const prisma = require('../prisma');

exports.list = async (req, res) => {
  const { category, search } = req.query;
  const where = {};
  if (category && category !== 'ALL') where.category = category;
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { content: { contains: search, mode: 'insensitive' } },
      { tags: { contains: search, mode: 'insensitive' } },
    ];
  }
  const articles = await prisma.kbArticle.findMany({
    where,
    include: {
      attachments: { select: { id: true, name: true, mimeType: true, size: true } },
      _count: { select: { attachments: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(articles);
};

exports.get = async (req, res) => {
  const article = await prisma.kbArticle.findUnique({
    where: { id: req.params.id },
    include: {
      attachments: true,
      _count: { select: { attachments: true } },
    },
  });
  if (!article) return res.status(404).json({ error: 'Artigo não encontrado' });
  res.json(article);
};

exports.create = async (req, res) => {
  const { title, content, category, tags, attachments = [] } = req.body;
  const last = await prisma.kbArticle.findFirst({ orderBy: { code: 'desc' } });
  const code = (last?.code ?? 0) + 1;
  const article = await prisma.kbArticle.create({
    data: {
      code,
      title,
      content,
      category,
      tags: tags || null,
      ...(attachments.length > 0 && {
        attachments: {
          create: attachments.map(a => ({
            name: a.name,
            mimeType: a.mimeType,
            size: a.size,
            data: a.data,
          })),
        },
      }),
    },
    include: {
      attachments: { select: { id: true, name: true, mimeType: true, size: true } },
    },
  });
  res.status(201).json(article);
};

exports.update = async (req, res) => {
  const { id } = req.params;
  const { title, content, category, tags, active, attachments = [] } = req.body;

  const existingIds = attachments.filter(a => a.id).map(a => a.id);
  const newOnes = attachments.filter(a => !a.id && a.data);

  if (existingIds.length > 0) {
    await prisma.kbAttachment.deleteMany({
      where: { articleId: id, id: { notIn: existingIds } },
    });
  } else {
    await prisma.kbAttachment.deleteMany({ where: { articleId: id } });
  }

  const article = await prisma.kbArticle.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(content !== undefined && { content }),
      ...(category !== undefined && { category }),
      ...(tags !== undefined && { tags: tags || null }),
      ...(active !== undefined && { active }),
      ...(newOnes.length > 0 && {
        attachments: {
          create: newOnes.map(a => ({
            name: a.name,
            mimeType: a.mimeType,
            size: a.size,
            data: a.data,
          })),
        },
      }),
    },
    include: {
      attachments: { select: { id: true, name: true, mimeType: true, size: true } },
    },
  });

  res.json(article);
};

exports.remove = async (req, res) => {
  await prisma.kbArticle.delete({ where: { id: req.params.id } });
  res.json({ message: 'Artigo excluído com sucesso' });
};

exports.query = async (req, res) => {
  const { question } = req.body;
  if (!question?.trim()) return res.status(400).json({ error: 'Pergunta é obrigatória' });

  const words = question.split(/\s+/).filter(w => w.length > 3).slice(0, 8);
  const searchClauses = words.flatMap(w => [
    { title: { contains: w, mode: 'insensitive' } },
    { content: { contains: w, mode: 'insensitive' } },
    { tags: { contains: w, mode: 'insensitive' } },
  ]);

  const articles = await prisma.kbArticle.findMany({
    where: {
      active: true,
      ...(searchClauses.length > 0 && { OR: searchClauses }),
    },
    include: {
      attachments: { select: { id: true, name: true, mimeType: true, size: true } },
    },
    orderBy: { updatedAt: 'desc' },
    take: 5,
  });

  let aiAnswer = null;
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (apiKey) {
    try {
      const context = articles.length > 0
        ? articles.map((a, i) => `[${i + 1}] ${a.title}\n${a.content}`).join('\n\n---\n\n')
        : 'Nenhum artigo encontrado na base de conhecimento.';

      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1024,
          messages: [{
            role: 'user',
            content: `Você é um assistente de suporte técnico do sistema Atendexa (helpdesk).
Responda à pergunta abaixo com base nos artigos da base de conhecimento disponíveis.
Seja objetivo, claro e responda em português do Brasil.
Se as informações não forem suficientes, informe que não encontrou a resposta na base de conhecimento.

BASE DE CONHECIMENTO:
${context}

PERGUNTA: ${question}`,
          }],
        }),
      });

      if (resp.ok) {
        const data = await resp.json();
        aiAnswer = data.content?.[0]?.text ?? null;
      } else {
        console.error('[AI Query] API error:', resp.status, await resp.text());
      }
    } catch (err) {
      console.error('[AI Query Error]', err.message);
    }
  }

  await prisma.kbQuery.create({ data: { question, aiAnswer } });

  res.json({ answer: aiAnswer, sources: articles });
};
