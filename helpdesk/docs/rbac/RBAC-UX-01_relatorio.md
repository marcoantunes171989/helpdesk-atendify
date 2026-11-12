# RBAC-UX-01 — Painel de Controle de Acesso, cadastro de perfis, permissões e organização do menu lateral

> Relatório de desenvolvimento local. **Nenhuma operação de produção foi executada.**
> Nenhum commit foi enviado ao remoto, nenhum merge para `main`, nenhum deploy.

## 1. Estado do Git

- Diretório: `C:\Projetos\Atendexa`. Remote: `origin` → `marcoantunes171989/helpdesk-atendify`.
- Branch no início da sessão: `feat/atendexa-rbac-access-control`, HEAD `1261830` (`chore(ci): prepara pipeline automatizado Atendexa`).
- `origin/main` no início da sessão: `d56a47e` (confirmado via `git fetch`; o SHA de referência `d56a47e...` informado na missão corresponde ao HEAD real de `origin/main`).
- Working tree ao iniciar: alterações não commitadas em `.gitignore`, `helpdesk/docs/CICD.md`, `helpdesk/docs/INFRAESTRUTURA.md` e diretório não rastreado `helpdesk/docs/rbac/` — todas preservadas, nenhuma descartada.
- Worktree adicional detectado: `C:/Projetos/atendexa-cicd-worktree` (HEAD destacado) — não tocado.

## 2. Diagnóstico — RBAC já existente (GATE 02)

Antes de qualquer alteração, o código real foi auditado (não apenas os relatórios anteriores, que tratam de backup/migração, não da UI). Confirmado que a Etapa de construção do RBAC (sessões RBAC-01 a RBAC-06, anteriores a esta) **já entregou e está funcionando**:

### Backend
- `helpdesk/backend/prisma/schema.prisma`: modelos `User` (`role: Role`, `accessGroupId String?`, `tokenVersion Int @default(0)`), `AccessGroup`, `Permission`, `AccessGroupPermission`, `AuditLog`. Migration aditiva já presente em `prisma/migrations/20261110000001_rbac_access_control/` (não aplicada em produção — ver `INFRAESTRUTURA.md` §13, fora do escopo desta tarefa, que não exige nenhuma mudança de schema).
- `src/permissions/catalog.js`: catálogo central com 18 módulos / 69 permissões (`módulo.ação`), mapeamento de compatibilidade `ROLE_DEFAULT_PERMISSIONS` para usuários legados sem grupo.
- `src/permissions/resolve.js`: resolve permissões efetivas — `SUPER_ADMIN` com bypass total, usuário com grupo ativo usa as permissões do grupo, usuário sem grupo (ou com grupo desativado) cai no padrão do seu `Role`.
- `src/middleware/requirePermission.js`: middleware DENY-BY-DEFAULT, consulta o banco a cada chamada (não confia em permissões do JWT), registra `audit_logs` em `access_denied`.
- `src/controllers/accessGroupController.js` + `src/routes/accessGroups.js`: CRUD completo de grupos de acesso, com proteção anti-escalonamento de privilégio (`assertNoEscalation` — um admin não pode conceder permissão que ele mesmo não tem) e bloqueio de exclusão de grupo com usuários vinculados.
- `src/controllers/permissionController.js`: `GET /api/permissions` (catálogo completo, para montar a matriz na UI) e `GET /api/permissions/me` (permissões efetivas do usuário logado, para o frontend decidir o que exibir).

### Frontend
- `src/pages/AccessGroups.jsx`: tela já implementada que **combina cadastro de perfil e matriz de permissões em uma única interface** (um modal com os campos do perfil e a matriz de módulos/ações abaixo) — já atendendo ao requisito do GATE 03 de evitar telas duplicadas.
- `src/contexts/AuthContext.jsx`: carrega permissões efetivas via `/api/permissions/me`, expõe `can(permissionKey)`, com bypass para `SUPER_ADMIN`.
- `src/pages/Users.jsx`: cadastro de usuário já vincula `role` (papel legado) e `accessGroupId` (perfil de acesso) na mesma tela, com proteção contra o próprio usuário se autodegradar (campos desabilitados ao editar o próprio registro, exceto para `SUPER_ADMIN`).
- `src/App.jsx`: roteamento já protegido por `PermissionRoute` (DENY-BY-DEFAULT — bloqueia acesso direto por URL sem a permissão, redireciona para `/app`) e `PrivateRoute` (aguarda `loading` antes de decidir, evitando liberar acesso prematuro).
- `src/test/rbac.test.jsx`: já havia 12 testes de regressão cobrindo menu por permissão, bloqueio de rota direta, bypass de `SUPER_ADMIN`, revogação por desativação de grupo.

**Conclusão do diagnóstico**: a infraestrutura de perfis/permissões pedida nos GATES 03–06 já existe e funciona. Construir uma segunda tela ou um segundo mecanismo de perfis seria exatamente a duplicidade que a missão probe evitar. O trabalho necessário nesta sessão ficou restrito a dois pontos não entregues antes:

1. **Terminologia da interface**: a tela e os textos usavam "Grupo de Acesso", mas a missão pede que a interface use "Perfis de Acesso" / "Permissões por Perfil".
2. **Organização do menu lateral (GATE 07/08)**: o menu era uma lista plana sem agrupamento e com a definição de itens espalhada dentro de `AppLayout.jsx` (sem fonte centralizada).

## 3. Trabalho realizado nesta sessão

### 3.1 Terminologia — "Perfis de Acesso" (GATE 03/04)
Alterado **apenas texto de interface**, sem renomear tabelas, rotas, serviços ou chaves de permissão (`access_groups.*` continua intacto no backend — evita duplicidade e quebra de compatibilidade):
- Menu lateral: "Grupos de Acesso" → "Perfis de Acesso".
- `AccessGroups.jsx`: título da página, botão "Novo Perfil", coluna da tabela, textos do modal de criação/edição e do modal de exclusão.
- `Users.jsx`: o campo de papel legado (`role`) foi relabelado de "Perfil" para "Papel" (desambiguação), e o campo de grupo (`accessGroupId`) passou a se chamar "Perfil de Acesso" — refletindo a distinção real entre as duas entidades (GATE 02: "não confundir role legado com perfil de acesso").

### 3.2 Menu lateral — fonte centralizada e agrupamento (GATE 07/08)
Criado `helpdesk/frontend/src/config/menuConfig.jsx`:
- `MENU_GROUPS`: Painel, Atendimento, Cadastros, Gestão, Administração — grupos derivados das telas reais encontradas no projeto (nenhum grupo ou tela inventada).
- `MENU_ITEMS`: lista única com `key` (rota), `label`, `icon`, `group`, `permission` (chave real do catálogo do backend, ou `null` para os dois itens que sempre foram visíveis a qualquer usuário autenticado — Dashboard e Configurações, comportamento preservado, não ampliado) e `order`.
- `buildMenuItems(can)`: filtra por permissão e agrupa; **grupo sem nenhum item visível não é incluído no resultado** (GATE 07/08 — "Grupo sem nenhum item permitido: Grupo não aparece").
- `flatMenuKeys()`: usado para o cálculo do item selecionado, sem depender da estrutura agrupada.

`AppLayout.jsx` foi refatorado para consumir essa fonte única (`buildMenuItems(can)`), eliminando a lista de 20 verificações `can(...) && {...}` que antes vivia dentro do componente. **Nada mais em `AppLayout.jsx` foi alterado**: a lógica de `collapsed`/`Sider collapsible`/botão de recolher-expandir, o `Drawer` mobile, o header, o menu do usuário e o `Suspense` do conteúdo permanecem exatamente como estavam — por instrução explícita da missão, esse comportamento não foi tocado.

Mapeamento de grupos (a partir dos módulos reais do projeto, sem adicionar nada hipotético):
| Grupo | Itens |
|---|---|
| Painel | Dashboard |
| Atendimento | Chamados, Agenda Técnica, Visitas Técnicas, Base de Conhecimento |
| Cadastros | Empresas, Funcionários, Técnicos, Categorias, Status, Estados, Cidades |
| Gestão | CRM, Implantações, Módulos de Treinamento, Etapas de Treinamento, Treinamentos, Relatórios |
| Administração | Usuários, Perfis de Acesso, Configurações |

### 3.3 Proteção de rotas e APIs (GATE 09)
Nenhuma alteração necessária — já reaproveitado o mecanismo existente:
- `PermissionRoute` em `App.jsx` já bloqueia acesso direto por URL (testado em `rbac.test.jsx`).
- `requirePermission` no backend já é a autoridade real (consulta o banco a cada chamada); a ocultação no menu é só apresentação, como exigido.

### 3.4 Sessões (GATE 10)
Nenhuma alteração necessária — já reaproveitado: `requirePermission` consulta o banco (não o JWT) a cada chamada sensível, então a revogação de um grupo já é refletida na próxima requisição, sem esperar reemissão de token. `tokenVersion` já existe no schema para invalidação de sessão quando necessário. Nenhuma lacuna nova identificada nesta sessão além das já documentadas em sessões RBAC anteriores.

### 3.5 Banco de dados (GATE 11)
**Nenhuma alteração de schema foi necessária.** Esta tarefa é de UI/organização e reaproveita 100% do modelo de dados já existente (`AccessGroup`, `Permission`, `AccessGroupPermission`). Não foi criada nenhuma migration nova, não foi executado nenhum SQL contra Supabase/produção.

## 4. Testes executados

### Backend (Jest)
```
Test Suites: 10 passed, 10 total
Tests:       65 passed, 65 total
```
Executado antes e depois das alterações — nenhuma mudança no backend nesta sessão, usado como baseline de não-regressão.

### Frontend (Vitest)
Baseline antes das alterações: 3 suites, 22 testes, todos passando.

Depois das alterações: 3 suites, **24 testes**, todos passando. Dois testes novos adicionados em `src/test/rbac.test.jsx`:
- `grupo "Gestão" não aparece no menu para usuário sem nenhuma permissão desse grupo` — cobre GATE 08 (grupo vazio ocultado).
- `SUPER_ADMIN vê todos os grupos do menu lateral agrupado` — cobre bypass total do `SUPER_ADMIN` já com o menu agrupado.

O teste pré-existente que verificava o texto `"Grupos de Acesso"` foi atualizado para `"Perfis de Acesso"`, refletindo a renomeação de interface (seção 3.1); seu comportamento validado (ocultação por permissão) não mudou.

### Build
`npm run build` no frontend concluído com sucesso (`vite build`), sem erros de importação ou JSX — confirma que a extração para `menuConfig.jsx` e o consumo em `AppLayout.jsx` compilam corretamente em produção. Avisos de chunk size são pré-existentes (bibliotecas de PDF/Excel), não relacionados a esta mudança.

### Testes negativos cobertos (já existentes, confirmados ainda válidos)
- Usuário sem permissão não vê o item de menu correspondente.
- Usuário sem permissão não consegue acessar a rota direta por URL (redirecionado para `/app`).
- Usuário cujo grupo foi desativado perde acesso a módulos antes visíveis.
- `SUPER_ADMIN` mantém acesso total mesmo sem permissões explícitas carregadas.

## 5. Validação visual/funcional
Validado via build de produção sem erros e suíte de testes de componente (jsdom) cobrindo desktop/mobile (o próprio `rbac.test.jsx` renderiza a árvore completa, incluindo `AppLayout`). Validação manual em navegador real (desktop/tablet/smartphone) **não foi executada nesta sessão** — recomenda-se ao proprietário abrir a branch localmente (`npm run dev` no frontend) para confirmar visualmente o agrupamento antes de qualquer publicação.

## 6. Arquivos alterados

- `helpdesk/frontend/src/config/menuConfig.jsx` (novo) — fonte centralizada do menu.
- `helpdesk/frontend/src/components/AppLayout.jsx` — consome a fonte centralizada; nenhuma mudança na lógica de collapse/expand, header, drawer mobile.
- `helpdesk/frontend/src/pages/AccessGroups.jsx` — textos relabelados para "Perfil de Acesso".
- `helpdesk/frontend/src/pages/Users.jsx` — textos relabelados ("Papel" para `role`, "Perfil de Acesso" para `accessGroupId`).
- `helpdesk/frontend/src/test/rbac.test.jsx` — teste existente atualizado para o novo texto + 2 testes novos de agrupamento do menu.
- `helpdesk/docs/rbac/RBAC-UX-01_relatorio.md` (este arquivo).

Nenhum arquivo de backend foi alterado. Nenhuma migration nova foi criada.

## 7. Riscos residuais e pendências

- Validação visual real em navegador (desktop/tablet/smartphone) ainda não foi feita manualmente — recomendada antes de qualquer PR.
- As pendências de publicação do RBAC em si (identidade do Supabase, backup, seed de permissões em produção, merge para `main`) permanecem exatamente como documentado em `RBAC-09E`/`RBAC-10B`/`RBAC-10C` — este trabalho de UI não altera nem resolve nenhuma delas, e não depende delas para funcionar localmente (usa os mesmos endpoints já existentes).
- Nenhum merge, push ou deploy foi realizado nesta sessão.

## 8. Status final

**PASS_DESENVOLVIMENTO.** Perfis de acesso, matriz de permissões, vínculo com cadastro de usuários, proteção de rotas/APIs e consistência de sessão já existiam e foram confirmados funcionando (65 testes backend + 24 testes frontend, 100% aprovados). O trabalho novo desta sessão — relabeling de interface para "Perfis de Acesso" e reorganização do menu lateral em grupos lógicos com fonte centralizada e ocultação de grupos vazios — foi implementado, testado e buildado localmente, sem nenhuma alteração de banco de dados e sem tocar no comportamento de recolher/expandir do menu lateral.
