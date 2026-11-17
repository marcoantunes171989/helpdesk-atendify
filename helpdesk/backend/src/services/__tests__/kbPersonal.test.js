jest.mock('../../prisma', () => ({
  kbFavorite: {
    findMany: jest.fn(),
    upsert: jest.fn(),
    deleteMany: jest.fn(),
  },
  kbHistory: {
    findMany: jest.fn(),
    upsert: jest.fn(),
    deleteMany: jest.fn(),
  },
  kbArticle: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
}));

const prisma = require('../../prisma');
const kbPersonal = require('../kbPersonal');

describe('kbPersonal', () => {
  afterEach(() => jest.clearAllMocks());

  test('addFavorite rejeita artigo inexistente', async () => {
    prisma.kbArticle.findUnique.mockResolvedValue(null);
    await expect(kbPersonal.addFavorite('u1', 'x')).rejects.toMatchObject({ status: 404 });
  });

  test('addFavorite faz upsert e lista ids', async () => {
    prisma.kbArticle.findUnique.mockResolvedValue({ id: 'a1' });
    prisma.kbFavorite.upsert.mockResolvedValue({});
    prisma.kbFavorite.findMany.mockResolvedValue([{ articleId: 'a1' }]);
    await expect(kbPersonal.addFavorite('u1', 'a1')).resolves.toEqual(['a1']);
  });

  test('importLocal ignora ids inexistentes', async () => {
    prisma.kbArticle.findMany.mockResolvedValue([{ id: 'a1' }]);
    prisma.kbFavorite.upsert.mockResolvedValue({});
    prisma.kbHistory.upsert.mockResolvedValue({});
    prisma.kbFavorite.findMany.mockResolvedValue([{ articleId: 'a1' }]);
    prisma.kbHistory.findMany.mockResolvedValue([
      { articleId: 'a1', viewedAt: new Date('2026-11-16T12:00:00Z') },
    ]);
    const out = await kbPersonal.importLocal('u1', {
      favorites: ['a1', 'ghost'],
      history: [{ id: 'a1', at: '2026-11-16T12:00:00Z' }, { id: 'ghost' }],
    });
    expect(out.favorites).toEqual(['a1']);
    expect(out.history[0].id).toBe('a1');
    expect(prisma.kbFavorite.upsert).toHaveBeenCalledTimes(1);
  });
});
