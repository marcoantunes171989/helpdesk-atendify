<#
.SYNOPSIS
    RBAC-10B / Etapa 7 — Restaura um dump em um PostgreSQL descartavel (container Docker local via WSL),
    totalmente isolado de qualquer banco de producao, para comprovar recuperabilidade.
.DESCRIPTION
    Fluxo:
      1. Cria um container postgres:15 novo, com nome e porta exclusivos (nenhuma conexao externa).
      2. Aguarda o banco ficar pronto (pg_isready).
      3. Restaura o dump com pg_restore --clean --if-exists --no-owner --no-privileges.
      4. Roda validacoes somente-leitura: contagem de tabelas, extensoes, integridade referencial basica.
      5. Remove o container (a menos que -KeepContainer seja passado, para inspecao manual).
    Nunca define variaveis apontando para producao; a URL de conexao usada aqui e sempre
    'postgresql://postgres:postgres@127.0.0.1:<portaLocal>/postgres', gerada localmente.
.PARAMETER DumpPath
    Caminho do arquivo .dump a restaurar (gerado por 02-Backup-Logico.ps1 ou um dump de teste local).
.PARAMETER KeepContainer
    Se definido, nao remove o container ao final (para inspecao manual com psql).
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory)][string]$DumpPath,
    [switch]$KeepContainer,
    [int]$TimeoutSec = 600
)

. "$PSScriptRoot\lib\Common.ps1"

$logFile = Get-LogFilePath -OperationName 'restaurar-isolado'
Write-Log "RBAC-10B Etapa 7 — restauracao isolada iniciada para: $DumpPath" -LogFile $logFile

if (-not (Test-Path $DumpPath)) {
    Write-Log "FALHA: dump nao encontrado: $DumpPath" -Level ERROR -LogFile $logFile
    exit $Script:ExitCodes.ValidationFailure
}

if (-not (Test-WslDockerAvailable)) {
    Write-Log "BLOQUEADO: Docker via WSL nao disponivel. Restauracao isolada requer Docker (nenhuma instancia de producao e usada)." -Level ERROR -LogFile $logFile
    exit $Script:ExitCodes.PrecheckFailure
}

$suffix = -join ((48..57) + (97..122) | Get-Random -Count 8 | ForEach-Object { [char]$_ })
$containerName = "atendexa-restore-test-$suffix"
$localPort = Get-Random -Minimum 15500 -Maximum 15999
$wslDumpDir = ConvertTo-WslPath -WindowsPath (Split-Path -Parent $DumpPath)
$fileOnly = Split-Path -Leaf $DumpPath

Write-Log "Container isolado: $containerName (porta local $localPort, somente 127.0.0.1)." -LogFile $logFile

function Remove-TestContainer {
    param([string]$Name)
    Invoke-WslDocker -DockerArgs "rm -f $Name" | Out-Null
}

try {
    $run = Invoke-WslDocker -DockerArgs "run -d --name $containerName -e POSTGRES_PASSWORD=postgres -p 127.0.0.1:${localPort}:5432 -v `"$wslDumpDir`":/backup:ro postgres:15"
    if ($run.ExitCode -ne 0) {
        Write-Log "FALHA ao criar container: $($run.StdErr)" -Level ERROR -LogFile $logFile
        exit $Script:ExitCodes.GenericFailure
    }
    Write-Log "Container criado: $containerName" -Level OK -LogFile $logFile

    $ready = $false
    $deadline = (Get-Date).AddSeconds(60)
    while ((Get-Date) -lt $deadline) {
        $chk = Invoke-WslDocker -DockerArgs "exec $containerName pg_isready -U postgres"
        if ($chk.ExitCode -eq 0) { $ready = $true; break }
        Start-Sleep -Seconds 2
    }
    if (-not $ready) {
        Write-Log "FALHA: banco isolado nao ficou pronto em 60s." -Level ERROR -LogFile $logFile
        exit $Script:ExitCodes.Timeout
    }
    Write-Log "Banco isolado pronto para restauracao." -Level OK -LogFile $logFile

    $restoreStart = Get-Date
    $restoreArgs = "exec $containerName pg_restore -U postgres -d postgres --clean --if-exists --no-owner --no-privileges --verbose /backup/$fileOnly"
    $restore = Invoke-WslDocker -DockerArgs $restoreArgs
    $restoreDuration = ((Get-Date) - $restoreStart).TotalSeconds

    # pg_restore pode retornar exit code != 0 por avisos de "ignorar" (ex.: role inexistente)
    # quando --no-owner/--no-privileges ja mitigam isso; tratamos como falha apenas se nenhuma
    # tabela terminar criada (verificado a seguir), nao apenas pelo exit code isolado.
    if ($restore.StdErr) {
        $sanitizedErr = $restore.StdErr
        Add-Content -Path $logFile -Value "[pg_restore stderr]`n$sanitizedErr" -Encoding utf8
    }
    Write-Log "pg_restore concluido em $([math]::Round($restoreDuration,1))s (exit code $($restore.ExitCode))." -LogFile $logFile

    $countCheck = Invoke-WslDocker -DockerArgs "exec $containerName psql -U postgres -d postgres -t -c `"SELECT count(*) FROM information_schema.tables WHERE table_schema='public';`""
    $tableCount = ($countCheck.StdOut | Out-String).Trim()
    Write-Log "Tabelas presentes no schema public apos restauracao: $tableCount" -Level $(if ($tableCount -match '^\d+$' -and [int]$tableCount -gt 0) { 'OK' } else { 'ERROR' }) -LogFile $logFile

    $extCheck = Invoke-WslDocker -DockerArgs "exec $containerName psql -U postgres -d postgres -t -c `"SELECT extname FROM pg_extension;`""
    Write-Log "Extensoes presentes: $(($extCheck.StdOut).Trim() -replace '\s+', ', ')" -LogFile $logFile

    $fkCheck = Invoke-WslDocker -DockerArgs "exec $containerName psql -U postgres -d postgres -t -c `"SELECT count(*) FROM pg_constraint WHERE contype='f';`""
    Write-Log "Foreign keys presentes apos restauracao: $(($fkCheck.StdOut).Trim())" -LogFile $logFile

    $evidencePath = "$DumpPath.restore-evidence.json"
    [ordered]@{
        timestamp        = (Get-Date -Format 'o')
        dumpPath         = $DumpPath
        containerName    = $containerName
        restoreDurationS = [math]::Round($restoreDuration, 1)
        pgRestoreExit    = $restore.ExitCode
        publicTableCount = $tableCount
        foreignKeyCount  = (($fkCheck.StdOut).Trim())
        extensions       = (($extCheck.StdOut).Trim())
    } | ConvertTo-Json | Set-Content -Path $evidencePath -Encoding utf8
    Write-Log "Evidencia de restauracao gravada em: $evidencePath" -Level OK -LogFile $logFile

    if (-not ($tableCount -match '^\d+$') -or [int]$tableCount -eq 0) {
        Write-Log "FALHA: restauracao nao produziu nenhuma tabela no schema public." -Level ERROR -LogFile $logFile
        exit $Script:ExitCodes.ValidationFailure
    }

    Write-Log "Restauracao isolada concluida com evidencia de recuperabilidade." -Level OK -LogFile $logFile
    exit $Script:ExitCodes.Success

} finally {
    if (-not $KeepContainer) {
        Remove-TestContainer -Name $containerName
        Write-Log "Container de teste removido: $containerName" -LogFile $logFile
    } else {
        Write-Log "Container mantido para inspecao manual: $containerName (porta 127.0.0.1:$localPort). Remover depois com: wsl docker rm -f $containerName" -Level WARN -LogFile $logFile
    }
}
