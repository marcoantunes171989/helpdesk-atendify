jest.mock('../../prisma', () => ({
  ticket: {
    count: jest.fn().mockResolvedValue(0),
    groupBy: jest.fn().mockResolvedValue([]),
    findMany: jest.fn().mockResolvedValue([]),
  },
  category: { findMany: jest.fn().mockResolvedValue([]) },
}));

const prisma = require('../../prisma');
const ctrl = require('../dashboardController');

function mockRes() {
  return { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
}

describe('dashboardController.stats (main)', () => {
  afterEach(() => jest.clearAllMocks());

  test('consulta contagens sem filtro de dono (visão global, sem RBAC de escopo)', async () => {
    prisma.ticket.count
      .mockResolvedValueOnce(10) // total
      .mockResolvedValueOnce(4)  // open
      .mockResolvedValueOnce(2)  // inProgress
      .mockResolvedValueOnce(3)  // resolved
      .mockResolvedValueOnce(1)  // closed
      .mockResolvedValueOnce(0); // overdueSla

    const req = {};
    const res = mockRes();
    await ctrl.stats(req, res);

    expect(prisma.ticket.count).toHaveBeenNthCalledWith(1, { where: {} });
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      summary: { total: 10, open: 4, inProgress: 2, resolved: 3, closed: 1, overdueSla: 0 },
    }));
  });

  test('monta byCategory combinando groupBy com os nomes das categorias', async () => {
    prisma.ticket.groupBy.mockImplementation(({ by }) => {
      if (by[0] === 'categoryId') {
        return Promise.resolve([{ categoryId: 'c1', _count: 7 }]);
      }
      return Promise.resolve([]);
    });
    prisma.category.findMany.mockResolvedValue([{ id: 'c1', name: 'Rede' }]);

    const res = mockRes();
    await ctrl.stats({}, res);

    const payload = res.json.mock.calls[0][0];
    expect(payload.byCategory).toEqual([{ categoryId: 'c1', _count: 7, name: 'Rede' }]);
  });

  test('categoria sem nome encontrado cai para "Sem categoria"', async () => {
    prisma.ticket.groupBy.mockImplementation(({ by }) => {
      if (by[0] === 'categoryId') {
        return Promise.resolve([{ categoryId: 'c-desconhecida', _count: 1 }]);
      }
      return Promise.resolve([]);
    });
    prisma.category.findMany.mockResolvedValue([]);

    const res = mockRes();
    await ctrl.stats({}, res);

    const payload = res.json.mock.calls[0][0];
    expect(payload.byCategory[0].name).toBe('Sem categoria');
  });
});
