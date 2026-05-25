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

function gerarATAImplantacao(imp, allEmployees = []) {
  const fmt = d => d ? new Date(d).toLocaleDateString('pt-BR') : '—';

  const statusStyle = {
    PENDENTE:     { bg: '#fff8e1', color: '#b45309', border: '#f59e0b' },
    EM_ANDAMENTO: { bg: '#eff6ff', color: '#1d4ed8', border: '#3b82f6' },
    CONCLUIDO:    { bg: '#f0fdf4', color: '#15803d', border: '#22c55e' },
    BLOQUEADO:    { bg: '#fef2f2', color: '#b91c1c', border: '#ef4444' },
  };
  const statusBadge = s => {
    const st = statusStyle[s] || statusStyle.PENDENTE;
    const label = FASE_STATUS[s]?.label || s;
    return `<span style="display:inline-block;padding:2px 10px;border-radius:12px;font-size:11px;font-weight:600;background:${st.bg};color:${st.color};border:1px solid ${st.border}">${label}</span>`;
  };

  const fases = imp.fases || [];

  // collect unique employees across all fases
  const empMap = {};
  fases.forEach(f => {
    (f.employeeIds || []).forEach(eid => {
      if (!empMap[eid]) {
        const found = allEmployees.find(e => e.id === eid);
        empMap[eid] = found || { id: eid, name: eid, position: '' };
      }
    });
  });
  const employees = Object.values(empMap).sort((a, b) => a.name.localeCompare(b.name));
  const unassigned = fases.filter(f => !f.employeeIds || f.employeeIds.length === 0);

  const infoRow = (label, value) =>
    `<tr><td style="padding:8px 14px;border:1px solid #e2e8f0;font-weight:600;background:#f8fafc;width:32%;font-size:12px;color:#475569;text-transform:uppercase;letter-spacing:.4px">${label}</td><td style="padding:8px 14px;border:1px solid #e2e8f0;font-size:13px;color:#1e293b">${value}</td></tr>`;

  const fasesTableRows = (list) => list.map((f, i) => `
    <tr style="${i % 2 === 1 ? 'background:#f8fafc' : ''}">
      <td style="padding:8px 12px;border:1px solid #e2e8f0;font-size:12px;color:#334155;width:36px;text-align:center;font-weight:600">${f.order ?? i + 1}</td>
      <td style="padding:8px 12px;border:1px solid #e2e8f0;font-size:13px;color:#1e293b">${f.title}</td>
      <td style="padding:8px 12px;border:1px solid #e2e8f0;font-size:12px;text-align:center">${statusBadge(f.status)}</td>
      <td style="padding:8px 12px;border:1px solid #e2e8f0;font-size:12px;color:#64748b">${f.description || '—'}</td>
    </tr>`).join('');

  const empSections = employees.map(emp => {
    const empFases = fases.filter(f => (f.employeeIds || []).includes(emp.id));
    const concluidas = empFases.filter(f => f.status === 'CONCLUIDO').length;
    const pct = empFases.length ? Math.round((concluidas / empFases.length) * 100) : 0;
    return `
      <div style="margin-bottom:24px">
        <div style="display:flex;align-items:center;justify-content:space-between;background:#1e3a5f;color:#fff;padding:10px 16px;border-radius:6px 6px 0 0">
          <div>
            <span style="font-size:14px;font-weight:700">${emp.name}</span>
            ${emp.position ? `<span style="font-size:11px;margin-left:10px;opacity:.8;font-style:italic">${emp.position}</span>` : ''}
          </div>
          <div style="font-size:11px;opacity:.85">${concluidas}/${empFases.length} módulos concluídos &nbsp;·&nbsp; ${pct}%</div>
        </div>
        <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-top:none">
          <thead><tr style="background:#f1f5f9">
            <th style="padding:7px 12px;border:1px solid #e2e8f0;font-size:11px;text-align:center;width:36px;color:#64748b">#</th>
            <th style="padding:7px 12px;border:1px solid #e2e8f0;font-size:11px;text-align:left;color:#64748b">MÓDULO / ETAPA</th>
            <th style="padding:7px 12px;border:1px solid #e2e8f0;font-size:11px;text-align:center;width:130px;color:#64748b">STATUS</th>
            <th style="padding:7px 12px;border:1px solid #e2e8f0;font-size:11px;text-align:left;color:#64748b">OBSERVAÇÃO</th>
          </tr></thead>
          <tbody>${fasesTableRows(empFases)}</tbody>
        </table>
      </div>`;
  }).join('');

  const unassignedSection = unassigned.length ? `
    <div style="margin-bottom:24px">
      <div style="background:#64748b;color:#fff;padding:10px 16px;border-radius:6px 6px 0 0;font-size:13px;font-weight:700">Etapas sem responsável atribuído</div>
      <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-top:none">
        <thead><tr style="background:#f1f5f9">
          <th style="padding:7px 12px;border:1px solid #e2e8f0;font-size:11px;text-align:center;width:36px;color:#64748b">#</th>
          <th style="padding:7px 12px;border:1px solid #e2e8f0;font-size:11px;text-align:left;color:#64748b">MÓDULO / ETAPA</th>
          <th style="padding:7px 12px;border:1px solid #e2e8f0;font-size:11px;text-align:center;width:130px;color:#64748b">STATUS</th>
          <th style="padding:7px 12px;border:1px solid #e2e8f0;font-size:11px;text-align:left;color:#64748b">OBSERVAÇÃO</th>
        </tr></thead>
        <tbody>${fasesTableRows(unassigned)}</tbody>
      </table>
    </div>` : '';

  const totalFases = fases.length;
  const totalConcluidas = fases.filter(f => f.status === 'CONCLUIDO').length;
  const progPct = totalFases ? Math.round((totalConcluidas / totalFases) * 100) : 0;

  const html = `
    <div style="font-family:'Segoe UI',Arial,sans-serif;color:#1e293b;max-width:820px;margin:0 auto;padding:40px 40px 60px">

      <!-- Cabeçalho -->
      <div style="background:#1e3a5f;color:#fff;padding:28px 32px;border-radius:8px;margin-bottom:28px;display:flex;align-items:flex-start;justify-content:space-between">
        <div>
          <div style="font-size:9px;letter-spacing:2px;opacity:.7;margin-bottom:6px;text-transform:uppercase">Documento Oficial</div>
          <h1 style="margin:0;font-size:24px;font-weight:700;letter-spacing:.5px">ATA DE IMPLANTAÇÃO</h1>
          <div style="margin-top:8px;font-size:13px;opacity:.85">${imp.title}</div>
        </div>
        <div style="text-align:right;font-size:11px;opacity:.75;line-height:1.8">
          <div>Emitido em ${new Date().toLocaleString('pt-BR')}</div>
          ${imp.company?.fantasia ? `<div style="margin-top:2px;font-size:12px;opacity:.9;font-weight:600">${imp.company.fantasia}</div>` : ''}
        </div>
      </div>

      <!-- Dados gerais -->
      <div style="margin-bottom:28px">
        <div style="font-size:11px;font-weight:700;color:#1e3a5f;letter-spacing:1px;text-transform:uppercase;margin-bottom:8px;padding-bottom:4px;border-bottom:2px solid #1e3a5f">Dados da Implantação</div>
        <table style="width:100%;border-collapse:collapse">
          ${infoRow('Empresa', imp.company?.name || '—')}
          ${imp.company?.fantasia ? infoRow('Nome Fantasia', imp.company.fantasia) : ''}
          ${infoRow('Técnico Responsável', imp.technician?.name || '—')}
          ${infoRow('Status', statusBadge(imp.status))}
          ${infoRow('Início Previsto', fmt(imp.startDate))}
          ${infoRow('Fim Previsto', fmt(imp.expectedEnd || imp.endDate))}
          ${imp.completedAt ? infoRow('Concluído em', fmt(imp.completedAt)) : ''}
        </table>
      </div>

      <!-- Progresso geral -->
      ${totalFases > 0 ? `
      <div style="margin-bottom:28px;padding:14px 18px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;display:flex;align-items:center;gap:20px">
        <div style="flex:1">
          <div style="font-size:11px;color:#64748b;margin-bottom:6px;font-weight:600;text-transform:uppercase;letter-spacing:.4px">Progresso Geral</div>
          <div style="background:#e2e8f0;border-radius:8px;height:8px;overflow:hidden">
            <div style="background:${progPct === 100 ? '#22c55e' : '#2563eb'};height:100%;width:${progPct}%;border-radius:8px;transition:width .3s"></div>
          </div>
        </div>
        <div style="text-align:right;min-width:90px">
          <div style="font-size:22px;font-weight:700;color:${progPct === 100 ? '#15803d' : '#1e3a5f'}">${progPct}%</div>
          <div style="font-size:11px;color:#64748b">${totalConcluidas} de ${totalFases} módulos</div>
        </div>
      </div>` : ''}

      <!-- Descrição -->
      ${imp.description ? `
      <div style="margin-bottom:28px">
        <div style="font-size:11px;font-weight:700;color:#1e3a5f;letter-spacing:1px;text-transform:uppercase;margin-bottom:8px;padding-bottom:4px;border-bottom:2px solid #1e3a5f">Descrição / Escopo</div>
        <p style="font-size:13px;line-height:1.8;color:#334155;white-space:pre-wrap;margin:0">${imp.description}</p>
      </div>` : ''}

      <!-- Cronograma por funcionário -->
      ${(empSections || unassignedSection) ? `
      <div style="margin-bottom:28px">
        <div style="font-size:11px;font-weight:700;color:#1e3a5f;letter-spacing:1px;text-transform:uppercase;margin-bottom:12px;padding-bottom:4px;border-bottom:2px solid #1e3a5f">Cronograma de Treinamento por Funcionário</div>
        ${empSections}
        ${unassignedSection}
      </div>` : ''}

      <!-- Observações -->
      ${imp.notes ? `
      <div style="margin-bottom:36px">
        <div style="font-size:11px;font-weight:700;color:#1e3a5f;letter-spacing:1px;text-transform:uppercase;margin-bottom:8px;padding-bottom:4px;border-bottom:2px solid #1e3a5f">Observações</div>
        <p style="font-size:13px;line-height:1.8;color:#334155;white-space:pre-wrap;margin:0">${imp.notes}</p>
      </div>` : ''}

      <!-- Assinaturas -->
      <div style="margin-top:70px;border-top:1px solid #e2e8f0;padding-top:32px;display:flex;gap:40px">
        <div style="flex:1;text-align:center">
          <div style="border-top:1px solid #334155;padding-top:8px;display:inline-block;min-width:180px">
            <div style="font-size:13px;font-weight:600;color:#1e293b">${imp.technician?.name || '________________________________'}</div>
            <div style="font-size:11px;color:#64748b;margin-top:2px">Técnico Responsável</div>
          </div>
        </div>
        <div style="flex:1;text-align:center">
          <div style="border-top:1px solid #334155;padding-top:8px;display:inline-block;min-width:180px">
            <div style="font-size:13px;font-weight:600;color:#1e293b">${imp.company?.name || '________________________________'}</div>
            ${imp.company?.fantasia ? `<div style="font-size:11px;color:#94a3b8">${imp.company.fantasia}</div>` : ''}
            <div style="font-size:11px;color:#64748b;margin-top:2px">Cliente</div>
          </div>
        </div>
      </div>
    </div>`;

  const win = window.open('', '_blank');
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>ATA - ${imp.title}</title><style>*{box-sizing:border-box}body{margin:0;background:#fff}@media print{body{margin:0;padding:0}@page{margin:15mm}}</style></head><body>${html}<script>window.onload=function(){window.print()}<\/script></body></html>`);
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
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);

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
    setSelectedEmployeeId(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (record) => {
    setEditing(record);
    setSelectedCompanyId(record.companyId || null);
    setSelectedEmployeeId(record.employeeId || null);
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
    setFasesForm(record.fases?.map(f => ({ ...f, employeeIds: f.employeeIds || [] })) || []);
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
    { id: null, order: prev.length + 1, title: '', description: '', status: 'PENDENTE', employeeIds: [] },
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
      render: (title, record) => {
        const co = record.company;
        const loc = [co?.city, co?.state].filter(Boolean).join(' / ');
        return (
          <div>
            <div style={{ fontWeight: 600, color: 'var(--cl-text-hi)', fontSize: 13 }}>{title}</div>
            <div style={{ fontSize: 11, color: 'var(--cl-text-faint)', lineHeight: 1.5 }}>
              {co?.fantasia || co?.name}
              {loc && <span style={{ marginLeft: 6, color: 'var(--cl-text-dim)' }}>· {loc}</span>}
            </div>
            {record.employee && (
              <div style={{ fontSize: 11, color: 'var(--cl-text-dim)', marginTop: 1 }}>
                {record.employee.name}
                {record.employee.position && <span style={{ marginLeft: 4, opacity: .7 }}>— {record.employee.position}</span>}
              </div>
            )}
          </div>
        );
      },
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
        <Space size={4} onClick={e => e.stopPropagation()}>
          <Tooltip title="Detalhes">
            <Button type="text" icon={<EyeOutlined />} size="small" onClick={() => openDetail(record)} />
          </Tooltip>
          <Tooltip title="Gerar ATA">
            <Button type="text" icon={<PrinterOutlined />} size="small" style={{ color: '#60a5fa' }} onClick={() => gerarATAImplantacao(record, allEmployees)} />
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
          onRow={record => ({ onClick: () => openDetail(record), style: { cursor: 'pointer' } })}
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
                  items={selected.fases.map(fase => {
                    const faseEmps = (fase.employeeIds || [])
                      .map(eid => allEmployees.find(e => e.id === eid))
                      .filter(Boolean);
                    return {
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
                      description: (
                        <div>
                          {fase.description && <div style={{ marginBottom: faseEmps.length ? 4 : 0 }}>{fase.description}</div>}
                          {faseEmps.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                              {faseEmps.map(e => (
                                <span key={e.id} style={{
                                  fontSize: 11, padding: '1px 8px', borderRadius: 10,
                                  background: 'rgba(37,99,235,0.1)', color: '#60a5fa',
                                  border: '1px solid rgba(37,99,235,0.2)',
                                }}>
                                  {e.name}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ),
                      status: fase.status === 'CONCLUIDO' ? 'finish' : fase.status === 'EM_ANDAMENTO' ? 'process' : 'wait',
                    };
                  })}
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
              <Button icon={<PrinterOutlined />} onClick={() => gerarATAImplantacao(selected, allEmployees)} style={{ color: '#60a5fa', borderColor: '#2563eb' }}>
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
                  setSelectedEmployeeId(null);
                  form.setFieldValue('employeeId', undefined);
                }}
              >
                {companies.map(c => (
                  <Option key={c.id} value={c.id} label={c.name} name={c.name} fantasia={c.fantasia || ''}>
                    <div style={{ lineHeight: 1.35 }}>
                      <div style={{ fontWeight: 500, fontSize: 13 }}>{c.name}</div>
                      {c.fantasia && <div style={{ fontSize: 11, color: 'var(--cl-text-muted)' }}>{c.fantasia}</div>}
                    </div>
                  </Option>
                ))}
              </Select>
            </Form.Item>
            {(() => {
              const co = companies.find(c => c.id === selectedCompanyId);
              return co?.fantasia ? (
                <div style={{ marginTop: -16, marginBottom: 16 }}>
                  <Input
                    value={co.fantasia}
                    readOnly
                    size="small"
                    prefix={<span style={{ fontSize: 11, color: 'var(--cl-text-faint)' }}>Fantasia:</span>}
                    style={{ background: 'var(--cl-bg)', color: 'var(--cl-text-muted)', cursor: 'default', borderRadius: 6 }}
                  />
                </div>
              ) : null;
            })()}

            <Form.Item name="employeeId" label="Funcionário da empresa">
              <Select
                placeholder={selectedCompanyId ? 'Selecione o funcionário' : 'Selecione a empresa primeiro'}
                allowClear showSearch size="large"
                disabled={!selectedCompanyId}
                optionLabelProp="label"
                filterOption={(input, option) => normalize(option?.label || '').includes(normalize(input))}
                onChange={v => setSelectedEmployeeId(v || null)}
              >
                {allEmployees
                  .filter(e => e.companyId === selectedCompanyId)
                  .map(e => (
                    <Option key={e.id} value={e.id} label={e.name}>
                      {e.name}
                    </Option>
                  ))}
              </Select>
            </Form.Item>
            {(() => {
              const emp = allEmployees.find(e => e.id === selectedEmployeeId);
              return emp?.position ? (
                <div style={{ marginTop: -16, marginBottom: 16 }}>
                  <Input
                    value={emp.position}
                    readOnly
                    size="small"
                    prefix={<span style={{ fontSize: 11, color: 'var(--cl-text-faint)' }}>Cargo:</span>}
                    style={{ background: 'var(--cl-bg)', color: 'var(--cl-text-muted)', cursor: 'default', borderRadius: 6 }}
                  />
                </div>
              ) : null;
            })()}

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
              {fasesForm.map((fase, idx) => {
                const companyEmployees = allEmployees.filter(e => e.companyId === selectedCompanyId);
                return (
                  <div key={idx} style={{
                    padding: '10px 12px', borderRadius: 8,
                    background: 'var(--cl-bg)', border: '1px solid var(--cl-border)',
                    display: 'flex', flexDirection: 'column', gap: 8,
                  }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px auto', gap: 8, alignItems: 'center' }}>
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
                    <Select
                      mode="multiple"
                      placeholder={selectedCompanyId ? 'Funcionários responsáveis (opcional)' : 'Selecione a empresa primeiro'}
                      value={fase.employeeIds || []}
                      onChange={v => updateFaseField(idx, 'employeeIds', v)}
                      disabled={!selectedCompanyId}
                      showSearch
                      filterOption={(input, option) => normalize(option?.children || '').includes(normalize(input))}
                      style={{ width: '100%' }}
                      size="small"
                      allowClear
                    >
                      {companyEmployees.map(e => (
                        <Option key={e.id} value={e.id}>
                          {e.name}
                        </Option>
                      ))}
                    </Select>
                  </div>
                );
              })}
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
