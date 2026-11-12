jest.mock('../../prisma', () => ({
  user: { findUnique: jest.fn() },
}));
jest.mock('jsonwebtoken');

const jwt = require('jsonwebtoken');
const prisma = require('../../prisma');
const statusCache = require('../../utils/userStatusCache');
const auth = require('../auth');

function mockRes() {
  return { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
}

function mockReq(token = 'valid-token') {
  return { headers: { authorization: token ? `Bearer ${token}` : undefined } };
}

describe('auth middleware — revalidação de status (ETAPA 3)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    statusCache.invalidate('u1');
  });

  test('401 sem header de autorização', async () => {
    const req = mockReq(null);
    const res = mockRes();
    await auth(req, res, () => {});
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('401 com token JWT inválido', async () => {
    jwt.verify.mockImplementation(() => { throw new Error('bad token'); });
    const req = mockReq('garbage');
    const res = mockRes();
    await auth(req, res, () => {});
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('401 quando usuário foi desativado no banco, mesmo com token ainda válido', async () => {
    jwt.verify.mockReturnValue({ id: 'u1', role: 'AGENT', email: 'a@x.com', name: 'A' });
    prisma.user.findUnique.mockResolvedValue({ active: false, role: 'AGENT' });

    const req = mockReq();
    const res = mockRes();
    const next = jest.fn();
    await auth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('usa a role ATUAL do banco, não a role gravada no token (revogação de promoção/demoção)', async () => {
    jwt.verify.mockReturnValue({ id: 'u1', role: 'ADMIN', email: 'a@x.com', name: 'A' });
    prisma.user.findUnique.mockResolvedValue({ active: true, role: 'CLIENT' });

    const req = mockReq();
    const res = mockRes();
    const next = jest.fn();
    await auth(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user.role).toBe('CLIENT');
  });

  test('segunda requisição dentro do TTL não repete a consulta ao banco (cache)', async () => {
    jwt.verify.mockReturnValue({ id: 'u1', role: 'AGENT', email: 'a@x.com', name: 'A' });
    prisma.user.findUnique.mockResolvedValue({ active: true, role: 'AGENT' });

    await auth(mockReq(), mockRes(), jest.fn());
    await auth(mockReq(), mockRes(), jest.fn());

    expect(prisma.user.findUnique).toHaveBeenCalledTimes(1);
  });

  test('503 quando a consulta ao banco falha (indisponibilidade), sem deixar passar a requisição', async () => {
    jwt.verify.mockReturnValue({ id: 'u1', role: 'AGENT', email: 'a@x.com', name: 'A' });
    prisma.user.findUnique.mockRejectedValue(new Error('connection refused'));

    const req = mockReq();
    const res = mockRes();
    const next = jest.fn();
    await auth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(next).not.toHaveBeenCalled();
  });

  test('statusCache.invalidate força nova consulta ao banco na próxima requisição', async () => {
    jwt.verify.mockReturnValue({ id: 'u1', role: 'AGENT', email: 'a@x.com', name: 'A' });
    prisma.user.findUnique.mockResolvedValue({ active: true, role: 'AGENT' });

    await auth(mockReq(), mockRes(), jest.fn());
    statusCache.invalidate('u1');
    prisma.user.findUnique.mockResolvedValue({ active: false, role: 'AGENT' });
    const req = mockReq();
    const res = mockRes();
    await auth(req, res, jest.fn());

    expect(prisma.user.findUnique).toHaveBeenCalledTimes(2);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  // RBAC-03 ETAPA 3: revogação de sessão/token via tokenVersion.
  test('401 quando o tokenVersion do JWT é anterior ao tokenVersion atual do usuário (senha trocada/reset administrativo/desativação revertida)', async () => {
    jwt.verify.mockReturnValue({ id: 'u1', role: 'AGENT', email: 'a@x.com', name: 'A', tokenVersion: 0 });
    prisma.user.findUnique.mockResolvedValue({ active: true, role: 'AGENT', tokenVersion: 1 });

    const req = mockReq();
    const res = mockRes();
    const next = jest.fn();
    await auth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('passa quando o tokenVersion do JWT confere com o do banco', async () => {
    jwt.verify.mockReturnValue({ id: 'u1', role: 'AGENT', email: 'a@x.com', name: 'A', tokenVersion: 2 });
    prisma.user.findUnique.mockResolvedValue({ active: true, role: 'AGENT', tokenVersion: 2 });

    const req = mockReq();
    const res = mockRes();
    const next = jest.fn();
    await auth(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test('token emitido antes do campo tokenVersion existir (undefined) ainda funciona para usuário nunca revogado (tokenVersion=0 implícito)', async () => {
    jwt.verify.mockReturnValue({ id: 'u1', role: 'AGENT', email: 'a@x.com', name: 'A' }); // sem tokenVersion
    prisma.user.findUnique.mockResolvedValue({ active: true, role: 'AGENT', tokenVersion: 0 });

    const req = mockReq();
    const res = mockRes();
    const next = jest.fn();
    await auth(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});
