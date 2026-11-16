import { Dropdown } from 'antd';
import KbIcon from './KbIcon';
import { initials } from './kbModel';
import { ROLES } from '../../utils/constants';

export default function KbHeader({ user, onMenu, onExit, onLogout }) {
  const menu = {
    items: [
      {
        key: 'who', disabled: true,
        label: (
          <div className="kb-user-who">
            <strong>{user?.name}</strong>
            <span>{user?.email}</span>
            {ROLES[user?.role] && <em>{ROLES[user.role].label}</em>}
          </div>
        ),
      },
      { type: 'divider' },
      onExit && { key: 'exit', icon: <KbIcon name="back" />, label: 'Voltar ao Atendexa' },
      { key: 'logout', icon: <KbIcon name="logout" />, label: 'Sair', danger: true },
    ].filter(Boolean),
    onClick: ({ key }) => {
      if (key === 'exit') onExit();
      if (key === 'logout') onLogout();
    },
  };

  return (
    <header className="kb-header">
      <button type="button" className="kb-menu-btn" onClick={onMenu} aria-label="Abrir menu">
        <KbIcon name="menu" />
      </button>
      <div className="kb-header-text">
        <h1 className="kb-title">Central de Conhecimento</h1>
        <p className="kb-subtitle">Tudo o que você precisa para utilizar, configurar e manter o sistema.</p>
      </div>
      <div className="kb-header-actions">
        <button type="button" className="kb-bell" aria-label="Notificações (nenhuma nova)" title="Nenhuma notificação nova">
          <KbIcon name="bell" />
        </button>
        <Dropdown menu={menu} trigger={['click']} placement="bottomRight" overlayClassName="kb-user-menu">
          <button type="button" className="kb-user" aria-label={`Menu do usuário ${user?.name || ''}`}>
            <span className="kb-avatar">{initials(user?.name)}</span>
            <KbIcon name="chevronDown" className="kb-user-chevron" />
          </button>
        </Dropdown>
      </div>
    </header>
  );
}
