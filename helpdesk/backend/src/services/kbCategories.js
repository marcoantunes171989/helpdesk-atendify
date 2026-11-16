const prisma = require('../prisma');

const DEFAULT_CATEGORIES = [
  { key: 'configuracoes', label: 'Configurações', icon: 'settings', tone: 'purple', sortOrder: 10 },
  { key: 'treinamentos', label: 'Treinamentos', icon: 'graduation', tone: 'blue', sortOrder: 20 },
  { key: 'operacao', label: 'Operação do Sistema', icon: 'monitor', tone: 'green', sortOrder: 30 },
  { key: 'equipamentos', label: 'Equipamentos', icon: 'printer', tone: 'orange', sortOrder: 40 },
  { key: 'fiscal', label: 'Fiscal', icon: 'fileText', tone: 'red', sortOrder: 50 },
  { key: 'outros', label: 'Outros', icon: 'layers', tone: 'sky', sortOrder: 60 },
];

const ALLOWED_ICONS = new Set([
  'settings', 'graduation', 'monitor', 'printer', 'fileText', 'layers',
  'bookOpen', 'download', 'link', 'star', 'home', 'folder', 'sparkles',
]);

const ALLOWED_TONES = new Set(['purple', 'blue', 'green', 'orange', 'red', 'sky', 'violet', 'amber', 'indigo', 'slate']);

function slugifyKey(input) {
  return String(input || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
}

function legacyEnumFromKey(key) {
  if (key === 'configuracoes') return 'CONFIGURACAO';
  return 'DUVIDA';
}

function legacyKeyFromEnum(category) {
  if (category === 'CONFIGURACAO') return 'configuracoes';
  return 'outros';
}

async function ensureDefaults() {
  for (const cat of DEFAULT_CATEGORIES) {
    await prisma.knowledgeCategory.upsert({
      where: { key: cat.key },
      create: cat,
      update: {},
    });
  }
}

async function resolveCategoryFields({ categoryId, category }) {
  if (categoryId) {
    const ref = await prisma.knowledgeCategory.findUnique({ where: { id: categoryId } });
    if (!ref) {
      const err = new Error('Categoria não encontrada');
      err.status = 400;
      throw err;
    }
    if (!ref.active) {
      const err = new Error('Categoria inativa');
      err.status = 400;
      throw err;
    }
    return { categoryId: ref.id, category: legacyEnumFromKey(ref.key) };
  }

  if (category) {
    const key = legacyKeyFromEnum(category);
    const ref = await prisma.knowledgeCategory.findUnique({ where: { key } });
    if (ref) return { categoryId: ref.id, category };
    return { categoryId: null, category };
  }

  const outros = await prisma.knowledgeCategory.findUnique({ where: { key: 'outros' } });
  return { categoryId: outros?.id || null, category: 'DUVIDA' };
}

module.exports = {
  DEFAULT_CATEGORIES,
  ALLOWED_ICONS,
  ALLOWED_TONES,
  slugifyKey,
  legacyEnumFromKey,
  legacyKeyFromEnum,
  ensureDefaults,
  resolveCategoryFields,
};
