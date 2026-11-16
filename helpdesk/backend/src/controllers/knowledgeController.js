const prisma = require('../prisma');
const {
  validateAttachmentInput,
  isExecutableName,
  safeResponseMime,
  canInline,
  sanitizeFileName,
} = require('../services/kbFileValidation');
const kbStorage = require('../services/kbStorage');
const {
  ALLOWED_ICONS,
  ALLOWED_TONES,
  slugifyKey,
  ensureDefaults,
  resolveCategoryFields,
} = require('../services/kbCategories');

const ATT_META = { id: true, name: true, mimeType: true, size: true, sha256: true, storagePath: true, createdAt: true };
const CAT_META = { id: true, key: true, label: true, icon: true, tone: true, sortOrder: true, active: true };

function stripAttachmentData(article) {
  if (!article) return article;
  const { attachments, ...rest } = article;
  return {
    ...rest,
    attachments: (attachments || []).map(({ data, ...meta }) => ({
      ...meta,
      hasContent: true,
    })),
  };
}

async function persistAttachments(articleId, rawList = []) {
  const created = [];
  for (const raw of rawList) {
    const validated = validateAttachmentInput(raw);
    let storagePath = null;
    let data = null;

    if (kbStorage.enabled()) {
      storagePath = await kbStorage.upload(articleId, validated.name, validated.buffer, validated.mimeType);
    } else {
      data = validated.buffer.toString('base64');
    }

    const row = await prisma.kbAttachment.create({
      data: {
        articleId,
        name: validated.name,
        mimeType: validated.mimeType,
        size: validated.size,
        sha256: validated.sha256,
        storagePath,
        data,
      },
      select: ATT_META,
    });
    created.push({ ...row, hasContent: true });
  }
  return created;
}

async function loadAttachmentBytes(att) {
  if (att.storagePath) {
    return kbStorage.download(att.storagePath);
  }
  if (att.data) {
    return Buffer.from(att.data, 'base64');
  }
  const err = new Error('Conteúdo do anexo indisponível');
  err.status = 404;
  throw err;
}

function sendAttachment(res, att, buf, { inline }) {
  const executable = isExecutableName(att.name);
  const disposition = (!inline || executable || !canInline(att)) ? 'attachment' : 'inline';
  const mime = disposition === 'attachment'
    ? (executable ? 'application/octet-stream' : (safeResponseMime(att) === 'application/octet-stream' ? 'application/octet-stream' : safeResponseMime(att)))
    : safeResponseMime(att);
  const safeName = sanitizeFileName(att.name);
  res.setHeader('Content-Type', mime);
  res.setHeader('Content-Length', buf.length);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Disposition', `${disposition}; filename="${encodeURIComponent(safeName)}"`);
  if (att.sha256) res.setHeader('X-Content-SHA256', att.sha256);
  res.send(buf);
}

exports.list = async (req, res) => {
  const { category, categoryKey, search } = req.query;
  const where = {};
  if (categoryKey) where.categoryRef = { key: categoryKey };
  else if (category && category !== 'ALL') where.category = category;
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
      attachments: { select: ATT_META },
      categoryRef: { select: CAT_META },
      _count: { select: { attachments: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(articles.map((a) => ({
    ...a,
    attachments: a.attachments.map((att) => ({ ...att, hasContent: true })),
  })));
};

exports.get = async (req, res) => {
  const article = await prisma.kbArticle.findUnique({
    where: { id: req.params.id },
    include: {
      attachments: true,
      categoryRef: { select: CAT_META },
      _count: { select: { attachments: true } },
    },
  });
  if (!article) return res.status(404).json({ error: 'Artigo não encontrado' });
  res.json(stripAttachmentData(article));
};

exports.create = async (req, res) => {
  const { title, content, category, categoryId, tags, attachments = [] } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: 'Título é obrigatório' });
  if (!categoryId && !category) return res.status(400).json({ error: 'Categoria é obrigatória' });

  let validatedNew = [];
  let resolved;
  try {
    validatedNew = (attachments || []).filter((a) => a && a.data);
    validatedNew.forEach(validateAttachmentInput);
    resolved = await resolveCategoryFields({ categoryId, category });
  } catch (err) {
    return res.status(err.status || 400).json({ error: err.message });
  }

  const last = await prisma.kbArticle.findFirst({ orderBy: { code: 'desc' } });
  const code = (last?.code ?? 0) + 1;

  const article = await prisma.kbArticle.create({
    data: {
      code,
      title: title.trim(),
      content: content || '',
      category: resolved.category,
      categoryId: resolved.categoryId,
      tags: tags || null,
    },
  });

  try {
    await persistAttachments(article.id, validatedNew);
  } catch (err) {
    await prisma.kbArticle.delete({ where: { id: article.id } }).catch(() => {});
    return res.status(err.status || 500).json({ error: err.message || 'Falha ao gravar anexos' });
  }

  const full = await prisma.kbArticle.findUnique({
    where: { id: article.id },
    include: {
      attachments: { select: ATT_META },
      categoryRef: { select: CAT_META },
    },
  });
  res.status(201).json(stripAttachmentData(full));
};

exports.update = async (req, res) => {
  const { id } = req.params;
  const { title, content, category, categoryId, tags, active, attachments = [] } = req.body;

  const existing = await prisma.kbArticle.findUnique({
    where: { id },
    include: { attachments: true },
  });
  if (!existing) return res.status(404).json({ error: 'Artigo não encontrado' });

  const keepIds = (attachments || []).filter((a) => a && a.id).map((a) => a.id);
  const newOnes = (attachments || []).filter((a) => a && !a.id && a.data);

  let resolved;
  try {
    newOnes.forEach(validateAttachmentInput);
    if (categoryId !== undefined || category !== undefined) {
      resolved = await resolveCategoryFields({ categoryId, category });
    }
  } catch (err) {
    return res.status(err.status || 400).json({ error: err.message });
  }

  const toDelete = existing.attachments.filter((a) => !keepIds.includes(a.id));
  for (const att of toDelete) {
    if (att.storagePath) await kbStorage.remove(att.storagePath);
  }
  if (toDelete.length > 0) {
    await prisma.kbAttachment.deleteMany({
      where: { articleId: id, id: { in: toDelete.map((a) => a.id) } },
    });
  }

  await prisma.kbArticle.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(content !== undefined && { content }),
      ...(resolved && { category: resolved.category, categoryId: resolved.categoryId }),
      ...(tags !== undefined && { tags: tags || null }),
      ...(active !== undefined && { active }),
    },
  });

  try {
    await persistAttachments(id, newOnes);
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message || 'Falha ao gravar anexos' });
  }

  const full = await prisma.kbArticle.findUnique({
    where: { id },
    include: {
      attachments: { select: ATT_META },
      categoryRef: { select: CAT_META },
    },
  });
  res.json(stripAttachmentData(full));
};

exports.remove = async (req, res) => {
  const article = await prisma.kbArticle.findUnique({
    where: { id: req.params.id },
    include: { attachments: { select: { storagePath: true } } },
  });
  if (!article) return res.status(404).json({ error: 'Artigo não encontrado' });

  for (const att of article.attachments) {
    if (att.storagePath) await kbStorage.remove(att.storagePath);
  }
  await prisma.kbArticle.delete({ where: { id: req.params.id } });
  res.json({ message: 'Artigo excluído com sucesso' });
};

exports.downloadAttachment = async (req, res) => {
  const att = await prisma.kbAttachment.findUnique({ where: { id: req.params.attachmentId } });
  if (!att) return res.status(404).json({ error: 'Anexo não encontrado' });
  try {
    const buf = await loadAttachmentBytes(att);
    const inline = String(req.query.inline || '') === '1' || String(req.query.disposition || '') === 'inline';
    sendAttachment(res, att, buf, { inline });
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message || 'Falha ao baixar anexo' });
  }
};

exports.query = async (req, res) => {
  const { question } = req.body;
  if (!question?.trim()) return res.status(400).json({ error: 'Pergunta é obrigatória' });

  const words = question.split(/\s+/).filter((w) => w.length > 3).slice(0, 8);
  const searchClauses = words.flatMap((w) => [
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
      attachments: { select: ATT_META },
      categoryRef: { select: CAT_META },
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

  res.json({
    answer: aiAnswer,
    sources: articles.map((a) => ({
      ...a,
      attachments: a.attachments.map((att) => ({ ...att, hasContent: true })),
    })),
  });
};

exports.listCategories = async (req, res) => {
  const includeInactive = String(req.query.all || '') === '1';
  try {
    await ensureDefaults();
  } catch (err) {
    // Tabela ainda não migrada: devolve vazio para o frontend usar fallback.
    if (err.code === 'P2021' || /kb_categories|does not exist/i.test(err.message || '')) {
      return res.json([]);
    }
    throw err;
  }
  const rows = await prisma.knowledgeCategory.findMany({
    where: includeInactive ? undefined : { active: true },
    include: { _count: { select: { articles: true } } },
    orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
  });
  res.json(rows);
};

exports.createCategory = async (req, res) => {
  const { label, icon, tone, sortOrder, key: rawKey } = req.body || {};
  if (!label?.trim()) return res.status(400).json({ error: 'Nome da categoria é obrigatório' });
  const key = slugifyKey(rawKey || label);
  if (!key) return res.status(400).json({ error: 'Chave da categoria inválida' });
  if (icon && !ALLOWED_ICONS.has(icon)) return res.status(400).json({ error: 'Ícone não permitido' });
  if (tone && !ALLOWED_TONES.has(tone)) return res.status(400).json({ error: 'Cor não permitida' });

  try {
    const created = await prisma.knowledgeCategory.create({
      data: {
        key,
        label: label.trim(),
        icon: icon || 'layers',
        tone: tone || 'sky',
        sortOrder: Number.isFinite(sortOrder) ? sortOrder : 100,
      },
      include: { _count: { select: { articles: true } } },
    });
    res.status(201).json(created);
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Já existe uma categoria com essa chave' });
    throw err;
  }
};

exports.updateCategory = async (req, res) => {
  const { id } = req.params;
  const { label, icon, tone, sortOrder, active } = req.body || {};
  const existing = await prisma.knowledgeCategory.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'Categoria não encontrada' });
  if (icon && !ALLOWED_ICONS.has(icon)) return res.status(400).json({ error: 'Ícone não permitido' });
  if (tone && !ALLOWED_TONES.has(tone)) return res.status(400).json({ error: 'Cor não permitida' });

  const updated = await prisma.knowledgeCategory.update({
    where: { id },
    data: {
      ...(label !== undefined && { label: String(label).trim() }),
      ...(icon !== undefined && { icon }),
      ...(tone !== undefined && { tone }),
      ...(sortOrder !== undefined && { sortOrder: Number(sortOrder) || 0 }),
      ...(active !== undefined && { active: Boolean(active) }),
    },
    include: { _count: { select: { articles: true } } },
  });
  res.json(updated);
};

exports.removeCategory = async (req, res) => {
  const { id } = req.params;
  const existing = await prisma.knowledgeCategory.findUnique({
    where: { id },
    include: { _count: { select: { articles: true } } },
  });
  if (!existing) return res.status(404).json({ error: 'Categoria não encontrada' });
  if (existing._count.articles > 0) {
    const updated = await prisma.knowledgeCategory.update({
      where: { id },
      data: { active: false },
      include: { _count: { select: { articles: true } } },
    });
    return res.json({
      ...updated,
      message: 'Categoria desativada porque ainda possui conteúdos vinculados',
    });
  }
  await prisma.knowledgeCategory.delete({ where: { id } });
  res.json({ message: 'Categoria excluída' });
};
