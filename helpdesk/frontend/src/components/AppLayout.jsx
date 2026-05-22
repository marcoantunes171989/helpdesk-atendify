import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Button, Avatar, Dropdown, Space, Drawer } from 'antd';
import {
  DashboardOutlined, TeamOutlined, UserOutlined, AppstoreOutlined,
  CustomerServiceOutlined, LogoutOutlined, BankOutlined,
  MenuFoldOutlined, MenuUnfoldOutlined, BellOutlined, IdcardOutlined,
  TagsOutlined, ToolOutlined, SettingOutlined, GlobalOutlined,
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { canManageCompanies, canManageUsers, canManageCategories, ROLES } from '../utils/constants';

const { Header, Sider, Content } = Layout;

const BREAKPOINT = 768;

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < BREAKPOINT);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handler = () => {
      const mobile = window.innerWidth < BREAKPOINT;
      setIsMobile(mobile);
      if (!mobile) setDrawerOpen(false);
    };
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const menuItems = [
    { key: '/app', icon: <DashboardOutlined />, label: 'Dashboard' },
    { key: '/app/tickets', icon: <CustomerServiceOutlined />, label: 'Chamados' },
    canManageCategories(user?.role) && { key: '/app/categories', icon: <AppstoreOutlined />, label: 'Categorias' },
    canManageCategories(user?.role) && { key: '/app/statuses', icon: <TagsOutlined />, label: 'Status' },
    canManageCategories(user?.role) && { key: '/app/technicians', icon: <ToolOutlined />, label: 'Técnicos' },
    canManageCategories(user?.role) && { key: '/app/states', icon: <GlobalOutlined />, label: 'Estados' },
    ['SUPER_ADMIN', 'ADMIN', 'AGENT'].includes(user?.role) && { key: '/app/employees', icon: <IdcardOutlined />, label: 'Funcionários' },
    canManageUsers(user?.role) && { key: '/app/users', icon: <TeamOutlined />, label: 'Usuários' },
    canManageCompanies(user?.role) && { key: '/app/companies', icon: <BankOutlined />, label: 'Empresas' },
    { key: '/app/settings', icon: <SettingOutlined />, label: 'Configurações' },
  ].filter(Boolean);

  const userMenu = {
    items: [
      {
        key: 'profile', disabled: true,
        label: (
          <div style={{ padding: '4px 0' }}>
            <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--cl-text)' }}>{user?.name}</div>
            <div style={{ color: 'var(--cl-text-faint)', fontSize: 11 }}>{user?.email}</div>
          </div>
        ),
      },
      { type: 'divider' },
      { key: 'logout', icon: <LogoutOutlined />, label: 'Sair', danger: true },
    ],
    onClick: ({ key }) => { if (key === 'logout') logout(); },
  };

  const selectedKey = menuItems.find(item =>
    item.key !== '/app' && location.pathname.startsWith(item.key)
  )?.key || (location.pathname === '/app' ? '/app' : '');

  const handleMenuClick = ({ key }) => {
    navigate(key);
    if (isMobile) setDrawerOpen(false);
  };

  const roleInfo = ROLES[user?.role];

  const SidebarContent = (
    <div className="app-sidebar" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Logo */}
      <div style={{
        height: 64, display: 'flex', alignItems: 'center',
        padding: collapsed && !isMobile ? '0 24px' : '0 20px',
        borderBottom: '1px solid var(--cl-border)', gap: 10, flexShrink: 0,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          boxShadow: '0 0 12px rgba(37,99,235,0.4)',
        }}>
          <CustomerServiceOutlined style={{ color: '#fff', fontSize: 16 }} />
        </div>
        {(!collapsed || isMobile) && (
          <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--cl-sidebar-logo)', fontFamily: "'Poppins', sans-serif" }}>
            Atendexa
          </span>
        )}
      </div>

      {/* Menu */}
      <div style={{ flex: 1, overflowY: 'auto', paddingTop: 8 }}>
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={handleMenuClick}
          style={{ border: 'none', background: 'transparent' }}
        />
      </div>

      {/* User card */}
      {(!collapsed || isMobile) && (
        <div style={{
          padding: '12px 16px',
          borderTop: '1px solid var(--cl-border)',
          background: 'var(--cl-bg)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Avatar size={30} style={{
              background: 'rgba(37,99,235,0.35)', color: '#60a5fa',
              fontSize: 12, fontWeight: 700, flexShrink: 0,
              border: '1px solid rgba(37,99,235,0.4)',
            }}>
              {user?.name?.charAt(0).toUpperCase()}
            </Avatar>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--cl-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.name}
              </div>
              <div style={{ fontSize: 11, color: 'var(--cl-text-faint)' }}>{roleInfo?.label}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <Layout style={{ minHeight: '100vh', background: 'var(--cl-page-bg)' }}>
      {/* Desktop Sidebar */}
      {!isMobile && (
        <Sider
          collapsible collapsed={collapsed} onCollapse={setCollapsed}
          trigger={null} width={220}
          style={{
            background: 'var(--cl-sidebar)',
            borderRight: '1px solid var(--cl-border)',
            position: 'fixed', height: '100vh', left: 0, top: 0, zIndex: 100,
          }}
        >
          {SidebarContent}
        </Sider>
      )}

      {/* Mobile Drawer */}
      {isMobile && (
        <Drawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          placement="left"
          width={240}
          styles={{
            body: { padding: 0, background: 'var(--cl-sidebar)' },
            header: { display: 'none' },
          }}
        >
          {SidebarContent}
        </Drawer>
      )}

      <Layout style={{ marginLeft: isMobile ? 0 : (collapsed ? 80 : 220), transition: 'margin-left 0.2s', background: 'transparent' }}>
        {/* Header */}
        <Header style={{
          background: 'var(--cl-header)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid var(--cl-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 16px', height: 64, position: 'sticky', top: 0, zIndex: 99,
        }}>
          <Button
            type="text"
            icon={isMobile
              ? <MenuUnfoldOutlined />
              : collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />
            }
            onClick={() => isMobile ? setDrawerOpen(true) : setCollapsed(!collapsed)}
            style={{ color: 'var(--cl-text-soft)' }}
          />

          <Space size={8}>
            <Button type="text" icon={<BellOutlined />} style={{ color: 'var(--cl-text-soft)' }} />
            <Dropdown menu={userMenu} placement="bottomRight" trigger={['click']}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                cursor: 'pointer', padding: '4px 8px', borderRadius: 8,
              }}>
                <Avatar size={32} style={{
                  background: 'rgba(37,99,235,0.35)', color: '#60a5fa',
                  fontWeight: 700, fontSize: 13,
                  border: '1px solid rgba(37,99,235,0.4)',
                }}>
                  {user?.name?.charAt(0).toUpperCase()}
                </Avatar>
                {!isMobile && (
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--cl-text)', lineHeight: 1.2 }}>{user?.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--cl-text-faint)', lineHeight: 1.2 }}>{roleInfo?.label}</div>
                  </div>
                )}
              </div>
            </Dropdown>
          </Space>
        </Header>

        <Content style={{
          padding: isMobile ? 16 : 24,
          minHeight: 'calc(100vh - 64px)',
          background: 'var(--cl-page-bg)',
        }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
