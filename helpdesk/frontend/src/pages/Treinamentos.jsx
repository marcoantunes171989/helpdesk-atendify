import { useEffect, useState, useCallback } from 'react';
import {
  Button, Modal, Form, Input, Select, Space, Tag, Tooltip,
  message, Table, Drawer, Divider, Checkbox, Badge,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined,
  ExclamationCircleOutlined, CheckCircleOutlined, ClockCircleOutlined,
  CloseCircleOutlined, SyncOutlined, LaptopOutlined, TeamOutlined,
  EnvironmentOutlined, LinkOutlined, UserAddOutlined, UserOutlined,
  CalendarOutlined, FieldTimeOutlined, PrinterOutlined,
} from '@ant-design/icons';
import { treinamentoService, companyService, userService, employeeService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { normalize } from '../utils/constants';

const { TextArea } = Input;
const { Option } = Select;

const TIPO_CONFIG = {
  PRESENCIAL: { label: 'Presencial',  color: '#34d399', bg: 'rgba(16,185,129,0.12)',  icon: <EnvironmentOutlined /> },
  REMOTO:     { label: 'Remoto',      color: '#60a5fa', bg: 'rgba(37,99,235,0.12)',   icon: <LaptopOutlined /> },
  HIBRIDO:    { label: 'Híbrido',     color: '#a78bfa', bg: 'rgba(124,58,237,0.12)',  icon: <TeamOutlined /> },
};

const STATUS_CONFIG = {
  AGENDADO:     { label: 'Agendado',      color: '#60a5fa', bg: 'rgba(37,99,235,0.12)',  icon: <ClockCircleOutlined /> },
  EM_ANDAMENTO: { label: 'Em Andamento',  color: '#fbbf24', bg: 'rgba(217,119,6,0.12)',  icon: <SyncOutlined spin /> },
  CONCLUIDO:    { label: 'Concluído',     color: '#34d399', bg: 'rgba(16,185,129,0.12)', icon: <CheckCircleOutlined /> },
  CANCELADO:    { label: 'Cancelado',     color: '#f87171', bg: 'rgba(220,38,38,0.12)',  icon: <CloseCircleOutlined /> },
};

function TipoBadge({ tipo }) {
  const cfg = TIPO_CONFIG[tipo] || TIPO_CONFIG.PRESENCIAL;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '2px 10px', borderRadius: 20,
      background: cfg.bg, color: cfg.color,
      fontSize: 12, fontWeight: 600,
      border: `1px solid ${cfg.color}40`,
    }}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.AGENDADO;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '2px 10px', borderRadius: 20,
      background: cfg.bg, color: cfg.color,
      fontSize: 12, fontWeight: 600,
      border: `1px solid ${cfg.color}40`,
    }}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

function fmtDuration(min) {
  if (!min) return null;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h${m > 0 ? m + 'min' : ''}` : `${m}min`;
}

function gerarATATreinamento(t) {
  const fmt = d => d ? new Date(d).toLocaleString('pt-BR') : '—';
  const participantesRows = (t.participantes || []).map(p => {
    const nome = p.employee?.name || p.name || '—';
    const cargo = p.employee?.position || p.email || '—';
    return `<tr>
      <td style="padding:7px 10px;border:1px solid #ddd;font-size:12px">${nome}</td>
      <td style="padding:7px 10px;border:1px solid #ddd;font-size:12px">${cargo}</td>
      <td style="padding:7px 10px;border:1px solid #ddd;font-size:12px;text-align:center">${p.attended ? '✓ Presente' : 'Ausente'}</td>
    </tr>`;
  }).join('');

  const html = `
    <div style="font-family:Arial,sans-serif;color:#111;max-width:800px;margin:0 auto;padding:40px">
      <div style="text-align:center;margin-bottom:32px">
        <h1 style="font-size:22px;margin:0">ATA DE TREINAMENTO</h1>
        <p style="margin:4px 0;color:#555;font-size:14px">Documento gerado em ${new Date().toLocaleString('pt-BR')}</p>
      </div>
      <table style="width:100%;border-collapse:collapse;margin-bottom:28px">
        <tr><td style="padding:8px 12px;border:1px solid #ddd;font-weight:bold;background:#f7f7f7;width:35%;font-size:13px">TÍTULO</td><td style="padding:8px 12px;border:1px solid #ddd;font-size:13px">${t.title}</td></tr>
        <tr><td style="padding:8px 12px;border:1px solid #ddd;font-weight:bold;background:#f7f7f7;font-size:13px">EMPRESA</td><td style="padding:8px 12px;border:1px solid #ddd;font-size:13px">${t.company?.name || '—'}</td></tr>
        <tr><td style="padding:8px 12px;border:1px solid #ddd;font-weight:bold;background:#f7f7f7;font-size:13px">TIPO</td><td style="padding:8px 12px;border:1px solid #ddd;font-size:13px">${TIPO_CONFIG[t.tipo]?.label || t.tipo}</td></tr>
        <tr><td style="padding:8px 12px;border:1px solid #ddd;font-weight:bold;background:#f7f7f7;font-size:13px">INSTRUTOR</td><td style="padding:8px 12px;border:1px solid #ddd;font-size:13px">${t.trainer?.name || '—'}</td></tr>
        <tr><td style="padding:8px 12px;border:1px solid #ddd;font-weight:bold;background:#f7f7f7;font-size:13px">DATA</td><td style="padding:8px 12px;border:1px solid #ddd;font-size:13px">${fmt(t.scheduledAt)}</td></tr>
        <tr><td style="padding:8px 12px;border:1px solid #ddd;font-weight:bold;background:#f7f7f7;font-size:13px">DURAÇÃO</td><td style="padding:8px 12px;border:1px solid #ddd;font-size:13px">${fmtDuration(t.duration) || '—'}</td></tr>
        ${t.location ? `<tr><td style="padding:8px 12px;border:1px solid #ddd;font-weight:bold;background:#f7f7f7;font-size:13px">LOCAL</td><td style="padding:8px 12px;border:1px solid #ddd;font-size:13px">${t.location}</td></tr>` : ''}
        <tr><td style="padding:8px 12px;border:1px solid #ddd;font-weight:bold;background:#f7f7f7;font-size:13px">STATUS</td><td style="padding:8px 12px;border:1px solid #ddd;font-size:13px">${STATUS_CONFIG[t.status]?.label || t.status}</td></tr>
      </table>
      ${t.description ? `<h3 style="font-size:14px;border-bottom:1px solid #ddd;padding-bottom:4px;margin-bottom:10px">DESCRIÇÃO / CONTEÚDO</h3><p style="font-size:13px;line-height:1.7;margin-bottom:24px;white-space:pre-wrap">${t.description}</p>` : ''}
      ${participantesRows ? `
      <h3 style="font-size:14px;border-bottom:1px solid #ddd;padding-bottom:4px;margin-bottom:10px">PARTICIPANTES</h3>
      <table style="width:100%;border-collapse:collapse;margin-bottom:28px">
        <thead><tr>
          <th style="padding:8px 10px;border:1px solid #ddd;background:#f7f7f7;font-size:12px;text-align:left">Nome</th>
          <th style="padding:8px 10px;border:1px solid #ddd;background:#f7f7f7;font-size:12px;text-align:left">Cargo / E-mail</th>
          <th style="padding:8px 10px;border:1px solid #ddd;background:#f7f7f7;font-size:12px;text-align:center;width:120px">Presença</th>
        </tr></thead>
        <tbody>${participantesRows}</tbody>
      </table>` : ''}
      ${t.notes ? `<h3 style="font-size:14px;border-bottom:1px solid #ddd;padding-bottom:4px;margin-bottom:10px">OBSERVAÇÕES</h3><p style="font-size:13px;line-height:1.7;margin-bottom:40px;white-space:pre-wrap">${t.notes}</p>` : ''}
      <div style="margin-top:60px;display:flex;gap:80px">
        <div style="flex:1;text-align:center"><div style="border-top:1px solid #333;padding-top:8px;font-size:12px"><b>${t.trainer?.name || 'Instrutor'}</b><br>Instrutor</div></div>
        <div style="flex:1;text-align:center"><div style="border-top:1px solid #333;padding-top:8px;font-size:12px"><b>${t.company?.name || 'Empresa'}</b><br>Cliente</div></div>
      </div>
    </div>`;

  const win = window.open('', '_blank');
  win.document.write(`<!DOCTYPE html><html><head><title>ATA - ${t.title}</title><style>@media print{body{margin:0;padding:0}}</style></head><body>${html}<script>window.onload=function(){window.print()}<\/script></body></html>`);
  win.document.close();
}

export default function Treinamentos() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterTipo, setFilterTipo] = useState('');

  const [companies, setCompanies] = useState([]);
  const [users, setUsers] = useState([]);
  const [employees, setEmployees] = useState([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const [participantesForm, setParticipantesForm] = useState([]);
  const [newParticipante, setNewParticipante] = useState({ employeeId: '', name: '', email: '' });

  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [updatingP, setUpdatingP] = useState(null);

  const [deleteModal, setDeleteModal] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const { user } = useAuth();
  const canEdit = ['SUPER_ADMIN', 'ADMIN', 'AGENT'].includes(user?.role);

  const load = useCallback(() => {
    setLoading(true);
    treinamentoService.list().then(setItems).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    companyService.list({ active: true }).then(r => setCompanies(r.data || r));
    userService.list({ active: true }).then(r => setUsers(r.data || r));
    employeeService.list({ active: true }).then(r => setEmployees(r.data || r));
  }, [load]);

  const filtered = items.filter(i => {
    if (filterStatus && i.status !== filterStatus) return false;
    if (filterTipo && i.tipo !== filterTipo) return false;
    if (search) {
      const q = normalize(search);
      return [i.title, i.company?.name, i.company?.fantasia, i.trainer?.name, i.tipo, i.description, i.notes].some(f => normalize(f).includes(q));
    }
    return true;
  });

  const openCreate = () => {
    setEditing(null);
    setParticipantesForm([]);
    setNewParticipante({ employeeId: '', name: '', email: '' });
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (record) => {
    setEditing(record);
    form.setFieldsValue({
      title: record.title,
      description: record.description,
      tipo: record.tipo,
      status: record.status,
      companyId: record.companyId,
      trainerId: record.trainerId,
      scheduledAt: record.scheduledAt ? record.scheduledAt.slice(0, 16) : '',
      duration: record.duration,
      location: record.location,
      meetingLink: record.meetingLink,
      notes: record.notes,
    });
    setParticipantesForm(record.participantes?.map(p => ({ ...p })) || []);
    setNewParticipante({ employeeId: '', name: '', email: '' });
    setModalOpen(true);
  };

  const handleSubmit = async (values) => {
    setSaving(true);
    try {
      const payload = { ...values, participantes: participantesForm };
      if (editing) {
        await treinamentoService.update(editing.id, payload);
        message.success('Treinamento atualizado');
        if (selected?.id === editing.id) {
          const updated = await treinamentoService.get(editing.id);
          setSelected(updated);
        }
      } else {
        await treinamentoService.create(payload);
        message.success('Treinamento cadastrado');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      message.error(err.response?.data?.error || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const openDetail = async (record) => {
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      const full = await treinamentoService.get(record.id);
      setSelected(full);
    } finally {
      setDetailLoading(false);
    }
  };

  const toggleAttended = async (treinamentoId, participanteId, attended) => {
    if (!selected) return;
    setUpdatingP(participanteId);
    try {
      await treinamentoService.updateParticipante(treinamentoId, participanteId, { attended });
      setSelected(prev => ({
        ...prev,
        participantes: prev.participantes.map(p =>
          p.id === participanteId ? { ...p, attended } : p
        ),
      }));
    } catch {
      message.error('Erro ao atualizar participante');
    } finally {
      setUpdatingP(null);
    }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await treinamentoService.remove(deleteModal.id);
      message.success('Treinamento excluído');
      if (selected?.id === deleteModal.id) { setDetailOpen(false); setSelected(null); }
      setDeleteModal(null);
      load();
    } catch (err) {
      message.error(err.response?.data?.error || 'Erro ao excluir');
    } finally {
      setDeleteLoading(false);
    }
  };

  const addParticipante = () => {
    const emp = employees.find(e => e.id === newParticipante.employeeId);
    const entry = {
      id: null,
      employeeId: newParticipante.employeeId || null,
      name: emp ? emp.name : newParticipante.name,
      email: emp ? emp.email : newParticipante.email,
      attended: false,
    };
    if (!entry.name && !entry.employeeId) return;
    setParticipantesForm(prev => [...prev, entry]);
    setNewParticipante({ employeeId: '', name: '', email: '' });
  };

  const removeParticipante = (idx) => {
    setParticipantesForm(prev => prev.filter((_, i) => i !== idx));
  };

  const columns = [
    {
      title: '#',
      dataIndex: 'code',
      width: 60,
      render: v => <span style={{ fontFamily: 'monospace', color: '#60a5fa', fontWeight: 700 }}>#{String(v).padStart(4, '0')}</span>,
    },
    {
      title: 'Título',
      dataIndex: 'title',
      render: (title, record) => (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--cl-text-hi)', fontSize: 13 }}>{title}</div>
          <div style={{ fontSize: 11, color: 'var(--cl-text-faint)' }}>{record.company?.fantasia || record.company?.name || '—'}</div>
        </div>
      ),
    },
    {
      title: 'Tipo',
      dataIndex: 'tipo',
      width: 130,
      render: v => <TipoBadge tipo={v} />,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 150,
      render: v => <StatusBadge status={v} />,
    },
    {
      title: 'Data',
      dataIndex: 'scheduledAt',
      width: 140,
      render: v => v ? (
        <span style={{ fontSize: 12 }}>
          {new Date(v).toLocaleDateString('pt-BR')} {new Date(v).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </span>
      ) : '—',
    },
    {
      title: 'Duração',
      dataIndex: 'duration',
      width: 90,
      render: v => <span style={{ fontSize: 12 }}>{fmtDuration(v) || '—'}</span>,
    },
    {
      title: 'Participantes',
      dataIndex: 'participantes',
      width: 110,
      render: (p = []) => {
        const attended = p.filter(x => x.attended).length;
        return <span style={{ fontSize: 12 }}>{attended}/{p.length}</span>;
      },
    },
    {
      title: 'Instrutor',
      dataIndex: 'trainer',
      width: 130,
      render: v => v ? <span style={{ fontSize: 12 }}>{v.name}</span> : '—',
    },
    {
      title: '',
      key: 'actions',
      width: 100,
      render: (_, record) => (
        <Space size={4}>
          <Tooltip title="Detalhes">
            <Button type="text" icon={<EyeOutlined />} size="small" onClick={() => openDetail(record)} />
          </Tooltip>
          <Tooltip title="Gerar ATA">
            <Button type="text" icon={<PrinterOutlined />} size="small" style={{ color: '#60a5fa' }} onClick={() => gerarATATreinamento(record)} />
          </Tooltip>
          {canEdit && (
            <>
              <Tooltip title="Editar">
                <Button type="text" icon={<EditOutlined />} size="small" onClick={() => openEdit(record)} />
              </Tooltip>
              <Tooltip title="Excluir">
                <Button type="text" icon={<DeleteOutlined />} size="small" danger
                  onClick={() => setDeleteModal({ id: record.id, title: record.title })} />
              </Tooltip>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="page-wrap">
      <div className="page-header">
        <div>
          <h1 className="page-title">Treinamentos</h1>
          <p style={{ color: 'var(--cl-text-muted)', fontSize: 13, margin: '4px 0 0' }}>
            {items.length} treinamento{items.length !== 1 ? 's' : ''} cadastrado{items.length !== 1 ? 's' : ''}
          </p>
        </div>
        {canEdit && (
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}
            style={{ borderRadius: 8, fontWeight: 600 }}>
            Novo Treinamento
          </Button>
        )}
      </div>

      {/* KPI cards */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
          const count = items.filter(i => i.status === key).length;
          return (
            <div
              key={key}
              onClick={() => setFilterStatus(filterStatus === key ? '' : key)}
              style={{
                flex: '1 1 140px', minWidth: 130, padding: '12px 16px', borderRadius: 10, cursor: 'pointer',
                background: filterStatus === key ? cfg.bg : 'var(--cl-bg-card)',
                border: `1px solid ${filterStatus === key ? cfg.color + '60' : 'var(--cl-border)'}`,
                transition: 'all 0.15s',
              }}
            >
              <div style={{ fontSize: 11, color: cfg.color, fontWeight: 600, marginBottom: 4 }}>{cfg.label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--cl-text-hi)' }}>{count}</div>
            </div>
          );
        })}
        {Object.entries(TIPO_CONFIG).map(([key, cfg]) => {
          const count = items.filter(i => i.tipo === key).length;
          return (
            <div
              key={key}
              onClick={() => setFilterTipo(filterTipo === key ? '' : key)}
              style={{
                flex: '1 1 120px', minWidth: 110, padding: '12px 16px', borderRadius: 10, cursor: 'pointer',
                background: filterTipo === key ? cfg.bg : 'var(--cl-bg-card)',
                border: `1px solid ${filterTipo === key ? cfg.color + '60' : 'var(--cl-border)'}`,
                transition: 'all 0.15s',
              }}
            >
              <div style={{ fontSize: 11, color: cfg.color, fontWeight: 600, marginBottom: 4 }}>{cfg.icon} {cfg.label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--cl-text-hi)' }}>{count}</div>
            </div>
          );
        })}
      </div>

      <div className="filter-bar" style={{ marginBottom: 16 }}>
        <Input
          placeholder="Buscar por título, empresa ou instrutor..."
          allowClear
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1 }}
        />
        <Select placeholder="Status" allowClear value={filterStatus || undefined}
          onChange={v => setFilterStatus(v || '')} style={{ width: 160 }}>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => <Option key={k} value={k}>{v.label}</Option>)}
        </Select>
        <Select placeholder="Tipo" allowClear value={filterTipo || undefined}
          onChange={v => setFilterTipo(v || '')} style={{ width: 140 }}>
          {Object.entries(TIPO_CONFIG).map(([k, v]) => <Option key={k} value={k}>{v.label}</Option>)}
        </Select>
      </div>

      <div style={{ background: 'var(--cl-bg-card)', border: '1px solid var(--cl-border)', borderRadius: 12, overflow: 'hidden' }}>
        <Table
          dataSource={filtered}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 15, showSizeChanger: false, showTotal: t => `${t} registros` }}
          size="middle"
          locale={{ emptyText: 'Nenhum treinamento encontrado' }}
        />
      </div>

      {/* Drawer — Detalhes */}
      <Drawer
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        width={520}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <TeamOutlined style={{ color: '#60a5fa' }} />
            <span>Detalhes do Treinamento</span>
          </div>
        }
        loading={detailLoading}
      >
        {selected && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 11, color: '#60a5fa', fontFamily: 'monospace', fontWeight: 700, marginBottom: 4 }}>
                  #{String(selected.code).padStart(4, '0')}
                </div>
                <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--cl-text-hi)' }}>{selected.title}</div>
              </div>
              <Space>
                <TipoBadge tipo={selected.tipo} />
                <StatusBadge status={selected.status} />
              </Space>
            </div>

            {selected.description && (
              <p style={{ fontSize: 13, color: 'var(--cl-text)', lineHeight: 1.7, marginBottom: 16 }}>
                {selected.description}
              </p>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
              {[
                { label: 'Empresa', value: selected.company?.fantasia || selected.company?.name },
                { label: 'Instrutor', value: selected.trainer?.name },
                { label: 'Data', value: selected.scheduledAt ? new Date(selected.scheduledAt).toLocaleString('pt-BR') : null },
                { label: 'Duração', value: fmtDuration(selected.duration) },
                { label: 'Local', value: selected.location },
                { label: 'Link', value: selected.meetingLink, link: true },
              ].filter(i => i.value).map(item => (
                <div key={item.label} style={{
                  padding: '10px 14px', borderRadius: 8,
                  background: 'var(--cl-bg)', border: '1px solid var(--cl-border)',
                }}>
                  <div style={{ fontSize: 11, color: 'var(--cl-text-faint)', marginBottom: 3 }}>{item.label}</div>
                  {item.link
                    ? <a href={item.value} target="_blank" rel="noreferrer" style={{ fontSize: 12 }}>{item.value}</a>
                    : <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--cl-text-hi)' }}>{item.value}</div>
                  }
                </div>
              ))}
            </div>

            {selected.participantes?.length > 0 && (
              <>
                <Divider style={{ margin: '16px 0' }} />
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--cl-text-soft)', marginBottom: 12 }}>
                  Participantes — {selected.participantes.filter(p => p.attended).length}/{selected.participantes.length} presentes
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {selected.participantes.map(p => {
                    const nome = p.employee?.name || p.name || 'Sem nome';
                    const cargo = p.employee?.position;
                    return (
                      <div key={p.id} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '8px 12px', borderRadius: 8,
                        background: p.attended ? 'rgba(16,185,129,0.06)' : 'var(--cl-bg)',
                        border: `1px solid ${p.attended ? 'rgba(16,185,129,0.25)' : 'var(--cl-border)'}`,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <UserOutlined style={{ color: p.attended ? '#34d399' : 'var(--cl-text-dim)' }} />
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--cl-text-hi)' }}>{nome}</div>
                            {cargo && <div style={{ fontSize: 11, color: 'var(--cl-text-faint)' }}>{cargo}</div>}
                          </div>
                        </div>
                        {canEdit && (
                          <Checkbox
                            checked={p.attended}
                            onChange={e => toggleAttended(selected.id, p.id, e.target.checked)}
                            disabled={updatingP === p.id}
                          >
                            <span style={{ fontSize: 11 }}>Presente</span>
                          </Checkbox>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {selected.notes && (
              <>
                <Divider style={{ margin: '16px 0' }} />
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--cl-text-soft)', marginBottom: 8 }}>Observações</div>
                <p style={{ fontSize: 13, color: 'var(--cl-text)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{selected.notes}</p>
              </>
            )}

            <div style={{ marginTop: 24, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Button icon={<PrinterOutlined />} onClick={() => gerarATATreinamento(selected)} style={{ color: '#60a5fa', borderColor: '#2563eb' }}>
                Gerar ATA
              </Button>
              {canEdit && (
                <>
                  <Button icon={<EditOutlined />} onClick={() => openEdit(selected)}>Editar</Button>
                  <Button danger icon={<DeleteOutlined />}
                    onClick={() => setDeleteModal({ id: selected.id, title: selected.title })}>
                    Excluir
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </Drawer>

      {/* Modal — Criar / Editar */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(37,99,235,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TeamOutlined style={{ color: '#60a5fa', fontSize: 16 }} />
            </div>
            <span style={{ fontWeight: 700, fontSize: 16 }}>{editing ? 'Editar Treinamento' : 'Novo Treinamento'}</span>
          </div>
        }
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        centered width={720}
        styles={{ body: { padding: '24px 0 8px', maxHeight: '70vh', overflowY: 'auto' } }}
        footer={
          <Space>
            <Button onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="primary" loading={saving} onClick={() => form.submit()}
              style={{ background: '#2563eb', borderColor: '#2563eb', fontWeight: 600 }}>
              {editing ? 'Salvar Alterações' : 'Cadastrar'}
            </Button>
          </Space>
        }
      >
        <div style={{ padding: '0 24px' }}>
          <Form form={form} layout="vertical" onFinish={handleSubmit}>
            <Form.Item name="title" label="Título" rules={[{ required: true }]}>
              <Input placeholder="Título do treinamento" size="large" />
            </Form.Item>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Form.Item name="tipo" label="Tipo" rules={[{ required: true }]}>
                <Select size="large" placeholder="Selecione">
                  {Object.entries(TIPO_CONFIG).map(([k, v]) => <Option key={k} value={k}>{v.icon} {v.label}</Option>)}
                </Select>
              </Form.Item>
              <Form.Item name="status" label="Status">
                <Select size="large" defaultValue="AGENDADO">
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => <Option key={k} value={k}>{v.label}</Option>)}
                </Select>
              </Form.Item>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Form.Item name="companyId" label="Empresa">
                <Select placeholder="Selecione (opcional)" allowClear showSearch
                  filterOption={(input, option) => normalize(option?.children || '').includes(normalize(input))}
                  size="large">
                  {companies.map(c => <Option key={c.id} value={c.id}>{c.fantasia || c.name}</Option>)}
                </Select>
              </Form.Item>
              <Form.Item name="trainerId" label="Instrutor">
                <Select placeholder="Selecione" allowClear showSearch
                  filterOption={(input, option) => normalize(option?.children || '').includes(normalize(input))}
                  size="large">
                  {users.map(u => <Option key={u.id} value={u.id}>{u.name}</Option>)}
                </Select>
              </Form.Item>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Form.Item name="scheduledAt" label="Data e Hora">
                <Input type="datetime-local" size="large" />
              </Form.Item>
              <Form.Item name="duration" label="Duração (minutos)">
                <Input type="number" min={1} placeholder="Ex: 60" size="large" />
              </Form.Item>
            </div>

            <Form.Item noStyle shouldUpdate={(prev, cur) => prev.tipo !== cur.tipo}>
              {({ getFieldValue }) => {
                const tipo = getFieldValue('tipo');
                return (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    {tipo !== 'REMOTO' && (
                      <Form.Item name="location" label="Local">
                        <Input placeholder="Endereço ou sala" size="large" />
                      </Form.Item>
                    )}
                    {tipo !== 'PRESENCIAL' && (
                      <Form.Item name="meetingLink" label="Link da Reunião">
                        <Input placeholder="https://meet.google.com/..." size="large" />
                      </Form.Item>
                    )}
                  </div>
                );
              }}
            </Form.Item>

            <Form.Item name="description" label="Descrição">
              <TextArea rows={3} placeholder="Objetivos e conteúdo programático..." style={{ resize: 'vertical' }} />
            </Form.Item>

            {/* Participantes */}
            <Divider orientation="left" style={{ fontSize: 13, fontWeight: 700 }}>Participantes</Divider>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
              {participantesForm.map((p, idx) => {
                const nome = employees.find(e => e.id === p.employeeId)?.name || p.name || '—';
                return (
                  <div key={idx} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 12px', borderRadius: 8,
                    background: 'var(--cl-bg)', border: '1px solid var(--cl-border)',
                  }}>
                    <span style={{ fontSize: 13 }}><UserOutlined style={{ marginRight: 6 }} />{nome}</span>
                    <Button type="text" danger size="small" icon={<DeleteOutlined />} onClick={() => removeParticipante(idx)} />
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8, marginBottom: 16 }}>
              <Select
                placeholder="Funcionário (opcional)"
                allowClear showSearch
                value={newParticipante.employeeId || undefined}
                onChange={v => setNewParticipante(prev => ({ ...prev, employeeId: v || '' }))}
                filterOption={(input, option) => normalize(option?.children || '').includes(normalize(input))}
              >
                {employees.map(e => <Option key={e.id} value={e.id}>{e.name}</Option>)}
              </Select>
              <Input
                placeholder="Ou nome livre"
                value={newParticipante.name}
                onChange={e => setNewParticipante(prev => ({ ...prev, name: e.target.value }))}
                disabled={!!newParticipante.employeeId}
              />
              <Button icon={<UserAddOutlined />} onClick={addParticipante}>Adicionar</Button>
            </div>

            <Form.Item name="notes" label="Observações">
              <TextArea rows={2} placeholder="Notas adicionais..." style={{ resize: 'vertical' }} />
            </Form.Item>
          </Form>
        </div>
      </Modal>

      {/* Modal — Excluir */}
      <Modal
        open={!!deleteModal}
        onCancel={() => setDeleteModal(null)}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ExclamationCircleOutlined style={{ color: '#f87171', fontSize: 20 }} />
            <span style={{ fontWeight: 700 }}>Excluir Treinamento</span>
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
          <p style={{ padding: '8px 0' }}>
            Deseja excluir o treinamento <strong>"{deleteModal.title}"</strong>?
            Todos os participantes vinculados serão removidos. Esta ação não pode ser desfeita.
          </p>
        )}
      </Modal>
    </div>
  );
}
