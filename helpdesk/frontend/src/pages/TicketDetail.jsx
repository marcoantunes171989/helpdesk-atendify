import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import {
  Tag, Button, Select, Space, Typography, Divider, Input, Modal,
  Avatar, Spin, Alert, Row, Col, Tooltip, message, Badge, Upload, Popconfirm,
  DatePicker,
} from 'antd';
import {
  ArrowLeftOutlined, SendOutlined, ExclamationCircleOutlined, ClockCircleOutlined,
  DeleteOutlined, PaperClipOutlined, DownloadOutlined, FileOutlined, EditOutlined,
  EyeOutlined, MessageOutlined, LockOutlined, UnlockOutlined, CheckCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  ticketService, userService, categoryService, companyService,
  employeeService, statusService, technicianService,
} from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import {
  TICKET_STATUS, PRIORITY, ROLES, canAssignTickets, canUpdateTicketStatus,
} from '../utils/constants';

const { Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const CARD = {
  background: 'var(--cl-bg)',
  border: '1px solid var(--cl-border)',
  borderRadius: 12,
};

const roleColors = {
  SUPER_ADMIN: { bg: 'rgba(124,58,237,0.18)', color: '#a78bfa' },
  ADMIN:       { bg: 'rgba(37,99,235,0.18)',  color: '#60a5fa' },
  AGENT:       { bg: 'rgba(37,99,235,0.14)',  color: '#60a5fa' },
  CLIENT:      { bg: 'var(--cl-bg-input)', color: 'var(--cl-text-soft)' },
};

const LABEL_STYLE = {
  fontSize: 11, color: 'var(--cl-text-muted)', fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4,
};

export default function TicketDetail() {
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === 'light';
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [ticket, setTicket] = useState(null);
  const [agents, setAgents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [comment, setComment] = useState('');
  const [commentFiles, setCommentFiles] = useState([]);
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  const [editMode, setEditMode] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCompanyId, setEditCompanyId] = useState(null);
  const [editCategoryId, setEditCategoryId] = useState(null);
  const [editEmployeeId, setEditEmployeeId] = useState(null);
  const [editPriority, setEditPriority] = useState(null);
  const [editStatusId, setEditStatusId] = useState(null);
  const [editAssignedTo, setEditAssignedTo] = useState(null);
  const [editTechnicianId, setEditTechnicianId] = useState(null);
  const [editEmployees, setEditEmployees] = useState([]);
  const [loadingEditEmployees, setLoadingEditEmployees] = useState(false);
  const [technicians, setTechnicians] = useState([]);
  const [editSaving, setEditSaving] = useState(false);

  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [editingCommentFiles, setEditingCommentFiles] = useState([]);
  const [editingCommentDate, setEditingCommentDate] = useState(null);
  const [editingCommentSaving, setEditingCommentSaving] = useState(false);
  const [commentDate, setCommentDate] = useState(dayjs());

  const [tramiteModal, setTramiteModal] = useState(false);
  const [statusChangeModal, setStatusChangeModal] = useState(false);
  const [pendingStatusId, setPendingStatusId] = useState(null);
  const [statusChangeComment, setStatusChangeComment] = useState('');
  const [statusChangeDate, setStatusChangeDate] = useState(dayjs());
  const [statusChangeFiles, setStatusChangeFiles] = useState([]);
  const [statusChangeSaving, setStatusChangeSaving] = useState(false);
  const [commentStatusId, setCommentStatusId] = useState(null);

  const disabledDate = (current) => current && current.isAfter(dayjs(), 'day');
  const disabledTime = (current) => {
    if (!current || !current.isSame(dayjs(), 'day')) return {};
    const now = dayjs();
    const h = now.hour();
    const m = now.minute();
    return {
      disabledHours: () => Array.from({ length: 23 - h }, (_, i) => h + 1 + i),
      disabledMinutes: (hour) => hour === h
        ? Array.from({ length: 59 - m }, (_, i) => m + 1 + i)
        : [],
    };
  };
  const datePickerFooter = () => (
    <div style={{ padding: '4px 2px', fontSize: 12, color: '#f87171', display: 'flex', alignItems: 'center', gap: 5 }}>
      <ExclamationCircleOutlined style={{ fontSize: 11 }} />
      Datas e horários futuros não são permitidos
    </div>
  );

  const load = () => {
    ticketService.get(id)
      .then(setTicket)
      .catch(() => message.error('Chamado não encontrado'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!ticket || !statuses.length) return;
    if (ticket.statusId) {
      setCommentStatusId(ticket.statusId);
    } else {
      const match = statuses.find(s => s.builtinStatus === ticket.status);
      setCommentStatusId(match?.id || statuses[0]?.id || null);
    }
  }, [ticket?.statusId, ticket?.status, statuses.length]);

  useEffect(() => {
    load();
    categoryService.list({ active: 'true' }).then(list => {
      const unique = [...new Map(list.map(c => [c.name.toLowerCase(), c])).values()];
      unique.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
      setCategories(unique);
    });
    if (canAssignTickets(user?.role)) userService.list({ role: 'AGENT' }).then(setAgents);
    if (canUpdateTicketStatus(user?.role)) {
      companyService.list().then(list => setCompanies(list.filter(c => c.active)));
      statusService.list().then(setStatuses);
      technicianService.list({ active: 'true' }).then(list => {
        list.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
        setTechnicians(list);
      });
    }
  }, [id, user]);

  const openEditMode = () => {
    setEditTitle(ticket.title);
    setEditDescription(ticket.description);
    setEditCompanyId(ticket.companyId);
    setEditCategoryId(ticket.categoryId);
    setEditEmployeeId(ticket.employeeId);
    setEditPriority(ticket.priority);
    setEditStatusId(ticket.statusId);
    setEditAssignedTo(ticket.assignedTo);
    setEditTechnicianId(ticket.technicianId);
    if (ticket.companyId) {
      setLoadingEditEmployees(true);
      employeeService.list({ companyId: ticket.companyId, active: 'true' })
        .then(list => {
          list.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
          setEditEmployees(list);
        })
        .finally(() => setLoadingEditEmployees(false));
    }
    setEditMode(true);
  };

  const handleEditCompanyChange = (val) => {
    setEditCompanyId(val);
    setEditEmployeeId(null);
    setEditEmployees([]);
    if (val) {
      setLoadingEditEmployees(true);
      employeeService.list({ companyId: val, active: 'true' })
        .then(list => {
          list.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
          setEditEmployees(list);
        })
        .finally(() => setLoadingEditEmployees(false));
    }
  };

  const handleSaveEdit = async () => {
    if (!editTitle.trim()) { message.warning('O título não pode ficar em branco'); return; }
    setEditSaving(true);
    try {
      const updated = await ticketService.update(id, {
        title: editTitle.trim(),
        description: editDescription,
        companyId: editCompanyId,
        categoryId: editCategoryId || null,
        employeeId: editEmployeeId || null,
        priority: editPriority,
        statusId: editStatusId || null,
        technicianId: editTechnicianId || null,
        assignedTo: editAssignedTo || null,
      });
      setTicket(updated);
      setEditMode(false);
      message.success('Chamado atualizado');
    } catch (err) {
      message.error(err.response?.data?.error || 'Erro ao salvar');
    } finally {
      setEditSaving(false);
    }
  };

  const openStatusChangeModal = (statusId) => {
    setPendingStatusId(statusId);
    setStatusChangeComment('');
    setStatusChangeDate(dayjs());
    setStatusChangeFiles([]);
    setStatusChangeModal(true);
  };

  const handleStatusChange = (v) => openStatusChangeModal(v);

  const handleStatusChangeConfirm = async () => {
    if (!statusChangeComment.trim()) { message.warning('Informe um trâmite para a mudança de status'); return; }
    setStatusChangeSaving(true);
    try {
      const selectedStatus = statuses.find(s => s.id === pendingStatusId);
      const builtinStatus = selectedStatus?.builtinStatus;
      let msg = statusChangeComment.trim();
      if (builtinStatus === 'RESOLVED') msg = `::SYS_RESOLVED:: ${msg}`;
      else if (builtinStatus === 'OPEN') msg = `::SYS_REOPENED:: ${msg}`;
      await ticketService.addComment(id, {
        message: msg,
        attachments: statusChangeFiles,
        createdAt: statusChangeDate?.toISOString(),
      });
      const updated = await ticketService.update(id, { statusId: pendingStatusId });
      setTicket(updated);
      setStatusChangeModal(false);
      message.success('Status atualizado');
    } catch (err) {
      message.error(err.response?.data?.error || 'Erro ao atualizar status');
    } finally {
      setStatusChangeSaving(false);
    }
  };

  const addStatusChangeFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target.result.split(',')[1];
      setStatusChangeFiles(prev => [...prev, { name: file.name, mimeType: file.type, size: file.size, data: base64 }]);
    };
    reader.readAsDataURL(file);
    return false;
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
    if (!comment.trim()) { message.warning('Escreva um trâmite'); return; }
    if (!commentStatusId) { message.warning('Selecione um status'); return; }
    setSending(true);
    try {
      const selectedStatus = statuses.find(s => s.id === commentStatusId);
      const builtinStatus = selectedStatus?.builtinStatus;
      let msg = comment.trim();
      if (builtinStatus === 'RESOLVED') msg = `::SYS_RESOLVED:: ${msg}`;
      else if (builtinStatus === 'OPEN' && ticket.status !== 'OPEN') msg = `::SYS_REOPENED:: ${msg}`;
      await ticketService.addComment(id, {
        message: msg,
        attachments: commentFiles,
        createdAt: commentDate?.toISOString(),
      });
      if (commentStatusId !== ticket.statusId) {
        await ticketService.update(id, { statusId: commentStatusId });
      }
      load();
      setComment('');
      setCommentFiles([]);
      setCommentDate(dayjs());
      setTramiteModal(false);
    } catch (err) {
      message.error(err.response?.data?.error || 'Erro ao gravar trâmite');
    } finally {
      setSending(false);
    }
  };

  const handleUpdateComment = async (commentId) => {
    if (!editingCommentText.trim()) { message.warning('O texto não pode ficar em branco'); return; }
    setEditingCommentSaving(true);
    try {
      const updated = await ticketService.updateComment(id, commentId, {
        message: editingCommentText,
        attachments: editingCommentFiles,
        createdAt: editingCommentDate?.toISOString(),
      });
      setTicket(prev => ({
        ...prev,
        comments: prev.comments.map(c => c.id === commentId ? updated : c),
      }));
      setEditingCommentId(null);
      setEditingCommentFiles([]);
      setEditingCommentDate(null);
      message.success('Trâmite atualizado');
    } catch (err) {
      message.error(err.response?.data?.error || 'Erro ao atualizar');
    } finally {
      setEditingCommentSaving(false);
    }
  };

  const addEditingCommentFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target.result.split(',')[1];
      setEditingCommentFiles(prev => [...prev, { name: file.name, mimeType: file.type, size: file.size, data: base64 }]);
    };
    reader.readAsDataURL(file);
    return false;
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await ticketService.deleteComment(id, commentId);
      setTicket(prev => ({ ...prev, comments: prev.comments.filter(c => c.id !== commentId) }));
      message.success('Trâmite removido');
    } catch (err) {
      message.error(err.response?.data?.error || 'Erro ao remover trâmite');
    }
  };

  const addCommentFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target.result.split(',')[1];
      setCommentFiles(prev => [...prev, { name: file.name, mimeType: file.type, size: file.size, data: base64 }]);
    };
    reader.readAsDataURL(file);
    return false;
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
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300, background: 'var(--cl-page-bg)' }}>
      <Spin size="large" />
    </div>
  );
  if (!ticket) return <Alert type="error" message="Chamado não encontrado" />;

  const isExpired = ticket.slaDeadline && !['RESOLVED', 'CLOSED', 'CANCELLED'].includes(ticket.status)
    && dayjs(ticket.slaDeadline).isBefore(dayjs());
  const isClosed = ['CLOSED', 'CANCELLED'].includes(ticket.status);
  const isResolved = ticket.status === 'RESOLVED';
  const canEdit = canUpdateTicketStatus(user?.role);

  const renderAttachment = (att, compact = false) => {
    const isImage = att.mimeType.startsWith('image/');
    const src = `data:${att.mimeType};base64,${att.data}`;

    if (compact) {
      return isImage ? (
        <img
          key={att.id}
          src={src}
          alt={att.name}
          title={att.name}
          style={{ width: 52, height: 52, objectFit: 'cover', borderRadius: 6, cursor: 'pointer', border: '1px solid var(--cl-border-input)', flexShrink: 0 }}
          onClick={() => setPreviewImage({ src, name: att.name })}
        />
      ) : (
        <Tooltip key={att.id} title={`${att.name} (${formatSize(att.size)})`}>
          <Button
            type="text"
            icon={<FileOutlined />}
            size="small"
            style={{ color: 'var(--cl-text-muted)' }}
            onClick={() => downloadAttachment(att)}
          />
        </Tooltip>
      );
    }

    return (
      <div key={att.id} style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 14px', borderRadius: 8,
        border: '1px solid var(--cl-border)',
        background: 'var(--cl-bg)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          {isImage ? (
            <img
              src={src}
              alt={att.name}
              style={{ width: 52, height: 52, objectFit: 'cover', borderRadius: 6, cursor: 'pointer', flexShrink: 0 }}
              onClick={() => setPreviewImage({ src, name: att.name })}
            />
          ) : (
            <FileOutlined style={{ color: 'var(--cl-text-muted)', fontSize: 18, flexShrink: 0 }} />
          )}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--cl-text-hi)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {att.name}
            </div>
            <div style={{ fontSize: 11, color: 'var(--cl-text-faint)' }}>{formatSize(att.size)}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          {isImage && (
            <Tooltip title="Visualizar">
              <Button type="text" icon={<EyeOutlined />} size="small"
                style={{ color: 'var(--cl-text-muted)' }} onClick={() => setPreviewImage({ src, name: att.name })} />
            </Tooltip>
          )}
          <Tooltip title="Baixar">
            <Button type="text" icon={<DownloadOutlined />} size="small"
              style={{ color: '#60a5fa' }} onClick={() => downloadAttachment(att)} />
          </Tooltip>
        </div>
      </div>
    );
  };

  return (
    <div className="page-wrap">
      <Button
        type="text"
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/app/tickets')}
        style={{ color: 'var(--cl-text-soft)', marginBottom: 16, padding: 0 }}
      >
        Voltar para Chamados
      </Button>

      <Row gutter={[20, 20]}>
        {/* Coluna principal */}
        <Col xs={24} lg={16}>

          {/* Cabeçalho */}
          <div style={{ ...CARD, padding: 24, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <Space wrap>
                {ticket.ticketStatus ? (
                  <Tag style={{
                    borderRadius: 6, fontWeight: 600,
                    background: isLight ? 'transparent' : ticket.ticketStatus.color + '22',
                    color: ticket.ticketStatus.color,
                    borderColor: isLight ? 'transparent' : ticket.ticketStatus.color + '55',
                  }}>
                    <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: ticket.ticketStatus.color, marginRight: 5, verticalAlign: 'middle' }} />
                    {ticket.ticketStatus.name}
                  </Tag>
                ) : (
                  <Tag color={TICKET_STATUS[ticket.status]?.color} style={{ borderRadius: 6, background: isLight ? 'transparent' : undefined, border: isLight ? 'none' : undefined }}>
                    {TICKET_STATUS[ticket.status]?.label}
                  </Tag>
                )}
                <Tag color={PRIORITY[ticket.priority]?.color} style={{ borderRadius: 6, background: isLight ? 'transparent' : undefined, border: isLight ? 'none' : undefined }}>
                  {PRIORITY[ticket.priority]?.label}
                </Tag>
                {isExpired && (
                  <Tag color="red" icon={<ExclamationCircleOutlined />} style={{ borderRadius: 6, background: isLight ? 'transparent' : undefined, border: isLight ? 'none' : undefined }}>
                    SLA Vencido
                  </Tag>
                )}
                <code style={{ fontSize: 11, color: 'var(--cl-text-faint)', background: 'var(--cl-bg-soft)', padding: '2px 8px', borderRadius: 4 }}>
                  #{ticket.id.slice(-8).toUpperCase()}
                </code>
              </Space>
              {canEdit && !isResolved && !isClosed && !editMode && (
                <Button
                  icon={<EditOutlined />}
                  size="small"
                  style={{ borderRadius: 6, flexShrink: 0, marginLeft: 8 }}
                  onClick={openEditMode}
                >
                  Editar
                </Button>
              )}
              {canEdit && isResolved && !editMode && (
                <Tooltip title="Chamado finalizado — clique para reabrir">
                  <Button
                    icon={<LockOutlined />}
                    size="small"
                    style={{ borderRadius: 6, flexShrink: 0, marginLeft: 8, color: '#60a5fa', borderColor: '#2563eb' }}
                    onClick={() => {
                      const openStatus = statuses.find(s => s.builtinStatus === 'OPEN');
                      if (openStatus) openStatusChangeModal(openStatus.id);
                    }}
                  >
                    Reabrir
                  </Button>
                </Tooltip>
              )}
            </div>

            {editMode ? (
              <div>
                <div style={{ marginBottom: 12 }}>
                  <div style={LABEL_STYLE}>Título</div>
                  <Input
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    style={{ borderRadius: 8 }}
                    placeholder="Título do chamado"
                  />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <div style={LABEL_STYLE}>Descrição</div>
                  <TextArea
                    rows={4}
                    value={editDescription}
                    onChange={e => setEditDescription(e.target.value)}
                    style={{ borderRadius: 8, resize: 'vertical' }}
                    placeholder="Descrição do chamado"
                  />
                </div>
                <Row gutter={12} style={{ marginBottom: 12 }}>
                  <Col xs={24} sm={12}>
                    <div style={LABEL_STYLE}>Empresa</div>
                    <Select
                      value={editCompanyId}
                      style={{ width: '100%' }}
                      onChange={handleEditCompanyChange}
                      showSearch
                      placeholder="Selecione a empresa"
                      filterOption={(input, option) => {
                        const c = companies.find(co => co.id === option.value);
                        const q = input.toLowerCase();
                        return (
                          c?.name?.toLowerCase().includes(q) ||
                          (c?.fantasia || '').toLowerCase().includes(q)
                        );
                      }}
                    >
                      {companies.map(c => (
                        <Option key={c.id} value={c.id}>
                          <div style={{ lineHeight: 1.3 }}>
                            <div>{c.name}</div>
                            {c.fantasia && (
                              <div style={{ fontSize: 11, color: 'var(--cl-text-muted)', marginTop: 1 }}>{c.fantasia}</div>
                            )}
                          </div>
                        </Option>
                      ))}
                    </Select>
                  </Col>
                  <Col xs={24} sm={12}>
                    <div style={LABEL_STYLE}>Funcionário</div>
                    <Select
                      value={editEmployeeId}
                      style={{ width: '100%' }}
                      onChange={setEditEmployeeId}
                      allowClear
                      placeholder="Selecione o funcionário"
                      loading={loadingEditEmployees}
                      showSearch
                      optionFilterProp="children"
                    >
                      {editEmployees.map(e => <Option key={e.id} value={e.id}>{e.name}</Option>)}
                    </Select>
                  </Col>
                </Row>
                <Row gutter={12} style={{ marginBottom: 12 }}>
                  <Col xs={24}>
                    <div style={LABEL_STYLE}>Categoria</div>
                    <Select
                      value={editCategoryId}
                      style={{ width: '100%' }}
                      onChange={setEditCategoryId}
                      allowClear
                      placeholder="Sem categoria"
                      showSearch
                      optionFilterProp="children"
                    >
                      {categories.map(c => <Option key={c.id} value={c.id}>{c.name}</Option>)}
                    </Select>
                  </Col>
                </Row>
                <Row gutter={12} style={{ marginBottom: 12 }}>
                  <Col xs={24} sm={12}>
                    <div style={LABEL_STYLE}>Status</div>
                    <Select
                      value={editStatusId}
                      style={{ width: '100%' }}
                      onChange={setEditStatusId}
                      allowClear
                      placeholder="Selecione o status"
                    >
                      {statuses.map(s => (
                        <Option key={s.id} value={s.id}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, display: 'inline-block', flexShrink: 0 }} />
                            {s.name}
                          </span>
                        </Option>
                      ))}
                    </Select>
                  </Col>
                  <Col xs={24} sm={12}>
                    <div style={LABEL_STYLE}>Prioridade</div>
                    <Select value={editPriority} style={{ width: '100%' }} onChange={setEditPriority}>
                      {Object.entries(PRIORITY).map(([k, { label }]) => <Option key={k} value={k}>{label}</Option>)}
                    </Select>
                  </Col>
                </Row>
                <div style={{ marginBottom: 12 }}>
                  <div style={LABEL_STYLE}>Técnico</div>
                  <Select
                    value={editTechnicianId}
                    style={{ width: '100%' }}
                    onChange={setEditTechnicianId}
                    allowClear
                    placeholder="Selecione o técnico"
                    showSearch
                    optionFilterProp="children"
                  >
                    {technicians.map(t => <Option key={t.id} value={t.id}>{t.name}</Option>)}
                  </Select>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
                  <Button onClick={() => setEditMode(false)}>Cancelar</Button>
                  <Button
                    type="primary"
                    loading={editSaving}
                    onClick={handleSaveEdit}
                    style={{ borderRadius: 8, fontWeight: 600 }}
                  >
                    Salvar Alterações
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--cl-text-hi)', margin: '0 0 12px' }}>
                  {ticket.title}
                </h2>
                <Paragraph style={{ color: 'var(--cl-text)', whiteSpace: 'pre-wrap', margin: 0, lineHeight: 1.7 }}>
                  {ticket.description}
                </Paragraph>
              </>
            )}
          </div>

          {/* Anexos do chamado */}
          {ticket.attachments?.length > 0 && (
            <div style={{ ...CARD, padding: 24, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <Badge count={ticket.attachments.length} color="var(--cl-text-soft)" size="small">
                  <PaperClipOutlined style={{ fontSize: 16, color: 'var(--cl-text-soft)' }} />
                </Badge>
                <h3 style={{ fontWeight: 700, fontSize: 15, color: 'var(--cl-text-hi)', margin: 0 }}>
                  Anexos ({ticket.attachments.length})
                </h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {ticket.attachments.map(att => renderAttachment(att))}
              </div>
            </div>
          )}

          {/* Trâmites */}
          <div style={{ ...CARD, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <Badge count={ticket.comments.length} color="#2563eb" size="small">
                <MessageOutlined style={{ fontSize: 16, color: 'var(--cl-text-soft)' }} />
              </Badge>
              <h3 style={{ fontWeight: 700, fontSize: 15, color: 'var(--cl-text-hi)', margin: 0 }}>
                Trâmites ({ticket.comments.length})
              </h3>
            </div>

            {ticket.comments.length === 0 && (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--cl-text-faint)', fontSize: 14 }}>
                Nenhum trâmite ainda. Seja o primeiro a responder.
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {ticket.comments.map(c => {
                const isSysResolved = c.message.startsWith('::SYS_RESOLVED::');
                const isSysReopened = c.message.startsWith('::SYS_REOPENED::');
                if (isSysResolved || isSysReopened) {
                  const prefix = isSysResolved ? '::SYS_RESOLVED::' : '::SYS_REOPENED::';
                  const sysMsg = c.message.slice(prefix.length).trim();
                  return (
                    <div key={c.id}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '8px 0' }}>
                        <div style={{ flex: 1, height: 1, background: isSysResolved ? 'rgba(37,99,235,0.3)' : 'rgba(234,88,12,0.3)' }} />
                        <div style={{
                          background: isSysResolved ? 'rgba(37,99,235,0.12)' : 'rgba(234,88,12,0.10)',
                          border: `1px solid ${isSysResolved ? 'rgba(96,165,250,0.25)' : 'rgba(251,146,60,0.25)'}`,
                          borderRadius: 20, padding: '3px 14px', fontSize: 12,
                          color: isSysResolved ? '#60a5fa' : '#fb923c', fontWeight: 600,
                          display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
                        }}>
                          {isSysResolved ? <CheckCircleOutlined /> : <UnlockOutlined />}
                          {isSysResolved ? 'Chamado Resolvido' : 'Chamado Reaberto'}
                          {' · '}
                          {dayjs(c.createdAt).format('DD/MM HH:mm')}
                          {' · '}
                          {c.user.name}
                        </div>
                        <div style={{ flex: 1, height: 1, background: isSysResolved ? 'rgba(37,99,235,0.3)' : 'rgba(234,88,12,0.3)' }} />
                      </div>
                      {sysMsg && (
                        <div style={{
                          margin: '4px 40px 8px', padding: '8px 14px', borderRadius: 8, fontSize: 13,
                          background: isSysResolved ? 'rgba(37,99,235,0.08)' : 'rgba(234,88,12,0.08)',
                          border: `1px solid ${isSysResolved ? 'rgba(96,165,250,0.15)' : 'rgba(251,146,60,0.15)'}`,
                          color: 'var(--cl-text)', whiteSpace: 'pre-wrap', lineHeight: 1.6,
                        }}>
                          {sysMsg}
                        </div>
                      )}
                    </div>
                  );
                }
                const isAgent = ['SUPER_ADMIN', 'ADMIN', 'AGENT'].includes(c.user.role);
                const canEditComment = c.user.id === user?.id || ['SUPER_ADMIN', 'ADMIN'].includes(user?.role);
                const isEditingThis = editingCommentId === c.id;
                return (
                  <div key={c.id} style={{ display: 'flex', gap: 12, flexDirection: isAgent ? 'row' : 'row-reverse' }}>
                    <Avatar
                      size={36}
                      style={{
                        background: roleColors[c.user.role]?.bg,
                        color: roleColors[c.user.role]?.color,
                        fontWeight: 700, fontSize: 14, flexShrink: 0,
                        border: `1px solid ${roleColors[c.user.role]?.color}44`,
                      }}
                    >
                      {c.user.name?.charAt(0).toUpperCase()}
                    </Avatar>
                    <div style={{ flex: 1, maxWidth: '80%' }}>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4,
                        flexDirection: isAgent ? 'row' : 'row-reverse',
                      }}>
                        <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--cl-text-hi)' }}>{c.user.name}</span>
                        <span style={{
                          fontSize: 11, padding: '1px 8px', borderRadius: 4,
                          background: roleColors[c.user.role]?.bg,
                          color: roleColors[c.user.role]?.color,
                          fontWeight: 600,
                        }}>
                          {ROLES[c.user.role]?.label}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--cl-text-faint)' }}>
                          {dayjs(c.createdAt).format('DD/MM HH:mm')}
                        </span>
                        {c.attachments?.length > 0 && (
                          <Badge count={c.attachments.length} size="small" color="var(--cl-text-soft)" offset={[4, 0]}>
                            <PaperClipOutlined style={{ fontSize: 12, color: 'var(--cl-text-faint)' }} />
                          </Badge>
                        )}
                        {canEditComment && !isEditingThis && !isClosed && (
                          <>
                            <Tooltip title="Editar trâmite">
                              <Button
                                type="text"
                                icon={<EditOutlined />}
                                size="small"
                                style={{ color: 'var(--cl-text-dim)', padding: 0, height: 'auto' }}
                                onClick={() => { setEditingCommentId(c.id); setEditingCommentText(c.message); setEditingCommentDate(dayjs(c.createdAt)); }}
                              />
                            </Tooltip>
                            <Popconfirm
                              title="Remover trâmite"
                              description="Tem certeza que deseja remover este trâmite?"
                              okText="Remover"
                              cancelText="Cancelar"
                              okButtonProps={{ danger: true }}
                              onConfirm={() => handleDeleteComment(c.id)}
                            >
                              <Tooltip title="Remover trâmite">
                                <Button
                                  type="text"
                                  icon={<DeleteOutlined />}
                                  size="small"
                                  style={{ color: 'var(--cl-text-dim)', padding: 0, height: 'auto' }}
                                />
                              </Tooltip>
                            </Popconfirm>
                          </>
                        )}
                      </div>

                      {isEditingThis ? (
                        <div>
                          <TextArea
                            value={editingCommentText}
                            onChange={e => setEditingCommentText(e.target.value)}
                            rows={3}
                            style={{ borderRadius: 8, resize: 'none', marginBottom: 8 }}
                            autoFocus
                          />
                          {editingCommentFiles.length > 0 && (
                            <div style={{ marginBottom: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                              {editingCommentFiles.map((f, i) => (
                                <div key={i} style={{
                                  display: 'flex', alignItems: 'center', gap: 6,
                                  background: 'var(--cl-bg-input)', borderRadius: 6, padding: '3px 10px', fontSize: 12, maxWidth: 220,
                                }}>
                                  <FileOutlined style={{ color: 'var(--cl-text-muted)', fontSize: 11, flexShrink: 0 }} />
                                  <span style={{ color: 'var(--cl-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {f.name}
                                  </span>
                                  <button
                                    onClick={() => setEditingCommentFiles(prev => prev.filter((_, idx) => idx !== i))}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cl-text-muted)', padding: 0, fontSize: 14, lineHeight: 1 }}
                                  >
                                    ×
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                          <div style={{ marginBottom: 8 }}>
                            <div style={LABEL_STYLE}>Data / Hora do Trâmite</div>
                            <DatePicker
                              showTime={{ format: 'HH:mm' }}
                              format="DD/MM/YYYY HH:mm"
                              value={editingCommentDate}
                              onChange={setEditingCommentDate}
                              allowClear={false}
                              style={{ width: '100%', borderRadius: 8 }}
                              placeholder="Selecione a data e hora"
                            />
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Upload multiple beforeUpload={addEditingCommentFile} showUploadList={false}>
                              <Tooltip title="Anexar arquivo">
                                <Button
                                  type="text"
                                  size="small"
                                  icon={
                                    <Badge count={editingCommentFiles.length} size="small" offset={[6, -4]}>
                                      <PaperClipOutlined style={{ fontSize: 15 }} />
                                    </Badge>
                                  }
                                  style={{ color: editingCommentFiles.length > 0 ? '#60a5fa' : 'var(--cl-text-muted)' }}
                                />
                              </Tooltip>
                            </Upload>
                            <Space>
                              <Button size="small" onClick={() => { setEditingCommentId(null); setEditingCommentFiles([]); setEditingCommentDate(null); }}>Cancelar</Button>
                              <Button
                                size="small"
                                type="primary"
                                loading={editingCommentSaving}
                                onClick={() => handleUpdateComment(c.id)}
                              >
                                Salvar
                              </Button>
                            </Space>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div style={{
                            padding: '10px 14px', borderRadius: 8, fontSize: 14, lineHeight: 1.6,
                            background: isAgent ? 'rgba(37,99,235,0.10)' : 'var(--cl-bg)',
                            color: 'var(--cl-text)', whiteSpace: 'pre-wrap',
                            border: `1px solid ${isAgent ? 'rgba(96,165,250,0.18)' : 'var(--cl-border)'}`,
                          }}>
                            {c.message}
                          </div>
                          {c.attachments?.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                              {c.attachments.map(att => renderAttachment(att, true))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {!isClosed && (
              <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--cl-border-subtle)' }}>
                <div
                  onClick={() => { setComment(''); setCommentFiles([]); setCommentDate(dayjs()); setTramiteModal(true); }}
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: 8, fontSize: 14,
                    color: 'var(--cl-text-faint)',
                    background: 'var(--cl-bg)',
                    border: '1px dashed var(--cl-border)',
                    cursor: 'pointer', userSelect: 'none',
                  }}
                >
                  + Clique para adicionar um trâmite...
                </div>
              </div>
            )}
          </div>
        </Col>

        {/* Sidebar direita */}
        <Col xs={24} lg={8}>
          <div style={{ ...CARD, padding: 20 }}>
            <h3 style={{ fontWeight: 700, fontSize: 14, color: 'var(--cl-text-hi)', margin: '0 0 16px' }}>Informações</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { label: 'Empresa', value: ticket.company?.name },
                ticket.employee && { label: 'Funcionário', value: `${ticket.employee.name}${ticket.employee.position ? ` — ${ticket.employee.position}` : ''}` },
                ticket.technician && { label: 'Técnico', value: ticket.technician.name },
                { label: 'Aberto em', value: dayjs(ticket.createdAt).format('DD/MM/YYYY HH:mm') },
                ticket.resolvedAt && { label: 'Resolvido em', value: dayjs(ticket.resolvedAt).format('DD/MM/YYYY HH:mm') },
                { label: 'Status', value: ticket.ticketStatus?.name || TICKET_STATUS[ticket.status]?.label },
                { label: 'Prioridade', value: PRIORITY[ticket.priority]?.label },
                ticket.category && { label: 'Categoria', value: ticket.category.name },
              ].filter(Boolean).map(item => (
                <div key={item.label}>
                  <div style={LABEL_STYLE}>{item.label}</div>
                  <div style={{ fontSize: 13, color: 'var(--cl-text)', fontWeight: 500 }}>{item.value}</div>
                </div>
              ))}

              {ticket.slaDeadline && (
                <div>
                  <div style={LABEL_STYLE}>Prazo SLA</div>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    fontSize: 13, fontWeight: 600,
                    color: isExpired ? '#f87171' : '#60a5fa',
                  }}>
                    <ClockCircleOutlined />
                    {dayjs(ticket.slaDeadline).format('DD/MM/YYYY HH:mm')}
                    {isExpired && <Tag color="red" style={{ marginLeft: 4, fontSize: 11, background: isLight ? 'transparent' : undefined, border: isLight ? 'none' : undefined }}>Vencido</Tag>}
                  </div>
                </div>
              )}
            </div>

            {!isClosed && canEdit && (
              <>
                <Divider style={{ margin: '16px 0', borderColor: 'var(--cl-border)' }} />
                <Button
                  danger block icon={<DeleteOutlined />}
                  onClick={() => setDeleteModal(true)}
                  style={{ borderRadius: 8, fontWeight: 600 }}
                >
                  Excluir chamado
                </Button>
              </>
            )}
          </div>
        </Col>
      </Row>

      {/* Modal — Excluir chamado */}
      <Modal
        open={deleteModal}
        onCancel={() => setDeleteModal(false)}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ExclamationCircleOutlined style={{ color: '#f87171', fontSize: 20 }} />
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
          <p style={{ marginBottom: 16 }}>
            Você está prestes a excluir o chamado <strong>"{ticket?.title}"</strong> permanentemente. Esta ação não pode ser desfeita.
          </p>
          <div style={{ background: 'rgba(220,38,38,0.10)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#f87171', fontWeight: 500 }}>
            Todos os trâmites vinculados também serão removidos.
          </div>
        </div>
      </Modal>

      {/* Modal — Novo trâmite */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(37,99,235,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MessageOutlined style={{ color: '#60a5fa', fontSize: 16 }} />
            </div>
            <span style={{ fontWeight: 700, fontSize: 16 }}>Novo Trâmite</span>
          </div>
        }
        open={tramiteModal}
        onCancel={() => setTramiteModal(false)}
        centered
        width={660}
        styles={{ body: { padding: '24px 0 8px', maxHeight: '72vh', overflowY: 'auto' } }}
        footer={
          <Space>
            <Button onClick={() => setTramiteModal(false)}>Cancelar</Button>
            <Button
              type="primary"
              icon={<SendOutlined />}
              loading={sending}
              disabled={!comment.trim() || !commentStatusId}
              onClick={handleComment}
              style={{ fontWeight: 600 }}
            >
              Gravar
            </Button>
          </Space>
        }
      >
        <div style={{ padding: '0 24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <div style={{ ...LABEL_STYLE, marginBottom: 6 }}>
                Trâmite <span style={{ color: '#f87171' }}>*</span>
              </div>
              <TextArea
                value={comment}
                onChange={e => setComment(e.target.value)}
                rows={6}
                maxLength={250}
                showCount
                placeholder="Descreva o trâmite..."
                style={{ borderRadius: 8, resize: 'none' }}
                autoFocus
                onKeyDown={e => { if (e.ctrlKey && e.key === 'Enter') handleComment(); }}
              />
            </div>

            <div>
              <div style={{ ...LABEL_STYLE, marginBottom: 6 }}>
                Status <span style={{ color: '#f87171' }}>*</span>
              </div>
              <Select
                value={commentStatusId}
                style={{ width: '100%' }}
                size="large"
                onChange={setCommentStatusId}
                placeholder="Selecione o status do chamado"
                status={!commentStatusId ? 'warning' : ''}
              >
                {statuses.map(s => (
                  <Option key={s.id} value={s.id}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, display: 'inline-block', flexShrink: 0 }} />
                      {s.name}
                    </span>
                  </Option>
                ))}
              </Select>
            </div>

            <div>
              <div style={{ ...LABEL_STYLE, marginBottom: 6 }}>
                Data / Hora do Lançamento <span style={{ color: '#f87171' }}>*</span>
              </div>
              <DatePicker
                showTime={{ format: 'HH:mm' }}
                format="DD/MM/YYYY HH:mm"
                value={commentDate}
                onChange={setCommentDate}
                allowClear={false}
                size="large"
                style={{ width: '100%', borderRadius: 8 }}
                disabledDate={disabledDate}
                disabledTime={disabledTime}
                renderExtraFooter={datePickerFooter}
              />
            </div>

            <div>
              <div style={{ ...LABEL_STYLE, marginBottom: 6 }}>Anexos</div>
              <Upload multiple beforeUpload={addCommentFile} showUploadList={false}>
                <Button icon={<PaperClipOutlined />} size="large" style={{ borderRadius: 8 }}>
                  Adicionar arquivo
                </Button>
              </Upload>
              {commentFiles.length > 0 && (
                <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {commentFiles.map((f, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      background: 'var(--cl-bg-input)', borderRadius: 6, padding: '4px 12px', fontSize: 13,
                    }}>
                      <FileOutlined style={{ color: 'var(--cl-text-muted)', fontSize: 12 }} />
                      <span style={{ color: 'var(--cl-text)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {f.name}
                      </span>
                      <button
                        onClick={() => setCommentFiles(prev => prev.filter((_, idx) => idx !== i))}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cl-text-muted)', padding: 0, fontSize: 16, lineHeight: 1 }}
                      >×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </Modal>

      {/* Modal — Mudança de status com trâmite obrigatório */}
      <Modal
        open={statusChangeModal}
        onCancel={() => setStatusChangeModal(false)}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {(() => {
              const ps = statuses.find(s => s.id === pendingStatusId);
              const builtin = ps?.builtinStatus;
              if (builtin === 'RESOLVED') return <CheckCircleOutlined style={{ color: '#60a5fa', fontSize: 20 }} />;
              if (builtin === 'OPEN') return <UnlockOutlined style={{ color: '#fb923c', fontSize: 20 }} />;
              return <ExclamationCircleOutlined style={{ color: '#fbbf24', fontSize: 20 }} />;
            })()}
            <span style={{ fontWeight: 700 }}>
              Alterar status para: {statuses.find(s => s.id === pendingStatusId)?.name}
            </span>
          </div>
        }
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setStatusChangeModal(false)}>Cancelar</Button>
            <Button
              type="primary"
              loading={statusChangeSaving}
              disabled={!statusChangeComment.trim()}
              onClick={handleStatusChangeConfirm}
            >
              Confirmar
            </Button>
          </div>
        }
      >
        <div style={{ padding: '8px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <TextArea
            rows={4}
            value={statusChangeComment}
            onChange={e => setStatusChangeComment(e.target.value)}
            placeholder="Descreva o trâmite desta mudança de status..."
            style={{ borderRadius: 8, resize: 'vertical' }}
            autoFocus
          />
          <div>
            <div style={LABEL_STYLE}>Data / Hora</div>
            <DatePicker
              showTime={{ format: 'HH:mm' }}
              format="DD/MM/YYYY HH:mm"
              value={statusChangeDate}
              onChange={setStatusChangeDate}
              allowClear={false}
              style={{ width: '100%', borderRadius: 8 }}
              disabledDate={disabledDate}
              disabledTime={disabledTime}
              renderExtraFooter={datePickerFooter}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Upload multiple beforeUpload={addStatusChangeFile} showUploadList={false}>
              <Button icon={<PaperClipOutlined />} size="small" style={{ borderRadius: 6 }}>
                Anexar arquivo
              </Button>
            </Upload>
            {statusChangeFiles.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {statusChangeFiles.map((f, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    background: 'var(--cl-bg-input)', borderRadius: 6, padding: '2px 8px', fontSize: 11,
                  }}>
                    <FileOutlined style={{ color: 'var(--cl-text-muted)', fontSize: 10 }} />
                    <span style={{ color: 'var(--cl-text)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {f.name}
                    </span>
                    <button
                      onClick={() => setStatusChangeFiles(prev => prev.filter((_, idx) => idx !== i))}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cl-text-muted)', padding: 0, lineHeight: 1 }}
                    >×</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Modal — Preview de imagem */}
      <Modal
        open={!!previewImage}
        onCancel={() => setPreviewImage(null)}
        footer={null}
        title={previewImage?.name}
        centered
        width={860}
        styles={{ body: { padding: 12, textAlign: 'center' } }}
      >
        {previewImage && (
          <img
            src={previewImage.src}
            alt={previewImage.name}
            style={{ maxWidth: '100%', maxHeight: '75vh', borderRadius: 8, display: 'inline-block' }}
          />
        )}
      </Modal>
    </div>
  );
}
