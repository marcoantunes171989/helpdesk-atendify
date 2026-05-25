import { useEffect, useState, useCallback } from 'react';
import {
  Button, Modal, Form, Input, Select, Space, Tag, Tooltip,
  message, Table, Progress, Drawer, Divider, Steps, Badge,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined,
  ExclamationCircleOutlined, CheckCircleOutlined, ClockCircleOutlined,
  PauseCircleOutlined, CloseCircleOutlined, SyncOutlined,
  CalendarOutlined, TeamOutlined, ToolOutlined, BuildOutlined, PrinterOutlined,
} from '@ant-design/icons';
import { implantacaoService, companyService, userService, technicianService, employeeService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { normalize } from '../utils/constants';

const { TextArea } = Input;
const { Option } = Select;

const STATUS_CONFIG = {
  PENDENTE:     { label: 'Pendente',     color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', icon: <ClockCircleOutlined />,  antColor: 'default' },
  EM_ANDAMENTO: { label: 'Em Andamento', color: '#60a5fa', bg: 'rgba(37,99,235,0.12)',   icon: <SyncOutlined spin />,     antColor: 'processing' },
  PAUSADO:      { label: 'Pausado',      color: '#fbbf24', bg: 'rgba(217,119,6,0.12)',   icon: <PauseCircleOutlined />,   antColor: 'warning' },
  CONCLUIDO:    { label: 'Concluído',    color: '#34d399', bg: 'rgba(16,185,129,0.12)',  icon: <CheckCircleOutlined />,   antColor: 'success' },
  CANCELADO:    { label: 'Cancelado',    color: '#f87171', bg: 'rgba(220,38,38,0.12)',   icon: <CloseCircleOutlined />,   antColor: 'error' },
};

const FASE_STATUS = {
  PENDENTE:     { label: 'Pendente',     color: 'default' },
  EM_ANDAMENTO: { label: 'Em Andamento', color: 'processing' },
  CONCLUIDO:    { label: 'Concluído',    color: 'success' },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.PENDENTE;
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

function faseProgress(fases = []) {
  if (!fases.length) return 0;
  return Math.round((fases.filter(f => f.status === 'CONCLUIDO').length / fases.length) * 100);
}

function gerarATAImplantacao(imp) {
  const fmt = d => d ? new Date(d).toLocaleDateString('pt-BR') : '—';
  const fasesRows = (imp.fases || []).map((f, i) => `
    <tr>
      <td style="padding:7px 10px;border:1px solid #ddd;font-size:12px">${i + 1}. ${f.title}</td>
      <td style="padding:7px 10px;border:1px solid #ddd;font-size:12px">${FASE_STATUS[f.status]?.label || f.status}</td>
      <td style="padding:7px 10px;border:1px solid #ddd;font-size:12px">${f.description || '—'}</td>
    </tr>`).join('');

  const html = `
    <div style="font-family:Arial,sans-serif;color:#111;max-width:800px;margin:0 auto;padding:40px">
      <div style="text-align:center;margin-bottom:32px">
        <h1 style="font-size:22px;margin:0">ATA DE IMPLANTAÇÃO</h1>
        <p style="margin:4px 0;color:#555;font-size:14px">Documento gerado em ${new Date().toLocaleString('pt-BR')}</p>
      </div>
      <table style="width:100%;border-collapse:collapse;margin-bottom:28px">
        <tr><td style="padding:8px 12px;border:1px solid #ddd;font-weight:bold;background:#f7f7f7;width:35%;font-size:13px">TÍTULO</td><td style="padding:8px 12px;border:1px solid #ddd;font-size:13px">${imp.title}</td></tr>
        <tr><td style="padding:8px 12px;border:1px solid #ddd;font-weight:bold;background:#f7f7f7;font-size:13px">EMPRESA</td><td style="padding:8px 12px;border:1px solid #ddd;font-size:13px">${imp.company?.name || '—'}</td></tr>
        <tr><td style="padding:8px 12px;border:1px solid #ddd;font-weight:bold;background:#f7f7f7;font-size:13px">RESPONSÁVEL</td><td style="padding:8px 12px;border:1px solid #ddd;font-size:13px">${imp.responsavel?.name || '—'}</td></tr>
        <tr><td style="padding:8px 12px;border:1px solid #ddd;font-weight:bold;background:#f7f7f7;font-size:13px">TÉCNICO</td><td style="padding:8px 12px;border:1px solid #ddd;font-size:13px">${imp.technician?.name || '—'}</td></tr>
        <tr><td style="padding:8px 12px;border:1px solid #ddd;font-weight:bold;background:#f7f7f7;font-size:13px">STATUS</td><td style="padding:8px 12px;border:1px solid #ddd;font-size:13px">${STATUS_CONFIG[imp.status]?.label || imp.status}</td></tr>
        <tr><td style="padding:8px 12px;border:1px solid #ddd;font-weight:bold;background:#f7f7f7;font-size:13px">INÍCIO PREVISTO</td><td style="padding:8px 12px;border:1px solid #ddd;font-size:13px">${fmt(imp.startDate)}</td></tr>
        <tr><td style="padding:8px 12px;border:1px solid #ddd;font-weight:bold;background:#f7f7f7;font-size:13px">FIM PREVISTO</td><td style="padding:8px 12px;border:1px solid #ddd;font-size:13px">${fmt(imp.endDate)}</td></tr>
        ${imp.completedAt ? `<tr><td style="padding:8px 12px;border:1px solid #ddd;font-weight:bold;background:#f7f7f7;font-size:13px">CONCLUÍDO EM</td><td style="padding:8px 12px;border:1px solid #ddd;font-size:13px">${fmt(imp.completedAt)}</td></tr>` : ''}
      </table>
      ${imp.description ? `<h3 style="font-size:14px;border-bottom:1px solid #ddd;padding-bottom:4px;margin-bottom:10px">DESCRIÇÃO</h3><p style="font-size:13px;line-height:1.7;margin-bottom:24px;white-space:pre-wrap">${imp.description}</p>` : ''}
      ${fasesRows ? `
      <h3 style="font-size:14px;border-bottom:1px solid #ddd;padding-bottom:4px;margin-bottom:10px">FASES DA IMPLANTAÇÃO</h3>
      <table style="width:100%;border-collapse:collapse;margin-bottom:28px">
        <thead><tr>
          <th style="padding:8px 10px;border:1px solid #ddd;background:#f7f7f7;font-size:12px;text-align:left">Fase</th>
          <th style="padding:8px 10px;border:1px solid #ddd;background:#f7f7f7;font-size:12px;text-align:left;width:140px">Status</th>
          <th style="padding:8px 10px;border:1px solid #ddd;background:#f7f7f7;font-size:12px;text-align:left">Descrição</th>
        </tr></thead>
        <tbody>${fasesRows}</tbody>
      </table>` : ''}
      ${imp.notes ? `<h3 style="font-size:14px;border-bottom:1px solid #ddd;padding-bottom:4px;margin-bottom:10px">OBSERVAÇÕES</h3><p style="font-size:13px;line-height:1.7;margin-bottom:40px;white-space:pre-wrap">${imp.notes}</p>` : ''}
      <div style="margin-top:60px;display:flex;gap:80px">
        <div style="flex:1;text-align:center"><div style="border-top:1px solid #333;padding-top:8px;font-size:12px"><b>${imp.responsavel?.name || 'Responsável'}</b><br>Responsável pela Implantação</div></div>
        <div style="flex:1;text-align:center"><div style="border-top:1px solid #333;padding-top:8px;font-size:12px"><b>${imp.company?.name || 'Empresa'}</b><br>Cliente</div></div>
      </div>
    </div>`;

  const win = window.open('', '_blank');
  win.document.write(`<!DOCTYPE html><html><head><title>ATA - ${imp.title}</title><style>@media print{body{margin:0;padding:0}}</style></head><body>${html}<script>window.onload=function(){window.print()}<\/script></body></html>`);
  win.document.close();
}

export default function Implantacoes() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const [companies, setCompanies] = useState([]);
  const [users, setUsers] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [allEmployees, setAllEmployees] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const [fasesForm, setFasesForm] = useState([]);

  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [updatingFase, setUpdatingFase] = useState(null);

  const [deleteModal, setDeleteModal] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const { user } = useAuth();
  const canEdit = ['SUPER_ADMIN', 'ADMIN', 'AGENT'].includes(user?.role);

  const load = useCallback(() => {
    setLoading(true);
    implantacaoService.list().then(setItems).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    companyService.list({ active: true }).then(r => setCompanies(r.data || r));
    userService.list({ active: true }).then(r => setUsers(r.data || r));
    technicianService.list({ active: true }).then(r => setTechnicians(r.data || r));
    employeeService.list({ active: true }).then(r => setAllEmployees(r.data || r));
  }, [load]);

  const filtered = items.filter(i => {
    if (filterStatus && i.status !== filterStatus) return false;
    if (search) {
      const q = normalize(search);
      return [i.title, i.company?.name, i.company?.fantasia, i.responsible?.name, i.technician?.name, i.description, i.notes].some(f => normalize(f).includes(q));
    }
    return true;
  });

  const openCreate = () => {
    setEditing(null);
    setFasesForm([]);
    setSelectedCompanyId(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (record) => {
    setEditing(record);
    setSelectedCompanyId(record.companyId || null);
    form.setFieldsValue({
      title: record.title,
      description: record.description,
      status: record.status,
      companyId: record.companyId,
      responsibleId: record.responsibleId,
      technicianId: record.technicianId,
      employeeId: record.employeeId || undefined,
      startDate: record.startDate ? record.startDate.slice(0, 10) : '',
      expectedEnd: record.expectedEnd ? record.expectedEnd.slice(0, 10) : '',
      notes: record.notes,
    });
    setFasesForm(record.fases?.map(f => ({ ...f })) || []);
    setModalOpen(true);
  };

  const handleSubmit = async (values) => {
    setSaving(true);
    try {
      const payload = { ...values, fases: fasesForm };
      if (editing) {
        await implantacaoService.update(editing.id, payload);
        message.success('Implantação atualizada');
        if (selected?.id === editing.id) {
          const updated = await implantacaoService.get(editing.id);
          setSelected(updated);
        }
      } else {
        await implantacaoService.create(payload);
        message.success('Implantação cadastrada');
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
      const full = await implantacaoService.get(record.id);
      setSelected(full);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleFaseStatus = async (faseId, status) => {
    if (!selected) return;
    setUpdatingFase(faseId);
    try {
      await implantacaoService.updateFase(selected.id, faseId, { status });
      const updated = await implantacaoService.get(selected.id);
      setSelected(updated);
      setItems(prev => prev.map(i => i.id === updated.id ? { ...i, status: updated.status, fases: updated.fases } : i));
    } catch {
      message.error('Erro ao atualizar fase');
    } finally {
      setUpdatingFase(null);
    }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await implantacaoService.remove(deleteModal.id);
      message.success('Implantação excluída');
      if (selected?.id === deleteModal.id) { setDetailOpen(false); setSelected(null); }
      setDeleteModal(null);
      load();
    } catch (err) {
      message.error(err.response?.data?.error || 'Erro ao excluir');
    } finally {
      setDeleteLoading(false);
    }
  };

  const addFase = () => setFasesForm(prev => [
    ...prev,
    { id: null, order: prev.length + 1, title: '', description: '', status: 'PENDENTE' },
  ]);

  const updateFaseField = (idx, field, value) => {
    setFasesForm(prev => prev.map((f, i) => i === idx ? { ...f, [field]: value } : f));
  };

  const removeFase = (idx) => {
    setFasesForm(prev => prev.filter((_, i) => i !== idx).map((f, i) => ({ ...f, order: i + 1 })));
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
          <div style={{ fontSize: 11, color: 'var(--cl-text-faint)' }}>{record.company?.fantasia || record.company?.name}</div>
        </div>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 150,
      render: v => <StatusBadge status={v} />,
    },
    {
      title: 'Progresso',
      dataIndex: 'fases',
      width: 160,
      render: (fases = []) => {
        const pct = faseProgress(fases);
        return fases.length > 0 ? (
          <div>
            <Progress percent={pct} size="small" strokeColor="#3b82f6" trailColor="var(--cl-border)" />
            <div style={{ fontSize: 11, color: 'var(--cl-text-faint)', marginTop: 2 }}>
              {fases.filter(f => f.status === 'CONCLUIDO').length}/{fases.length} fases
            </div>
          </div>
        ) : <span style={{ color: 'var(--cl-text-dim)', fontSize: 12 }}>—</span>;
      },
    },
    {
      title: 'Responsável',
      dataIndex: 'responsible',
      width: 140,
      render: v => v ? <span style={{ fontSize: 12 }}>{v.name}</span> : '—',
    },
    {
      title: 'Técnico',
      dataIndex: 'technician',
      width: 130,
      render: v => v ? <span style={{ fontSize: 12 }}>{v.name}</span> : '—',
    },
    {
      title: 'Previsão',
      dataIndex: 'expectedEnd',
      width: 110,
      render: v => v ? <span style={{ fontSize: 12 }}>{new Date(v).toLocaleDateString('pt-BR')}</span> : '—',
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
            <Button type="text" icon={<PrinterOutlined />} size="small" style={{ color: '#60a5fa' }} onClick={() => gerarATAImplantacao(record)} />
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
          <h1 className="page-title">Implantações</h1>
          <p style={{ color: 'var(--cl-text-muted)', fontSize: 13, margin: '4px 0 0' }}>
            {items.length} implantaç{items.length !== 1 ? 'ões' : 'ão'} cadastrada{items.length !== 1 ? 's' : ''}
          </p>
        </div>
        {canEdit && (
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}
            style={{ borderRadius: 8, fontWeight: 600 }}>
            Nova Implantação
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
      </div>

      <div className="filter-bar" style={{ marginBottom: 16 }}>
        <Input
          placeholder="Buscar por título, empresa ou responsável..."
          allowClear
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1 }}
        />
        <Select
          placeholder="Filtrar por status"
          allowClear
          value={filterStatus || undefined}
          onChange={v => setFilterStatus(v || '')}
          style={{ width: 180 }}
        >
          {Object.entries(STATUS_CONFIG).map(([k, v]) => (
            <Option key={k} value={k}>{v.label}</Option>
          ))}
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
          locale={{ emptyText: 'Nenhuma implantação encontrada' }}
        />
      </div>

      {/* Drawer — Detalhes */}
      <Drawer
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        width={520}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <BuildOutlined style={{ color: '#60a5fa' }} />
            <span>Detalhes da Implantação</span>
          </div>
        }
        loading={detailLoading}
      >
        {selected && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 11, color: '#60a5fa', fontFamily: 'monospace', fontWeight: 700, marginBottom: 4 }}>
                  #{String(selected.code).padStart(4, '0')}
                </div>
                <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--cl-text-hi)' }}>{selected.title}</div>
              </div>
              <StatusBadge status={selected.status} />
            </div>

            {selected.description && (
              <p style={{ fontSize: 13, color: 'var(--cl-text)', lineHeight: 1.7, marginBottom: 16 }}>
                {selected.description}
              </p>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              {[
                { label: 'Empresa', value: selected.company?.fantasia || selected.company?.name, icon: <TeamOutlined /> },
                { label: 'Funcionário', value: selected.employee ? `${selected.employee.name}${selected.employee.position ? ` — ${selected.employee.position}` : ''}` : null, icon: <TeamOutlined /> },
                { label: 'Responsável', value: selected.responsible?.name, icon: <TeamOutlined /> },
                { label: 'Técnico', value: selected.technician?.name, icon: <ToolOutlined /> },
                { label: 'Início', value: selected.startDate ? new Date(selected.startDate).toLocaleDateString('pt-BR') : null, icon: <CalendarOutlined /> },
                { label: 'Previsão', value: selected.expectedEnd ? new Date(selected.expectedEnd).toLocaleDateString('pt-BR') : null, icon: <CalendarOutlined /> },
                { label: 'Concluído em', value: selected.completedAt ? new Date(selected.completedAt).toLocaleDateString('pt-BR') : null, icon: <CheckCircleOutlined /> },
              ].filter(i => i.value).map(item => (
                <div key={item.label} style={{
                  padding: '10px 14px', borderRadius: 8,
                  background: 'var(--cl-bg)', border: '1px solid var(--cl-border)',
                }}>
                  <div style={{ fontSize: 11, color: 'var(--cl-text-faint)', marginBottom: 3 }}>{item.label}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--cl-text-hi)' }}>{item.value}</div>
                </div>
              ))}
            </div>

            {selected.fases?.length > 0 && (
              <>
                <Divider style={{ margin: '16px 0' }} />
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--cl-text-soft)', marginBottom: 12 }}>
                  Fases — {faseProgress(selected.fases)}% concluído
                </div>
                <Progress
                  percent={faseProgress(selected.fases)}
                  strokeColor="#3b82f6"
                  trailColor="var(--cl-border)"
                  style={{ marginBottom: 16 }}
                />
                <Steps
                  direction="vertical"
                  size="small"
                  current={-1}
                  items={selected.fases.map(fase => ({
                    title: (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{fase.title}</span>
                        <Space size={4}>
                          {canEdit && fase.status !== 'CONCLUIDO' && (
                            <Button
                              size="small" type="text"
                              loading={updatingFase === fase.id}
                              onClick={() => handleFaseStatus(fase.id, fase.status === 'PENDENTE' ? 'EM_ANDAMENTO' : 'CONCLUIDO')}
                              style={{ fontSize: 11, color: '#60a5fa' }}
                            >
                              {fase.status === 'PENDENTE' ? 'Iniciar' : 'Concluir'}
                            </Button>
                          )}
                          <Tag color={FASE_STATUS[fase.status]?.color}>{FASE_STATUS[fase.status]?.label}</Tag>
                        </Space>
                      </div>
                    ),
                    description: fase.description,
                    status: fase.status === 'CONCLUIDO' ? 'finish' : fase.status === 'EM_ANDAMENTO' ? 'process' : 'wait',
                  }))}
                />
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
              <Button icon={<PrinterOutlined />} onClick={() => gerarATAImplantacao(selected)} style={{ color: '#60a5fa', borderColor: '#2563eb' }}>
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
              <BuildOutlined style={{ color: '#60a5fa', fontSize: 16 }} />
            </div>
            <span style={{ fontWeight: 700, fontSize: 16 }}>{editing ? 'Editar Implantação' : 'Nova Implantação'}</span>
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
              <Input placeholder="Título da implantação" size="large" />
            </Form.Item>

            <Form.Item name="companyId" label="Empresa" rules={[{ required: true }]}>
              <Select
                placeholder="Selecione a empresa" showSearch size="large"
                optionLabelProp="label"
                filterOption={(input, option) => {
                  const q = normalize(input);
                  return normalize(option?.name || '').includes(q) || normalize(option?.fantasia || '').includes(q);
                }}
                onChange={v => {
                  setSelectedCompanyId(v || null);
                  form.setFieldValue('employeeId', undefined);
                }}
              >
                {companies.map(c => (
                  <Option
                    key={c.id} value={c.id}
                    label={c.fantasia ? `${c.name} — ${c.fantasia}` : c.name}
                    name={c.name} fantasia={c.fantasia || ''}
                  >
                    <div style={{ lineHeight: 1.35 }}>
                      <div style={{ fontWeight: 500, fontSize: 13 }}>{c.name}</div>
                      {c.fantasia && <div style={{ fontSize: 11, color: 'var(--cl-text-muted)' }}>{c.fantasia}</div>}
                    </div>
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item name="employeeId" label="Funcionário da empresa">
              <Select
                placeholder={selectedCompanyId ? 'Selecione o funcionário' : 'Selecione a empresa primeiro'}
                allowClear showSearch size="large"
                disabled={!selectedCompanyId}
                filterOption={(input, option) => normalize(option?.children || '').includes(normalize(input))}
              >
                {allEmployees
                  .filter(e => e.companyId === selectedCompanyId)
                  .map(e => (
                    <Option key={e.id} value={e.id}>
                      {e.name}{e.position ? ` — ${e.position}` : ''}
                    </Option>
                  ))}
              </Select>
            </Form.Item>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Form.Item name="responsibleId" label="Responsável">
                <Select placeholder="Selecione" allowClear showSearch
                  filterOption={(input, option) => normalize(option?.children || '').includes(normalize(input))}
                  size="large">
                  {users.map(u => <Option key={u.id} value={u.id}>{u.name}</Option>)}
                </Select>
              </Form.Item>
              <Form.Item name="technicianId" label="Técnico">
                <Select placeholder="Selecione" allowClear showSearch
                  filterOption={(input, option) => normalize(option?.children || '').includes(normalize(input))}
                  size="large">
                  {technicians.map(t => <Option key={t.id} value={t.id}>{t.name}</Option>)}
                </Select>
              </Form.Item>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
              <Form.Item name="status" label="Status">
                <Select size="large" defaultValue="PENDENTE">
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => <Option key={k} value={k}>{v.label}</Option>)}
                </Select>
              </Form.Item>
              <Form.Item name="startDate" label="Data de Início">
                <Input type="date" size="large" />
              </Form.Item>
              <Form.Item name="expectedEnd" label="Previsão de Término">
                <Input type="date" size="large" />
              </Form.Item>
            </div>

            <Form.Item name="description" label="Descrição">
              <TextArea rows={3} placeholder="Descreva o escopo da implantação..." style={{ resize: 'vertical' }} />
            </Form.Item>

            {/* Fases */}
            <Divider orientation="left" style={{ fontSize: 13, fontWeight: 700 }}>Fases / Etapas</Divider>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
              {fasesForm.map((fase, idx) => (
                <div key={idx} style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8, alignItems: 'start',
                  padding: '10px 12px', borderRadius: 8,
                  background: 'var(--cl-bg)', border: '1px solid var(--cl-border)',
                }}>
                  <Input
                    placeholder={`Fase ${idx + 1} — título`}
                    value={fase.title}
                    onChange={e => updateFaseField(idx, 'title', e.target.value)}
                  />
                  <Select
                    value={fase.status}
                    onChange={v => updateFaseField(idx, 'status', v)}
                    size="middle"
                  >
                    {Object.entries(FASE_STATUS).map(([k, v]) => <Option key={k} value={k}>{v.label}</Option>)}
                  </Select>
                  <Button type="text" danger icon={<DeleteOutlined />} onClick={() => removeFase(idx)} />
                </div>
              ))}
            </div>
            <Button icon={<PlusOutlined />} onClick={addFase} size="small" style={{ marginBottom: 16 }}>
              Adicionar Fase
            </Button>

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
            <span style={{ fontWeight: 700 }}>Excluir Implantação</span>
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
            Deseja excluir a implantação <strong>"{deleteModal.title}"</strong>?
            Todas as fases vinculadas serão removidas. Esta ação não pode ser desfeita.
          </p>
        )}
      </Modal>
    </div>
  );
}
