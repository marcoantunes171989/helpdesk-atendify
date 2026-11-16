import { useEffect, useMemo, useState } from 'react';
import { Modal, Spin, message } from 'antd';
import KbIcon from './KbIcon';
import { ICON_STYLE, FORMAT_TONE } from './KbContentCard';
import {
  describe, formatDate, formatSize, fileKind, FILE_KIND_LABEL, BACKEND_CATEGORY_LABEL,
  videoEmbedUrl, URL_SPLIT_RE, CONTENT_TYPES,
} from './kbModel';
import { attachmentBlobUrl, attachmentText, downloadAttachment, inlineImageSrc, previewMode } from './attachments';

const KIND_ICON = { pdf: 'fileText', exe: 'exe', zip: 'archive', sheet: 'sheet', doc: 'fileText', video: 'monitorPlay', image: 'image', text: 'fileText', file: 'paperclip' };
const KIND_TONE = { pdf: 'red', exe: 'gray', zip: 'amber', sheet: 'green', doc: 'blue', video: 'violet', image: 'sky', text: 'indigo', file: 'indigo' };

function RichText({ text }) {
  const parts = (text || '').split(URL_SPLIT_RE);
  return (
    <div className="kb-read-content">
      {parts.map((part, i) => (i % 2 === 1
        ? <a key={i} href={part} target="_blank" rel="noopener noreferrer">{part}</a>
        : <span key={i}>{part}</span>))}
    </div>
  );
}

function Preview({ att, onClose }) {
  const mode = att ? previewMode(att) : null;
  const [url, setUrl] = useState(null);
  const [text, setText] = useState('');

  useEffect(() => {
    if (!att) return undefined;
    if (mode === 'text') { setText(attachmentText(att)); return undefined; }
    if (mode === 'pdf' || mode === 'video') {
      const u = attachmentBlobUrl(att);
      setUrl(u);
      return () => URL.revokeObjectURL(u);
    }
    return undefined;
  }, [att, mode]);

  return (
    <Modal open={!!att} onCancel={onClose} footer={null} width={mode === 'pdf' ? 960 : 760} centered
      title={att?.name} className="kb-preview-modal" destroyOnHidden>
      {mode === 'pdf' && url && <iframe title={att.name} src={url} className="kb-preview-pdf" />}
      {mode === 'video' && url && <video src={url} controls className="kb-preview-video" />}
      {mode === 'image' && <img src={inlineImageSrc(att)} alt={att.name} className="kb-preview-img" />}
      {mode === 'text' && <pre className="kb-preview-text">{text}</pre>}
    </Modal>
  );
}

export default function KbArticleView({
  article, loading, favorite, onToggleFavorite, onBack, canUpdate, canDelete, onEdit, onDelete,
}) {
  const [preview, setPreview] = useState(null);
  const [copied, setCopied] = useState(false);
  const meta = useMemo(() => (article ? describe(article) : null), [article]);

  if (loading || !article) {
    return (
      <div className="kb-read">
        <button type="button" className="kb-back" onClick={onBack}><KbIcon name="arrowLeft" /> Voltar para a Central</button>
        <div className="kb-read-loading">{loading ? <Spin size="large" /> : <p>Conteúdo não encontrado.</p>}</div>
      </div>
    );
  }

  const style = ICON_STYLE[meta.icon] || ICON_STYLE.article;
  const embed = videoEmbedUrl(meta.videoUrl);
  const typeLabel = CONTENT_TYPES.find(t => t.key === meta.type)?.label;
  const attachments = article.attachments || [];
  const images = attachments.filter(a => inlineImageSrc(a));

  const copy = () => {
    const text = `${article.title}\n\n${article.content || ''}`.trim();
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => message.error('Não foi possível copiar'));
  };

  return (
    <div className="kb-read">
      <button type="button" className="kb-back" onClick={onBack}><KbIcon name="arrowLeft" /> Voltar para a Central</button>

      <article className="kb-read-card">
        <header className="kb-read-head">
          <span className={`kb-read-icon tone-${style.tone}`}><KbIcon name={style.icon} /></span>
          <div className="kb-read-titles">
            <div className="kb-read-tags">
              <span className={`kb-tag tone-${FORMAT_TONE[meta.format] || 'indigo'}`}>{meta.format}</span>
              <span className="kb-tag tone-soft">{meta.category.label}</span>
              {article.code != null && <span className="kb-read-code">#{String(article.code).padStart(4, '0')}</span>}
              {article.active === false && <span className="kb-tag tone-gray">Inativo</span>}
            </div>
            <h2 className="kb-read-title">{article.title}</h2>
            <p className="kb-read-meta">
              <KbIcon name="calendar" /> Atualizado em {formatDate(meta.date)}
              <span aria-hidden="true">·</span> {typeLabel}
              <span aria-hidden="true">·</span> {BACKEND_CATEGORY_LABEL[article.category] || article.category}
            </p>
          </div>
          <div className="kb-read-actions">
            <button type="button" className={`kb-icon-btn${favorite ? ' is-fav' : ''}`} onClick={() => onToggleFavorite(article.id)}
              aria-pressed={favorite} aria-label={favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}>
              <KbIcon name="star" filled={favorite} />
            </button>
            <button type="button" className="kb-icon-btn" onClick={copy} aria-label="Copiar conteúdo">
              <KbIcon name={copied ? 'check' : 'copy'} />
            </button>
            {canUpdate && (
              <button type="button" className="kb-icon-btn" onClick={onEdit} aria-label="Editar conteúdo">
                <KbIcon name="edit" />
              </button>
            )}
            {canDelete && (
              <button type="button" className="kb-icon-btn is-danger" onClick={onDelete} aria-label="Excluir conteúdo">
                <KbIcon name="trash" />
              </button>
            )}
          </div>
        </header>

        {meta.tags.length > 0 && (
          <div className="kb-read-keywords">
            {meta.tags.map(t => <span key={t} className="kb-keyword">{t}</span>)}
          </div>
        )}

        {embed && (
          <div className="kb-read-video">
            <iframe src={embed} title={`Vídeo: ${article.title}`} allowFullScreen loading="lazy"
              allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              referrerPolicy="strict-origin-when-cross-origin" />
          </div>
        )}

        <RichText text={article.content} />

        {images.length > 0 && (
          <div className="kb-read-gallery">
            {images.map(img => (
              <button key={img.id} type="button" className="kb-read-thumb" onClick={() => setPreview(img)} aria-label={`Ampliar imagem ${img.name}`}>
                <img src={inlineImageSrc(img)} alt={img.name} loading="lazy" />
              </button>
            ))}
          </div>
        )}

        {meta.urls.length > 0 && (
          <section className="kb-read-section">
            <h3>Links</h3>
            <ul className="kb-read-links">
              {meta.urls.map(u => (
                <li key={u}>
                  <a href={u} target="_blank" rel="noopener noreferrer">
                    <KbIcon name="link" /> <span>{u}</span> <KbIcon name="externalLink" />
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        {attachments.length > 0 && (
          <section className="kb-read-section">
            <h3>Anexos ({attachments.length})</h3>
            <ul className="kb-files">
              {attachments.map(att => {
                const kind = fileKind(att);
                const mode = previewMode(att);
                return (
                  <li key={att.id} className="kb-file">
                    <span className={`kb-file-icon tone-${KIND_TONE[kind]}`}><KbIcon name={KIND_ICON[kind]} /></span>
                    <span className="kb-file-info">
                      <strong>{att.name}</strong>
                      <span>{FILE_KIND_LABEL[kind]} · {formatSize(att.size)}</span>
                      {kind === 'exe' && (
                        <span className="kb-file-warn">
                          <KbIcon name="alert" /> Executáveis não abrem no navegador. Confirme a origem antes de executar.
                        </span>
                      )}
                    </span>
                    <span className="kb-file-actions">
                      {mode && att.data && (
                        <button type="button" className="kb-btn-ghost" onClick={() => setPreview(att)}>
                          <KbIcon name="eye" /> Visualizar
                        </button>
                      )}
                      {att.data && (
                        <button type="button" className="kb-btn-primary" onClick={() => downloadAttachment(att)}>
                          <KbIcon name="download" /> Baixar
                        </button>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </article>

      <Preview att={preview} onClose={() => setPreview(null)} />
    </div>
  );
}
