import KbIcon from './KbIcon';
import { formatDate } from './kbModel';

export const ICON_STYLE = {
  manual: { icon: 'bookOpen', tone: 'blue' },
  video: { icon: 'monitorPlay', tone: 'violet' },
  sheet: { icon: 'sheet', tone: 'green' },
  download: { icon: 'download', tone: 'green' },
  zip: { icon: 'archive', tone: 'amber' },
  pdf: { icon: 'fileText', tone: 'red' },
  exe: { icon: 'exe', tone: 'gray' },
  link: { icon: 'link', tone: 'sky' },
  article: { icon: 'fileText', tone: 'indigo' },
};

export const FORMAT_TONE = {
  Manual: 'blue', 'Vídeo': 'violet', Download: 'green', PDF: 'red',
  'Executável': 'gray', 'Link Externo': 'sky', Artigo: 'indigo',
};

export default function KbContentCard({ article, meta, favorite, onToggleFavorite, onOpen, layout }) {
  const style = ICON_STYLE[meta.icon] || ICON_STYLE.article;
  return (
    <article className={`kb-card kb-card--${layout}${article.active === false ? ' is-inactive' : ''}`}>
      <span className={`kb-card-icon tone-${style.tone}`}><KbIcon name={style.icon} /></span>
      <div className="kb-card-body">
        <h3 className="kb-card-title">
          <button type="button" className="kb-card-link" onClick={() => onOpen(article.id)}>{article.title}</button>
        </h3>
        {meta.summary && <p className="kb-card-desc">{meta.summary}</p>}
        <div className="kb-card-tags">
          <span className={`kb-tag tone-${FORMAT_TONE[meta.format] || 'indigo'}`}>{meta.format}</span>
          {article.active === false && <span className="kb-tag tone-gray">Inativo</span>}
        </div>
      </div>
      <footer className="kb-card-foot">
        <span className="kb-card-meta">
          <KbIcon name="calendar" />
          <time dateTime={meta.date}>{formatDate(meta.date)}</time>
        </span>
        {article.attachments?.length > 0 && (
          <span className="kb-card-meta" title={`${article.attachments.length} anexo(s)`}>
            <KbIcon name="paperclip" />
            {article.attachments.length}
          </span>
        )}
        <button
          type="button"
          className={`kb-fav${favorite ? ' is-on' : ''}`}
          aria-pressed={favorite}
          aria-label={favorite ? `Remover "${article.title}" dos favoritos` : `Adicionar "${article.title}" aos favoritos`}
          onClick={() => onToggleFavorite(article.id)}
        >
          <KbIcon name="star" filled={favorite} />
        </button>
      </footer>
    </article>
  );
}
