import KbIcon from './KbIcon';
import KbIllustration from './KbIllustration';

const EXAMPLES = ['emitir nota fiscal', 'configurar impressora', 'atualizar sistema', 'instalar PDV'];

export default function KbSearchBanner({ value, onChange, onSubmit, onClear, busy }) {
  const submit = (e) => {
    e.preventDefault();
    onSubmit(value);
  };

  return (
    <section className="kb-banner" aria-labelledby="kb-banner-title">
      <div className="kb-banner-body">
        <h2 id="kb-banner-title" className="kb-banner-title">Encontre guias, manuais, tutoriais e soluções</h2>
        <form className="kb-search" role="search" onSubmit={submit}>
          <KbIcon name="search" className="kb-search-icon" />
          <input
            type="search"
            className="kb-search-input"
            value={value}
            onChange={e => onChange(e.target.value)}
            onKeyDown={e => { if (e.key === 'Escape' && value) { e.preventDefault(); onClear(); } }}
            placeholder="Digite sua dúvida, recurso ou palavra-chave..."
            aria-label="Pesquisar na Central de Conhecimento"
            enterKeyHint="search"
            autoComplete="off"
          />
          {value && (
            <button type="button" className="kb-search-clear" onClick={onClear} aria-label="Limpar pesquisa">
              <KbIcon name="x" />
            </button>
          )}
          <button type="submit" className="kb-search-btn" disabled={busy}>
            {busy ? <span className="kb-spinner" aria-hidden="true" /> : null}
            Buscar
          </button>
        </form>
        <p className="kb-examples">
          Exemplos:{' '}
          {EXAMPLES.map((ex, i) => (
            <span key={ex}>
              <button type="button" className="kb-example" onClick={() => { onChange(ex); onSubmit(ex); }}>{ex}</button>
              {i < EXAMPLES.length - 1 ? ', ' : ''}
            </span>
          ))}
        </p>
      </div>
      <KbIllustration className="kb-banner-art" />
    </section>
  );
}
