import KbIcon from './KbIcon';
import { CONTENT_TYPES } from './kbModel';

export default function KbRightPanel({ actions, onAction, onIntro, onType, activeType }) {
  return (
    <aside className="kb-right" aria-label="Atalhos">
      {actions.length > 0 && (
        <section className="kb-panel">
          <h2 className="kb-panel-title"><KbIcon name="zap" className="kb-panel-icon is-amber" /> Acesso Rápido</h2>
          <div className="kb-quick">
            {actions.map(a => (
              <button key={a.key} type="button" className="kb-quick-btn" onClick={() => onAction(a.key)}>
                <KbIcon name={a.icon} className="kb-quick-icon" />
                <span>{a.label}</span>
                <KbIcon name="chevronRight" className="kb-quick-chev" />
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="kb-panel">
        <h2 className="kb-panel-title"><KbIcon name="bookmark" className="kb-panel-icon is-amber" /> Destaques</h2>
        <button type="button" className="kb-highlight" onClick={onIntro}>
          <KbIcon name="rocket" className="kb-highlight-icon" />
          <span className="kb-highlight-text">
            <strong>Primeiros Passos</strong>
            <span>Comece por aqui</span>
          </span>
          <KbIcon name="chevronRight" className="kb-quick-chev" />
        </button>
      </section>

      <section className="kb-panel">
        <h2 className="kb-panel-title"><KbIcon name="layers" className="kb-panel-icon is-purple" /> Tipos de Conteúdo</h2>
        <ul className="kb-types">
          {CONTENT_TYPES.map(t => (
            <li key={t.key}>
              <button
                type="button"
                className={`kb-type${activeType === t.key ? ' is-active' : ''}`}
                aria-pressed={activeType === t.key}
                onClick={() => onType(t)}
              >
                <KbIcon name={t.icon} className="kb-type-icon" />
                <strong>{t.label}</strong>
                <span>{t.detail}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </aside>
  );
}
