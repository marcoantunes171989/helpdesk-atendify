# RBAC-10C — Certificação da identidade Supabase e preparação supervisionada do backup real

> Relatório de verificação e preparação. **Nenhuma operação remota foi executada.** Nenhum `pg_dump`,
> `pg_restore`, SQL de escrita, conexão a produção, commit, push, merge ou deploy foi feito nesta sessão.

## 1. Estado do Git

- Branch: `feat/atendexa-rbac-access-control` (confirmado, nenhuma mudança de branch).
- Working tree: alterações não commitadas preservadas e reutilizadas, sem nenhum `git add`/`commit`:
  - `M .gitignore`
  - `M helpdesk/docs/INFRAESTRUTURA.md`
  - `?? helpdesk/docs/rbac/` (relatórios RBAC-09E/10B e scripts de backup, já preparados em sessões anteriores)
- HEAD mais recente: `dceae86` (docs: infraestrutura oficial + pendências de auditoria). Nenhum commit novo criado nesta sessão.

## 2. Scripts existentes reutilizados (Etapa 1)

Todos os 8 scripts em `helpdesk/docs/rbac/scripts/backup/` confirmados presentes e íntegros (tamanhos consistentes com `RBAC-10B_relatorio.md`, nenhum arquivo ausente ou truncado):

`lib/Common.ps1`, `00-Precheck-Ambiente.ps1`, `01-Verificar-Identidade-Supabase.ps1`, `02-Backup-Logico.ps1`, `03-Validar-Backup.ps1`, `04-Restaurar-Isolado.ps1`, `05-Relatorio-Consolidado.ps1`, `Test-Local-Sintetico.ps1`.

Nenhuma mudança de conteúdo foi feita neles nesta sessão → **os 13/13 testes locais já aprovados na RBAC-10B não foram repetidos**, conforme instrução de não repetir validação sem necessidade.

## 3. Identidade Supabase/Render (Etapa 2)

**Status: PENDENTE** (inalterado desde RBAC-09A/10B).

Verificado nesta sessão, somente leitura:
- Não há conector Render/MCP disponível neste ambiente — nenhuma ferramenta existe para ler a `DATABASE_URL` efetiva do serviço Render por API. Confirmação só é possível pelo painel (Render → Environment).
- Conector `claude.ai Supabase` está instalado mas **não autenticado** — a ferramenta disponível (`authenticate`) apenas inicia um fluxo OAuth que exigiria ação do proprietário no navegador. Conforme a regra desta tarefa ("não tentar contornar a autenticação" / apresentar somente a ação manual indispensável quando não há integração já autorizada), **esse fluxo não foi iniciado** nesta sessão.
- Conector Vercel (autenticado) foi consultado apenas para reconfirmar que não há dado de Render/Supabase nele — o projeto Vercel é só o frontend; não expõe a `DATABASE_URL` do backend Render nem metadados do Supabase. Nenhuma variável de ambiente foi lida (evita qualquer risco de exposição de segredo).

**Ação manual indispensável para o proprietário** (nenhuma credencial completa deve ser colada em nenhum momento):

1. Painel **Supabase** → `Project Settings → General` → copiar apenas o **Reference ID** (ex.: `abcdefghijklmno`).
2. Painel **Render** → serviço `helpdesk-atendify` → `Environment` → localizar a variável `DATABASE_URL` (ou `DIRECT_URL`) e copiar **apenas o host ou o usuário**, nunca a string completa:
   - Conexão direta: o trecho `db.<ref>.supabase.co`.
   - Pooler/Supavisor: o trecho `postgres.<ref>` (usuário).
3. Comparar visualmente o `<ref>` das duas fontes. Devem ser **idênticos**.
4. Opcional (automatiza o passo 3 sem nunca aceitar a string completa): `pwsh helpdesk/docs/rbac/scripts/backup/01-Verificar-Identidade-Supabase.ps1` — o script recusa e aborta sem registrar nada se o valor colado parecer uma connection string completa.
5. Confirmar explicitamente a correspondência ao assistente (ou aceitar o `CONFIRMADO` gravado pelo script em `atendexa-backups/identidade-supabase.json`) antes de qualquer próxima etapa.

Sem essa confirmação explícita, o status permanece **PENDENTE** — não presumido como correspondente.

## 4. Inventário de backup / plano Supabase (Etapa 3)

**Status: PENDENTE.** Não presumido. O proprietário já informou não possuir backup disponível.

Verificação necessária no painel Supabase (leitura manual, nenhuma API disponível sem o conector autenticado):
- `Project Settings → Billing`: plano atual (Free/Pro/Team) e se PITR está incluído.
- `Project Settings → Database → Backups`: existência de backup automático ativo, timestamp do último backup **concluído com sucesso**, período de retenção, e se o botão de **restore** está realmente habilitado (não apenas listado).

Se nenhuma proteção automática recuperável existir, mantém-se o plano de backup lógico já preparado (seção 5).

## 5. Revisão do backup preparado (Etapa 4)

Reconfirmado — nenhuma mudança em relação à RBAC-10B §5–6. O procedimento `02-Backup-Logico.ps1` já contempla, sem necessidade de nova implementação:

1. Gate de identidade obrigatório (`identidade-supabase.json` com `status: CONFIRMADO`).
2. Banco de origem inequívoco (gate acima) antes de qualquer conexão.
3. `pg_dump --format=custom` via Docker/WSL (`postgres:15`), compatível com Postgres do Supabase — versão do servidor real a confirmar com `SELECT version();` (leitura) na execução supervisionada.
4. Exportação completa de schema + dados (nenhum `--schema`/`--exclude` aplicado).
5. Sequences, functions, triggers, views, extensões incluídos por padrão.
6. `--no-owner --no-privileges` para roles/privilégios geridos pela plataforma Supabase (deliberadamente excluídos — não portáveis).
7. Schemas gerenciados (`auth`, `storage`) capturados se o usuário de conexão tiver permissão de leitura — a confirmar via `pg_restore --list` pós-backup, não presumido.
8. Supabase **Storage** (arquivos em buckets) é explicitamente **fora de escopo** deste `pg_dump` — precisa de backup próprio se usado pelo Atendexa (não identificado uso de Storage no código auditado até agora).
9. Dados exportados protegidos: diretório `atendexa-backups/` fora do Git (`.gitignore` já atualizado, seção 1), recomendação de criptografia pós-backup (BitLocker/7-Zip) documentada.
10. Nome de arquivo com timestamp (`Assert-DestinationDoesNotExist` impede sobrescrita).
11. Proteção contra sobrescrita confirmada (testada na RBAC-10B, não repetida).
12. SHA-256 registrado em manifesto, validado por `03-Validar-Backup.ps1`.
13. Registro de resultados em JSON por etapa + relatório consolidado (`05-Relatorio-Consolidado.ps1`).
14. Código de saída específico por tipo de falha (`$Script:ExitCodes` em `lib/Common.ps1`).
15. Nenhum segredo em argv/log: connection string decomposta em variáveis libpq individuais, nunca escrita em texto de comando (`Assert-NoSecret` bloqueia tentativas).

Nenhum backup real foi executado nesta sessão.

## 6. Restauração de validação (Etapa 5)

Reconfirmado — `04-Restaurar-Isolado.ps1` restaura exclusivamente em container Postgres descartável (nome `atendexa-*`, porta aleatória em `127.0.0.1`), nunca em instância de outro projeto. Já validado com dados sintéticos (RBAC-10B §7); valida contagem de tabelas/FKs/extensões e registra divergências sem mascarar falhas. **Nenhuma restauração com dados de produção foi executada nesta sessão.**

## 7. Fluxo único supervisionado (Etapa 6)

Sequência de gates confirmada e inalterada:

| Gate | Critério | Status atual |
|---|---|---|
| 1 | Identidade do banco comprovada | **PENDENTE** (seção 3) |
| 2 | Autorização explícita para leitura/backup remoto | **PENDENTE** |
| 3 | Backup concluído sem erros | Não iniciado |
| 4 | Integridade do backup verificada | Não iniciado |
| 5 | Restauração isolada concluída | Não iniciado |
| 6 | Recuperabilidade documentada | Não iniciado |

Em qualquer `FAIL`, os scripts interrompem e preservam evidências (comportamento já implementado e testado). Nenhuma progressão automática para migração RBAC está implementada — a Fase B do plano (`INFRAESTRUTURA.md` §13) permanece uma ação manual separada e distinta.

## 8. Autorizações (Etapa 7)

Nenhuma autorização abaixo está implícita nas demais; cada uma exige confirmação explícita e separada do proprietário:

| # | Autorização | Status |
|---|---|---|
| A | Consultar metadados (Supabase/Render, somente leitura) | Parcialmente disponível — sem conector Render; Supabase requer OAuth que o proprietário deve iniciar (`/mcp` → "claude.ai Supabase") |
| B | Executar backup real (`02-Backup-Logico.ps1 -Confirm`) | **Não concedida** |
| C | Restaurar o backup em ambiente isolado (`04-Restaurar-Isolado.ps1`) | **Não concedida** |
| D | Modificar o schema de produção (Fase B do plano RBAC) | **Não concedida** |
| E | Executar seed de permissões em produção (Fase D) | **Não concedida** |
| F | Merge para `main` e deploy (Fase F–L) | **Não concedida** |

## 9. Relatório final

1. **Estado do Git**: branch `feat/atendexa-rbac-access-control`, working tree preservado, nenhum commit criado (seção 1).
2. **Scripts reutilizados**: 8/8 presentes e íntegros, nenhuma repetição dos 13 testes locais (seção 2).
3. **Identidade Supabase**: **PENDENTE** — sem conector autenticado e sem Render MCP; ação manual descrita na seção 3.
4. **Plano Supabase**: **PENDENTE** — não presumido; verificação manual necessária (seção 4).
5. **Escopo do backup**: banco PostgreSQL completo (schema+dados, todas as extensões/schemas legíveis); **exclui** Supabase Storage (seção 5).
6. **Limitações relevantes**: sem conector Render; `pg_dump` não é PITR; versão real do servidor Supabase não confirmada; RLS não identificado no schema Prisma mas não auditado diretamente no banco de produção; host Docker (WSL) compartilhado com outros projetos (mitigado por nomes/portas isoladas).
7. **Plano de recuperação**: `04-Restaurar-Isolado.ps1` em container descartável, já validado com dados sintéticos; execução com dados reais pendente de autorização (gate C, seção 8).
8. **Riscos de exposição de dados**: nenhum segredo foi solicitado, exibido ou persistido nesta sessão; scripts decompõem a connection string em variáveis libpq e bloqueiam qualquer log que pareça credencial (`Assert-NoSecret`).
9. **Pré-requisitos para execução real**: identidade confirmada (gate 1) + autorizações B e C (seção 8) + confirmação manual de plano/backup Supabase (seção 4).
10. **Comandos necessários** (sem credenciais, a executar pelo proprietário na própria sessão de shell, após autorização):
    ```
    pwsh helpdesk/docs/rbac/scripts/backup/00-Precheck-Ambiente.ps1
    pwsh helpdesk/docs/rbac/scripts/backup/01-Verificar-Identidade-Supabase.ps1
    pwsh helpdesk/docs/rbac/scripts/backup/02-Backup-Logico.ps1 -Confirm
    pwsh helpdesk/docs/rbac/scripts/backup/03-Validar-Backup.ps1
    pwsh helpdesk/docs/rbac/scripts/backup/04-Restaurar-Isolado.ps1
    pwsh helpdesk/docs/rbac/scripts/backup/05-Relatorio-Consolidado.ps1
    ```
11. **Autorizações ainda necessárias**: A (concluir), B, C no mínimo antes de qualquer execução real; D–F permanecem fora de escopo desta preparação.
12. **Próxima operação segura**: proprietário confirma identidade (seção 3, passo 5) e checa painel Supabase (seção 4) — nenhuma automação pode avançar sem isso.
13. **Status final**: **PENDENTE.** Não é possível declarar **CERTIFICADO** — identidade do Supabase não confirmada e nenhum backup real/restauração com dados de produção foi executado ou comprovado nesta sessão.
