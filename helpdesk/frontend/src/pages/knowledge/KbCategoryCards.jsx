import KbIcon from './KbIcon';
import { CATEGORIES } from './kbModel';

export default function KbCategoryCards({ categories = CATEGORIES, counts, selected, onSelect }) {
  const list = (categories?.length ? categories : CATEGORIES).filter(c => c.active !== false);
  return (
    <section className="kb-cats" aria-label="Categorias">
      {list.map(cat => {
        const active = selected === cat.key;
        const n = counts[cat.key] || 0;
        return (
          <button
            key={cat.key}
            type="button"
            className={`kb-cat${active ? ' is-active' : ''}`}
            aria-pressed={active}
            onClick={() => onSelect(active ? null : cat.key)}
          >
            <span className={`kb-cat-icon tone-${cat.tone}`}><KbIcon name={cat.icon} /></span>
            <span className="kb-cat-title">{cat.label}</span>
            <span className="kb-cat-count">{n} {n === 1 ? 'conteúdo' : 'conteúdos'}</span>
          </button>
        );
      })}
    </section>
  );
}
