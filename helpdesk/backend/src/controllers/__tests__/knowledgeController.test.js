jest.mock('../../prisma', () => ({
  kbArticle: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  kbAttachment: {
    findUnique: jest.fn(),
    create: jest.fn(),
    deleteMany: jest.fn(),
  },
  knowledgeCategory: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    upsert: jest.fn(),
  },
  kbQuery: { create: jest.fn() },
  kbArticleView: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
  },
  $transaction: jest.fn((ops) => Promise.all(ops)),
}));

jest.mock('../../services/kbStorage', () => ({
  enabled: () => false,
  upload: jest.fn(),
  download: jest.fn(),
  remove: jest.fn(),
}));

jest.mock('../../services/kbViews', () => ({
  recordArticleView: jest.fn().mockResolvedValue(true),
}));

const prisma = require('../../prisma');
const { recordArticleView } = require('../../services/kbViews');
const ctrl = require('../knowledgeController');

function mockRes() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    setHeader: jest.fn(),
    send: jest.fn(),
  };
}

describe('knowledgeController — Etapa A anexos', () => {
  afterEach(() => jest.clearAllMocks());

  test('get não devolve data base64 dos anexos e registra visualização', async () => {
    prisma.kbArticle.findUnique.mockResolvedValue({
      id: 'a1',
      title: 'Manual',
      content: 'x',
      category: 'CONFIGURACAO',
      viewCount: 3,
      attachments: [{
        id: 'f1', name: 'n.pdf', mimeType: 'application/pdf', size: 10,
        data: 'JVBERg==', storagePath: null, sha256: null,
      }],
      _count: { attachments: 1 },
    });
    const res = mockRes();
    await ctrl.get({ params: { id: 'a1' }, user: { id: 'u1' } }, res);
    const body = res.json.mock.calls[0][0];
    expect(body.attachments[0].data).toBeUndefined();
    expect(body.attachments[0].hasContent).toBe(true);
    expect(body.attachments[0].name).toBe('n.pdf');
    expect(recordArticleView).toHaveBeenCalledWith('a1', 'u1');
  });

  test('list com sort=views ordena por viewCount', async () => {
    prisma.kbArticle.findMany.mockResolvedValue([]);
    const res = mockRes();
    await ctrl.list({ query: { sort: 'views' } }, res);
    expect(prisma.kbArticle.findMany).toHaveBeenCalledWith(expect.objectContaining({
      orderBy: [{ viewCount: 'desc' }, { updatedAt: 'desc' }],
    }));
  });

  test('downloadAttachment envia bytes com disposition attachment por padrão', async () => {
    prisma.kbAttachment.findUnique.mockResolvedValue({
      id: 'f1',
      name: 'n.pdf',
      mimeType: 'application/pdf',
      size: 8,
      data: Buffer.from('%PDF-1.4').toString('base64'),
      storagePath: null,
      sha256: 'abc',
    });
    const res = mockRes();
    await ctrl.downloadAttachment({ params: { attachmentId: 'f1' }, query: {} }, res);
    expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', expect.stringContaining('attachment'));
    expect(res.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
    expect(res.send).toHaveBeenCalled();
    const buf = res.send.mock.calls[0][0];
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.slice(0, 4).toString()).toBe('%PDF');
  });

  test('downloadAttachment força octet-stream para executável mesmo com inline', async () => {
    prisma.kbAttachment.findUnique.mockResolvedValue({
      id: 'f2',
      name: 'setup.exe',
      mimeType: 'application/x-msdownload',
      size: 2,
      data: Buffer.from('MZ').toString('base64'),
      storagePath: null,
    });
    const res = mockRes();
    await ctrl.downloadAttachment({ params: { attachmentId: 'f2' }, query: { inline: '1' } }, res);
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/octet-stream');
    expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', expect.stringContaining('attachment'));
  });

  test('create rejeita anexo com extensão inválida', async () => {
    const res = mockRes();
    await ctrl.create({
      body: {
        title: 'X',
        content: 'y',
        category: 'CONFIGURACAO',
        attachments: [{ name: 'x.svg', mimeType: 'image/svg+xml', data: Buffer.from('<svg/>').toString('base64') }],
      },
    }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(prisma.kbArticle.create).not.toHaveBeenCalled();
  });

  test('listCategories devolve categorias com contagem', async () => {
    prisma.knowledgeCategory.upsert.mockResolvedValue({});
    prisma.knowledgeCategory.findMany.mockResolvedValue([
      { id: 'c1', key: 'configuracoes', label: 'Configurações', icon: 'settings', tone: 'purple', sortOrder: 10, active: true, _count: { articles: 2 } },
    ]);
    const res = mockRes();
    await ctrl.listCategories({ query: {} }, res);
    expect(res.json.mock.calls[0][0][0].key).toBe('configuracoes');
  });

  test('createCategory valida nome e cria', async () => {
    prisma.knowledgeCategory.create.mockResolvedValue({
      id: 'c2', key: 'integracoes', label: 'Integrações', icon: 'link', tone: 'blue', sortOrder: 100, active: true, _count: { articles: 0 },
    });
    const res = mockRes();
    await ctrl.createCategory({ body: { label: 'Integrações', icon: 'link', tone: 'blue' } }, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(prisma.knowledgeCategory.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ key: 'integracoes', label: 'Integrações' }),
    }));
  });

  test('removeCategory desativa quando há artigos', async () => {
    prisma.knowledgeCategory.findUnique.mockResolvedValue({
      id: 'c1', key: 'fiscal', label: 'Fiscal', _count: { articles: 3 },
    });
    prisma.knowledgeCategory.update.mockResolvedValue({
      id: 'c1', key: 'fiscal', active: false, _count: { articles: 3 },
    });
    const res = mockRes();
    await ctrl.removeCategory({ params: { id: 'c1' } }, res);
    expect(prisma.knowledgeCategory.delete).not.toHaveBeenCalled();
    expect(prisma.knowledgeCategory.update).toHaveBeenCalledWith(expect.objectContaining({
      data: { active: false },
    }));
  });
});
