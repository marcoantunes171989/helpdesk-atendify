import {
  DashboardOutlined, TeamOutlined, AppstoreOutlined,
  CustomerServiceOutlined, BankOutlined,
  IdcardOutlined, TagsOutlined, ToolOutlined, SettingOutlined,
  GlobalOutlined, EnvironmentOutlined, BookOutlined, BarChartOutlined,
  ContactsOutlined, RocketOutlined, ReadOutlined, CarOutlined,
  ScheduleOutlined, OrderedListOutlined, AppstoreAddOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';

// Fonte central do menu lateral. Qualquer item novo nasce aqui — o
// AppLayout apenas filtra por permissão e agrupa, nunca decide individualmente
// se um item deve aparecer (RBAC-UX-01, GATE 07).
//
// group: chave de um dos MENU_GROUPS abaixo.
// permission: chave de permissão exigida (ver backend/src/permissions/catalog.js)
//   ou null para itens sempre visíveis a qualquer usuário autenticado
//   (Dashboard e Configurações, como já era o comportamento anterior).

export const MENU_GROUPS = [
  { key: 'painel', label: 'Painel' },
  { key: 'atendimento', label: 'Atendimento' },
  { key: 'cadastros', label: 'Cadastros' },
  { key: 'gestao', label: 'Gestão' },
  { key: 'administracao', label: 'Administração' },
];

export const MENU_ITEMS = [
  { key: '/app', label: 'Dashboard', icon: DashboardOutlined, group: 'painel', permission: null, order: 1 },

  { key: '/app/tickets', label: 'Chamados', icon: CustomerServiceOutlined, group: 'atendimento', permission: 'tickets.read', order: 1 },
  { key: '/app/agenda-tecnica', label: 'Agenda Técnica', icon: ScheduleOutlined, group: 'atendimento', permission: 'agenda_tecnica.read', order: 2 },
  { key: '/app/visitas', label: 'Visitas Técnicas', icon: CarOutlined, group: 'atendimento', permission: 'visitas.read', order: 3 },
  { key: '/app/knowledge', label: 'Base de Conhecimento', icon: BookOutlined, group: 'atendimento', permission: 'knowledge.read', order: 4 },

  { key: '/app/companies', label: 'Empresas', icon: BankOutlined, group: 'cadastros', permission: 'companies.read', order: 1 },
  { key: '/app/employees', label: 'Funcionários', icon: IdcardOutlined, group: 'cadastros', permission: 'employees.read', order: 2 },
  { key: '/app/technicians', label: 'Técnicos', icon: ToolOutlined, group: 'cadastros', permission: 'technicians.read', order: 3 },
  { key: '/app/categories', label: 'Categorias', icon: AppstoreOutlined, group: 'cadastros', permission: 'categories.read', order: 4 },
  { key: '/app/statuses', label: 'Status', icon: TagsOutlined, group: 'cadastros', permission: 'statuses.read', order: 5 },
  { key: '/app/states', label: 'Estados', icon: GlobalOutlined, group: 'cadastros', permission: 'states_cities.read', order: 6 },
  { key: '/app/cities', label: 'Cidades', icon: EnvironmentOutlined, group: 'cadastros', permission: 'states_cities.read', order: 7 },

  { key: '/app/crm', label: 'CRM', icon: ContactsOutlined, group: 'gestao', permission: 'crm.read', order: 1 },
  { key: '/app/implantacoes', label: 'Implantações', icon: RocketOutlined, group: 'gestao', permission: 'implantacoes.read', order: 2 },
  { key: '/app/modulos-treinamento', label: 'Módulos de Treinamento', icon: AppstoreAddOutlined, group: 'gestao', permission: 'treinamentos.read', order: 3 },
  { key: '/app/etapas-treinamento', label: 'Etapas de Treinamento', icon: OrderedListOutlined, group: 'gestao', permission: 'treinamentos.read', order: 4 },
  { key: '/app/treinamentos', label: 'Treinamentos', icon: ReadOutlined, group: 'gestao', permission: 'treinamentos.read', order: 5 },
  { key: '/app/reports', label: 'Relatórios', icon: BarChartOutlined, group: 'gestao', permission: 'reports.read', order: 6 },

  { key: '/app/users', label: 'Usuários', icon: TeamOutlined, group: 'administracao', permission: 'users.read', order: 1 },
  { key: '/app/access-groups', label: 'Perfis de Acesso', icon: SafetyCertificateOutlined, group: 'administracao', permission: 'access_groups.read', order: 2 },
  { key: '/app/settings', label: 'Configurações', icon: SettingOutlined, group: 'administracao', permission: null, order: 3 },
];

// Monta os itens do menu já filtrados por permissão e agrupados para o
// componente antd <Menu>. Grupos sem nenhum item visível são omitidos
// (GATE 07/08: "Grupo sem nenhum item permitido: Grupo não aparece").
export function buildMenuItems(can) {
  const visible = MENU_ITEMS.filter(item => item.permission === null || can(item.permission));

  const result = [];
  for (const group of MENU_GROUPS) {
    const items = visible
      .filter(item => item.group === group.key)
      .sort((a, b) => a.order - b.order);
    if (items.length === 0) continue;

    result.push({
      key: `group:${group.key}`,
      label: group.label,
      type: 'group',
      children: items.map(item => ({
        key: item.key,
        icon: <item.icon />,
        label: item.label,
      })),
    });
  }
  return result;
}

export function flatMenuKeys() {
  return MENU_ITEMS.map(item => item.key);
}
