jest.mock('../../prisma', () => ({
  accessGroup: { findUnique: jest.fn() },
}));

const prisma = require('../../prisma');
const { resolveEffectivePermissions } = require('../resolve');
const { PERMISSION_KEYS } = require('../catalog');

describe('resolveEffectivePermissions', () => {
  afterEach(() => jest.clearAllMocks());

  test('SUPER_ADMIN sempre tem acesso total (bypass)', async () => {
    const perms = await resolveEffectivePermissions({ role: 'SUPER_ADMIN', accessGroupId: null });
    expect(perms.size).toBe(PERMISSION_KEYS.length);
    expect(perms.has('users.delete')).toBe(true);
  });

  test('usuário com grupo ativo usa permissões do grupo, não do role', async () => {
    prisma.accessGroup.findUnique.mockResolvedValue({
      active: true,
      permissions: [{ permission: { key: 'tickets.read' } }],
    });
    const perms = await resolveEffectivePermissions({ role: 'CLIENT', accessGroupId: 'g1' });
    expect(Array.from(perms)).toEqual(['tickets.read']);
  });

  test('grupo desativado cai para o padrão do role (nunca escala acima)', async () => {
    prisma.accessGroup.findUnique.mockResolvedValue({ active: false, permissions: [] });
    const perms = await resolveEffectivePermissions({ role: 'CLIENT', accessGroupId: 'g1' });
    expect(perms.has('users.delete')).toBe(false);
    expect(perms.has('tickets.read')).toBe(true);
  });

  test('usuário legado sem grupo usa o mapeamento padrão do role (AGENT não gerencia usuários)', async () => {
    const perms = await resolveEffectivePermissions({ role: 'AGENT', accessGroupId: null });
    expect(perms.has('users.delete')).toBe(false);
    expect(perms.has('tickets.create')).toBe(true);
  });

  // RBAC-05: categories/technicians/statuses/states_cities migraram de
  // minRole('ADMIN') para requirePermission no backend. O padrão do AGENT
  // precisa continuar bloqueando escrita nesses módulos (como o minRole
  // bloqueava antes), só a leitura (.read) é liberada por padrão.
  test('AGENT legado lê, mas não cria/edita/exclui cadastros básicos (categorias, técnicos, status, estados/cidades)', async () => {
    const perms = await resolveEffectivePermissions({ role: 'AGENT', accessGroupId: null });
    expect(perms.has('categories.read')).toBe(true);
    expect(perms.has('categories.create')).toBe(false);
    expect(perms.has('categories.update')).toBe(false);
    expect(perms.has('categories.delete')).toBe(false);
    expect(perms.has('technicians.create')).toBe(false);
    expect(perms.has('statuses.update')).toBe(false);
    expect(perms.has('states_cities.delete')).toBe(false);
    expect(perms.has('states_cities.read')).toBe(true);
  });

  test('grupo de acesso personalizado PODE conceder escrita em cadastros básicos a um AGENT', async () => {
    prisma.accessGroup.findUnique.mockResolvedValue({
      active: true,
      permissions: [{ permission: { key: 'categories.create' } }, { permission: { key: 'categories.read' } }],
    });
    const perms = await resolveEffectivePermissions({ role: 'AGENT', accessGroupId: 'g9' });
    expect(perms.has('categories.create')).toBe(true);
  });
});
