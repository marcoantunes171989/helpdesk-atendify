# RBAC-10B — Biblioteca comum dos scripts de backup/restauração Atendexa.
# Nenhuma funcao aqui deve imprimir, logar ou persistir credenciais.
# Importar com: . "$PSScriptRoot\lib\Common.ps1"

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# $PSScriptRoot aqui e .../helpdesk/docs/rbac/scripts/backup/lib — a raiz do repositorio
# fica 6 niveis acima (lib->backup->scripts->rbac->docs->helpdesk->raiz). Resolvido
# explicitamente para nao depender de $PWD.
$Script:RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..\..\..\..')).ProviderPath
# ATENDEXA_BACKUP_ROOT_OVERRIDE permite que o harness de teste local (Etapa 10) isole
# totalmente seus artefatos da pasta real de backups, sem alterar nenhum script individual.
$Script:AtendexaBackupRoot = if ($env:ATENDEXA_BACKUP_ROOT_OVERRIDE) {
    $env:ATENDEXA_BACKUP_ROOT_OVERRIDE
} else {
    Join-Path $Script:RepoRoot 'atendexa-backups'
}

$Script:ExitCodes = @{
    Success             = 0
    GenericFailure      = 1
    ValidationFailure   = 2
    DestinationConflict = 3
    PrecheckFailure     = 4
    IdentityMismatch     = 5
    Timeout             = 6
}

# Padroes que nunca devem aparecer em texto logado — defesa em profundidade contra
# vazamento acidental de segredo em uma mensagem de log.
$Script:SecretPatterns = @(
    'postgres(?:ql)?://[^\s"'']+',
    'password\s*=\s*\S+',
    'DATABASE_URL\s*=\s*\S+',
    'DIRECT_URL\s*=\s*\S+'
)

function Assert-NoSecret {
    <#
        Lanca excecao se a string contiver algo que pareca uma credencial/connection string.
        Usar antes de qualquer Write-Log ou saida em arquivo.
    #>
    param([Parameter(Mandatory)][string]$Text)
    foreach ($pattern in $Script:SecretPatterns) {
        if ($Text -match $pattern) {
            throw "Assert-NoSecret: texto bloqueado por conter padrao sensivel ('$pattern'). Operacao abortada para evitar vazamento de credencial."
        }
    }
}

function Get-LogFilePath {
    param([Parameter(Mandatory)][string]$OperationName)
    $logDir = Join-Path $Script:AtendexaBackupRoot 'logs'
    if (-not (Test-Path $logDir)) {
        New-Item -ItemType Directory -Path $logDir -Force | Out-Null
    }
    $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
    return Join-Path $logDir "$OperationName`_$stamp.log"
}

function Write-Log {
    param(
        [Parameter(Mandatory)][string]$Message,
        [ValidateSet('INFO', 'WARN', 'ERROR', 'OK')][string]$Level = 'INFO',
        [string]$LogFile
    )
    Assert-NoSecret -Text $Message
    $ts = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    $line = "[$ts] [$Level] $Message"
    switch ($Level) {
        'ERROR' { Write-Host $line -ForegroundColor Red }
        'WARN'  { Write-Host $line -ForegroundColor Yellow }
        'OK'    { Write-Host $line -ForegroundColor Green }
        default { Write-Host $line }
    }
    if ($LogFile) {
        Add-Content -Path $LogFile -Value $line -Encoding utf8
    }
}

function Get-FileSha256 {
    param([Parameter(Mandatory)][string]$Path)
    if (-not (Test-Path $Path)) {
        throw "Get-FileSha256: arquivo nao encontrado: $Path"
    }
    return (Get-FileHash -Path $Path -Algorithm SHA256).Hash.ToLowerInvariant()
}

function Test-DiskSpaceAvailable {
    <#
        Verifica espaco livre no drive do caminho informado.
        Retorna $true se houver pelo menos $MinimumGB livres.
    #>
    param(
        [Parameter(Mandatory)][string]$Path,
        [double]$MinimumGB = 2.0
    )
    $resolved = (Resolve-Path (Split-Path -Parent $Path) -ErrorAction SilentlyContinue)
    if (-not $resolved) { $resolved = $Script:RepoRoot }
    $drive = (Get-Item $resolved).PSDrive.Name
    $freeBytes = (Get-PSDrive -Name $drive).Free
    $freeGB = [math]::Round($freeBytes / 1GB, 2)
    return @{
        FreeGB = $freeGB
        Ok     = ($freeGB -ge $MinimumGB)
    }
}

function New-TimestampedBackupFileName {
    param(
        [Parameter(Mandatory)][string]$Prefix,
        [string]$Extension = 'dump'
    )
    $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
    return "${Prefix}_${stamp}.${Extension}"
}

function Assert-DestinationDoesNotExist {
    <#
        Protecao contra sobrescrita: aborta se o arquivo de destino ja existir.
    #>
    param([Parameter(Mandatory)][string]$Path)
    if (Test-Path $Path) {
        throw "Assert-DestinationDoesNotExist: destino ja existe, operacao abortada para nao sobrescrever: $Path"
    }
}

function Test-WslAvailable {
    try {
        $null = & wsl.exe --status 2>$null
        return ($LASTEXITCODE -eq 0)
    } catch {
        return $false
    }
}

function Test-WslDockerAvailable {
    if (-not (Test-WslAvailable)) { return $false }
    $r = Invoke-WslBash -Command 'docker info > /dev/null 2>&1'
    return ($r.ExitCode -eq 0)
}

function Invoke-WslBash {
    <#
        Executa um comando bash arbitrario dentro do WSL, escrevendo-o em um arquivo
        temporario antes de chamar wsl.exe — isso evita por completo os problemas de
        requoting de linha de comando do Windows com aspas aninhadas (CreateProcess /
        Start-Process nao preservam aspas duplas internas de forma confiavel ao atravessar
        a fronteira Windows->WSL). Variaveis de ambiente sensiveis devem ser repassadas via
        WSLENV (-PassEnvVarNames), nunca escritas dentro do proprio comando/arquivo.
    #>
    param(
        [Parameter(Mandatory)][string]$Command,
        [string[]]$PassEnvVarNames = @()
    )
    # Nota: nao aplicamos Assert-NoSecret ao TEXTO do comando aqui — comandos legitimos de
    # docker/psql podem conter a palavra "password" (ex.: senhas sinteticas de containers de
    # teste descartaveis, flags --no-password) sem que isso seja uma credencial real. A
    # credencial real de producao nunca entra no texto do comando: ela so trafega por
    # variavel de ambiente via -PassEnvVarNames/WSLENV. Assert-NoSecret protege o que e
    # exibido/gravado em log (Write-Log) e o relatorio consolidado, nao a construcao interna
    # de comandos.
    if ($PassEnvVarNames.Count -gt 0) {
        $existing = $env:WSLENV
        $toAdd = ($PassEnvVarNames | ForEach-Object { "$_/u" }) -join ':'
        $env:WSLENV = if ($existing) { "$existing`:$toAdd" } else { $toAdd }
    }
    $tmpDir = [System.IO.Path]::GetTempPath()
    $scriptName = "atendexa-wsl-$([guid]::NewGuid().ToString('N')).sh"
    $scriptPath = Join-Path $tmpDir $scriptName
    Set-Content -Path $scriptPath -Value $Command -Encoding ascii -NoNewline
    $stdoutFile = [System.IO.Path]::GetTempFileName()
    $stderrFile = [System.IO.Path]::GetTempFileName()
    try {
        $wslScriptPath = ConvertTo-WslPath -WindowsPath $scriptPath
        $p = Start-Process -FilePath 'wsl.exe' -ArgumentList @('-e', 'bash', $wslScriptPath) `
            -NoNewWindow -Wait -PassThru -RedirectStandardOutput $stdoutFile -RedirectStandardError $stderrFile
        $stdoutContent = Get-Content -Raw -ErrorAction SilentlyContinue $stdoutFile
        $stderrContent = Get-Content -Raw -ErrorAction SilentlyContinue $stderrFile
        return @{
            ExitCode = $p.ExitCode
            StdOut   = $(if ($null -eq $stdoutContent) { '' } else { $stdoutContent })
            StdErr   = $(if ($null -eq $stderrContent) { '' } else { $stderrContent })
        }
    } finally {
        Remove-Item $scriptPath, $stdoutFile, $stderrFile -ErrorAction SilentlyContinue
    }
}

function ConvertFrom-PgConnectionString {
    <#
        Decompoe uma connection string postgresql://user:pass@host:port/db?sslmode=require
        em variaveis libpq individuais (PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE,
        PGSSLMODE). Isso evita por completo colocar a credencial em qualquer argv de
        processo (docker run -e NOME, sem valor, so repassa o NOME da variavel) — a URI
        completa via PGDATABASE NAO funciona com pg_dump/psql (apenas --dbname=<uri> aceita
        URI; a variavel de ambiente PGDATABASE so aceita um nome de banco simples).
    #>
    param([Parameter(Mandatory)][string]$ConnectionString)
    try {
        $uri = [System.Uri]$ConnectionString
    } catch {
        throw "ConvertFrom-PgConnectionString: nao foi possivel interpretar a connection string como URI valida."
    }
    $userInfo = $uri.UserInfo -split ':', 2
    $user = [System.Uri]::UnescapeDataString($userInfo[0])
    $pass = if ($userInfo.Count -gt 1) { [System.Uri]::UnescapeDataString($userInfo[1]) } else { '' }
    $db = $uri.AbsolutePath.TrimStart('/')
    # Default 'prefer': usa SSL automaticamente quando o servidor oferece (sempre o caso no
    # Supabase) sem falhar contra um servidor local de teste sem SSL. Se a connection string
    # especificar sslmode explicitamente (ex.: 'require' para Supabase), esse valor prevalece.
    $sslmode = 'prefer'
    if ($uri.Query) {
        foreach ($pair in ($uri.Query.TrimStart('?') -split '&')) {
            $kv = $pair -split '=', 2
            if ($kv.Count -eq 2 -and $kv[0] -eq 'sslmode') {
                $sslmode = [System.Uri]::UnescapeDataString($kv[1])
            }
        }
    }
    return [ordered]@{
        PGHOST     = $uri.Host
        PGPORT     = if ($uri.Port -gt 0) { [string]$uri.Port } else { '5432' }
        PGUSER     = $user
        PGPASSWORD = $pass
        PGDATABASE = $db
        PGSSLMODE  = $sslmode
    }
}

function Invoke-WslDocker {
    <#
        Executa 'docker <args>' dentro do WSL (ver Invoke-WslBash para o porque do uso de
        arquivo temporario), repassando variaveis de ambiente sensiveis via WSLENV (nunca
        via linha de comando ou arquivo), e retorna exit code + stdout/stderr capturados
        separadamente. O chamador decide o que logar (nunca logar stdout bruto sem passar
        por Assert-NoSecret antes).
    #>
    param(
        [Parameter(Mandatory)][string]$DockerArgs,
        [string[]]$PassEnvVarNames = @()
    )
    return Invoke-WslBash -Command "docker $DockerArgs" -PassEnvVarNames $PassEnvVarNames
}

function ConvertTo-WslPath {
    <#
        Converte um caminho Windows (ex.: C:\Projetos\Atendexa\x) para o equivalente WSL (/mnt/c/Projetos/Atendexa/x).
    #>
    param([Parameter(Mandatory)][string]$WindowsPath)
    $full = (Resolve-Path $WindowsPath).ProviderPath
    $drive = $full.Substring(0, 1).ToLowerInvariant()
    $rest = $full.Substring(2) -replace '\\', '/'
    return "/mnt/$drive$rest"
}
