export const ROLES = {
  SUPER_ADMIN: { label: 'Super Admin', color: 'purple' },
  ADMIN: { label: 'Administrador', color: 'blue' },
  AGENT: { label: 'Agente', color: 'cyan' },
  CLIENT: { label: 'Cliente', color: 'green' },
};

export const TICKET_STATUS = {
  OPEN: { label: 'Aberto', color: 'blue' },
  IN_PROGRESS: { label: 'Em Andamento', color: 'orange' },
  RESOLVED: { label: 'Resolvido', color: 'green' },
  CLOSED: { label: 'Fechado', color: 'default' },
  CANCELLED: { label: 'Cancelado', color: 'red' },
};

export const PRIORITY = {
  LOW: { label: 'Baixa', color: 'default' },
  MEDIUM: { label: 'Média', color: 'blue' },
  HIGH: { label: 'Alta', color: 'orange' },
  CRITICAL: { label: 'Crítica', color: 'red' },
};

export const canManageUsers = (role) => ['SUPER_ADMIN', 'ADMIN'].includes(role);
export const canManageCompanies = (role) => role === 'SUPER_ADMIN';
export const canManageCategories = (role) => ['SUPER_ADMIN', 'ADMIN'].includes(role);
export const canAssignTickets = (role) => ['SUPER_ADMIN', 'ADMIN', 'AGENT'].includes(role);
export const canUpdateTicketStatus = (role) => ['SUPER_ADMIN', 'ADMIN', 'AGENT'].includes(role);
