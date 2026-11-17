const prisma = require('../prisma');

/** Intervalo mínimo entre contagens do mesmo usuário no mesmo artigo. */
const THROTTLE_MS = 60 * 60 * 1000; // 1 hora

/**
 * Registra visualização e incrementa viewCount no máximo 1x por usuário/hora.
 * Falhas são engolidas para não quebrar a leitura do artigo.
 */
async function recordArticleView(articleId, userId) {
  if (!articleId || !userId) return false;
  try {
    const existing = await prisma.kbArticleView.findUnique({
      where: { userId_articleId: { userId, articleId } },
    });
    const now = Date.now();
    if (existing && now - new Date(existing.viewedAt).getTime() < THROTTLE_MS) {
      return false;
    }

    await prisma.$transaction([
      prisma.kbArticleView.upsert({
        where: { userId_articleId: { userId, articleId } },
        create: { userId, articleId, viewedAt: new Date() },
        update: { viewedAt: new Date() },
      }),
      prisma.kbArticle.update({
        where: { id: articleId },
        data: { viewCount: { increment: 1 } },
      }),
    ]);
    return true;
  } catch (err) {
    console.error('[kbViews.recordArticleView]', err.message);
    return false;
  }
}

module.exports = { recordArticleView, THROTTLE_MS };
