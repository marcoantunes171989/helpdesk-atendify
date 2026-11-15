<#
.SYNOPSIS
    RBAC-10B / Etapa 5 — Executa backup logico (pg_dump, formato custom) de um banco PostgreSQL.
.DESCRIPTION
    PREPARADO PARA EXECUCAO FUTURA SUPERVISIONADA. Nao deve ser chamado contra producao
    sem: (1) identidade do Supabase confirmada (01-Verificar-Identidade-Supabase.ps1 =
    CONFIRMADO), (2) backup/PITR avaliado (relatorio RBAC-10B), (3) autorizacao explicita
    do proprietario via -Confirm.

    A connection string NUNCA e passada como parametro, nunca aparece em linha de comando,
    log ou historico. Ela deve estar em uma variavel de ambiente (-EnvVarName) definida
    pelo proprietario na MESMA sessao de shell, antes de chamar este script.

.PARAMETER EnvVarName
    Nome da variavel de ambiente (ja definida pelo usuario) que contem a DATABASE_URL/DIRECT_URL.
    O valor nunca e lido como parametro de linha de comando.

.PARAMETER Label
    Rotulo curto para o nome do arquivo (ex.: 'producao-supabase'). Nao deve conter dados sensiveis.

.PARAMETER Confirm
    Obrigatorio. Sem este switch o script aborta sem conectar a nada.

.PARAMETER TimeoutSec
    Tempo maximo (segundos) para o pg_dump. Default 1800 (30 min).

.PARAMETER MinimumFreeDiskGB
    Espaco livre minimo exigido no destino antes de iniciar. Default 5 GB.

.OUTPUTS
    Dump em atendexa-backups/dumps/<Label>_<timestamp>.dump
    Manifesto em atendexa-backups/dumps/<Label>_<timestamp>.manifest.json (hash, tamanho, timestamps, SEM credenciais)
    Exit codes: 0 sucesso; 1 falha generica; 2 validacao; 3 destino ja existe; 4 precheck ausente/invalido;
                5 identidade nao confirmada; 6 timeout.
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory)][string]$EnvVarName,
    [Parameter(Mandatory)][string]$Label,
    [switch]$Confirm,
    [int]$TimeoutSec = 1800,
    [double]$MinimumFreeDiskGB = 5.0
)

. "$PSScriptRoot\lib\Common.ps1"

$logFile = Get-LogFilePath -OperationName "backup-$Label"
Write-Log "RBAC-10B Etapa 5 — backup logico iniciado (label='$Label')." -LogFile $logFile

if (-not $Confirm) {
    Write-Log "BLOQUEADO: execute novamente com -Confirm apos ter (1) identidade Supabase CONFIRMADA, (2) backup/PITR avaliado, (3) autorizacao explicita do proprietario para este backup especifico." -Level ERROR -LogFile $logFile
    exit $Script:ExitCodes.ValidationFailure
}

if ($Label -match '(?i)postgres|password|supabase\.co') {
    Write-Log "BLOQUEADO: -Label parece conter um host/credencial; use um rotulo neutro (ex.: 'producao')." -Level ERROR -LogFile $logFile
    exit $Script:ExitCodes.ValidationFailure
}

# --- Gate 1: identidade do Supabase confirmada ---
$identityPath = Join-Path $Script:AtendexaBackupRoot 'identidade-supabase.json'
if (-not (Test-Path $identityPath)) {
    Write-Log "BLOQUEADO: $identityPath nao existe. Execute 01-Verificar-Identidade-Supabase.ps1 antes." -Level ERROR -LogFile $logFile
    exit $Script:ExitCodes.IdentityMismatch
}
$identity = Get-Content $identityPath -Raw | ConvertFrom-Json
if ($identity.status -ne 'CONFIRMADO') {
    Write-Log "BLOQUEADO: identidade do Supabase com status '$($identity.status)', nao 'CONFIRMADO'. $($identity.detail)" -Level ERROR -LogFile $logFile
    exit $Script:ExitCodes.IdentityMismatch
}
Write-Log "Gate de identidade OK (status CONFIRMADO em $($identity.timestamp))." -Level OK -LogFile $logFile

# --- Gate 2: variavel de ambiente com a connection string ---
$connValue = [System.Environment]::GetEnvironmentVariable($EnvVarName)
if ([string]::IsNullOrWhiteSpace($connValue)) {
    Write-Log "BLOQUEADO: variavel de ambiente '$EnvVarName' nao esta definida ou esta vazia nesta sessao. Defina-a antes de chamar o script (nunca como parametro)." -Level ERROR -LogFile $logFile
    exit $Script:ExitCodes.ValidationFailure
}
if ($connValue -notmatch '^postgres(ql)?://') {
    Write-Log "BLOQUEADO: o conteudo de '$EnvVarName' nao parece uma connection string PostgreSQL valida (nao sera registrado)." -Level ERROR -LogFile $logFile
    exit $Script:ExitCodes.ValidationFailure
}
Write-Log "Variavel '$EnvVarName' presente e com formato valido (conteudo nao sera logado)." -Level OK -LogFile $logFile

# --- Gate 3: precheck de ambiente ---
$precheckPath = Join-Path $Script:AtendexaBackupRoot 'precheck-ambiente.json'
if (-not (Test-Path $precheckPath)) {
    Write-Log "BLOQUEADO: execute 00-Precheck-Ambiente.ps1 antes." -Level ERROR -LogFile $logFile
    exit $Script:ExitCodes.PrecheckFailure
}
$precheck = Get-Content $precheckPath -Raw | ConvertFrom-Json
if (-not $precheck.viablePath) {
    Write-Log "BLOQUEADO: precheck indica que nenhum caminho viavel (nativo ou WSL+Docker) esta disponivel." -Level ERROR -LogFile $logFile
    exit $Script:ExitCodes.PrecheckFailure
}
Write-Log "Caminho viavel: $($precheck.viablePath)" -LogFile $logFile

# --- Destino ---
$dumpDir = Join-Path $Script:AtendexaBackupRoot 'dumps'
if (-not (Test-Path $dumpDir)) { New-Item -ItemType Directory -Path $dumpDir -Force | Out-Null }
$fileName = New-TimestampedBackupFileName -Prefix $Label -Extension 'dump'
$destPath = Join-Path $dumpDir $fileName
Assert-DestinationDoesNotExist -Path $destPath

$diskCheck = Test-DiskSpaceAvailable -Path $dumpDir -MinimumGB $MinimumFreeDiskGB
Write-Log "Espaco livre no destino: $($diskCheck.FreeGB) GB (minimo exigido: $MinimumFreeDiskGB GB)." -LogFile $logFile -Level $(if ($diskCheck.Ok) { 'OK' } else { 'ERROR' })
if (-not $diskCheck.Ok) {
    Write-Log "BLOQUEADO: espaco em disco insuficiente." -Level ERROR -LogFile $logFile
    exit $Script:ExitCodes.ValidationFailure
}

Write-Log "Destino: $destPath" -LogFile $logFile

$startedAt = Get-Date
$exitCode = $null
$pgDumpArgs = @(
    '--format=custom',
    '--no-owner',
    '--no-privileges',
    '--verbose',
    "--file=$destPath"
)

# A credencial e decomposta em variaveis libpq individuais (PGHOST/PGPORT/PGUSER/
# PGPASSWORD/PGDATABASE/PGSSLMODE) — a variavel de ambiente PGDATABASE sozinha NAO aceita
# uma URI completa (apenas --dbname=<uri> na linha de comando aceita, o que exporia a
# credencial em argv). Assim nenhuma parte sensivel aparece em nenhum texto de comando.
$pgVars = ConvertFrom-PgConnectionString -ConnectionString $connValue
$pgVarNames = @('PGHOST', 'PGPORT', 'PGUSER', 'PGPASSWORD', 'PGDATABASE', 'PGSSLMODE')

try {
    foreach ($k in $pgVarNames) { [System.Environment]::SetEnvironmentVariable($k, $pgVars[$k]) }

    if ($precheck.viablePath -eq 'native') {
        $env:PGCONNECT_TIMEOUT = '30'
        try {
            $p = Start-Process -FilePath 'pg_dump' -ArgumentList $pgDumpArgs `
                -NoNewWindow -PassThru -RedirectStandardError (Join-Path $dumpDir "$fileName.stderr.tmp")
            if (-not $p.WaitForExit($TimeoutSec * 1000)) {
                $p.Kill()
                Write-Log "TIMEOUT: pg_dump excedeu $TimeoutSec s e foi finalizado." -Level ERROR -LogFile $logFile
                exit $Script:ExitCodes.Timeout
            }
            $exitCode = $p.ExitCode
        } finally {
            foreach ($k in $pgVarNames) { Remove-Item "Env:\$k" -ErrorAction SilentlyContinue }
        }
    } else {
        $wslDumpDir = ConvertTo-WslPath -WindowsPath $dumpDir
        $pgVersion = if ($precheck.pgImageVersion -match 'postgres:15') { 'postgres:15' } else { 'postgres:15' }
        $envFlags = ($pgVarNames | ForEach-Object { "-e $_" }) -join ' '
        # --network host: necessario para alcancar um Postgres publicado em 127.0.0.1:<porta>
        # no host WSL (ex.: banco local de teste); nao prejudica o acesso a um host remoto
        # na internet (ex.: Supabase), que continua funcionando normalmente.
        $dockerArgs = "run --rm --network host $envFlags -v `"$wslDumpDir`":/backup $pgVersion pg_dump --format=custom --no-owner --no-privileges --verbose --file=/backup/$fileName"
        $r = Invoke-WslDocker -DockerArgs $dockerArgs -PassEnvVarNames $pgVarNames
        $exitCode = $r.ExitCode
        if ($r.StdErr) {
            $sanitized = $r.StdErr -replace '(?i)postgres(ql)?://\S+', '[REDACTED]'
            Add-Content -Path $logFile -Value "[pg_dump stderr, sanitizado]`n$sanitized" -Encoding utf8
        }
        foreach ($k in $pgVarNames) { Remove-Item "Env:\$k" -ErrorAction SilentlyContinue }
    }
} catch {
    Write-Log "Falha ao executar pg_dump: $($_.Exception.Message)" -Level ERROR -LogFile $logFile
    exit $Script:ExitCodes.GenericFailure
}

$finishedAt = Get-Date
$duration = ($finishedAt - $startedAt).TotalSeconds

if ($exitCode -ne 0 -or -not (Test-Path $destPath) -or (Get-Item $destPath).Length -eq 0) {
    Write-Log "FALHA: pg_dump retornou exit code $exitCode ou arquivo de saida vazio/ausente." -Level ERROR -LogFile $logFile
    exit $Script:ExitCodes.GenericFailure
}

$sha256 = Get-FileSha256 -Path $destPath
$sizeBytes = (Get-Item $destPath).Length

$manifest = [ordered]@{
    label         = $Label
    file          = $fileName
    startedAt     = $startedAt.ToString('o')
    finishedAt    = $finishedAt.ToString('o')
    durationSec   = [math]::Round($duration, 1)
    sizeBytes     = $sizeBytes
    sha256        = $sha256
    path          = $precheck.viablePath
    pgDumpExit    = $exitCode
    identityCheck = $identity.timestamp
}
$manifestPath = Join-Path $dumpDir "$($fileName).manifest.json"
$manifest | ConvertTo-Json | Set-Content -Path $manifestPath -Encoding utf8

Write-Log "Backup concluido: $destPath ($sizeBytes bytes, sha256=$sha256, duracao=$([math]::Round($duration,1))s)." -Level OK -LogFile $logFile
Write-Log "Manifesto: $manifestPath" -Level OK -LogFile $logFile
Write-Log "LEMBRETE: armazenar este arquivo fora do repositorio git (ja protegido por .gitignore em /atendexa-backups/), de preferencia em local criptografado, e aplicar retencao/descarte conforme politica (Etapa 8)." -LogFile $logFile

exit $Script:ExitCodes.Success
