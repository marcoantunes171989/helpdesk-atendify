jest.mock('../../prisma', () => ({
  kbArticleView: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
  },
  kbArticle: {
    update: jest.fn(),
  },
  $transaction: jest.fn((ops) => Promise.all(ops)),
}));

const prisma = require('../../prisma');
const { recordArticleView, THROTTLE_MS } = require('../kbViews');

describe('kbViews.recordArticleView', () => {
  afterEach(() => jest.clearAllMocks());

  test('incrementa na primeira visualização', async () => {
    prisma.kbArticleView.findUnique.mockResolvedValue(null);
    prisma.kbArticleView.upsert.mockResolvedValue({});
    prisma.kbArticle.update.mockResolvedValue({});
    await expect(recordArticleView('a1', 'u1')).resolves.toBe(true);
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  test('não incrementa dentro do throttle', async () => {
    prisma.kbArticleView.findUnique.mockResolvedValue({
      userId: 'u1',
      articleId: 'a1',
      viewedAt: new Date(),
    });
    await expect(recordArticleView('a1', 'u1')).resolves.toBe(false);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  test('incrementa após o throttle', async () => {
    prisma.kbArticleView.findUnique.mockResolvedValue({
      userId: 'u1',
      articleId: 'a1',
      viewedAt: new Date(Date.now() - THROTTLE_MS - 1000),
    });
    prisma.kbArticleView.upsert.mockResolvedValue({});
    prisma.kbArticle.update.mockResolvedValue({});
    await expect(recordArticleView('a1', 'u1')).resolves.toBe(true);
  });
});
