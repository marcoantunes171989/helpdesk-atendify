jest.mock('../../prisma', () => ({
  accessGroup: { findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
  permission: { findUnique: jest.fn(), findMany: jest.fn() },
  user: { count: jest.fn() },
  auditLog: { create: jest.fn().mockResolvedValue({}) },
}));

const prisma = require('../../prisma');
const ctrl = require('../accessGroupController');

function mockRes() {
  return { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
}

describe('accessGroupController — vedar concessão de permissões que o ator não possui (ETAPA 4.1)', () => {
  afterEach(() => jest.clearAllMocks());

  test('create: ADMIN restrito não pode criar grupo com permissão que ele mesmo não tem', async () => {
    prisma.accessGroup.findFirst.mockResolvedValue(null);
    const req = {
      body: { name: 'Grupo X', permissions: ['users.delete'] },
      dbUser: { id: 'admin-1', role: 'ADMIN' },
      permissions: new Set(['users.read']),
    };
    const res = mockRes();
    await ctrl.create(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(prisma.accessGroup.create).not.toHaveBeenCalled();
  });

  test('create: ator pode criar grupo com permissões que ele possui', async () => {
    prisma.accessGroup.findFirst.mockResolvedValue(null);
    prisma.permission.findUnique.mockResolvedValue({ id: 'p1' });
    prisma.accessGroup.create.mockResolvedValue({ id: 'g1', permissions: [] });
    const req = {
      body: { name: 'Grupo X', permissions: ['users.read'] },
      dbUser: { id: 'admin-1', role: 'ADMIN' },
      permissions: new Set(['users.read']),
    };
    const res = mockRes();
    await ctrl.create(req, res);
    expect(prisma.accessGroup.create).toHaveBeenCalled();
  });

  test('create: SUPER_ADMIN não sofre a checagem de escalonamento', async () => {
    prisma.accessGroup.findFirst.mockResolvedValue(null);
    prisma.permission.findUnique.mockResolvedValue({ id: 'p1' });
    prisma.accessGroup.create.mockResolvedValue({ id: 'g1', permissions: [] });
    const req = {
      body: { name: 'Grupo X', permissions: ['users.delete', 'access_groups.delete'] },
      dbUser: { id: 'root', role: 'SUPER_ADMIN' },
      permissions: new Set(), // nem precisa ter as permissões no set
    };
    const res = mockRes();
    await ctrl.create(req, res);
    expect(prisma.accessGroup.create).toHaveBeenCalled();
  });

  test('update: ADMIN restrito não pode adicionar permissão que não possui a um grupo existente', async () => {
    prisma.accessGroup.findUnique.mockResolvedValue({ id: 'g1', name: 'Grupo X' });
    const req = {
      params: { id: 'g1' },
      body: { permissions: ['access_groups.delete'] },
      dbUser: { id: 'admin-1', role: 'ADMIN' },
      permissions: new Set(['access_groups.read']),
    };
    const res = mockRes();
    await ctrl.update(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(prisma.accessGroup.update).not.toHaveBeenCalled();
  });
});
