import { useEffect, useState } from 'react';
import { Modal, Input, Spin, message } from 'antd';
import KbIcon from './KbIcon';
import { knowledgeService } from '../../services/api';

export default function KbAiModal({ open, initialQuestion, onClose, onOpenArticle }) {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (open) {
      setQuestion(initialQuestion || '');
      setResult(null);
    }
  }, [open, initialQuestion]);

  const ask = async () => {
    if (!question.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const r = await knowledgeService.query({ question });
      setResult({ answer: r.answer, sources: r.sources || [] });
    } catch (err) {
      message.error(err.response?.data?.error || 'Erro ao consultar a IA');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onCancel={onClose} footer={null} width={720} centered className="kb-ai-modal"
      title={<span className="kb-form-title"><span className="kb-form-title-icon"><KbIcon name="sparkles" /></span>Assistente de Conhecimento</span>}>
      <p className="kb-ai-hint">A resposta é gerada a partir dos conteúdos cadastrados na Central.</p>
      <Input.TextArea
        value={question}
        onChange={e => setQuestion(e.target.value)}
        rows={3}
        placeholder="Descreva sua dúvida, erro ou o que precisa configurar..."
        onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) ask(); }}
      />
      <div className="kb-ai-bar">
        <span>Ctrl + Enter para enviar</span>
        <button type="button" className="kb-btn-primary" onClick={ask} disabled={loading || !question.trim()}>
          {loading ? <span className="kb-spinner" aria-hidden="true" /> : <KbIcon name="sparkles" />} Perguntar
        </button>
      </div>

      {loading && <div className="kb-ai-loading"><Spin /> Consultando a base de conhecimento...</div>}

      {result && (
        <div className="kb-ai-result" aria-live="polite">
          {result.answer ? (
            <div className="kb-ai-answer">{result.answer}</div>
          ) : (
            <div className="kb-ai-empty">
              {result.sources.length ? 'IA indisponível no momento. Conteúdos relacionados:' : 'Nenhum conteúdo relacionado encontrado. Tente reformular a pergunta.'}
            </div>
          )}
          {result.sources.length > 0 && (
            <ul className="kb-ai-sources">
              {result.sources.map(s => (
                <li key={s.id}>
                  <button type="button" onClick={() => { onClose(); onOpenArticle(s.id); }}>
                    <KbIcon name="fileText" /> {s.title} <KbIcon name="chevronRight" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Modal>
  );
}
