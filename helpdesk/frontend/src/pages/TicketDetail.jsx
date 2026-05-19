import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Tag, Button, Select, Space, Typography, Divider, Input, Modal,
  Avatar, Spin, Alert, Row, Col, Tooltip, message, Badge,
} from 'antd';
import {
  ArrowLeftOutlined, SendOutlined, ExclamationCircleOutlined, ClockCircleOutlined,
  DeleteOutlined, PaperClipOutlined, DownloadOutlined, FileOutlined, EditOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { ticketService, userService, categoryService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { TICKET_STATUS, PRIORITY, ROLES, canAssignTickets, canUpdateTicketStatus } from '../utils/constants';

const { Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const roleColors = {
  SUPER_ADMIN: { bg: '#f3e8ff', color: '#7c3aed' },
  ADMIN: { bg: '#dbeafe', color: '#1d4ed8' },
  AGENT: { bg: '#dcfce7', color: '#15803d' },
  CLIENT: { bg: '#f3f4f6', color: '#374151' },
};

export default function TicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [ticket, setTicket] = useState(null);
  const [agents, setAgents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [comment, setComment] = useState('');
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  const load = () => {
    ticketService.get(id)
      .then(setTicket)
      .catch(() => message.error('Chamado não encontrado'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    categoryService.list().then(setCategories);
    if (canAssignTickets(user?.role)) {
      userService.list({ role: 'AGENT' }).then(setAgents);
    }
  }, [id, user]);

  const handleSaveEdit = async () => {
    if (!editTitle.trim()) { message.warning('O título não pode ficar em branco'); return; }
    setEditSaving(true);
    try {
      const updated = await ticketService.update(id, { title: editTitle.trim(), description: editDescription });
      setTicket(updated);
      setEditMode(false);
      message.success('Chamado atualizado');
    } catch (err) {
      message.error(err.response?.data?.error || 'Erro ao salvar');
    } finally {
      setEditSaving(false);
    }
  };

  const handleUpdate = async (field, value) => {
    try {
      const updated = await ticketService.update(id, { [field]: value });
      setTicket(updated);
      message.success('Atualizado');
    } catch (err) {
      message.error(err.response?.data?.error || 'Erro ao atualizar');
    }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await ticketService.remove(id);
      message.success('Chamado excluído com sucesso');
      navigate('/app/tickets');
    } catch (err) {
      message.error(err.response?.data?.error || 'Erro ao excluir chamado');
      setDeleteLoading(false);
    }
  };

  const handleComment = async () => {
    if (!comment.trim()) return;
    setSending(true);
    try {
      const newComment = await ticketService.addComment(id, { message: comment });
      setTicket(prev => ({ ...prev, comments: [...prev.comments, newComment] }));
      setComment('');
    } catch (err) {
      message.error(err.response?.data?.error || 'Erro ao enviar');
    } finally {
      setSending(false);
    }
  };

  const downloadAttachment = (att) => {
    const link = document.createElement('a');
    link.href = `data:${att.mimeType};base64,${att.data}`;
    link.download = att.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
      <Spin size="large" />
    </div>
  );
  if (!ticket) return <Alert type="error" message="Chamado não encontrado" />;

  const isExpired = ticket.slaDeadline && !['RESOLVED', 'CLOSED', 'CANCELLED'].includes(ticket.status)
    && dayjs(ticket.slaDeadline).isBefore(dayjs());

  const isClosed = ['CLOSED', 'CANCELLED'].includes(ticket.status);
  const isResolved = ticket.status === 'RESOLVED';
  const canEdit = canUpdateTicketStatus(user?.role);

  return (
    <div>
      <Button
        type="text"
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/app/tickets')}
        style={{ color: '#6b7280', marginBottom: 16, padding: 0 }}
      >
        Voltar para Chamados
      </Button>

      <Row gutter={[20, 20]}>
        {/* Coluna principal */}
        <Col xs={24} lg={16}>
          {/* Cabeçalho do chamado */}
          <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', padding: 24, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <Space wrap>
                <Tag color={TICKET_STATUS[ticket.status]?.color} style={{ borderRadius: 6 }}>
                  {TICKET_STATUS[ticket.status]?.label}
                </Tag>
                <Tag color={PRIORITY[ticket.priority]?.color} style={{ borderRadius: 6 }}>
                  {PRIORITY[ticket.priority]?.label}
                </Tag>
                {isExpired && (
                  <Tag color="red" icon={<ExclamationCircleOutlined />} style={{ borderRadius: 6 }}>
                    SLA Vencido
                  </Tag>
                )}
                <code style={{ fontSize: 11, color: '#9ca3af', background: '#f3f4f6', padding: '2px 8px', borderRadius: 4 }}>
                  #{ticket.id.slice(-8).toUpperCase()}
                </code>
              </Space>
              {canEdit && !isResolved && !isClosed && !editMode && (
                <Button
                  icon={<EditOutlined />}
                  size="small"
                  style={{ borderRadius: 6, flexShrink: 0, marginLeft: 8 }}
                  onClick={() => { setEditTitle(ticket.title); setEditDescription(ticket.description); setEditMode(true); }}
                >
                  Editar
                </Button>
              )}
            </div>

            {editMode ? (
              <>
                <Input
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  style={{ fontWeight: 700, fontSize: 16, marginBottom: 12, borderRadius: 8 }}
                  placeholder="Título do chamado"
                />
                <TextArea
                  rows={5}
                  value={editDescription}
                  onChange={e => setEditDescription(e.target.value)}
                  style={{ borderRadius: 8, resize: 'vertical' }}
                  placeholder="Descrição do chamado"
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                  <Button onClick={() => setEditMode(false)}>Cancelar</Button>
                  <Button
                    type="primary"
                    loading={editSaving}
                    onClick={handleSaveEdit}
                    style={{ background: '#16a34a', borderColor: '#16a34a', borderRadius: 8, fontWeight: 600 }}
                  >
                    Salvar Alterações
                  </Button>
                </div>
              </>
            ) : (
              <>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: '0 0 12px' }}>
                  {ticket.title}
                </h2>
                <Paragraph style={{ color: '#374151', whiteSpace: 'pre-wrap', margin: 0, lineHeight: 1.7 }}>
                  {ticket.description}
                </Paragraph>
              </>
            )}
          </div>

          {/* Anexos */}
          {ticket.attachments?.length > 0 && (
            <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', padding: 24, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <Badge count={ticket.attachments.length} color="#6b7280" size="small">
                  <PaperClipOutlined style={{ fontSize: 16, color: '#374151' }} />
                </Badge>
                <h3 style={{ fontWeight: 700, fontSize: 15, color: '#111827', margin: 0 }}>
                  Anexos ({ticket.attachments.length})
                </h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {ticket.attachments.map(att => (
                  <div key={att.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 14px', borderRadius: 8, border: '1px solid #e5e7eb',
                    background: '#f9fafb',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                      <FileOutlined style={{ color: '#6b7280', fontSize: 18, flexShrink: 0 }} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {att.name}
                        </div>
                        <div style={{ fontSize: 11, color: '#9ca3af' }}>{formatSize(att.size)}</div>
                      </div>
                    </div>
                    <Tooltip title="Baixar">
                      <Button
                        type="text"
                        icon={<DownloadOutlined />}
                        size="small"
                        style={{ color: '#16a34a', flexShrink: 0 }}
                        onClick={() => downloadAttachment(att)}
                      />
                    </Tooltip>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Comentários */}
          <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', padding: 24 }}>
            <h3 style={{ fontWeight: 700, fontSize: 15, color: '#111827', margin: '0 0 20px' }}>
              Comentários ({ticket.comments.length})
            </h3>

            {ticket.comments.length === 0 && (
              <div style={{ textAlign: 'center', padding: '24px 0', color: '#9ca3af', fontSize: 14 }}>
                Nenhum comentário ainda. Seja o primeiro a responder.
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {ticket.comments.map(c => {
                const isAgent = ['SUPER_ADMIN', 'ADMIN', 'AGENT'].includes(c.user.role);
                return (
                  <div key={c.id} style={{
                    display: 'flex', gap: 12,
                    flexDirection: isAgent ? 'row' : 'row-reverse',
                  }}>
                    <Avatar
                      size={36}
                      style={{
                        background: roleColors[c.user.role]?.bg,
                        color: roleColors[c.user.role]?.color,
                        fontWeight: 700, fontSize: 14, flexShrink: 0,
                      }}
                    >
                      {c.user.name?.charAt(0).toUpperCase()}
                    </Avatar>
                    <div style={{ flex: 1, maxWidth: '80%' }}>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4,
                        flexDirection: isAgent ? 'row' : 'row-reverse',
                      }}>
                        <span style={{ fontWeight: 600, fontSize: 13, color: '#111827' }}>{c.user.name}</span>
                        <span style={{
                          fontSize: 11, padding: '1px 8px', borderRadius: 4,
                          background: roleColors[c.user.role]?.bg, color: roleColors[c.user.role]?.color, fontWeight: 600,
                        }}>
                          {ROLES[c.user.role]?.label}
                        </span>
                        <span style={{ fontSize: 11, color: '#9ca3af' }}>
                          {dayjs(c.createdAt).format('DD/MM HH:mm')}
                        </span>
                      </div>
                      <div style={{
                        padding: '10px 14px', borderRadius: 8, fontSize: 14, lineHeight: 1.6,
                        background: isAgent ? '#f0fdf4' : '#f9fafb',
                        color: '#374151', whiteSpace: 'pre-wrap',
                        border: `1px solid ${isAgent ? '#bbf7d0' : '#e5e7eb'}`,
                      }}>
                        {c.message}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {!isClosed && (
              <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid #f3f4f6' }}>
                <TextArea
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  rows={3}
                  placeholder="Escreva um comentário..."
                  style={{ borderRadius: 8, resize: 'none' }}
                  onKeyDown={e => { if (e.ctrlKey && e.key === 'Enter') handleComment(); }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                  <Button
                    type="primary"
                    icon={<SendOutlined />}
                    loading={sending}
                    onClick={handleComment}
                    disabled={!comment.trim()}
                    style={{ background: '#16a34a', borderColor: '#16a34a', borderRadius: 8 }}
                  >
                    Enviar
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Col>

        {/* Sidebar direita */}
        <Col xs={24} lg={8}>
          <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', padding: 20 }}>
            <h3 style={{ fontWeight: 700, fontSize: 14, color: '#111827', margin: '0 0 16px' }}>Informações</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { label: 'Solicitante', value: ticket.user?.name },
                { label: 'Empresa', value: ticket.company?.name },
                { label: 'Aberto em', value: dayjs(ticket.createdAt).format('DD/MM/YYYY HH:mm') },
                ticket.resolvedAt && { label: 'Resolvido em', value: dayjs(ticket.resolvedAt).format('DD/MM/YYYY HH:mm') },
              ].filter(Boolean).map(item => (
                <div key={item.label}>
                  <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
                    {item.label}
                  </div>
                  <div style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>{item.value}</div>
                </div>
              ))}

              {ticket.slaDeadline && (
                <div>
                  <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
                    Prazo SLA
                  </div>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    fontSize: 13, fontWeight: 600,
                    color: isExpired ? '#dc2626' : '#16a34a',
                  }}>
                    <ClockCircleOutlined />
                    {dayjs(ticket.slaDeadline).format('DD/MM/YYYY HH:mm')}
                    {isExpired && <Tag color="red" style={{ marginLeft: 4, fontSize: 11 }}>Vencido</Tag>}
                  </div>
                </div>
              )}
            </div>

            {!isClosed && canEdit && (
              <>
                <Divider style={{ margin: '16px 0' }} />
                <Button
                  danger block icon={<DeleteOutlined />}
                  onClick={() => setDeleteModal(true)}
                  style={{ borderRadius: 8, fontWeight: 600 }}
                >
                  Excluir chamado
                </Button>
              </>
            )}

            {canEdit && (
              <>
                <Divider style={{ margin: '16px 0' }} />
                <h3 style={{ fontWeight: 700, fontSize: 14, color: '#111827', margin: '0 0 12px' }}>Gerenciar</h3>
                <Space direction="vertical" style={{ width: '100%' }} size={10}>
                  <div>
                    <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, marginBottom: 4 }}>STATUS</div>
                    <Select value={ticket.status} style={{ width: '100%' }} onChange={v => handleUpdate('status', v)} size="small">
                      {Object.entries(TICKET_STATUS).map(([k, { label }]) => <Option key={k} value={k}>{label}</Option>)}
                    </Select>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, marginBottom: 4 }}>PRIORIDADE</div>
                    <Select value={ticket.priority} style={{ width: '100%' }} onChange={v => handleUpdate('priority', v)} size="small">
                      {Object.entries(PRIORITY).map(([k, { label }]) => <Option key={k} value={k}>{label}</Option>)}
                    </Select>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, marginBottom: 4 }}>CATEGORIA</div>
                    <Select value={ticket.categoryId} style={{ width: '100%' }} allowClear placeholder="Sem categoria" onChange={v => handleUpdate('categoryId', v)} size="small">
                      {categories.map(c => <Option key={c.id} value={c.id}>{c.name}</Option>)}
                    </Select>
                  </div>
                  {canAssignTickets(user?.role) && (
                    <div>
                      <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, marginBottom: 4 }}>ATRIBUÍDO A</div>
                      <Select value={ticket.assignedTo} style={{ width: '100%' }} allowClear placeholder="Não atribuído" onChange={v => handleUpdate('assignedTo', v || null)} size="small">
                        {agents.map(a => <Option key={a.id} value={a.id}>{a.name}</Option>)}
                      </Select>
                    </div>
                  )}
                </Space>
              </>
            )}
          </div>
        </Col>
      </Row>
      <Modal
        open={deleteModal}
        onCancel={() => setDeleteModal(false)}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ExclamationCircleOutlined style={{ color: '#dc2626', fontSize: 20 }} />
            <span style={{ fontWeight: 700 }}>Excluir chamado</span>
          </div>
        }
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setDeleteModal(false)}>Cancelar</Button>
            <Button danger type="primary" loading={deleteLoading} onClick={handleDelete}>
              Excluir permanentemente
            </Button>
          </div>
        }
      >
        <div style={{ padding: '8px 0' }}>
          <p style={{ color: '#374151', marginBottom: 16 }}>
            Você está prestes a excluir o chamado <strong>"{ticket?.title}"</strong> permanentemente. Esta ação não pode ser desfeita.
          </p>
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#dc2626', fontWeight: 500 }}>
            Todos os comentários vinculados também serão removidos.
          </div>
        </div>
      </Modal>
    </div>
  );
}
