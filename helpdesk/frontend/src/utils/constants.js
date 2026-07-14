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

// Removes diacritical marks so search works with or without accents
export const normalize = (str) =>
  (str ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export const canManageUsers = (role) => ['SUPER_ADMIN', 'ADMIN'].includes(role);
export const canManageCompanies = (role) => ['SUPER_ADMIN', 'ADMIN'].includes(role);
export const canManageCategories = (role) => ['SUPER_ADMIN', 'ADMIN'].includes(role);
export const canAssignTickets = (role) => ['SUPER_ADMIN', 'ADMIN', 'AGENT'].includes(role);
export const canUpdateTicketStatus = (role) => ['SUPER_ADMIN', 'ADMIN', 'AGENT'].includes(role);
