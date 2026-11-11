jest.mock('../../prisma', () => ({
  ticket: {
    count: jest.fn().mockResolvedValue(0),
    findMany: jest.fn().mockResolvedValue([]),
    groupBy: jest.fn().mockResolvedValue([]),
    aggregate: jest.fn().mockResolvedValue({ _avg: { satisfaction: null }, _count: { satisfaction: 0 } }),
  },
  category: { findMany: jest.fn().mockResolvedValue([]) },
  ticketStatusRef: { findMany: jest.fn().mockResolvedValue([]) },
  user: { count: jest.fn().mockResolvedValue(5), findMany: jest.fn().mockResolvedValue([]) },
}));

const prisma = require('../../prisma');
const ctrl = require('../dashboardController');

function mockRes() {
  return { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
}

describe('dashboardController — isolamento de dados por role (ETAPA 2 do RBAC-03)', () => {
  afterEach(() => jest.clearAllMocks());

  test('stats: CLIENT só vê os próprios chamados (where.userId)', async () => {
    const req = { query: {}, dbUser: { id: 'client-1', role: 'CLIENT' } };
    await ctrl.stats(req, mockRes());

    for (const call of prisma.ticket.count.mock.calls) {
      expect(call[0].where.userId).toBe('client-1');
    }
  });

  test('stats: ADMIN vê todos os chamados (sem filtro de userId)', async () => {
    const req = { query: {}, dbUser: { id: 'admin-1', role: 'ADMIN' } };
    await ctrl.stats(req, mockRes());

    for (const call of prisma.ticket.count.mock.calls) {
      expect(call[0].where.userId).toBeUndefined();
    }
  });

  test('kpis: CLIENT não recebe a contagem de agentes online (métrica interna da equipe)', async () => {
    const req = { query: {}, dbUser: { id: 'client-1', role: 'CLIENT' } };
    const res = mockRes();
    await ctrl.kpis(req, res);

    expect(prisma.user.count).not.toHaveBeenCalled();
    const payload = res.json.mock.calls[0][0];
    expect(payload.kpis.agentes_online.value).toBeNull();
    expect(payload.kpis.agentes_online.restricted).toBe(true);
  });

  test('kpis: ADMIN recebe a contagem de agentes online', async () => {
    const req = { query: {}, dbUser: { id: 'admin-1', role: 'ADMIN' } };
    const res = mockRes();
    await ctrl.kpis(req, res);

    expect(prisma.user.count).toHaveBeenCalled();
    const payload = res.json.mock.calls[0][0];
    expect(payload.kpis.agentes_online.value).toBe(5);
  });

  test('agents: CLIENT recebe lista vazia e marcada como restrita, sem consultar o desempenho de outros usuários', async () => {
    const req = { query: {}, dbUser: { id: 'client-1', role: 'CLIENT' } };
    const res = mockRes();
    await ctrl.agents(req, res);

    expect(prisma.user.findMany).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ agents: [], restricted: true });
  });

  test('agents: AGENT/ADMIN continuam recebendo o relatório de desempenho da equipe', async () => {
    const req = { query: {}, dbUser: { id: 'agent-1', role: 'AGENT' } };
    await ctrl.agents(req, mockRes());

    expect(prisma.user.findMany).toHaveBeenCalled();
  });

  test('queue: CLIENT só vê os próprios chamados na fila em tempo real', async () => {
    const req = { query: {}, dbUser: { id: 'client-1', role: 'CLIENT' } };
    await ctrl.queue(req, mockRes());

    const call = prisma.ticket.findMany.mock.calls[0][0];
    expect(call.where.userId).toBe('client-1');
  });
});
