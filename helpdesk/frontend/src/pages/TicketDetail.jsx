import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import {
  Tag, Button, Select, Space, Typography, Divider, Input, Modal,
  Avatar, Spin, Alert, Row, Col, Tooltip, message, Badge, Upload, Popconfirm,
  DatePicker, Rate,
} from 'antd';
import {
  ArrowLeftOutlined, SendOutlined, ExclamationCircleOutlined, ClockCircleOutlined,
  DeleteOutlined, PaperClipOutlined, DownloadOutlined, FileOutlined, EditOutlined,
  EyeOutlined, MessageOutlined, LockOutlined, UnlockOutlined, CheckCircleOutlined, PlusOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  ticketService, userService, categoryService, companyService,
  employeeService, statusService, technicianService,
} from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import {
  TICKET_STATUS, PRIORITY, ROLES, canAssignTickets, canUpdateTicketStatus, normalize } from '../utils/constants';

const { Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const CARD = {
  background: 'var(--cl-bg)',
  border: '1px solid var(--cl-border)',
  borderRadius: 12,
};

const roleColors = {
  SUPER_ADMIN: { bg: 'rgba(139,92,246,0.18)', color: 'var(--cl-purple)' },
  ADMIN:       { bg: 'rgba(37,99,235,0.18)',  color: 'var(--cl-primary-text)' },
  AGENT:       { bg: 'rgba(6,182,212,0.16)',  color: 'var(--cl-secondary)' },
  CLIENT:      { bg: 'var(--cl-bg-input)', color: 'var(--cl-text-soft)' },
};

const LABEL_STYLE = {
  fontSize: 11, color: 'var(--cl-text-muted)', fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4,
};

function DateTimeInput({ value, onChange, disabledDate, size }) {
  const [timeText, setTimeText] = useState(value ? value.format('HH:mm') : '');

  useEffect(() => {
    setTimeText(value ? value.format('HH:mm') : '');
  }, [value ? value.format('YYYY-MM-DDHH:mm') : null]);

  const applyTime = (base, tStr) => {
    const match = tStr.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return base;
    const h = Number(match[1]);
    const m = Number(match[2]);
    if (h > 23 || m > 59) return base;
    return base.clone().hour(h).minute(m).second(0);
  };

  const handleDateChange = (date) => {
    if (!date) return;
    onChange(applyTime(date, timeText));
  };

  const handleTimeChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 4);
    const formatted = digits.length > 2 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits;
    setTimeText(formatted);
    if (/^\d{2}:\d{2}$/.test(formatted) && value) {
      onChange(applyTime(value, formatted));
    }
  };

  const handleTimeBlur = () => {
    if (!/^\d{2}:\d{2}$/.test(timeText)) {
      setTimeText(value ? value.format('HH:mm') : '00:00');
    }
  };

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <DatePicker
        value={value}
        onChange={handleDateChange}
        format="DD/MM/YYYY"
        disabledDate={disabledDate}
        allowClear={false}
        size={size}
        style={{ flex: 1, borderRadius: 8 }}
      />
      <Input
        value={timeText}
        onChange={handleTimeChange}
        onBlur={handleTimeBlur}
        placeholder="HH:mm"
        size={size}
        style={{ width: 96, borderRadius: 8, textAlign: 'center', fontVariantNumeric: 'tabular-nums', letterSpacing: 1 }}
        maxLength={5}
        prefix={<ClockCircleOutlined style={{ color: 'var(--cl-text-faint)', fontSize: 12 }} />}
      />
    </div>
  );
}

export default function TicketDetail() {
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === 'light';
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [isMobile, setIsMobile] = useState(window.innerWidth < 992);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 992);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

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
  const [previewImage, setPreviewImage] = useState(null); // { src, name, mimeType, data }
  const [ratingSaving, setRatingSaving] = useState(false);

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
      const scAttachments = await Promise.all(statusChangeFiles.map(async f => ({
        name: f.name, mimeType: f.type, size: f.size, data: await readFileAsBase64(f),
      })));
      await ticketService.addComment(id, {
        message: msg,
        attachments: scAttachments,
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

  const readFileAsBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file.originFileObj || file);
  });

  const beforeUploadFile = (file) => {
    if (file.size > 10 * 1024 * 1024) {
      message.error(`${file.name} excede 10MB`);
      return Upload.LIST_IGNORE;
    }
    return false;
  };

  const handleUploadPreview = async (file) => {
    const isImage = file.type?.startsWith('image/') || /\.(jpe?g|png|gif|webp|svg|bmp)$/i.test(file.name || '');
    if (!isImage || !file.originFileObj) return;
    const src = await new Promise(resolve => {
      const reader = new FileReader();
      reader.readAsDataURL(file.originFileObj);
      reader.onload = () => resolve(reader.result);
    });
    setPreviewImage({ src, name: file.name });
  };

  const handleRate = async (value) => {
    setRatingSaving(true);
    try {
      const updated = await ticketService.rate(id, value);
      setTicket(updated);
      message.success('Obrigado pela avaliação!');
    } catch (err) {
      message.error(err.response?.data?.error || 'Erro ao enviar avaliação');
    } finally {
      setRatingSaving(false);
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
    if (!comment.trim()) { message.warning('Escreva um trâmite'); return; }
    if (!commentStatusId) { message.warning('Selecione um status'); return; }
    setSending(true);
    try {
      const selectedStatus = statuses.find(s => s.id === commentStatusId);
      const builtinStatus = selectedStatus?.builtinStatus;
      let msg = comment.trim();
      if (builtinStatus === 'RESOLVED') msg = `::SYS_RESOLVED:: ${msg}`;
      else if (builtinStatus === 'OPEN' && ticket.status !== 'OPEN') msg = `::SYS_REOPENED:: ${msg}`;
      const cfAttachments = await Promise.all(commentFiles.map(async f => ({
        name: f.name, mimeType: f.type, size: f.size, data: await readFileAsBase64(f),
      })));
      await ticketService.addComment(id, {
        message: msg,
        attachments: cfAttachments,
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
      const ecAttachments = await Promise.all(editingCommentFiles.map(async f => ({
        name: f.name, mimeType: f.type, size: f.size, data: await readFileAsBase64(f),
      })));
      const updated = await ticketService.updateComment(id, commentId, {
        message: editingCommentText,
        attachments: ecAttachments,
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


  const handleDeleteComment = async (commentId) => {
    try {
      await ticketService.deleteComment(id, commentId);
      setTicket(prev => ({ ...prev, comments: prev.comments.filter(c => c.id !== commentId) }));
      message.success('Trâmite removido');
    } catch (err) {
      message.error(err.response?.data?.error || 'Erro ao remover trâmite');
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
          onClick={() => setPreviewImage({ src, name: att.name, mimeType: att.mimeType, data: att.data })}
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
                style={{ color: 'var(--cl-text-muted)' }} onClick={() => setPreviewImage({ src, name: att.name, mimeType: att.mimeType, data: att.data })} />
            </Tooltip>
          )}
          <Tooltip title="Baixar">
            <Button type="text" icon={<DownloadOutlined />} size="small"
              style={{ color: 'var(--cl-primary-text)' }} onClick={() => downloadAttachment(att)} />
          </Tooltip>
        </div>
      </div>
    );
  };

  const desktopPage = {};

  return (
    <div className="page-wrap" style={desktopPage}>
      <Button
        type="text"
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/app/tickets')}
        style={{ color: 'var(--cl-text-soft)', marginBottom: 16, padding: 0, flexShrink: 0 }}
      >
        Voltar para Chamados
      </Button>

      <Row gutter={[20, 20]} style={{ alignItems: 'flex-start' }}>
        {/* Coluna principal */}
        <Col xs={24} lg={18}>

          {/* Cabeçalho */}
          <div style={{ ...CARD, padding: 24, marginBottom: 16, flexShrink: 0, maxHeight: 260, overflowY: 'auto' }}>
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
                <code style={{ fontSize: 13, fontWeight: 700, color: 'var(--cl-text-soft)', background: 'var(--cl-bg-soft)', padding: '2px 10px', borderRadius: 6, letterSpacing: '0.02em' }}>
                  #{ticket.code ? String(ticket.code).padStart(4, '0') : ticket.id.slice(-8).toUpperCase()}
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
                    style={{ borderRadius: 6, flexShrink: 0, marginLeft: 8, color: 'var(--cl-primary-text)', borderColor: 'var(--cl-primary)' }}
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
                        const q = normalize(input);
                        return (
                          normalize(c?.name).includes(q) ||
                          normalize(c?.fantasia).includes(q)
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
            <div style={{ ...CARD, padding: '16px 20px', marginBottom: 16, flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <PaperClipOutlined style={{ fontSize: 14, color: 'var(--cl-text-soft)' }} />
                <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--cl-text-hi)' }}>
                  Anexos ({ticket.attachments.length})
                </span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {ticket.attachments.map(att => {
                  const isImage = att.mimeType?.startsWith('image/');
                  const src = `data:${att.mimeType};base64,${att.data}`;
                  if (isImage) {
                    return (
                      <Tooltip key={att.id} title={`${att.name} · ${formatSize(att.size)}`}>
                        <div style={{ position: 'relative', width: 72, height: 72, flexShrink: 0 }}
                          className="att-thumb-wrap">
                          <img
                            src={src} alt={att.name}
                            style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--cl-border)', display: 'block', cursor: 'pointer' }}
                            onClick={() => setPreviewImage({ src, name: att.name, mimeType: att.mimeType, data: att.data })}
                          />
                          <div style={{
                            position: 'absolute', inset: 0, borderRadius: 8,
                            background: 'rgba(0,0,0,0.45)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                            opacity: 0, transition: 'opacity 0.15s',
                          }}
                            className="att-thumb-overlay"
                            onMouseEnter={e => e.currentTarget.style.opacity = 1}
                            onMouseLeave={e => e.currentTarget.style.opacity = 0}
                          >
                            <EyeOutlined
                              style={{ color: '#fff', fontSize: 16, cursor: 'pointer' }}
                              onClick={() => setPreviewImage({ src, name: att.name, mimeType: att.mimeType, data: att.data })}
                            />
                            <DownloadOutlined
                              style={{ color: '#fff', fontSize: 16, cursor: 'pointer' }}
                              onClick={e => { e.stopPropagation(); downloadAttachment(att); }}
                            />
                          </div>
                        </div>
                      </Tooltip>
                    );
                  }
                  return (
                    <Tooltip key={att.id} title={`${att.name} · ${formatSize(att.size)}`}>
                      <div
                        onClick={() => downloadAttachment(att)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          padding: '6px 12px', borderRadius: 8, cursor: 'pointer',
                          background: 'var(--cl-bg)', border: '1px solid var(--cl-border)',
                          maxWidth: 200, transition: 'border-color 0.15s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--cl-primary)'}
                        onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--cl-border)'}
                      >
                        <FileOutlined style={{ color: 'var(--cl-primary-text)', fontSize: 14, flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: 'var(--cl-text-hi)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {att.name}
                        </span>
                        <DownloadOutlined style={{ color: 'var(--cl-text-faint)', fontSize: 12, flexShrink: 0 }} />
                      </div>
                    </Tooltip>
                  );
                })}
              </div>
            </div>
          )}

          {/* Trâmites */}
          <div style={{ ...CARD, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, flexShrink: 0 }}>
              <Badge count={ticket.comments.length} color="var(--cl-primary)" size="small">
                <MessageOutlined style={{ fontSize: 16, color: 'var(--cl-text-soft)' }} />
              </Badge>
              <h3 style={{ fontWeight: 700, fontSize: 15, color: 'var(--cl-text-hi)', margin: 0 }}>
                Trâmites ({ticket.comments.length})
              </h3>
            </div>

            <div>
            {ticket.comments.length === 0 && (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--cl-text-faint)', fontSize: 14 }}>
                Nenhum trâmite ainda. Seja o primeiro a responder.
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {(() => {
                let seq = 0;
                return ticket.comments.map(c => {
                const isSysResolved = c.message.startsWith('::SYS_RESOLVED::');
                const isSysReopened = c.message.startsWith('::SYS_REOPENED::');
                if (!isSysResolved && !isSysReopened) seq++;
                if (isSysResolved || isSysReopened) {
                  const prefix = isSysResolved ? '::SYS_RESOLVED::' : '::SYS_REOPENED::';
                  const sysMsg = c.message.slice(prefix.length).trim();
                  const sysColor = isSysResolved ? 'var(--cl-success)' : 'var(--cl-warning)';
                  const sysBg = isSysResolved ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.08)';
                  const sysBorder = isSysResolved ? 'rgba(16,185,129,0.30)' : 'rgba(245,158,11,0.30)';
                  const sysTextColor = isSysResolved ? 'var(--cl-success)' : 'var(--cl-warning)';
                  return (
                    <div key={c.id} style={{
                      borderRadius: 10,
                      border: `1px solid ${sysBorder}`,
                      background: sysBg,
                      padding: '14px 18px',
                      borderLeft: `4px solid ${sysColor}`,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: sysMsg ? 10 : 0 }}>
                        <span style={{ fontSize: 16, color: sysTextColor }}>
                          {isSysResolved ? <CheckCircleOutlined /> : <UnlockOutlined />}
                        </span>
                        <span style={{ fontWeight: 700, fontSize: 13, color: sysTextColor }}>
                          {isSysResolved ? 'Chamado Resolvido' : 'Chamado Reaberto'}
                        </span>
                        <span style={{ fontSize: 12, color: 'var(--cl-text-faint)', marginLeft: 'auto' }}>
                          {dayjs(c.createdAt).format('DD/MM/YYYY HH:mm')}
                          {' · '}
                          <strong style={{ color: 'var(--cl-text-soft)' }}>{c.user.name}</strong>
                        </span>
                      </div>
                      {sysMsg && (
                        <div style={{
                          fontSize: 13, color: 'var(--cl-text)', whiteSpace: 'pre-wrap',
                          lineHeight: 1.6, paddingLeft: 26,
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
                  <div key={c.id} style={{ display: 'flex', gap: 12, flexDirection: isAgent ? 'row' : 'row-reverse', alignItems: 'flex-start' }}>
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
                    <div style={{ flex: '1 1 0', minWidth: 0 }}>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6,
                        flexDirection: isAgent ? 'row' : 'row-reverse', flexWrap: 'wrap',
                      }}>
                        <span style={{
                          fontFamily: 'monospace', fontSize: 11, fontWeight: 700,
                          color: 'var(--cl-primary-text)', flexShrink: 0,
                        }}>
                          #{String(seq).padStart(2, '0')}
                        </span>
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
                            onChange={e => setEditingCommentText(e.target.value.slice(0, 250))}
                            rows={3}
                            maxLength={250}
                            showCount
                            style={{ borderRadius: 8, resize: 'none', marginBottom: 8 }}
                            autoFocus
                          />
                          <div style={{ marginBottom: 8 }}>
                            <Upload
                              multiple
                              beforeUpload={beforeUploadFile}
                              fileList={editingCommentFiles}
                              onChange={({ fileList: nl }) => setEditingCommentFiles(nl.map(f => ({ ...f, status: 'done' })))}
                              onPreview={handleUploadPreview}
                              listType="picture-card"
                              style={{ width: '100%' }}
                            >
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, color: 'var(--cl-text-soft)', fontSize: 12 }}>
                                <PlusOutlined style={{ fontSize: 14 }} />
                                <span>Adicionar</span>
                              </div>
                            </Upload>
                          </div>
                          <div style={{ marginBottom: 8 }}>
                            <div style={LABEL_STYLE}>Data / Hora do Trâmite</div>
                            <DateTimeInput
                              value={editingCommentDate}
                              onChange={setEditingCommentDate}
                              disabledDate={disabledDate}
                            />
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
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
                            background: isAgent ? 'var(--cl-bg-soft)' : 'var(--cl-bg)',
                            color: 'var(--cl-text)', whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word', overflowWrap: 'break-word',
                            border: `1px solid ${isAgent ? 'rgba(37,99,235,0.25)' : 'var(--cl-border)'}`,
                            minHeight: 40, display: 'block',
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
              });
              })()}
            </div>
            </div>{/* fim scroll */}

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
        <Col xs={24} lg={6} style={!isMobile ? { position: 'sticky', top: 16 } : {}}>
          <div style={{ ...CARD, overflow: 'hidden' }}>
            {/* Header do card */}
            <div style={{
              padding: '14px 18px',
              borderBottom: '1px solid var(--cl-border)',
              background: 'var(--cl-bg-soft)',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <div style={{
                width: 6, height: 6, borderRadius: '50%',
                background: 'var(--cl-primary)', flexShrink: 0,
              }} />
              <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--cl-text-hi)', letterSpacing: '0.02em' }}>
                Informações
              </span>
            </div>

            {/* Itens */}
            <div style={{ padding: '4px 0' }}>
              {[
                { label: 'Empresa', value: ticket.company?.name },
                ticket.employee && { label: 'Funcionário', value: `${ticket.employee.name}${ticket.employee.position ? ` — ${ticket.employee.position}` : ''}` },
                ticket.technician && { label: 'Técnico', value: ticket.technician.name },
                { label: 'Aberto em', value: dayjs(ticket.createdAt).format('DD/MM/YYYY HH:mm') },
                ticket.resolvedAt && { label: 'Resolvido em', value: dayjs(ticket.resolvedAt).format('DD/MM/YYYY HH:mm') },
                { label: 'Status', value: ticket.ticketStatus?.name || TICKET_STATUS[ticket.status]?.label },
                { label: 'Prioridade', value: PRIORITY[ticket.priority]?.label },
                ticket.category && { label: 'Categoria', value: ticket.category.name },
              ].filter(Boolean).map((item, idx, arr) => (
                <div key={item.label} style={{
                  padding: '10px 18px',
                  borderBottom: idx < arr.length - 1 ? '1px solid var(--cl-border)' : 'none',
                }}>
                  <div style={LABEL_STYLE}>{item.label}</div>
                  <div style={{ fontSize: 13, color: 'var(--cl-text)', fontWeight: 500, wordBreak: 'break-word', overflowWrap: 'break-word', marginTop: 2 }}>{item.value}</div>
                </div>
              ))}

              {ticket.slaDeadline && (
                <div style={{ padding: '10px 18px', borderBottom: (isResolved || isClosed) && ticket.userId === user?.id ? '1px solid var(--cl-border)' : 'none' }}>
                  <div style={LABEL_STYLE}>Prazo SLA</div>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 6, marginTop: 2,
                    fontSize: 13, fontWeight: 600,
                    color: isExpired ? 'var(--cl-danger)' : 'var(--cl-primary-text)',
                  }}>
                    <ClockCircleOutlined style={{ fontSize: 12 }} />
                    {dayjs(ticket.slaDeadline).format('DD/MM/YYYY HH:mm')}
                    {isExpired && <Tag color="red" style={{ marginLeft: 4, fontSize: 11, background: isLight ? 'transparent' : undefined, border: isLight ? 'none' : undefined }}>Vencido</Tag>}
                  </div>
                </div>
              )}

              {(isResolved || isClosed) && ticket.userId === user?.id && (
                <div style={{ padding: '10px 18px' }}>
                  <div style={LABEL_STYLE}>{ticket.satisfaction ? 'Sua avaliação' : 'Avalie o atendimento'}</div>
                  <Rate
                    value={ticket.satisfaction || 0}
                    disabled={!!ticket.satisfaction || ratingSaving}
                    onChange={handleRate}
                    style={{ marginTop: 4, fontSize: 18 }}
                  />
                </div>
              )}
            </div>
          </div>
        </Col>
      </Row>

      {/* Modal — Excluir chamado */}
      <Modal
        open={deleteModal}
        onCancel={() => setDeleteModal(false)}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ExclamationCircleOutlined style={{ color: 'var(--cl-danger)', fontSize: 20 }} />
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
          <div style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--cl-danger)', fontWeight: 500 }}>
            Todos os trâmites vinculados também serão removidos.
          </div>
        </div>
      </Modal>

      {/* Modal — Novo trâmite */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(37,99,235,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MessageOutlined style={{ color: 'var(--cl-primary-text)', fontSize: 16 }} />
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
                Trâmite <span style={{ color: 'var(--cl-danger)' }}>*</span>
              </div>
              <TextArea
                value={comment}
                onChange={e => setComment(e.target.value.slice(0, 250))}
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
                Status <span style={{ color: 'var(--cl-danger)' }}>*</span>
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
                Data / Hora do Lançamento <span style={{ color: 'var(--cl-danger)' }}>*</span>
              </div>
              <DateTimeInput
                value={commentDate}
                onChange={setCommentDate}
                disabledDate={disabledDate}
                size="large"
              />
            </div>

            <div>
              <div style={{ ...LABEL_STYLE, marginBottom: 6 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <PaperClipOutlined style={{ fontSize: 14 }} />
                  <span>Anexos</span>
                  {commentFiles.length > 0 && (
                    <span style={{ background: 'var(--cl-primary)', color: '#fff', borderRadius: 10, fontSize: 11, fontWeight: 600, padding: '1px 7px', lineHeight: '18px' }}>
                      {commentFiles.length}
                    </span>
                  )}
                </span>
              </div>
              <Upload
                multiple
                beforeUpload={beforeUploadFile}
                fileList={commentFiles}
                onChange={({ fileList: nl }) => setCommentFiles(nl.map(f => ({ ...f, status: 'done' })))}
                onPreview={handleUploadPreview}
                listType="picture-card"
                style={{ width: '100%' }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, color: 'var(--cl-text-soft)', fontSize: 12 }}>
                  <PlusOutlined style={{ fontSize: 16 }} />
                  <span>Adicionar</span>
                </div>
              </Upload>
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
              if (builtin === 'RESOLVED') return <CheckCircleOutlined style={{ color: 'var(--cl-success)', fontSize: 20 }} />;
              if (builtin === 'OPEN') return <UnlockOutlined style={{ color: 'var(--cl-warning)', fontSize: 20 }} />;
              return <ExclamationCircleOutlined style={{ color: 'var(--cl-warning)', fontSize: 20 }} />;
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
            <DateTimeInput
              value={statusChangeDate}
              onChange={setStatusChangeDate}
              disabledDate={disabledDate}
            />
          </div>
          <div>
            <div style={{ ...LABEL_STYLE, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
              <PaperClipOutlined style={{ fontSize: 14 }} />
              <span>Anexos</span>
              {statusChangeFiles.length > 0 && (
                <span style={{ background: 'var(--cl-primary)', color: '#fff', borderRadius: 10, fontSize: 11, fontWeight: 600, padding: '1px 7px', lineHeight: '18px' }}>
                  {statusChangeFiles.length}
                </span>
              )}
            </div>
            <Upload
              multiple
              beforeUpload={beforeUploadFile}
              fileList={statusChangeFiles}
              onChange={({ fileList: nl }) => setStatusChangeFiles(nl.map(f => ({ ...f, status: 'done' })))}
              onPreview={handleUploadPreview}
              listType="picture-card"
              style={{ width: '100%' }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, color: 'var(--cl-text-soft)', fontSize: 12 }}>
                <PlusOutlined style={{ fontSize: 16 }} />
                <span>Adicionar</span>
              </div>
            </Upload>
          </div>
        </div>
      </Modal>

      {/* Modal — Preview de imagem */}
      <Modal
        open={!!previewImage}
        onCancel={() => setPreviewImage(null)}
        footer={null}
        title={null}
        closable={false}
        centered
        width={860}
        styles={{ body: { padding: 0, background: 'transparent' } }}
        style={{ background: 'transparent' }}
      >
        {previewImage && (
          <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', background: '#000' }}>
            {/* X button */}
            <button
              onClick={() => setPreviewImage(null)}
              style={{
                position: 'absolute', top: 10, right: 10, zIndex: 10,
                width: 32, height: 32, borderRadius: '50%',
                background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.2)',
                color: '#fff', fontSize: 18, lineHeight: 1, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backdropFilter: 'blur(4px)',
              }}
            >
              ×
            </button>
            {/* Nome do arquivo */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, zIndex: 5,
              padding: '10px 48px 10px 16px',
              background: 'linear-gradient(to bottom, rgba(0,0,0,0.65), transparent)',
              color: '#fff', fontSize: 13, fontWeight: 600,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {previewImage.name}
            </div>
            <img
              src={previewImage.src}
              alt={previewImage.name}
              style={{ maxWidth: '100%', maxHeight: '80vh', display: 'block', margin: '0 auto' }}
            />
            {/* Download */}
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              padding: '10px 16px',
              background: 'linear-gradient(to top, rgba(0,0,0,0.65), transparent)',
              display: 'flex', justifyContent: 'flex-end',
            }}>
              <Button
                size="small" icon={<DownloadOutlined />}
                onClick={() => downloadAttachment(previewImage)}
                style={{ background: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.3)', color: '#fff' }}
              >
                Baixar
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
