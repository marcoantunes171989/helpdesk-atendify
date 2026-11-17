const prisma = require('../prisma');

const HISTORY_LIMIT = 30;

async function listFavoriteIds(userId) {
  const rows = await prisma.kbFavorite.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: { articleId: true },
  });
  return rows.map((r) => r.articleId);
}

async function listHistory(userId) {
  const rows = await prisma.kbHistory.findMany({
    where: { userId },
    orderBy: { viewedAt: 'desc' },
    take: HISTORY_LIMIT,
    select: { articleId: true, viewedAt: true },
  });
  return rows.map((r) => ({ id: r.articleId, at: r.viewedAt.toISOString() }));
}

async function addFavorite(userId, articleId) {
  const article = await prisma.kbArticle.findUnique({ where: { id: articleId }, select: { id: true } });
  if (!article) {
    const err = new Error('Artigo não encontrado');
    err.status = 404;
    throw err;
  }
  await prisma.kbFavorite.upsert({
    where: { userId_articleId: { userId, articleId } },
    create: { userId, articleId },
    update: {},
  });
  return listFavoriteIds(userId);
}

async function removeFavorite(userId, articleId) {
  await prisma.kbFavorite.deleteMany({ where: { userId, articleId } });
  return listFavoriteIds(userId);
}

async function recordHistory(userId, articleId) {
  if (!userId || !articleId) return;
  try {
    await prisma.kbHistory.upsert({
      where: { userId_articleId: { userId, articleId } },
      create: { userId, articleId, viewedAt: new Date() },
      update: { viewedAt: new Date() },
    });
    // Mantém no máximo HISTORY_LIMIT entradas por usuário.
    const overflow = await prisma.kbHistory.findMany({
      where: { userId },
      orderBy: { viewedAt: 'desc' },
      skip: HISTORY_LIMIT,
      select: { articleId: true },
    });
    if (overflow.length > 0) {
      await prisma.kbHistory.deleteMany({
        where: { userId, articleId: { in: overflow.map((r) => r.articleId) } },
      });
    }
  } catch (err) {
    console.error('[kbPersonal.recordHistory]', err.message);
  }
}

async function clearHistory(userId) {
  await prisma.kbHistory.deleteMany({ where: { userId } });
  return [];
}

/**
 * Importa favoritos/histórico do localStorage uma vez.
 * Não remove o que já existe no servidor; só adiciona/atualiza.
 */
async function importLocal(userId, { favorites = [], history = [] } = {}) {
  const favIds = [...new Set((favorites || []).filter((id) => typeof id === 'string' && id))];
  const histItems = (history || [])
    .filter((h) => h && typeof h.id === 'string')
    .slice(0, HISTORY_LIMIT);

  if (favIds.length > 0) {
    const existing = await prisma.kbArticle.findMany({
      where: { id: { in: favIds } },
      select: { id: true },
    });
    const ok = new Set(existing.map((a) => a.id));
    await Promise.all(favIds.filter((id) => ok.has(id)).map((articleId) => prisma.kbFavorite.upsert({
      where: { userId_articleId: { userId, articleId } },
      create: { userId, articleId },
      update: {},
    })));
  }

  if (histItems.length > 0) {
    const ids = histItems.map((h) => h.id);
    const existing = await prisma.kbArticle.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });
    const ok = new Set(existing.map((a) => a.id));
    for (const item of histItems) {
      if (!ok.has(item.id)) continue;
      const viewedAt = item.at ? new Date(item.at) : new Date();
      await prisma.kbHistory.upsert({
        where: { userId_articleId: { userId, articleId: item.id } },
        create: { userId, articleId: item.id, viewedAt: Number.isNaN(viewedAt.getTime()) ? new Date() : viewedAt },
        update: {
          viewedAt: Number.isNaN(viewedAt.getTime()) ? new Date() : viewedAt,
        },
      });
    }
  }

  return {
    favorites: await listFavoriteIds(userId),
    history: await listHistory(userId),
  };
}

module.exports = {
  HISTORY_LIMIT,
  listFavoriteIds,
  listHistory,
  addFavorite,
  removeFavorite,
  recordHistory,
  clearHistory,
  importLocal,
};
