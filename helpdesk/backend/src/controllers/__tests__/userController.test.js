jest.mock('../../prisma', () => ({
  user: { findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), count: jest.fn(), delete: jest.fn() },
  accessGroup: { findUnique: jest.fn() },
  ticket: { count: jest.fn(), updateMany: jest.fn() },
  ticketComment: { count: jest.fn() },
  auditLog: { create: jest.fn().mockResolvedValue({}) },
  $transaction: jest.fn((ops) => Promise.all(ops)),
}));
jest.mock('bcryptjs', () => ({ hash: jest.fn().mockResolvedValue('hashed') }));

const prisma = require('../../prisma');
const ctrl = require('../userController');

function mockRes() {
  return { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
}

describe('userController — proteção contra escalonamento de privilégios (ETAPA 4)', () => {
  afterEach(() => jest.clearAllMocks());

  test('create: ADMIN não pode criar um usuário SUPER_ADMIN', async () => {
    const req = {
      body: { name: 'X', email: 'x@x.com', password: '123456', role: 'SUPER_ADMIN' },
      dbUser: { id: 'admin-1', role: 'ADMIN' },
      permissions: new Set(),
    };
    const res = mockRes();
    await ctrl.create(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  test('create: ADMIN pode criar um usuário AGENT normalmente', async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({ id: 'u1', role: 'AGENT' });
    const req = {
      body: { name: 'X', email: 'x@x.com', password: '123456', role: 'AGENT' },
      dbUser: { id: 'admin-1', name: 'Admin', role: 'ADMIN' },
      permissions: new Set(),
    };
    const res = mockRes();
    await ctrl.create(req, res);
    expect(prisma.user.create).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test('create: SUPER_ADMIN pode criar outro SUPER_ADMIN', async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({ id: 'u1', role: 'SUPER_ADMIN' });
    const req = {
      body: { name: 'X', email: 'x@x.com', password: '123456', role: 'SUPER_ADMIN' },
      dbUser: { id: 'root', name: 'Root', role: 'SUPER_ADMIN' },
      permissions: new Set(),
    };
    const res = mockRes();
    await ctrl.create(req, res);
    expect(prisma.user.create).toHaveBeenCalled();
  });

  test('update: ADMIN não pode promover um usuário a SUPER_ADMIN', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', role: 'AGENT', active: true });
    const req = {
      params: { id: 'u1' },
      body: { role: 'SUPER_ADMIN' },
      dbUser: { id: 'admin-1', role: 'ADMIN' },
      permissions: new Set(),
    };
    const res = mockRes();
    await ctrl.update(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  test('update: ADMIN não pode atribuir um grupo de acesso com permissões que não possui', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', role: 'AGENT', active: true });
    prisma.accessGroup.findUnique
      .mockResolvedValueOnce({ id: 'g1' }) // assertAccessGroupExists
      .mockResolvedValueOnce({
        id: 'g1',
        permissions: [{ permission: { key: 'users.delete' } }],
      }); // groupExceedsActorPermissions
    const req = {
      params: { id: 'u1' },
      body: { accessGroupId: 'g1' },
      dbUser: { id: 'admin-1', role: 'ADMIN' },
      permissions: new Set(['users.read', 'users.update']), // sem users.delete
    };
    const res = mockRes();
    await ctrl.update(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  test('update: SUPER_ADMIN pode atribuir qualquer grupo de acesso, sem checagem de escalonamento', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', role: 'AGENT', active: true });
    prisma.accessGroup.findUnique.mockResolvedValueOnce({ id: 'g1' }); // só assertAccessGroupExists é chamado
    prisma.user.update.mockResolvedValue({ id: 'u1' });
    const req = {
      params: { id: 'u1' },
      body: { accessGroupId: 'g1' },
      dbUser: { id: 'root', role: 'SUPER_ADMIN' },
      permissions: new Set(),
    };
    const res = mockRes();
    await ctrl.update(req, res);
    expect(prisma.user.update).toHaveBeenCalled();
  });
});
