import KbIcon from './KbIcon';
import { SECTIONS } from './kbModel';

export default function KbSidebar({ section, onNavigate, onExit, open, onClose }) {
  return (
    <>
      {open && <div className="kb-scrim" onClick={onClose} aria-hidden="true" />}
      <aside className={`kb-sidebar${open ? ' is-open' : ''}`} aria-label="Navegação da Central de Conhecimento">
        <div className="kb-brand">
          <KbIcon name="bookOpen" className="kb-brand-icon" />
          <span className="kb-brand-text">Central de<br />Conhecimento</span>
          <button type="button" className="kb-sidebar-close" onClick={onClose} aria-label="Fechar menu">
            <KbIcon name="x" />
          </button>
        </div>

        <nav className="kb-nav">
          {SECTIONS.map(s => {
            const active = section === s.key;
            return (
              <button
                key={s.key || 'inicio'}
                type="button"
                className={`kb-nav-item${active ? ' is-active' : ''}`}
                aria-current={active ? 'page' : undefined}
                onClick={() => onNavigate(s.key)}
              >
                <KbIcon name={s.icon} className="kb-nav-icon" />
                <span>{s.label}</span>
              </button>
            );
          })}
        </nav>

        {onExit && (
          <button type="button" className="kb-nav-exit" onClick={onExit}>
            <KbIcon name="back" className="kb-nav-icon" />
            <span>Voltar ao Atendexa</span>
          </button>
        )}
      </aside>
    </>
  );
}
