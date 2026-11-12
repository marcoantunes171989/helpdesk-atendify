jest.mock('../../prisma', () => ({
  user: { findUnique: jest.fn() },
  accessGroup: { findUnique: jest.fn() },
  auditLog: { create: jest.fn().mockResolvedValue({}) },
}));

const prisma = require('../../prisma');
const requirePermission = require('../requirePermission');

function mockRes() {
  return { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
}

describe('requirePermission (deny by default)', () => {
  afterEach(() => jest.clearAllMocks());

  test('401 quando não há req.user', async () => {
    const req = {};
    const res = mockRes();
    await requirePermission('users.read')(req, res, () => {});
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('401 quando usuário está inativo no banco (revogação efetiva)', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', name: 'X', role: 'ADMIN', active: false, accessGroupId: null });
    const req = { user: { id: 'u1' } };
    const res = mockRes();
    await requirePermission('users.read')(req, res, () => {});
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('403 quando o papel não tem a permissão exigida', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u2', name: 'Cliente', role: 'CLIENT', active: true, accessGroupId: null });
    const req = { user: { id: 'u2' } };
    const res = mockRes();
    await requirePermission('users.delete')(req, res, () => {});
    expect(res.status).toHaveBeenCalledWith(403);
    expect(prisma.auditLog.create).toHaveBeenCalled(); // tentativa negada é auditada
  });

  test('chama next() quando a permissão existe', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u3', name: 'Admin', role: 'ADMIN', active: true, accessGroupId: null });
    const req = { user: { id: 'u3' } };
    const res = mockRes();
    const next = jest.fn();
    await requirePermission('users.read')(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});
