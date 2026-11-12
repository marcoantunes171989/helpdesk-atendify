jest.mock('../../prisma', () => ({
  ticket: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  ticketComment: { create: jest.fn(), deleteMany: jest.fn() },
  ticketStatusRef: { findFirst: jest.fn() },
  category: { findUnique: jest.fn() },
  $transaction: jest.fn(async (cb) => {
    if (typeof cb === 'function') {
      return cb({ ticketComment: { deleteMany: jest.fn() }, ticket: { delete: jest.fn() } });
    }
  }),
}));

const prisma = require('../../prisma');
const ctrl = require('../ticketController');

function mockRes() {
  return { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
}

describe('ticketController — isolamento por proprietário (CLIENT)', () => {
  afterEach(() => jest.clearAllMocks());

  test('list: CLIENT só vê os próprios chamados, mesmo tentando filtrar por outro userId', async () => {
    prisma.ticket.findMany.mockResolvedValue([]);
    const req = { query: { userId: 'outro-usuario' }, user: { id: 'client-1', role: 'CLIENT' } };
    await ctrl.list(req, mockRes());

    const whereArg = prisma.ticket.findMany.mock.calls[0][0].where;
    expect(whereArg.userId).toBe('client-1');
  });

  test('list: AGENT pode ver todos os chamados (sem filtro forçado)', async () => {
    prisma.ticket.findMany.mockResolvedValue([]);
    const req = { query: {}, user: { id: 'agent-1', role: 'AGENT' } };
    await ctrl.list(req, mockRes());

    const whereArg = prisma.ticket.findMany.mock.calls[0][0].where;
    expect(whereArg.userId).toBeUndefined();
  });

  test('get: CLIENT recebe 403 ao tentar ler chamado de outro usuário (IDOR)', async () => {
    prisma.ticket.findUnique.mockResolvedValue({ id: 't1', userId: 'outro-usuario' });
    const req = { params: { id: 't1' }, user: { id: 'client-1', role: 'CLIENT' } };
    const res = mockRes();
    await ctrl.get(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  test('get: CLIENT consegue ler o próprio chamado', async () => {
    prisma.ticket.findUnique.mockResolvedValue({ id: 't1', userId: 'client-1' });
    const req = { params: { id: 't1' }, user: { id: 'client-1', role: 'CLIENT' } };
    const res = mockRes();
    await ctrl.get(req, res);
    expect(res.status).not.toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalled();
  });

  test('update: CLIENT nunca pode editar chamados, mesmo o próprio', async () => {
    const req = { params: { id: 't1' }, body: { title: 'novo' }, user: { id: 'client-1', role: 'CLIENT' } };
    const res = mockRes();
    await ctrl.update(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(prisma.ticket.update).not.toHaveBeenCalled();
  });

  test('remove: CLIENT nunca pode excluir chamados', async () => {
    const req = { params: { id: 't1' }, user: { id: 'client-1', role: 'CLIENT' } };
    const res = mockRes();
    await ctrl.remove(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(prisma.ticket.delete).not.toHaveBeenCalled();
  });

  test('addComment: CLIENT recebe 403 ao comentar em chamado de outro usuário', async () => {
    prisma.ticket.findUnique.mockResolvedValue({ id: 't1', userId: 'outro-usuario', status: 'OPEN' });
    const req = { params: { id: 't1' }, body: { message: 'oi' }, user: { id: 'client-1', role: 'CLIENT' } };
    const res = mockRes();
    await ctrl.addComment(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(prisma.ticketComment.create).not.toHaveBeenCalled();
  });

  test('addComment: CLIENT pode comentar no próprio chamado', async () => {
    prisma.ticket.findUnique.mockResolvedValue({ id: 't1', userId: 'client-1', status: 'OPEN' });
    prisma.ticketComment.create.mockResolvedValue({ id: 'c1' });
    const req = { params: { id: 't1' }, body: { message: 'oi' }, user: { id: 'client-1', role: 'CLIENT' } };
    const res = mockRes();
    await ctrl.addComment(req, res);
    expect(prisma.ticketComment.create).toHaveBeenCalled();
  });
});
