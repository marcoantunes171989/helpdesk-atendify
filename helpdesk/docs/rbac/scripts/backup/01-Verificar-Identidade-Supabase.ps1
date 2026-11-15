<#
.SYNOPSIS
    RBAC-10B / Etapa 2 — Compara o Project Reference do Supabase com o host/usuario
    efetivamente configurado no Render, SEM solicitar ou registrar a connection string completa.
.DESCRIPTION
    Interativo, para ser executado pelo proprietario. Pede apenas:
      1) O <project-ref> visto em Supabase -> Project Settings -> General -> Reference ID.
      2) O host OU usuario da DATABASE_URL configurada no Render -> Environment
         (ex.: host 'db.<project-ref>.supabase.co' no modo direto, ou usuario
         'postgres.<project-ref>' no modo pooler/Supavisor).
    Nao aceita e nao tenta ler uma connection string completa — se o valor colado
    contiver '://' ou 'password', o script aborta sem logar o conteudo.
.OUTPUTS
    Grava status CONFIRMADO ou PENDENTE em atendexa-backups/identidade-supabase.json
    (sem qualquer credencial), e retorna exit code 0 (confirmado) ou 5 (divergencia/pendente).
#>
[CmdletBinding()]
param(
    [string]$ProjectRef,
    [string]$RenderHostOrUser
)

. "$PSScriptRoot\lib\Common.ps1"

$logFile = Get-LogFilePath -OperationName 'identidade-supabase'
Write-Log "RBAC-10B Etapa 2 — verificacao de identidade Supabase iniciada." -LogFile $logFile

function Test-LooksLikeFullConnectionString {
    param([string]$Value)
    return ($Value -match '://' -or $Value -match '(?i)password' -or $Value -match '@.*:\d{3,5}/')
}

if (-not $ProjectRef) {
    $ProjectRef = Read-Host "Cole APENAS o Reference ID do Supabase (Project Settings -> General)"
}
if (-not $RenderHostOrUser) {
    $RenderHostOrUser = Read-Host "Cole APENAS o host ou usuario da DATABASE_URL do Render (ex.: db.<ref>.supabase.co ou postgres.<ref>) — NUNCA a string completa"
}

foreach ($pair in @(@('ProjectRef', $ProjectRef), @('RenderHostOrUser', $RenderHostOrUser))) {
    if (Test-LooksLikeFullConnectionString -Value $pair[1]) {
        Write-Log "BLOQUEADO: o valor informado para '$($pair[0])' parece ser uma connection string completa (contem '://', 'password' ou formato usuario@host:porta). Operacao abortada sem registrar o conteudo." -Level ERROR -LogFile $logFile
        exit $Script:ExitCodes.ValidationFailure
    }
}

if ([string]::IsNullOrWhiteSpace($ProjectRef) -or [string]::IsNullOrWhiteSpace($RenderHostOrUser)) {
    Write-Log "BLOQUEADO: Project Ref ou host/usuario do Render nao informado." -Level ERROR -LogFile $logFile
    exit $Script:ExitCodes.ValidationFailure
}

# Extrai o project-ref do host/usuario informado, suportando os dois formatos documentados:
#   db.<ref>.supabase.co           (conexao direta)
#   postgres.<ref>                 (usuario em modo pooler/Supavisor)
$extractedRef = $null
if ($RenderHostOrUser -match '^db\.([a-z0-9]+)\.supabase\.co$') {
    $extractedRef = $Matches[1]
} elseif ($RenderHostOrUser -match '^postgres\.([a-z0-9]+)$') {
    $extractedRef = $Matches[1]
} elseif ($RenderHostOrUser -match '^[a-z0-9]{15,30}$') {
    # proprietario pode ter colado so o ref isoladamente
    $extractedRef = $RenderHostOrUser
}

$status = 'PENDENTE'
$detail = ''

if (-not $extractedRef) {
    $detail = "Nao foi possivel extrair um project-ref do valor informado ('$RenderHostOrUser' nao corresponde a 'db.<ref>.supabase.co' nem a 'postgres.<ref>'). Confirmar manualmente o formato no painel Render."
    Write-Log $detail -Level WARN -LogFile $logFile
} elseif ($extractedRef -ceq $ProjectRef) {
    $status = 'CONFIRMADO'
    $detail = "project-ref '$ProjectRef' coincide com o valor extraido do Render ('$extractedRef')."
    Write-Log $detail -Level OK -LogFile $logFile
} else {
    $status = 'PENDENTE'
    $detail = "DIVERGENCIA: project-ref do Supabase ('$ProjectRef') difere do extraido do Render ('$extractedRef'). O SQL Editor aberto pode ser de um projeto diferente do de producao. Nao prosseguir."
    Write-Log $detail -Level ERROR -LogFile $logFile
}

if (-not (Test-Path $Script:AtendexaBackupRoot)) { New-Item -ItemType Directory -Path $Script:AtendexaBackupRoot -Force | Out-Null }
$reportPath = Join-Path $Script:AtendexaBackupRoot 'identidade-supabase.json'
[ordered]@{
    timestamp     = (Get-Date -Format 'o')
    projectRef    = $ProjectRef
    renderValue   = $RenderHostOrUser
    extractedRef  = $extractedRef
    status        = $status
    detail        = $detail
} | ConvertTo-Json | Set-Content -Path $reportPath -Encoding utf8

Write-Log "Status gravado em $reportPath" -LogFile $logFile
Write-Log "Status final: $status" -Level $(if ($status -eq 'CONFIRMADO') { 'OK' } else { 'WARN' }) -LogFile $logFile

if ($status -eq 'CONFIRMADO') { exit $Script:ExitCodes.Success } else { exit $Script:ExitCodes.IdentityMismatch }
