<#
.SYNOPSIS
    RBAC-10B / Etapa 1 e 4 — Verifica o ambiente local antes de qualquer preparacao de backup.
.DESCRIPTION
    Somente leitura. Nao conecta a nenhum banco remoto. Verifica:
    - Git (diretorio, branch, HEAD, working tree)
    - PowerShell e Node
    - Disponibilidade de pg_dump/pg_restore/psql (nativo Windows) e, como alternativa, Docker via WSL
    - Versao do Postgres disponivel via imagem Docker (se houver)
.OUTPUTS
    Codigo de saida 0 = ambiente utilizavel (nativo OU via WSL/Docker).
    Codigo de saida 4 = nenhum caminho viavel para pg_dump/pg_restore/psql encontrado.
#>
[CmdletBinding()]
param()

. "$PSScriptRoot\lib\Common.ps1"

$logFile = Get-LogFilePath -OperationName 'precheck'
Write-Log "RBAC-10B Etapa 1/4 — precheck de ambiente iniciado." -LogFile $logFile

$result = [ordered]@{
    git            = $null
    node           = $null
    pwsh           = $null
    pgToolsNative  = $false
    wslAvailable   = $false
    wslDocker      = $false
    pgImageVersion = $null
    viablePath     = $null
}

# --- Git ---
try {
    Push-Location $Script:RepoRoot
    $branch = (& git branch --show-current).Trim()
    $head = (& git log -1 --oneline).Trim()
    $statusLines = (& git status --short)
    $result.git = @{ Branch = $branch; Head = $head; Dirty = [bool]$statusLines }
    Write-Log "Git OK — branch='$branch' head='$head' workingTreeDirty=$([bool]$statusLines)" -LogFile $logFile -Level OK
} catch {
    Write-Log "Falha ao inspecionar Git: $($_.Exception.Message)" -Level ERROR -LogFile $logFile
} finally {
    Pop-Location
}

# --- Node / PowerShell ---
try {
    $result.node = (& node --version).Trim()
    Write-Log "Node disponivel: $($result.node)" -LogFile $logFile -Level OK
} catch {
    Write-Log "Node nao encontrado no PATH." -Level WARN -LogFile $logFile
}
$result.pwsh = $PSVersionTable.PSVersion.ToString()
Write-Log "PowerShell em uso: $($result.pwsh)" -LogFile $logFile -Level OK

# --- Clientes PostgreSQL nativos (Windows) ---
foreach ($tool in @('pg_dump', 'pg_restore', 'psql')) {
    $cmd = Get-Command $tool -ErrorAction SilentlyContinue
    if ($cmd) {
        $result.pgToolsNative = $true
        Write-Log "Cliente nativo encontrado: $tool ($($cmd.Source))" -LogFile $logFile -Level OK
    }
}
if (-not $result.pgToolsNative) {
    Write-Log "Nenhum cliente PostgreSQL nativo (pg_dump/pg_restore/psql) encontrado no PATH do Windows." -Level WARN -LogFile $logFile
}

# --- WSL + Docker (caminho alternativo, somente leitura) ---
$result.wslAvailable = Test-WslAvailable
Write-Log "WSL disponivel: $($result.wslAvailable)" -LogFile $logFile -Level $(if ($result.wslAvailable) { 'OK' } else { 'WARN' })

if ($result.wslAvailable) {
    $result.wslDocker = Test-WslDockerAvailable
    Write-Log "Docker dentro do WSL operacional: $($result.wslDocker)" -LogFile $logFile -Level $(if ($result.wslDocker) { 'OK' } else { 'WARN' })

    if ($result.wslDocker) {
        $imgCheck = Invoke-WslDocker -DockerArgs "images --format '{{.Repository}}:{{.Tag}}'"
        if ($imgCheck.ExitCode -eq 0) {
            $pgImages = $imgCheck.StdOut -split "`n" | Where-Object { $_ -match '^postgres:' }
            if ($pgImages) {
                $result.pgImageVersion = ($pgImages -join ', ').Trim()
                Write-Log "Imagens Docker postgres disponiveis localmente: $($result.pgImageVersion)" -LogFile $logFile -Level OK
            } else {
                Write-Log "Docker operacional, mas nenhuma imagem 'postgres:*' presente localmente ainda (sera necessario 'docker pull' na execucao supervisionada)." -Level WARN -LogFile $logFile
            }
        }
    }
}

# --- Decisao de caminho viavel ---
if ($result.pgToolsNative) {
    $result.viablePath = 'native'
} elseif ($result.wslDocker) {
    $result.viablePath = 'wsl-docker'
} else {
    $result.viablePath = $null
}

Write-Log "Caminho viavel para operacoes de backup/restore: $($result.viablePath ?? 'NENHUM')" -LogFile $logFile -Level $(if ($result.viablePath) { 'OK' } else { 'ERROR' })

$reportPath = Join-Path $Script:AtendexaBackupRoot 'precheck-ambiente.json'
if (-not (Test-Path $Script:AtendexaBackupRoot)) { New-Item -ItemType Directory -Path $Script:AtendexaBackupRoot -Force | Out-Null }
$result | ConvertTo-Json -Depth 5 | Set-Content -Path $reportPath -Encoding utf8
Write-Log "Relatorio de precheck salvo em: $reportPath" -LogFile $logFile

if (-not $result.viablePath) {
    Write-Log "BLOQUEADO: nenhum caminho viavel para pg_dump/pg_restore/psql (nem nativo, nem via WSL+Docker)." -Level ERROR -LogFile $logFile
    exit $Script:ExitCodes.PrecheckFailure
}

Write-Log "Precheck concluido com sucesso." -Level OK -LogFile $logFile
exit $Script:ExitCodes.Success
