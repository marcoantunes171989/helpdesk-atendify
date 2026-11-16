// Cores da Paleta Atendexa (hex literais — usadas em antd <Tag color="...">)
export const ROLES = {
  SUPER_ADMIN: { label: 'Super Admin', color: '#8b5cf6' },
  ADMIN: { label: 'Administrador', color: '#2563eb' },
  AGENT: { label: 'Agente', color: '#06b6d4' },
  CLIENT: { label: 'Cliente', color: '#10b981' },
};

export const TICKET_STATUS = {
  OPEN: { label: 'Aberto', color: '#2563eb' },
  IN_PROGRESS: { label: 'Em Andamento', color: '#8b5cf6' },
  RESOLVED: { label: 'Resolvido', color: '#10b981' },
  CLOSED: { label: 'Fechado', color: 'default' },
  CANCELLED: { label: 'Cancelado', color: '#ef4444' },
};

export const PRIORITY = {
  LOW: { label: 'Baixa', color: 'default' },
  MEDIUM: { label: 'Média', color: '#38bdf8' },
  HIGH: { label: 'Alta', color: '#f59e0b' },
  CRITICAL: { label: 'Crítica', color: '#ef4444' },
};

// Removes diacritical marks so search works with or without accents.
// As buscas das telas chamam isto para cada linha × campo a cada tecla; o
// cache evita refazer a normalização Unicode dos mesmos textos.
const NORMALIZE_CACHE_LIMIT = 50_000;
const normalizeCache = new Map();

export const normalize = (str) => {
  if (str === null || str === undefined || str === '') return '';
  const cached = normalizeCache.get(str);
  if (cached !== undefined) return cached;
  const result = str.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  if (normalizeCache.size >= NORMALIZE_CACHE_LIMIT) normalizeCache.clear();
  normalizeCache.set(str, result);
  return result;
};

export const canManageUsers = (role) => ['SUPER_ADMIN', 'ADMIN'].includes(role);
export const canManageCompanies = (role) => ['SUPER_ADMIN', 'ADMIN'].includes(role);
export const canManageCategories = (role) => ['SUPER_ADMIN', 'ADMIN'].includes(role);
export const canAssignTickets = (role) => ['SUPER_ADMIN', 'ADMIN', 'AGENT'].includes(role);
export const canUpdateTicketStatus = (role) => ['SUPER_ADMIN', 'ADMIN', 'AGENT'].includes(role);
