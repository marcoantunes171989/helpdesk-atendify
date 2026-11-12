<#
.SYNOPSIS
    RBAC-10B / Etapa 9F — Consolida os artefatos JSON gerados pelos demais scripts em um relatorio Markdown.
.DESCRIPTION
    Le (se existirem, sem exigir todos): precheck-ambiente.json, identidade-supabase.json,
    e os manifestos/evidencias mais recentes em atendexa-backups/dumps/. Nao conecta a nada,
    nao gera dados novos — apenas resume o que outros scripts ja gravaram.
#>
[CmdletBinding()]
param(
    [string]$OutputPath
)

. "$PSScriptRoot\lib\Common.ps1"

if (-not $OutputPath) {
    $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
    $OutputPath = Join-Path $Script:AtendexaBackupRoot "relatorio-consolidado_$stamp.md"
}

$precheckPath = Join-Path $Script:AtendexaBackupRoot 'precheck-ambiente.json'
$identityPath = Join-Path $Script:AtendexaBackupRoot 'identidade-supabase.json'
$dumpsDir = Join-Path $Script:AtendexaBackupRoot 'dumps'

$lines = @()
$lines += "# Relatorio consolidado — operacoes de backup/restauracao Atendexa"
$lines += ""
$lines += "Gerado em: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
$lines += ""

$lines += "## Precheck de ambiente"
if (Test-Path $precheckPath) {
    $p = Get-Content $precheckPath -Raw | ConvertFrom-Json
    $lines += "- Caminho viavel: **$($p.viablePath)**"
    $lines += "- Git: branch=$($p.git.Branch), head=$($p.git.Head), workingTreeDirty=$($p.git.Dirty)"
    $lines += "- Node: $($p.node) | PowerShell: $($p.pwsh)"
    $lines += "- Clientes nativos pg_dump/pg_restore/psql: $($p.pgToolsNative)"
    $lines += "- WSL disponivel: $($p.wslAvailable) | Docker no WSL: $($p.wslDocker)"
    $lines += "- Imagens postgres no Docker: $($p.pgImageVersion)"
} else {
    $lines += "- **Nao executado.** Rodar 00-Precheck-Ambiente.ps1."
}
$lines += ""

$lines += "## Identidade do Supabase"
if (Test-Path $identityPath) {
    $i = Get-Content $identityPath -Raw | ConvertFrom-Json
    $lines += "- Status: **$($i.status)**"
    $lines += "- Verificado em: $($i.timestamp)"
    $lines += "- Detalhe: $($i.detail)"
} else {
    $lines += "- **PENDENTE.** Rodar 01-Verificar-Identidade-Supabase.ps1."
}
$lines += ""

$lines += "## Backups (dumps)"
if (Test-Path $dumpsDir) {
    $manifests = Get-ChildItem -Path $dumpsDir -Filter '*.manifest.json' -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending
    if ($manifests) {
        foreach ($m in $manifests) {
            $mj = Get-Content $m.FullName -Raw | ConvertFrom-Json
            $lines += "### $($mj.label) — $($mj.file)"
            $lines += "- Tamanho: $([math]::Round($mj.sizeBytes/1MB,2)) MB | sha256: ``$($mj.sha256)``"
            $lines += "- Gerado: $($mj.startedAt) -> $($mj.finishedAt) ($($mj.durationSec)s) via $($mj.path)"
            $dumpFile = Join-Path $dumpsDir ($m.Name -replace '\.manifest\.json$', '')
            $invPath = "$dumpFile.inventory.txt"
            $evidencePath = "$dumpFile.restore-evidence.json"
            $lines += "- Validacao de integridade (inventario): $(if (Test-Path $invPath) { 'OK — ' + $invPath } else { 'nao executada' })"
            if (Test-Path $evidencePath) {
                $ev = Get-Content $evidencePath -Raw | ConvertFrom-Json
                $lines += "- Restauracao isolada: tabelas=$($ev.publicTableCount), FKs=$($ev.foreignKeyCount), duracao=$($ev.restoreDurationS)s — **recuperabilidade comprovada**"
            } else {
                $lines += "- Restauracao isolada: nao executada ainda (recuperabilidade **nao** comprovada)"
            }
            $lines += ""
        }
    } else {
        $lines += "- Nenhum backup registrado ainda."
    }
} else {
    $lines += "- Nenhum backup registrado ainda."
}

$content = $lines -join "`n"
Assert-NoSecret -Text $content
if (-not (Test-Path $Script:AtendexaBackupRoot)) { New-Item -ItemType Directory -Path $Script:AtendexaBackupRoot -Force | Out-Null }
Set-Content -Path $OutputPath -Value $content -Encoding utf8

Write-Host "Relatorio consolidado gravado em: $OutputPath"
exit $Script:ExitCodes.Success
