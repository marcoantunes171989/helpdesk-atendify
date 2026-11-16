import { useEffect, useMemo, useState } from 'react';
import { Modal, Spin, message } from 'antd';
import KbIcon from './KbIcon';
import { ICON_STYLE, FORMAT_TONE } from './KbContentCard';
import {
  describe, formatDate, formatSize, fileKind, FILE_KIND_LABEL, BACKEND_CATEGORY_LABEL,
  videoEmbedUrl, URL_SPLIT_RE, CONTENT_TYPES,
} from './kbModel';
import {
  attachmentObjectUrl, attachmentText, canDownload, canPreview,
  downloadAttachment, previewMode,
} from './attachments';

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
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    let objectUrl;
    if (!att || !mode) return undefined;
    setLoading(true);
    setUrl(null);
    setText('');
    (async () => {
      try {
        if (mode === 'text') {
          const t = await attachmentText(att);
          if (alive) setText(t);
        } else {
          objectUrl = await attachmentObjectUrl(att, { inline: true });
          if (alive) setUrl(objectUrl);
        }
      } catch {
        if (alive) message.error('Não foi possível abrir o anexo');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [att, mode]);

  return (
    <Modal open={!!att} onCancel={onClose} footer={null} width={mode === 'pdf' ? 960 : 760} centered
      title={att?.name} className="kb-preview-modal" destroyOnHidden>
      {loading && <div className="kb-read-loading"><Spin /></div>}
      {mode === 'pdf' && url && <iframe title={att.name} src={url} className="kb-preview-pdf" />}
      {mode === 'video' && url && <video src={url} controls className="kb-preview-video" />}
      {mode === 'image' && url && <img src={url} alt={att.name} className="kb-preview-img" />}
      {mode === 'text' && !loading && <pre className="kb-preview-text">{text}</pre>}
    </Modal>
  );
}

function Thumb({ att, onOpen }) {
  const [src, setSrc] = useState(null);
  useEffect(() => {
    let alive = true;
    let objectUrl;
    (async () => {
      try {
        objectUrl = await attachmentObjectUrl(att, { inline: true });
        if (alive) setSrc(objectUrl);
      } catch { /* silencioso na galeria */ }
    })();
    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [att]);
  if (!src) return null;
  return (
    <button type="button" className="kb-read-thumb" onClick={() => onOpen(att)} aria-label={`Ampliar imagem ${att.name}`}>
      <img src={src} alt={att.name} loading="lazy" />
    </button>
  );
}

export default function KbArticleView({
  article, loading, favorite, onToggleFavorite, onBack, canUpdate, canDelete, onEdit, onDelete,
}) {
  const [preview, setPreview] = useState(null);
  const [copied, setCopied] = useState(false);
  const [busyId, setBusyId] = useState(null);
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
  const images = attachments.filter(a => previewMode(a) === 'image');

  const copy = () => {
    const text = `${article.title}\n\n${article.content || ''}`.trim();
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => message.error('Não foi possível copiar'));
  };

  const onDownload = async (att) => {
    setBusyId(att.id);
    try {
      await downloadAttachment(att);
    } catch {
      message.error('Não foi possível baixar o anexo');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="kb-read">
      <button type="button" className="kb-back" onClick={onBack}><KbIcon name="arrowLeft" /> Voltar para a Central</button>

      <article className="kb-read-card">
        <header className="kb-read-head">
          <span className="kb-read-icon" style={{ background: style.bg, color: style.fg }}><KbIcon name={meta.icon} /></span>
          <div className="kb-read-meta">
            <div className="kb-read-tags">
              <span className={`kb-chip tone-${FORMAT_TONE[meta.format] || 'indigo'}`}>{meta.format}</span>
              <span className="kb-chip tone-slate">{BACKEND_CATEGORY_LABEL[article.category] || article.category}</span>
              {article.code != null && <span className="kb-chip tone-slate">#{article.code}</span>}
              {article.active === false && <span className="kb-chip tone-amber">Inativo</span>}
            </div>
            <h2>{article.title}</h2>
            <p className="kb-read-sub">
              Atualizado em {formatDate(article.updatedAt || article.createdAt)}
              {typeLabel ? ` · ${typeLabel}` : ''}
            </p>
          </div>
          <div className="kb-read-actions">
            <button type="button" className={`kb-icon-btn${favorite ? ' is-on' : ''}`}
              aria-label={favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
              onClick={() => onToggleFavorite(article.id)}>
              <KbIcon name="star" filled={favorite} />
            </button>
            <button type="button" className="kb-btn-ghost" onClick={copy}>
              <KbIcon name="copy" /> {copied ? 'Copiado' : 'Copiar'}
            </button>
            {canUpdate && (
              <button type="button" className="kb-btn-ghost" onClick={onEdit} aria-label="Editar conteúdo">
                <KbIcon name="edit" /> Editar
              </button>
            )}
            {canDelete && (
              <button type="button" className="kb-btn-ghost kb-btn-danger" onClick={onDelete} aria-label="Excluir conteúdo">
                <KbIcon name="trash" /> Excluir
              </button>
            )}
          </div>
        </header>

        {meta.tags.length > 0 && (
          <div className="kb-read-keywords">
            {meta.tags.map(t => <span key={t} className="kb-chip tone-violet">{t}</span>)}
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
            {images.map(img => <Thumb key={img.id} att={img} onOpen={setPreview} />)}
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
                      {canPreview(att) && mode && (
                        <button type="button" className="kb-btn-ghost" onClick={() => setPreview(att)}>
                          <KbIcon name="eye" /> Visualizar
                        </button>
                      )}
                      {canDownload(att) && (
                        <button type="button" className="kb-btn-primary" disabled={busyId === att.id}
                          onClick={() => onDownload(att)}>
                          <KbIcon name="download" /> {busyId === att.id ? 'Baixando…' : 'Baixar'}
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
