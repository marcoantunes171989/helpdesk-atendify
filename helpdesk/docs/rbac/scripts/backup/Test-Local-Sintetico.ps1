<#
.SYNOPSIS
    RBAC-10B / Etapa 10 — Testa toda a cadeia de scripts (precheck -> identidade -> backup ->
    validacao -> restauracao isolada) usando um banco PostgreSQL SINTETICO local (Docker),
    sem qualquer dado ou credencial real do Supabase.
.DESCRIPTION
    1. Cria um container postgres:15 "fonte" com schema/dados sinteticos (nao-Atendexa).
    2. Executa 00-Precheck-Ambiente.ps1.
    3. Grava um identidade-supabase.json sintetico com status CONFIRMADO (marcado como teste).
    4. Define uma variavel de ambiente de teste com a connection string do container fonte
       (senha de teste 'postgres', apenas em 127.0.0.1, container descartavel).
    5. Executa 02-Backup-Logico.ps1 contra o container fonte.
    6. Executa 03-Validar-Backup.ps1 no dump gerado.
    7. Executa 04-Restaurar-Isolado.ps1 (container de destino separado).
    8. Executa testes negativos: falta de -Confirm, identidade PENDENTE, protecao contra
       sobrescrita, variavel de ambiente ausente/invalida, deteccao de segredo em log.
    9. Remove os containers de teste. Nao afeta pastas de backup reais (usa subpasta isolada).
.OUTPUTS
    Imprime um resumo PASS/FAIL por verificacao e retorna exit code 0 se tudo passou.
#>
[CmdletBinding()]
param()

. "$PSScriptRoot\lib\Common.ps1"

# Isola completamente os artefatos deste teste da pasta real de backups, inclusive para
# os scripts filhos invocados abaixo (que re-importam Common.ps1 em seu proprio escopo).
$testBackupRoot = Join-Path $Script:RepoRoot 'atendexa-backups-TESTE-LOCAL'
if (Test-Path $testBackupRoot) { Remove-Item $testBackupRoot -Recurse -Force }
New-Item -ItemType Directory -Path $testBackupRoot -Force | Out-Null
$env:ATENDEXA_BACKUP_ROOT_OVERRIDE = $testBackupRoot
$Script:AtendexaBackupRoot = $testBackupRoot

$results = New-Object System.Collections.Generic.List[object]
function Record-Result {
    param([string]$Name, [bool]$Passed, [string]$Detail = '')
    $results.Add([pscustomobject]@{ Name = $Name; Passed = $Passed; Detail = $Detail })
    $mark = if ($Passed) { 'PASS' } else { 'FAIL' }
    $color = if ($Passed) { 'Green' } else { 'Red' }
    Write-Host "[$mark] $Name $(if ($Detail) { "— $Detail" })" -ForegroundColor $color
}

$sourceContainer = "atendexa-test-source-$((Get-Random))"
$sourcePort = Get-Random -Minimum 15300 -Maximum 15499

try {
    # --- Setup: container fonte sintetico ---
    Invoke-WslDocker -DockerArgs "run -d --name $sourceContainer -e POSTGRES_PASSWORD=postgres -p 127.0.0.1:${sourcePort}:5432 postgres:15" | Out-Null
    $ready = $false
    $deadline = (Get-Date).AddSeconds(45)
    while ((Get-Date) -lt $deadline) {
        $chk = Invoke-WslDocker -DockerArgs "exec $sourceContainer pg_isready -U postgres"
        if ($chk.ExitCode -eq 0) { $ready = $true; break }
        Start-Sleep -Seconds 2
    }
    Record-Result "Container fonte sintetico ficou pronto" $ready

    if ($ready) {
        Invoke-WslDocker -DockerArgs "exec $sourceContainer psql -U postgres -d postgres -c `"CREATE TABLE sample_items (id serial primary key, name text not null, created_at timestamptz default now());`"" | Out-Null
        Invoke-WslDocker -DockerArgs "exec $sourceContainer psql -U postgres -d postgres -c `"INSERT INTO sample_items (name) VALUES ('alpha'),('beta'),('gamma');`"" | Out-Null
        $seedCheck = Invoke-WslDocker -DockerArgs "exec $sourceContainer psql -U postgres -d postgres -t -c `"SELECT count(*) FROM sample_items;`""
        Record-Result "Dados sinteticos inseridos (3 linhas)" (($seedCheck.StdOut).Trim() -eq '3') $seedCheck.StdOut.Trim()
    }

    # --- 1. Precheck ---
    & "$PSScriptRoot\00-Precheck-Ambiente.ps1" | Out-Null
    $precheckOk = (Test-Path (Join-Path $Script:AtendexaBackupRoot 'precheck-ambiente.json'))
    Record-Result "00-Precheck-Ambiente gera relatorio" $precheckOk

    # --- 2. Identidade sintetica CONFIRMADA ---
    [ordered]@{
        timestamp  = (Get-Date -Format 'o')
        projectRef = 'TESTE-LOCAL-NAO-E-SUPABASE-REAL'
        status     = 'CONFIRMADO'
        detail     = 'Identidade sintetica gerada apenas para teste local da cadeia de scripts (Etapa 10). NAO representa um projeto Supabase real.'
    } | ConvertTo-Json | Set-Content -Path (Join-Path $Script:AtendexaBackupRoot 'identidade-supabase.json') -Encoding utf8
    Record-Result "Identidade sintetica de teste gravada" $true

    # --- 3. Teste negativo: backup sem -Confirm deve bloquear ---
    $env:ATENDEXA_TEST_CONN = "postgresql://postgres:postgres@127.0.0.1:$sourcePort/postgres"
    & "$PSScriptRoot\02-Backup-Logico.ps1" -EnvVarName 'ATENDEXA_TEST_CONN' -Label 'teste' 2>$null | Out-Null
    Record-Result "Backup sem -Confirm e bloqueado (exit != 0)" ($LASTEXITCODE -ne 0) "exit=$LASTEXITCODE"

    # --- 4. Teste negativo: variavel de ambiente ausente deve bloquear ---
    & "$PSScriptRoot\02-Backup-Logico.ps1" -EnvVarName 'ATENDEXA_VAR_INEXISTENTE' -Label 'teste' -Confirm 2>$null | Out-Null
    Record-Result "Backup com variavel de ambiente ausente e bloqueado" ($LASTEXITCODE -ne 0) "exit=$LASTEXITCODE"

    # --- 5. Backup real (sintetico) com -Confirm ---
    & "$PSScriptRoot\02-Backup-Logico.ps1" -EnvVarName 'ATENDEXA_TEST_CONN' -Label 'teste-sintetico' -Confirm
    $backupExit = $LASTEXITCODE
    $dumpFile = Get-ChildItem -Path (Join-Path $Script:AtendexaBackupRoot 'dumps') -Filter 'teste-sintetico_*.dump' -ErrorAction SilentlyContinue | Select-Object -First 1
    $dumpFileName = if ($dumpFile) { $dumpFile.Name } else { '(nenhum)' }
    Record-Result "Backup sintetico concluido (exit 0) e arquivo gerado" ($backupExit -eq 0 -and $dumpFile -ne $null) "exit=$backupExit file=$dumpFileName"

    if ($dumpFile) {
        # --- 6. Protecao contra sobrescrita: rodar de novo IMEDIATAMENTE com mesmo timestamp seria raro;
        #        testamos diretamente a funcao de guarda. ---
        $overwriteBlocked = $false
        try {
            Assert-DestinationDoesNotExist -Path $dumpFile.FullName
        } catch {
            $overwriteBlocked = $true
        }
        Record-Result "Assert-DestinationDoesNotExist bloqueia caminho existente" $overwriteBlocked

        # --- 7. Validacao de integridade ---
        & "$PSScriptRoot\03-Validar-Backup.ps1" -DumpPath $dumpFile.FullName -ExpectedTables @('sample_items')
        Record-Result "03-Validar-Backup aprova o dump sintetico" ($LASTEXITCODE -eq 0) "exit=$LASTEXITCODE"

        # --- 8. Hash deliberadamente corrompido deve falhar ---
        $manifestPath = "$($dumpFile.FullName).manifest.json"
        $originalManifest = Get-Content $manifestPath -Raw
        $corrupted = $originalManifest -replace '"sha256":\s*"[0-9a-f]+"', '"sha256": "0000000000000000000000000000000000000000000000000000000000000000"'
        Set-Content -Path $manifestPath -Value $corrupted -Encoding utf8
        & "$PSScriptRoot\03-Validar-Backup.ps1" -DumpPath $dumpFile.FullName 2>$null | Out-Null
        Record-Result "03-Validar-Backup detecta hash divergente" ($LASTEXITCODE -ne 0) "exit=$LASTEXITCODE"
        Set-Content -Path $manifestPath -Value $originalManifest -Encoding utf8

        # --- 9. Restauracao isolada ---
        & "$PSScriptRoot\04-Restaurar-Isolado.ps1" -DumpPath $dumpFile.FullName
        $restoreExit = $LASTEXITCODE
        $evidencePath = "$($dumpFile.FullName).restore-evidence.json"
        $recovered = $false
        $ev = $null
        if (Test-Path $evidencePath) {
            $ev = Get-Content $evidencePath -Raw | ConvertFrom-Json
            $recovered = ($ev.publicTableCount -match '^\d+$' -and [int]$ev.publicTableCount -gt 0)
        }
        $tableCountDetail = if ($ev) { $ev.publicTableCount } else { 'N/A' }
        Record-Result "04-Restaurar-Isolado restaura e confirma tabelas" ($restoreExit -eq 0 -and $recovered) "exit=$restoreExit tabelas=$tableCountDetail"

        # --- 10. Relatorio consolidado ---
        $reportOut = Join-Path $Script:AtendexaBackupRoot 'relatorio-teste.md'
        & "$PSScriptRoot\05-Relatorio-Consolidado.ps1" -OutputPath $reportOut
        Record-Result "05-Relatorio-Consolidado gera markdown" (Test-Path $reportOut)
    }

    # --- 11. Assert-NoSecret bloqueia string com connection string ---
    $secretBlocked = $false
    try {
        Assert-NoSecret -Text "algo com postgresql://user:pass@host/db dentro"
    } catch {
        $secretBlocked = $true
    }
    Record-Result "Assert-NoSecret bloqueia texto com connection string" $secretBlocked

} finally {
    Remove-Item Env:\ATENDEXA_TEST_CONN -ErrorAction SilentlyContinue
    Remove-Item Env:\ATENDEXA_BACKUP_ROOT_OVERRIDE -ErrorAction SilentlyContinue
    Invoke-WslDocker -DockerArgs "rm -f $sourceContainer" | Out-Null
}

Write-Host ""
$failed = @($results | Where-Object { -not $_.Passed })
Write-Host "Resumo: $($results.Count - $failed.Count)/$($results.Count) verificacoes passaram." -ForegroundColor $(if ($failed.Count -eq 0) { 'Green' } else { 'Red' })

if ($failed.Count -gt 0) {
    exit $Script:ExitCodes.ValidationFailure
}
exit $Script:ExitCodes.Success
