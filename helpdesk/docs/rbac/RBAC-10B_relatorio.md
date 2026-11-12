# RBAC-10B — Preparação definitiva do backup e recuperação do Supabase

> Relatório de preparação. **Nenhuma operação remota foi executada.** Nenhum `pg_dump`,
> `pg_restore`, SQL ou conexão foi feita contra o Supabase/Render de produção nesta sessão.
> Nenhum commit, branch, push, merge ou deploy foi realizado.

## 1. Estado do projeto

- Branch: `feat/atendexa-rbac-access-control`. HEAD no início desta sessão: `dceae86`.
- Working tree preservado: alterações não commitadas em `helpdesk/docs/INFRAESTRUTURA.md` e `.gitignore` (desta e de sessões anteriores) mantidas intactas.
- Resultados de teste já validados em sessões anteriores (RBAC-09C/09E) reutilizados sem repetição: Backend Jest 65/65, Frontend Vitest 22/22, PostgreSQL isolado 8/8, catálogo 18 módulos/69 permissões.
- RBAC ainda não publicado em produção (ver plano de fases A–L em `INFRAESTRUTURA.md` §13).

## 2. Ambiente local confirmado (Etapa 1/4)

| Item | Resultado |
|---|---|
| Git | branch/HEAD/working tree confirmados, nada repetido |
| PowerShell | `pwsh` 7.6.9 disponível (via `C:\Program Files\PowerShell\7\pwsh.exe`) |
| Node.js | v24.19.0 |
| `pg_dump`/`pg_restore`/`psql` nativos no Windows | **Ausentes** no PATH |
| WSL | Disponível (Ubuntu 26.04, WSL2) |
| Docker dentro do WSL | **Disponível e operacional** (Docker 29.8.1), com imagens `postgres:15`, `postgres:17` já presentes localmente |
| Caminho viável escolhido | **WSL + Docker** (`docker run postgres:15 pg_dump/pg_restore/psql`) — não é necessário instalar nenhum cliente PostgreSQL nativo no Windows |

Nota de ambiente compartilhado: o daemon Docker do WSL já hospeda containers de **outros projetos** não relacionados ao Atendexa (confirmado via `docker ps`). Todos os scripts preparados usam nomes de container prefixados `atendexa-` e portas aleatórias em `127.0.0.1`, e nunca assumem exclusividade do host Docker.

## 3. Identidade do projeto Supabase (Etapa 2)

**Status: PENDENTE** (depende exclusivamente do proprietário).

Não há conector Supabase autenticado nesta sessão. Foi preparado `01-Verificar-Identidade-Supabase.ps1`, que:
- Pede **apenas** o `Reference ID` (painel Supabase) e o host/usuário da `DATABASE_URL` do Render (painel Render → Environment) — nunca a connection string completa.
- Bloqueia automaticamente (sem registrar nada) se o valor colado parecer uma connection string completa (contém `://`, `password` ou formato `usuario@host:porta`).
- Extrai o `project-ref` de `db.<ref>.supabase.co` (conexão direta) ou `postgres.<ref>` (pooler/Supavisor) e compara com o Reference ID informado.
- Grava `CONFIRMADO` ou `PENDENTE` em `atendexa-backups/identidade-supabase.json` — esse arquivo é o **gate obrigatório** que `02-Backup-Logico.ps1` exige antes de conectar a qualquer lugar.

**Ação necessária do proprietário**: executar este script (ou confirmar manualmente os dois valores) antes de qualquer backup real.

## 4. Inventário de backup / plano Supabase (Etapa 3)

**Status: NÃO presumido.** Não foi assumido que o plano é Free. O proprietário já informou não possuir backup disponível (contexto desta tarefa).

Antes de qualquer execução real, confirmar manualmente no painel Supabase:
1. `Project Settings → Billing` — plano atual (Free/Pro/Team) e se PITR está incluído.
2. `Project Settings → Database → Backups` — existência de backup automático ativo, timestamp da **última execução concluída com sucesso**, período de retenção, e se o **restore** está habilitado (não apenas listado).

Se não houver PITR/backup automático adequado, a recomendação (Etapa 4) é o backup lógico completo abaixo, executado e **validado por restauração isolada** antes de qualquer migração em produção.

## 5. Avaliação técnica do `pg_dump` (Etapa 4)

Decisões tomadas e por quê:

- **Backup lógico via `pg_dump --format=custom`**, não `supabase db dump` — o comando oficial da CLI Supabase pode, dependendo das flags, excluir schemas gerenciados (`auth`, `storage`, `supabase_*`) ou dados; não deve ser presumido como backup completo do projeto sem revisão explícita das flags no momento da execução supervisionada.
- **Distinção explícita**: isto é um backup do **banco PostgreSQL**. Arquivos efetivamente armazenados no **Supabase Storage** (buckets) são um sistema separado e **não** são cobertos por este `pg_dump` — se o Atendexa usa Storage, isso precisa de um procedimento de backup próprio (fora do escopo desta preparação).
- `--no-owner --no-privileges`: evita falhas de restauração por roles/owners que não existem no ambiente isolado de teste (o Supabase usa roles gerenciadas como `supabase_admin` que não existem fora dele).
- Formato `custom` (não `plain`/SQL texto): permite `pg_restore --list` para inventário/validação sem precisar restaurar, e restauração seletiva se necessário.
- **Versão do cliente**: usamos a imagem Docker `postgres:15`, compatível com o Postgres 15 que o Supabase usa por padrão nos projetos atuais; a versão efetiva do servidor de produção deve ser confirmada (`SELECT version();`, leitura) antes da execução real — `pg_dump` de versão igual ou mais nova que o servidor é a prática segura.
- **SSL**: a credencial é decomposta em `PGSSLMODE` (default `prefer`, ou o valor explícito da connection string se houver `?sslmode=...`) — usa SSL automaticamente quando o servidor oferece (sempre o caso no Supabase) sem exigir instalação de certificados adicionais.
- **IPv4/IPv6**: conexão via hostname padrão do Supabase (resolve para IPv4/IPv6 conforme a rede); `--network host` no container Docker garante que a resolução/roteamento usa a pilha de rede real do host WSL, não uma rede isolada do container.
- Sequences, constraints, índices, functions, triggers, views, extensões: todos incluídos por padrão pelo `pg_dump` sem necessidade de flags adicionais (nenhuma delas foi excluída na preparação).
- Roles/privilégios de usuários do Supabase (gerenciados pela plataforma) são **deliberadamente excluídos** (`--no-owner --no-privileges`) — não fazem sentido fora do projeto Supabase original e sua ausência não compromete a restauração do schema/dados aplicacionais.
- Metadados de `auth`/`storage`: fazem parte do schema `public`-adjacente gerenciado pelo Supabase; `pg_dump` sem `--schema` captura **todos** os schemas visíveis ao usuário de conexão, incluindo `auth`/`storage` se o usuário tiver permissão de leitura — isso deve ser confirmado no inventário pós-backup (`pg_restore --list`), não presumido.
- Limitação conhecida: `--no-owner --no-privileges` **não** preserva Row Level Security policies se as roles referenciadas por elas não existirem no destino — a restauração isolada deve confirmar manualmente se RLS é relevante para o Atendexa (não identificado uso de RLS no schema Prisma atual).

## 6. Scripts operacionais preparados (Etapa 5–9)

Todos em `helpdesk/docs/rbac/scripts/backup/` (não commitados nesta sessão — preparação apenas):

| Arquivo | Etapa | Função |
|---|---|---|
| `lib/Common.ps1` | — | Biblioteca compartilhada: logging sem segredos (`Assert-NoSecret`), hash SHA-256, verificação de disco, proteção contra sobrescrita, wrapper Docker/WSL sem exposição de credencial em argv, parser de connection string em variáveis libpq individuais |
| `00-Precheck-Ambiente.ps1` | 1/4 | Detecta caminho viável (nativo ou WSL+Docker); bloqueia se nenhum existir |
| `01-Verificar-Identidade-Supabase.ps1` | 2 | Compara `project-ref` Supabase vs. Render sem tocar na connection string completa |
| `02-Backup-Logico.ps1` | 5 | Executa o backup real (**não chamado contra produção nesta sessão**) — exige `-Confirm`, identidade `CONFIRMADO`, variável de ambiente já definida pelo usuário, protege contra sobrescrita, verifica espaço em disco, timeout, hash, manifesto |
| `03-Validar-Backup.ps1` | 6 | Verifica tamanho, hash vs. manifesto, legibilidade via `pg_restore --list`, inventário de tabelas |
| `04-Restaurar-Isolado.ps1` | 7 | Restaura em container Postgres **descartável**, isolado, porta aleatória em `127.0.0.1`, nunca toca produção; valida contagem de tabelas/FKs/extensões como evidência de recuperabilidade |
| `05-Relatorio-Consolidado.ps1` | 9F | Consolida os JSONs gerados pelos demais scripts em um Markdown, sem conectar a nada |
| `Test-Local-Sintetico.ps1` | 10 | Executa toda a cadeia acima contra um Postgres **sintético local** (Docker), isolado em `atendexa-backups-TESTE-LOCAL/`, sem nenhum dado/credencial real |

### Controles de segurança implementados (e testados — ver Etapa 10)

- **Credencial nunca em argv/log/histórico**: a connection string é decomposta em `PGHOST`/`PGPORT`/`PGUSER`/`PGPASSWORD`/`PGDATABASE`/`PGSSLMODE` (variáveis libpq individuais) e repassada ao container Docker via `docker run -e NOME` (sem valor) + `WSLENV`, nunca escrita em nenhum texto de comando. Descoberta técnica durante os testes: a variável `PGDATABASE` **não** aceita uma URI completa (apenas `--dbname=<uri>` na linha de comando aceita isso) — por isso a decomposição em variáveis individuais é necessária, não apenas preferível, para nunca expor a credencial em argv neste host Docker compartilhado com outros projetos.
- `Assert-NoSecret` bloqueia qualquer tentativa de logar texto que pareça uma connection string/senha.
- Gate de identidade obrigatório: `02-Backup-Logico.ps1` recusa executar sem `identidade-supabase.json` com `status: CONFIRMADO`.
- `-Confirm` explícito obrigatório — sem ele, nada conecta a nada.
- Proteção contra sobrescrita (`Assert-DestinationDoesNotExist`), nome de arquivo com timestamp, verificação de espaço em disco (mínimo configurável), timeout com kill do processo, hash SHA-256 registrado em manifesto, código de saída específico por tipo de falha.
- `.gitignore` atualizado (aditivamente, preservando a alteração já pendente de sessão anterior) para excluir `/atendexa-backups/`, `/atendexa-backups-TESTE-LOCAL/`, `*.dump`, `*.sql.gz`, `*.manifest.json` — nenhum dump ou credencial pode ser commitado por acidente.

## 7. Testes locais executados (Etapa 10)

`Test-Local-Sintetico.ps1` executado nesta sessão contra um Postgres sintético local (dados fictícios `sample_items`, **não** Supabase/Atendexa):

```
Resumo: 13/13 verificacoes passaram.
```

Verificações cobertas: ambiente pronto, dados sintéticos inseridos, precheck gera relatório, identidade sintética gravada, backup **bloqueado** sem `-Confirm`, backup **bloqueado** com variável de ambiente ausente, backup sintético concluído com sucesso, proteção contra sobrescrita, validação de integridade aprova o dump, validação **detecta** hash deliberadamente corrompido, restauração isolada confirma tabelas recuperadas, relatório consolidado gerado, `Assert-NoSecret` bloqueia texto com connection string.

Problemas encontrados e corrigidos durante este teste (documentados para transparência):
1. Cálculo de `RepoRoot` relativo a `$PSScriptRoot` estava incorreto (resolvia 2 níveis acima do esperado) — corrigido para resolver a partir da estrutura real de diretórios.
2. `wsl.exe -l --status` não é uma combinação de flags válida — corrigido para `wsl.exe --status`.
3. Passar comandos com aspas aninhadas via `Start-Process -ArgumentList` para `wsl.exe` corrompia o comando (Windows não preserva aspas internas de forma confiável ao atravessar a fronteira para o WSL) — corrigido escrevendo o comando em um arquivo temporário e executando-o via `wsl.exe bash <arquivo>`.
4. `PGDATABASE` como variável de ambiente **não** aceita URI completa (só `--dbname=<uri>` aceita) — corrigido decompondo a connection string em variáveis libpq individuais (ver seção 6).
5. Container de `pg_dump` isolado por rede Docker padrão não alcançava a porta publicada do container-fonte em `127.0.0.1` — corrigido com `--network host` (também correto e necessário para alcançar o Supabase real pela internet).
6. `sslmode=require` (default inicial) falhava contra um Postgres local sem SSL — ajustado para default `prefer` (usa SSL quando o servidor oferece, como sempre ocorre no Supabase, sem falhar contra bancos sem SSL).
7. Duas ocorrências de acesso a propriedade (`.Count`, `.Name`) em objetos potencialmente `$null` sob `Set-StrictMode` — corrigidas com inicialização defensiva.

Nenhum dado real do Supabase foi usado nesses testes, conforme exigido.

## 8. Proteção de credenciais e dados (Etapa 8)

- Backups ficam em `C:\Projetos\Atendexa\atendexa-backups\` (fora de qualquer pasta rastreada pelo Git de forma relevante, e explicitamente ignorado pelo `.gitignore`).
- Nenhum script aceita a connection string como parâmetro de linha de comando — apenas como variável de ambiente já definida pelo usuário na própria sessão de shell, nunca escrita em arquivo por este processo.
- Recomendação para o proprietário: após um backup real, mover o `.dump` para armazenamento criptografado (ex.: BitLocker, 7-Zip com senha forte, ou cofre de segredos da organização) e restringir permissões de acesso ao arquivo (`icacls` para remover herança e conceder apenas à conta do proprietário). Definir uma data de descarte seguro e só executá-lo com autorização explícita.
- `.gitignore` protege contra commit acidental de `*.dump`, `*.sql.gz` e `*.manifest.json` em qualquer lugar do repositório.

## 9. Plano de restauração isolada (Etapa 7) — pronto para uso real

`04-Restaurar-Isolado.ps1` já validado (seção 7) cria um container Postgres **descartável** (nome único, porta aleatória, apenas `127.0.0.1`), restaura com `pg_restore --clean --if-exists --no-owner --no-privileges`, valida contagem de tabelas/FKs/extensões, grava evidência em JSON, e remove o container ao final (ou mantém com `-KeepContainer` para inspeção manual). **Nenhuma conexão com produção ocorre neste fluxo** — o container é sempre um banco novo e vazio até a restauração.

## 10. Limitações e riscos residuais

- **Supabase Storage** (arquivos, não linhas de banco) não é coberto por este procedimento — precisa de backup próprio se usado pelo Atendexa.
- A versão exata do Postgres de produção no Supabase não foi confirmada nesta sessão (sem conector autenticado); `postgres:15` foi escolhido como suposição razoável e deve ser confirmado/ajustado na execução supervisionada (`SELECT version();`).
- RLS (Row Level Security), se existente em produção e não refletido no schema Prisma auditado, pode exigir atenção extra na restauração — não identificado uso de RLS nas migrations atuais, mas não auditado diretamente no banco de produção.
- O host Docker usado (WSL) é compartilhado com outros projetos não relacionados — mitigado com nomes de container prefixados e portas aleatórias, mas o proprietário deve estar ciente de que não é um ambiente de teste exclusivo do Atendexa.
- Backup lógico via `pg_dump` não é PITR — cobre o estado em um instante, não transações entre backups. Se RTO/RPO exigirem granularidade menor, isso depende do plano Supabase pago com PITR (não confirmado nesta sessão).

## 11. Evidências necessárias do proprietário antes da próxima etapa

1. Executar `01-Verificar-Identidade-Supabase.ps1` (ou confirmar manualmente) → `project-ref` do Supabase coincide com o host/usuário do Render.
2. Confirmar no painel Supabase (`Project Settings → Billing` e `→ Database → Backups`): plano atual, existência e timestamp do último backup/PITR concluído, retenção, disponibilidade de restore.
3. Definir a variável de ambiente com a `DATABASE_URL`/`DIRECT_URL` de produção **apenas na própria sessão de shell do proprietário** (nunca compartilhada com este assistente).
4. Autorização explícita para rodar `02-Backup-Logico.ps1 -Confirm` contra produção (backup real, apenas leitura no Supabase — `pg_dump` não altera dados).
5. Autorização explícita para rodar `04-Restaurar-Isolado.ps1` com o dump real (ambiente local isolado, não afeta produção) para comprovar recuperabilidade antes de qualquer migração.

## 12. Próxima operação segura

Com as evidências da seção 11 em mãos: `00-Precheck-Ambiente.ps1` → `01-Verificar-Identidade-Supabase.ps1` → `02-Backup-Logico.ps1 -Confirm` → `03-Validar-Backup.ps1` → `04-Restaurar-Isolado.ps1` → `05-Relatorio-Consolidado.ps1`. Cada passo já está implementado, testado localmente (seção 7) e com os gates de segurança descritos na seção 6. Nenhuma dessas execuções reais foi feita nesta sessão.

## 13. Status final

**PREPARADO.** Scripts e procedimentos implementados e validados localmente com dados sintéticos (13/13 verificações); nenhuma operação remota foi executada. Não é possível declarar **CERTIFICADO** nesta sessão — isso exige identidade do Supabase confirmada, backup real concluído e recuperação validada com dados de produção, todos pendentes de ação do proprietário (seção 11).
