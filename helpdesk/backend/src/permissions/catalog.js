// Fonte central de permissões do Atendexa.
// Qualquer tela/ação nova de autorização deve nascer aqui — backend e frontend
// consomem esta mesma lista (frontend via GET /api/permissions).
// Identificadores (key) são estáveis: módulo.ação. Nunca usar o label como chave.

const ACTIONS = {
  READ: 'read',
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  EXPORT: 'export',
  MANAGE: 'manage', // ações administrativas específicas do módulo (ex.: reset de senha, mudança de status)
};

// module -> { label, actions: [ACTIONS...] }
const MODULES = {
  dashboard:        { label: 'Dashboard',              actions: [ACTIONS.READ] },
  companies:        { label: 'Empresas',               actions: [ACTIONS.READ, ACTIONS.CREATE, ACTIONS.UPDATE, ACTIONS.DELETE, ACTIONS.EXPORT] },
  users:            { label: 'Usuários',                actions: [ACTIONS.READ, ACTIONS.CREATE, ACTIONS.UPDATE, ACTIONS.DELETE, ACTIONS.MANAGE] },
  access_groups:    { label: 'Grupos de Acesso',        actions: [ACTIONS.READ, ACTIONS.CREATE, ACTIONS.UPDATE, ACTIONS.DELETE] },
  categories:       { label: 'Categorias',              actions: [ACTIONS.READ, ACTIONS.CREATE, ACTIONS.UPDATE, ACTIONS.DELETE] },
  tickets:          { label: 'Chamados',                actions: [ACTIONS.READ, ACTIONS.CREATE, ACTIONS.UPDATE, ACTIONS.DELETE, ACTIONS.EXPORT, ACTIONS.MANAGE] },
  employees:        { label: 'Colaboradores',           actions: [ACTIONS.READ, ACTIONS.CREATE, ACTIONS.UPDATE, ACTIONS.DELETE] },
  technicians:      { label: 'Técnicos',                actions: [ACTIONS.READ, ACTIONS.CREATE, ACTIONS.UPDATE, ACTIONS.DELETE] },
  statuses:         { label: 'Status',                  actions: [ACTIONS.READ, ACTIONS.CREATE, ACTIONS.UPDATE, ACTIONS.DELETE] },
  states_cities:    { label: 'Estados e Cidades',        actions: [ACTIONS.READ, ACTIONS.CREATE, ACTIONS.UPDATE, ACTIONS.DELETE] },
  knowledge:        { label: 'Base de Conhecimento',     actions: [ACTIONS.READ, ACTIONS.CREATE, ACTIONS.UPDATE, ACTIONS.DELETE] },
  reports:          { label: 'Relatórios',               actions: [ACTIONS.READ, ACTIONS.EXPORT] },
  crm:              { label: 'CRM',                      actions: [ACTIONS.READ, ACTIONS.CREATE, ACTIONS.UPDATE, ACTIONS.DELETE] },
  implantacoes:     { label: 'Implantações',             actions: [ACTIONS.READ, ACTIONS.CREATE, ACTIONS.UPDATE, ACTIONS.DELETE] },
  treinamentos:     { label: 'Treinamentos',             actions: [ACTIONS.READ, ACTIONS.CREATE, ACTIONS.UPDATE, ACTIONS.DELETE] },
  visitas:          { label: 'Visitas',                  actions: [ACTIONS.READ, ACTIONS.CREATE, ACTIONS.UPDATE, ACTIONS.DELETE] },
  agenda_tecnica:   { label: 'Agenda Técnica',            actions: [ACTIONS.READ, ACTIONS.CREATE, ACTIONS.UPDATE, ACTIONS.DELETE] },
  settings:         { label: 'Configurações',             actions: [ACTIONS.READ, ACTIONS.UPDATE] },
};

function buildPermissionList() {
  const list = [];
  for (const [moduleKey, { label, actions }] of Object.entries(MODULES)) {
    for (const action of actions) {
      list.push({
        key: `${moduleKey}.${action}`,
        module: moduleKey,
        moduleLabel: label,
        action,
        description: `${label} — ${action}`,
      });
    }
  }
  return list;
}

const PERMISSIONS = buildPermissionList();
const PERMISSION_KEYS = PERMISSIONS.map(p => p.key);

// Mapeamento de compatibilidade: usuários legados sem accessGroupId continuam
// com o comportamento atual baseado em Role, sem perder acesso que já tinham.
// SUPER_ADMIN é tratado separadamente (bypass total) no middleware.
const ROLE_DEFAULT_PERMISSIONS = {
  ADMIN: PERMISSION_KEYS, // Admin legado mantém acesso total, igual ao comportamento anterior
  AGENT: PERMISSION_KEYS.filter(k =>
    !k.startsWith('users.') &&
    !k.startsWith('access_groups.') &&
    // Cadastro de empresas (criar/editar/excluir) é restrito a ADMIN/SUPER_ADMIN
    // no backend (ver routes/companies.js) — o catálogo precisa refletir essa
    // mesma regra para que um grupo de acesso não pareça conceder mais do
    // que o endpoint efetivamente permite (ETAPA 4 do RBAC-03).
    !k.startsWith('companies.create') &&
    !k.startsWith('companies.update') &&
    !k.startsWith('companies.delete') &&
    // Cadastros básicos (categorias, técnicos, status, estados/cidades) eram
    // restritos a ADMIN/SUPER_ADMIN via minRole('ADMIN') no backend antes do
    // RBAC-05. Migrar essas rotas para requirePermission não deve, por si só,
    // ampliar o que o AGENT legado já podia fazer — write continua restrito;
    // a leitura (.read) permanece liberada, como já era (rotas GET sem gate).
    !k.startsWith('categories.create') &&
    !k.startsWith('categories.update') &&
    !k.startsWith('categories.delete') &&
    !k.startsWith('technicians.create') &&
    !k.startsWith('technicians.update') &&
    !k.startsWith('technicians.delete') &&
    !k.startsWith('statuses.create') &&
    !k.startsWith('statuses.update') &&
    !k.startsWith('statuses.delete') &&
    !k.startsWith('states_cities.create') &&
    !k.startsWith('states_cities.update') &&
    !k.startsWith('states_cities.delete') &&
    !k.startsWith('settings.')
  ),
  CLIENT: [
    'dashboard.read',
    'tickets.read', 'tickets.create',
    'knowledge.read',
  ],
};

module.exports = { ACTIONS, MODULES, PERMISSIONS, PERMISSION_KEYS, ROLE_DEFAULT_PERMISSIONS };
