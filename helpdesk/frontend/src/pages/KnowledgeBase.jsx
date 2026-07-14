import { useEffect, useState } from 'react';
import {
  Row, Col, Button, Modal, Form, Input, Select, Space, Tag,
  message, Tooltip, Upload, Divider, Spin, Empty,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, ExclamationCircleOutlined,
  PaperClipOutlined, DownloadOutlined, SendOutlined, RobotOutlined,
  QuestionCircleOutlined, WarningOutlined, SettingOutlined, BookOutlined,
  SearchOutlined, InboxOutlined, CopyOutlined, CheckOutlined,
} from '@ant-design/icons';
import { knowledgeService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { normalize } from '../utils/constants';

const { TextArea } = Input;
const { Option } = Select;

const KB_CATEGORIES = {
  DUVIDA: {
    label: 'Dúvida',
    color: 'var(--cl-info)',
    bg: 'rgba(56,189,248,0.15)',
    border: 'rgba(56,189,248,0.3)',
    icon: <QuestionCircleOutlined />,
  },
  ERRO: {
    label: 'Erro',
    color: 'var(--cl-danger)',
    bg: 'rgba(239,68,68,0.12)',
    border: 'rgba(239,68,68,0.3)',
    icon: <WarningOutlined />,
  },
  CONFIGURACAO: {
    label: 'Configuração',
    color: 'var(--cl-purple)',
    bg: 'rgba(139,92,246,0.15)',
    border: 'rgba(139,92,246,0.3)',
    icon: <SettingOutlined />,
  },
};

function CategoryBadge({ category, small }) {
  const cat = KB_CATEGORIES[category];
  if (!cat) return null;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: small ? '1px 8px' : '2px 10px',
      borderRadius: 20,
      background: cat.bg,
      border: `1px solid ${cat.border}`,
      color: cat.color,
      fontSize: small ? 11 : 12,
      fontWeight: 600,
    }}>
      {cat.icon} {cat.label}
    </span>
  );
}

function downloadAttachment(att) {
  const byteChars = atob(att.data);
  const byteArr = new Uint8Array(Array.from(byteChars).map(c => c.charCodeAt(0)));
  const blob = new Blob([byteArr], { type: att.mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = att.name;
  a.click();
  URL.revokeObjectURL(url);
}

function fileIcon(mimeType = '') {
  if (mimeType.includes('pdf')) return '📄';
  if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
  if (mimeType.includes('sheet') || mimeType.includes('excel')) return '📊';
  if (mimeType.includes('image')) return '🖼️';
  if (mimeType.includes('rar') || mimeType.includes('zip') || mimeType.includes('compressed') || mimeType.includes('x-rar')) return '🗜️';
  return '📎';
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function KnowledgeBase() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [articleLoading, setArticleLoading] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [showAi, setShowAi] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [fileList, setFileList] = useState([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  const [previewTitle, setPreviewTitle] = useState('');
  const [form] = Form.useForm();

  const [deleteModal, setDeleteModal] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [aiQuestion, setAiQuestion] = useState('');
  const [aiAnswer, setAiAnswer] = useState(null);
  const [aiSources, setAiSources] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);

  const { user } = useAuth();
  const canEdit = ['SUPER_ADMIN', 'ADMIN', 'AGENT'].includes(user?.role);

  const load = () => {
    setLoading(true);
    knowledgeService.list().then(setArticles).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const selectArticle = async (id) => {
    setShowAi(false);
    setArticleLoading(true);
    try {
      const full = await knowledgeService.get(id);
      setSelectedArticle(full);
    } catch {
      message.error('Erro ao carregar artigo');
    } finally {
      setArticleLoading(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setFileList([]);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (record) => {
    setEditing(record);
    form.setFieldsValue({
      title: record.title,
      content: record.content,
      category: record.category,
      tags: record.tags || '',
      active: record.active,
    });
    setFileList((record.attachments || []).map(a => ({
      uid: a.id,
      id: a.id,
      name: a.name,
      type: a.mimeType,
      mimeType: a.mimeType,
      size: a.size,
      status: 'done',
    })));
    setModalOpen(true);
  };

  const readFileAsBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file.originFileObj || file);
  });

  const handlePreview = async (file) => {
    const isImage = file.type?.startsWith('image/') || /\.(jpe?g|png|gif|webp|svg|bmp)$/i.test(file.name || '');
    if (!isImage || !file.originFileObj) return;
    if (!file.preview) {
      file.preview = await new Promise(resolve => {
        const reader = new FileReader();
        reader.readAsDataURL(file.originFileObj);
        reader.onload = () => resolve(reader.result);
      });
    }
    setPreviewImage(file.preview);
    setPreviewTitle(file.name || '');
    setPreviewOpen(true);
  };

  const handleSubmit = async (values) => {
    setSaving(true);
    try {
      const attachments = await Promise.all(fileList.map(async f => {
        if (f.id) return { id: f.id };
        const data = await readFileAsBase64(f);
        return { name: f.name, mimeType: f.type || f.mimeType, size: f.size, data };
      }));

      const payload = { ...values, tags: values.tags || null, attachments };

      if (editing) {
        await knowledgeService.update(editing.id, payload);
        message.success('Artigo atualizado com sucesso');
        if (selectedArticle?.id === editing.id) {
          const updated = await knowledgeService.get(editing.id);
          setSelectedArticle(updated);
        }
      } else {
        await knowledgeService.create(payload);
        message.success('Artigo cadastrado com sucesso');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      message.error(err.response?.data?.error || 'Erro ao salvar artigo');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      const deletedId = deleteModal.id;
      await knowledgeService.remove(deletedId);
      message.success('Artigo excluído com sucesso');
      if (selectedArticle?.id === deletedId) setSelectedArticle(null);
      setAiSources(prev => prev.filter(s => s.id !== deletedId));
      setDeleteModal(null);
      load();
    } catch (err) {
      message.error(err.response?.data?.error || 'Erro ao excluir artigo');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleAiQuery = async () => {
    if (!aiQuestion.trim()) return;
    setAiLoading(true);
    setAiAnswer(null);
    setAiSources([]);
    try {
      const result = await knowledgeService.query({ question: aiQuestion });
      setAiAnswer(result.answer);
      setAiSources(result.sources || []);
    } catch (err) {
      message.error(err.response?.data?.error || 'Erro ao consultar IA');
    } finally {
      setAiLoading(false);
    }
  };

  const beforeUpload = (file) => {
    if (file.size > 10 * 1024 * 1024) {
      message.error(`${file.name} excede o limite de 10 MB`);
      return Upload.LIST_IGNORE;
    }
    return false;
  };

  const filtered = articles.filter(a => {
    if (categoryFilter !== 'ALL' && a.category !== categoryFilter) return false;
    if (search) {
      const q = normalize(search);
      return (
        normalize(a.title).includes(q) ||
        normalize(a.tags || '').includes(q) ||
        normalize(a.content).includes(q) ||
        normalize(KB_CATEGORIES[a.category]?.label || a.category || '').includes(q)
      );
    }
    return true;
  });

  const panelStyle = {
    background: 'var(--cl-bg-card)',
    border: '1px solid var(--cl-border)',
    borderRadius: 12,
    overflow: 'hidden',
  };

  return (
    <div className="page-wrap">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Base de Conhecimento</h1>
          <p style={{ color: 'var(--cl-text-muted)', fontSize: 13, margin: '4px 0 0' }}>
            {articles.length} artigo{articles.length !== 1 ? 's' : ''} cadastrado{articles.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Space>
          <Button
            icon={<RobotOutlined />}
            onClick={() => { setShowAi(true); setSelectedArticle(null); }}
            style={{
              borderRadius: 8, fontWeight: 600,
              color: 'var(--cl-purple)',
              borderColor: 'rgba(139,92,246,0.35)',
              background: showAi ? 'rgba(139,92,246,0.1)' : 'transparent',
            }}
          >
            Consultar IA
          </Button>
          {canEdit && (
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate} style={{ borderRadius: 8, fontWeight: 600 }}>
              Novo Artigo
            </Button>
          )}
        </Space>
      </div>

      {/* Search + category filters — full width, prominent */}
      <div style={{ marginBottom: 16 }}>
        <Input
          size="large"
          prefix={<SearchOutlined style={{ color: 'var(--cl-text-dim)', fontSize: 16 }} />}
          placeholder="Buscar por título, tags ou conteúdo..."
          allowClear
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ borderRadius: 10, marginBottom: 10 }}
        />
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          {[
            { key: 'ALL', label: 'Todos' },
            { key: 'DUVIDA', label: 'Dúvidas' },
            { key: 'ERRO', label: 'Erros' },
            { key: 'CONFIGURACAO', label: 'Configurações' },
          ].map(opt => (
            <button
              key={opt.key}
              onClick={() => setCategoryFilter(opt.key)}
              style={{
                padding: '4px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                cursor: 'pointer', border: '1px solid',
                background: categoryFilter === opt.key
                  ? (opt.key === 'ALL' ? 'rgba(37,99,235,0.18)' : KB_CATEGORIES[opt.key]?.bg || 'rgba(37,99,235,0.18)')
                  : 'transparent',
                borderColor: categoryFilter === opt.key
                  ? (opt.key === 'ALL' ? 'rgba(37,99,235,0.4)' : KB_CATEGORIES[opt.key]?.border || 'rgba(37,99,235,0.4)')
                  : 'var(--cl-border)',
                color: categoryFilter === opt.key
                  ? (opt.key === 'ALL' ? 'var(--cl-primary-text)' : KB_CATEGORIES[opt.key]?.color || 'var(--cl-primary-text)')
                  : 'var(--cl-text-soft)',
              }}
            >
              {opt.label}
            </button>
          ))}
          {(search || categoryFilter !== 'ALL') && (
            <span style={{ fontSize: 12, color: 'var(--cl-text-faint)', marginLeft: 4 }}>
              {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Two-column layout — no tabs */}
      <Row gutter={[16, 16]}>
        {/* Left — article list */}
        <Col xs={24} lg={9}>
          <div style={panelStyle}>
            <div style={{ maxHeight: 'calc(100vh - 290px)', overflowY: 'auto' }}>
              {loading ? (
                <div style={{ padding: 40, textAlign: 'center' }}><Spin /></div>
              ) : filtered.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center' }}>
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Nenhum artigo encontrado" />
                </div>
              ) : (
                filtered.map(article => {
                  const isSelected = selectedArticle?.id === article.id;
                  return (
                    <div
                      key={article.id}
                      onClick={() => selectArticle(article.id)}
                      style={{
                        padding: '12px 16px',
                        borderBottom: '1px solid var(--cl-border)',
                        cursor: 'pointer',
                        background: isSelected ? 'rgba(37,99,235,0.08)' : 'transparent',
                        borderLeft: isSelected ? '3px solid var(--cl-primary)' : '3px solid transparent',
                        transition: 'background 0.15s',
                        opacity: article.active === false ? 0.5 : 1,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, color: 'var(--cl-text-hi)', fontSize: 13, marginBottom: 4, lineHeight: 1.4 }}>
                            {article.title}
                          </div>
                          <div style={{
                            fontSize: 12, color: 'var(--cl-text-muted)',
                            overflow: 'hidden', display: '-webkit-box',
                            WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                            lineHeight: 1.5, marginBottom: 6,
                          }}>
                            {article.content}
                          </div>
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                            <CategoryBadge category={article.category} small />
                            {article.attachments?.length > 0 && (
                              <span style={{ fontSize: 11, color: 'var(--cl-text-faint)' }}>
                                <PaperClipOutlined /> {article.attachments.length}
                              </span>
                            )}
                            {article.tags && (
                              <span style={{ fontSize: 11, color: 'var(--cl-text-faint)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>
                                🏷 {article.tags}
                              </span>
                            )}
                            {article.active === false && (
                              <Tag style={{ fontSize: 10, margin: 0, lineHeight: '16px' }}>Inativo</Tag>
                            )}
                          </div>
                        </div>
                        <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--cl-primary-text)', fontWeight: 700, flexShrink: 0 }}>
                          #{String(article.code).padStart(4, '0')}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </Col>

        {/* Right — article detail or AI panel (no tab switching) */}
        <Col xs={24} lg={15}>
          <div style={{ ...panelStyle, position: 'sticky', top: 16 }}>
            <div style={{ maxHeight: 'calc(100vh - 220px)', overflowY: 'auto' }}>
              {showAi ? (
                <div style={{ padding: 24 }}>
                  <AiPanel
                    question={aiQuestion}
                    onQuestionChange={setAiQuestion}
                    onQuery={handleAiQuery}
                    loading={aiLoading}
                    answer={aiAnswer}
                    sources={aiSources}
                    onSelectSource={id => selectArticle(id)}
                  />
                </div>
              ) : articleLoading ? (
                <div style={{ padding: 60, textAlign: 'center' }}><Spin size="large" /></div>
              ) : selectedArticle ? (
                <div style={{ padding: 24 }}>
                  <ArticleDetailPanel
                    article={selectedArticle}
                    canEdit={canEdit}
                    onEdit={() => openEdit(selectedArticle)}
                    onDelete={() => setDeleteModal({ id: selectedArticle.id, title: selectedArticle.title })}
                  />
                </div>
              ) : (
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', padding: '80px 24px', textAlign: 'center', gap: 16,
                }}>
                  <BookOutlined style={{ fontSize: 48, color: 'var(--cl-text-dim)' }} />
                  <div>
                    <p style={{ color: 'var(--cl-text-hi)', fontSize: 15, fontWeight: 600, margin: '0 0 6px' }}>
                      Selecione um artigo para leitura
                    </p>
                    <p style={{ color: 'var(--cl-text-muted)', fontSize: 13, margin: 0 }}>
                      Ou use a IA para encontrar o que precisa rapidamente
                    </p>
                  </div>
                  <Button
                    icon={<RobotOutlined />}
                    onClick={() => setShowAi(true)}
                    style={{
                      borderRadius: 8, fontWeight: 600,
                      color: 'var(--cl-purple)',
                      borderColor: 'rgba(139,92,246,0.35)',
                      background: 'rgba(139,92,246,0.08)',
                    }}
                  >
                    Consultar IA
                  </Button>
                </div>
              )}
            </div>
          </div>
        </Col>
      </Row>

      {/* Modal — Create / Edit */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(37,99,235,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BookOutlined style={{ color: 'var(--cl-primary-text)', fontSize: 16 }} />
            </div>
            <span style={{ fontWeight: 700, fontSize: 16 }}>
              {editing ? 'Editar Artigo' : 'Novo Artigo'}
            </span>
          </div>
        }
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        centered
        width={680}
        styles={{ body: { padding: '24px 0 8px' } }}
        footer={
          <Space>
            <Button onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="primary" loading={saving} onClick={() => form.submit()}
              style={{ background: 'var(--cl-primary)', borderColor: 'var(--cl-primary)', fontWeight: 600 }}>
              {editing ? 'Salvar Alterações' : 'Cadastrar'}
            </Button>
          </Space>
        }
      >
        <div style={{ padding: '0 24px' }}>
          <Form form={form} layout="vertical" onFinish={handleSubmit}>
            <Form.Item name="title" label="Título" rules={[{ required: true, message: 'Informe o título' }]}>
              <Input placeholder="Título do artigo" size="large" />
            </Form.Item>

            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item name="category" label="Categoria" rules={[{ required: true, message: 'Selecione a categoria' }]}>
                  <Select placeholder="Selecione" size="large">
                    {Object.entries(KB_CATEGORIES).map(([k, v]) => (
                      <Option key={k} value={k}>{v.icon} {v.label}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item name="tags" label="Tags (opcional)">
                  <Input placeholder="Ex: smtp, email, configuração" size="large" />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item name="content" label="Conteúdo" rules={[{ required: true, message: 'Informe o conteúdo' }]}>
              <TextArea
                placeholder="Descreva o problema, solução ou configuração detalhadamente..."
                rows={8}
                style={{ resize: 'vertical' }}
              />
            </Form.Item>

            {editing && (
              <Form.Item name="active" label="Status">
                <Select size="large" style={{ width: 160 }}>
                  <Option value={true}>Ativo</Option>
                  <Option value={false}>Inativo</Option>
                </Select>
              </Form.Item>
            )}

            <Form.Item
              label={
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <PaperClipOutlined style={{ fontSize: 15 }} />
                  <span>Anexos</span>
                  {fileList.length > 0 && (
                    <span style={{ background: 'var(--cl-primary)', color: '#fff', borderRadius: 10, fontSize: 11, fontWeight: 600, padding: '1px 7px', lineHeight: '18px' }}>
                      {fileList.length}
                    </span>
                  )}
                  <span style={{ color: 'var(--cl-text-muted)', fontSize: 12, fontWeight: 400 }}>
                    opcional · máx. 10MB · PDF, Word, Excel, imagens, ZIP
                  </span>
                </div>
              }
            >
              <Upload
                fileList={fileList}
                beforeUpload={beforeUpload}
                onChange={({ fileList: nl }) => setFileList(nl.map(f => ({ ...f, status: 'done' })))}
                onPreview={handlePreview}
                multiple
                accept=".pdf,.txt,.doc,.docx,.xls,.xlsx,.csv,.png,.jpg,.jpeg,.zip,.rar"
                listType="picture-card"
                style={{ width: '100%' }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, color: 'var(--cl-text-soft)', fontSize: 12 }}>
                  <PlusOutlined style={{ fontSize: 16 }} />
                  <span>Adicionar</span>
                </div>
              </Upload>
            </Form.Item>
          </Form>
        </div>
      </Modal>

      {/* Modal — Preview de anexo */}
      <Modal open={previewOpen} title={previewTitle} footer={null} centered onCancel={() => setPreviewOpen(false)}>
        <img alt="preview" style={{ width: '100%', borderRadius: 8 }} src={previewImage} />
      </Modal>

      {/* Modal — Delete confirmation */}
      <Modal
        open={!!deleteModal}
        onCancel={() => setDeleteModal(null)}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ExclamationCircleOutlined style={{ color: 'var(--cl-danger)', fontSize: 20 }} />
            <span style={{ fontWeight: 700 }}>Excluir artigo</span>
          </div>
        }
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setDeleteModal(null)}>Cancelar</Button>
            <Button danger type="primary" loading={deleteLoading} onClick={handleDelete}>
              Excluir permanentemente
            </Button>
          </div>
        }
      >
        {deleteModal && (
          <div style={{ padding: '8px 0' }}>
            <p>
              Deseja excluir o artigo <strong>"{deleteModal.title}"</strong>?
              Todos os anexos vinculados também serão removidos. Esta ação não pode ser desfeita.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}

function ArticleDetailPanel({ article, canEdit, onEdit, onDelete }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    const tags = article.tags ? `\nTags: ${article.tags}\n` : '';
    const text = `${article.title}\n${tags}\n${article.content ?? ''}`.trim();
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div>
      {/* Top bar: category + code + actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <CategoryBadge category={article.category} />
          <span style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--cl-primary-text)', fontWeight: 700 }}>
            #{String(article.code).padStart(4, '0')}
          </span>
          {!article.active && (
            <Tag color="default" style={{ fontSize: 11 }}>Inativo</Tag>
          )}
        </div>
        <Space size={4}>
          <Tooltip title={copied ? 'Copiado!' : 'Copiar conteúdo'}>
            <Button
              type="text"
              icon={copied ? <CheckOutlined style={{ color: 'var(--cl-success)' }} /> : <CopyOutlined />}
              size="small"
              style={{ color: copied ? 'var(--cl-success)' : 'var(--cl-text-soft)' }}
              onClick={handleCopy}
            />
          </Tooltip>
          {canEdit && (
            <>
              <Tooltip title="Editar">
                <Button type="text" icon={<EditOutlined />} size="small"
                  style={{ color: 'var(--cl-text-soft)' }} onClick={onEdit} />
              </Tooltip>
              <Tooltip title="Excluir">
                <Button type="text" icon={<DeleteOutlined />} size="small" danger onClick={onDelete} />
              </Tooltip>
            </>
          )}
        </Space>
      </div>

      {/* Title */}
      <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--cl-text-hi)', marginBottom: 10, lineHeight: 1.35 }}>
        {article.title}
      </h2>

      {/* Tags */}
      {article.tags && (
        <div style={{ marginBottom: 14 }}>
          {article.tags.split(',').map(t => t.trim()).filter(Boolean).map(tag => (
            <Tag key={tag} style={{ fontSize: 11, borderRadius: 20, marginBottom: 4 }}>{tag}</Tag>
          ))}
        </div>
      )}

      <Divider style={{ margin: '14px 0' }} />

      {/* Content */}
      <div style={{
        fontSize: 14, color: 'var(--cl-text)', lineHeight: 1.75,
        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
      }}>
        {article.content}
      </div>

      {/* Attachments */}
      {article.attachments?.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <Divider style={{ margin: '16px 0 14px' }} />
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--cl-text-soft)', marginBottom: 10 }}>
            <PaperClipOutlined /> Anexos ({article.attachments.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {article.attachments.map(att => (
              <div key={att.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 12px', borderRadius: 8,
                background: 'var(--cl-bg-input)', border: '1px solid var(--cl-border)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 18 }}>{fileIcon(att.mimeType)}</span>
                  <div>
                    <div style={{ fontSize: 13, color: 'var(--cl-text-hi)', fontWeight: 500 }}>{att.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--cl-text-faint)' }}>{formatSize(att.size)}</div>
                  </div>
                </div>
                {att.data && (
                  <Tooltip title="Baixar arquivo">
                    <Button type="text" icon={<DownloadOutlined />} size="small"
                      style={{ color: 'var(--cl-primary-text)' }} onClick={() => downloadAttachment(att)} />
                  </Tooltip>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AiPanel({ question, onQuestionChange, onQuery, loading, answer, sources, onSelectSource }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12,
          background: 'rgba(139,92,246,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <RobotOutlined style={{ color: 'var(--cl-purple)', fontSize: 20 }} />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--cl-text-hi)' }}>
            Assistente de Conhecimento
          </div>
          <div style={{ fontSize: 12, color: 'var(--cl-text-faint)' }}>
            Powered by Claude AI · busca na base de conhecimento
          </div>
        </div>
      </div>

      <TextArea
        value={question}
        onChange={e => onQuestionChange(e.target.value)}
        placeholder="Descreva sua dúvida, erro ou o que precisa configurar..."
        rows={4}
        style={{ marginBottom: 10, resize: 'none' }}
        onKeyDown={e => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) onQuery();
        }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <span style={{ fontSize: 11, color: 'var(--cl-text-faint)' }}>Ctrl+Enter para enviar</span>
        <Button
          type="primary" icon={<SendOutlined />} loading={loading}
          onClick={onQuery} disabled={!question.trim()}
          style={{ background: 'var(--cl-purple)', borderColor: 'var(--cl-purple)', borderRadius: 8, fontWeight: 600 }}
        >
          Perguntar
        </Button>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <Spin />
          <p style={{ color: 'var(--cl-text-muted)', fontSize: 13, marginTop: 8 }}>Consultando base de conhecimento...</p>
        </div>
      )}

      {!loading && answer && (
        <div>
          <div style={{
            background: 'rgba(139,92,246,0.08)',
            border: '1px solid rgba(139,92,246,0.2)',
            borderRadius: 10, padding: '16px 18px', marginBottom: 16,
          }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--cl-purple)', marginBottom: 10 }}>
              <RobotOutlined /> Resposta da IA
            </div>
            <div style={{ fontSize: 14, color: 'var(--cl-text)', lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>
              {answer}
            </div>
          </div>

          {sources.length > 0 && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--cl-text-soft)', marginBottom: 8 }}>
                Fontes utilizadas ({sources.length}):
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {sources.map(s => (
                  <div
                    key={s.id}
                    onClick={() => onSelectSource(s.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '8px 12px', borderRadius: 8, cursor: 'pointer',
                      background: 'var(--cl-bg-input)', border: '1px solid var(--cl-border)',
                      transition: 'border-color 0.15s',
                    }}
                  >
                    <CategoryBadge category={s.category} small />
                    <span style={{ fontSize: 13, color: 'var(--cl-text-hi)', fontWeight: 500 }}>
                      {s.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!loading && answer === null && sources.length > 0 && (
        <div>
          <div style={{
            background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.2)',
            borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: 'var(--cl-primary-text)',
          }}>
            IA indisponível no momento. Artigos relacionados encontrados:
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {sources.map(s => (
              <div
                key={s.id}
                onClick={() => onSelectSource(s.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 12px', borderRadius: 8, cursor: 'pointer',
                  background: 'var(--cl-bg-input)', border: '1px solid var(--cl-border)',
                }}
              >
                <CategoryBadge category={s.category} small />
                <span style={{ fontSize: 13, color: 'var(--cl-text-hi)', fontWeight: 500 }}>{s.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && answer === null && sources.length === 0 && question && (
        <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--cl-text-faint)', fontSize: 13 }}>
          <InboxOutlined style={{ fontSize: 32, marginBottom: 8 }} />
          <p>Nenhum resultado encontrado. Tente reformular a pergunta.</p>
        </div>
      )}
    </div>
  );
}
