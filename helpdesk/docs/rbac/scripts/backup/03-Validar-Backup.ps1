<#
.SYNOPSIS
    RBAC-10B / Etapa 6 — Valida a integridade (nao a recuperabilidade) de um dump gerado por 02-Backup-Logico.ps1.
.DESCRIPTION
    Verificacoes puramente locais, sem conectar a nenhum banco:
      - Arquivo existe e nao esta vazio.
      - Tamanho plausivel (> MinimumSizeKB).
      - Hash SHA-256 atual confere com o manifesto gravado no momento do backup.
      - Arquivo e um dump pg_dump --format=custom legivel (via 'pg_restore --list').
      - Inventario de objetos (tabelas) presente na lista do pg_restore.
    Integridade de arquivo != recuperabilidade comprovada — isso so e estabelecido
    pela restauracao isolada (04-Restaurar-Isolado.ps1).
.PARAMETER DumpPath
    Caminho completo do arquivo .dump a validar.
.PARAMETER ExpectedTables
    Lista opcional de nomes de tabela que devem aparecer no inventario do pg_restore --list.
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory)][string]$DumpPath,
    [int]$MinimumSizeKB = 1,
    [string[]]$ExpectedTables = @()
)

. "$PSScriptRoot\lib\Common.ps1"

$logFile = Get-LogFilePath -OperationName 'validar-backup'
Write-Log "RBAC-10B Etapa 6 — validacao de integridade do dump: $DumpPath" -LogFile $logFile

$failures = @()

if (-not (Test-Path $DumpPath)) {
    Write-Log "FALHA: arquivo nao encontrado: $DumpPath" -Level ERROR -LogFile $logFile
    exit $Script:ExitCodes.ValidationFailure
}

$sizeBytes = (Get-Item $DumpPath).Length
$sizeKB = [math]::Round($sizeBytes / 1KB, 1)
if ($sizeBytes -eq 0) {
    $failures += "Arquivo vazio (0 bytes)."
} elseif ($sizeKB -lt $MinimumSizeKB) {
    $failures += "Tamanho ($sizeKB KB) abaixo do minimo plausivel ($MinimumSizeKB KB)."
} else {
    Write-Log "Tamanho plausivel: $sizeKB KB." -Level OK -LogFile $logFile
}

$manifestPath = "$DumpPath.manifest.json"
if (Test-Path $manifestPath) {
    $manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
    $currentHash = Get-FileSha256 -Path $DumpPath
    if ($currentHash -eq $manifest.sha256) {
        Write-Log "Hash SHA-256 confere com o manifesto ($currentHash)." -Level OK -LogFile $logFile
    } else {
        $failures += "Hash SHA-256 NAO confere com o manifesto (arquivo pode ter sido alterado/corrompido apos o backup). Esperado=$($manifest.sha256) Atual=$currentHash"
    }
} else {
    Write-Log "Manifesto nao encontrado ($manifestPath) — hash nao pode ser comparado a um valor de referencia registrado no momento do backup." -Level WARN -LogFile $logFile
}

$precheckPath = Join-Path $Script:AtendexaBackupRoot 'precheck-ambiente.json'
$precheck = if (Test-Path $precheckPath) { Get-Content $precheckPath -Raw | ConvertFrom-Json } else { $null }

$listOutput = $null
try {
    if ($precheck -and $precheck.viablePath -eq 'native' -and (Get-Command pg_restore -ErrorAction SilentlyContinue)) {
        $listOutput = (& pg_restore --list $DumpPath 2>&1) -join "`n"
    } elseif ($precheck -and $precheck.viablePath -eq 'wsl-docker') {
        $wslDir = ConvertTo-WslPath -WindowsPath (Split-Path -Parent $DumpPath)
        $fileOnly = Split-Path -Leaf $DumpPath
        $r = Invoke-WslDocker -DockerArgs "run --rm -v `"$wslDir`":/backup postgres:15 pg_restore --list /backup/$fileOnly"
        if ($r.ExitCode -eq 0) { $listOutput = $r.StdOut }
    }
} catch {
    Write-Log "Nao foi possivel executar pg_restore --list: $($_.Exception.Message)" -Level WARN -LogFile $logFile
}

if ($listOutput) {
    $tableLines = @($listOutput -split "`n" | Where-Object { $_ -match '\bTABLE\b' -and $_ -notmatch 'TABLE DATA' })
    $dataLines = @($listOutput -split "`n" | Where-Object { $_ -match 'TABLE DATA' })
    Write-Log "pg_restore --list legivel: $($tableLines.Count) definicoes de tabela, $($dataLines.Count) blocos de dados." -Level OK -LogFile $logFile

    foreach ($t in $ExpectedTables) {
        if ($listOutput -notmatch [regex]::Escape($t)) {
            $failures += "Tabela esperada '$t' nao encontrada no inventario do dump."
        }
    }
    $inventoryPath = "$DumpPath.inventory.txt"
    Set-Content -Path $inventoryPath -Value $listOutput -Encoding utf8
    Write-Log "Inventario completo salvo em $inventoryPath" -LogFile $logFile
} else {
    $failures += "Nao foi possivel ler a estrutura do dump via pg_restore --list (arquivo pode estar corrompido, ou nenhuma ferramenta pg_restore disponivel)."
}

if ($failures.Count -gt 0) {
    Write-Log "VALIDACAO FALHOU ($($failures.Count) problema(s)):" -Level ERROR -LogFile $logFile
    foreach ($f in $failures) { Write-Log " - $f" -Level ERROR -LogFile $logFile }
    exit $Script:ExitCodes.ValidationFailure
}

Write-Log "Validacao de integridade do arquivo concluida com sucesso. Lembrete: isto NAO comprova recuperabilidade — executar 04-Restaurar-Isolado.ps1 para essa evidencia." -Level OK -LogFile $logFile
exit $Script:ExitCodes.Success
