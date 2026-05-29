import { useEffect, useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import {
  Table, Button, Modal, Form, Input, Select, Space, Tag, Switch,
  message, Tooltip, DatePicker, Checkbox, Row, Col, Divider, Badge,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined,
  ExclamationCircleOutlined, CarOutlined, PrinterOutlined,
  CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  visitaService, companyService, technicianService, employeeService, etapaTreinamentoService,
} from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { normalize } from '../utils/constants';

const { Option } = Select;
const { TextArea } = Input;

const STATUS_MAP = {
  REALIZADA: { label: 'Realizada', color: 'success',  icon: <CheckCircleOutlined /> },
  AGENDADA:  { label: 'Agendada',  color: 'processing', icon: <ClockCircleOutlined /> },
  CANCELADA: { label: 'Cancelada', color: 'default',  icon: <CloseCircleOutlined /> },
};

function gerarATA(visita) {
  const fmt = (d) => d ? dayjs(d).format('DD/MM/YYYY HH:mm') : 'â€”';
  const topics = [];
  if (visita.topicConfig) {
    topics.push(`<b>ConfiguraÃ§Ã£o</b><br>${visita.topicConfigDesc || ''}`);
  }
  if (visita.topicTreino) {
    let treinoEtapas = [], treinoEmps = [];
    try { treinoEtapas = JSON.parse(visita.topicTreinoMods || '[]'); if (!Array.isArray(treinoEtapas)) treinoEtapas = []; } catch {}
    try { treinoEmps   = JSON.parse(visita.topicTreinoEmps  || '[]'); if (!Array.isArray(treinoEmps))   treinoEmps   = []; } catch {}

    const byMod = treinoEtapas.reduce((acc, e) => {
      const k = e.moduloName || 'â€”';
      if (!acc[k]) acc[k] = [];
      acc[k].push(e.title || e.id || '');
      return acc;
    }, {});

    let t = `<b>Treinamento</b>`;
    if (Object.keys(byMod).length > 0) {
      t += `<br><ul style="margin:4px 0 4px 16px;padding:0">` +
        Object.entries(byMod).map(([mod, steps]) =>
          `<li style="margin-bottom:3px"><span style="font-weight:600">${mod}:</span> ${steps.join(', ')}</li>`
        ).join('') + `</ul>`;
    }
    if (treinoEmps.length > 0) {
      t += `<br><i>FuncionÃ¡rios:</i> ${treinoEmps.map(e => e.name || e.id).join(', ')}`;
    }
    if (visita.topicTreinoDesc) t += `<br>${visita.topicTreinoDesc}`;
    topics.push(t);
  }
  if (visita.topicOutros) {
    topics.push(`<b>Outros Assuntos</b><br>${visita.topicOutrosDesc || ''}`);
  }

  const html = `
    <div style="font-family:Arial,sans-serif;color:#111;max-width:800px;margin:0 auto;padding:40px">
      <div style="text-align:center;margin-bottom:32px">
        <h1 style="font-size:22px;margin:0">ATA DE VISITA TÃ‰CNICA</h1>
        <p style="margin:4px 0;color:#555;font-size:14px">Documento gerado em ${dayjs().format('DD/MM/YYYY HH:mm')}</p>
      </div>
      <table style="width:100%;border-collapse:collapse;margin-bottom:28px">
        <tr>
          <td style="padding:8px 12px;border:1px solid #ddd;font-weight:bold;background:#f7f7f7;width:35%;font-size:13px">TÃTULO</td>
          <td style="padding:8px 12px;border:1px solid #ddd;font-size:13px">${visita.title}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;border:1px solid #ddd;font-weight:bold;background:#f7f7f7;font-size:13px">EMPRESA</td>
          <td style="padding:8px 12px;border:1px solid #ddd;font-size:13px">${visita.company?.name || 'â€”'}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;border:1px solid #ddd;font-weight:bold;background:#f7f7f7;font-size:13px">CONTATO / FUNCIONÃRIO</td>
          <td style="padding:8px 12px;border:1px solid #ddd;font-size:13px">${visita.employee ? `${visita.employee.name}${visita.employee.position ? ' â€” ' + visita.employee.position : ''}` : 'â€”'}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;border:1px solid #ddd;font-weight:bold;background:#f7f7f7;font-size:13px">TÃ‰CNICO RESPONSÃVEL</td>
          <td style="padding:8px 12px;border:1px solid #ddd;font-size:13px">${visita.technician?.name || 'â€”'}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;border:1px solid #ddd;font-weight:bold;background:#f7f7f7;font-size:13px">DATA DA VISITA</td>
          <td style="padding:8px 12px;border:1px solid #ddd;font-size:13px">${fmt(visita.visitDate)}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px;border:1px solid #ddd;font-weight:bold;background:#f7f7f7;font-size:13px">STATUS</td>
          <td style="padding:8px 12px;border:1px solid #ddd;font-size:13px">${STATUS_MAP[visita.status]?.label || visita.status}</td>
        </tr>
      </table>

      ${visita.objectives ? `
      <h3 style="font-size:14px;border-bottom:1px solid #ddd;padding-bottom:4px;margin-bottom:10px">OBJETIVOS DA VISITA</h3>
      <p style="font-size:13px;line-height:1.7;margin-bottom:24px;white-space:pre-wrap">${visita.objectives}</p>
      ` : ''}

      ${topics.length > 0 ? `
      <h3 style="font-size:14px;border-bottom:1px solid #ddd;padding-bottom:4px;margin-bottom:10px">TEMAS ABORDADOS</h3>
      <ul style="margin:0 0 24px;padding-left:20px">
        ${topics.map(t => `<li style="font-size:13px;line-height:1.8;margin-bottom:8px">${t}</li>`).join('')}
      </ul>
      ` : ''}

      ${visita.conclusions ? `
      <h3 style="font-size:14px;border-bottom:1px solid #ddd;padding-bottom:4px;margin-bottom:10px">CONCLUSÃ•ES</h3>
      <p style="font-size:13px;line-height:1.7;margin-bottom:24px;white-space:pre-wrap">${visita.conclusions}</p>
      ` : ''}

      ${visita.nextSteps ? `
      <h3 style="font-size:14px;border-bottom:1px solid #ddd;padding-bottom:4px;margin-bottom:10px">PRÃ“XIMOS PASSOS</h3>
      <p style="font-size:13px;line-height:1.7;margin-bottom:40px;white-space:pre-wrap">${visita.nextSteps}</p>
      ` : ''}

      <div style="margin-top:60px;display:flex;gap:80px">
        <div style="flex:1;text-align:center">
          <div style="border-top:1px solid #333;padding-top:8px;font-size:12px">
            <b>${visita.technician?.name || 'TÃ©cnico ResponsÃ¡vel'}</b><br>TÃ©cnico
          </div>
        </div>
        <div style="flex:1;text-align:center">
          <div style="border-top:1px solid #333;padding-top:8px;font-size:12px">
            <b>${visita.employee?.name || 'ResponsÃ¡vel do Cliente'}</b><br>${visita.company?.name || 'Cliente'}
          </div>
        </div>
      </div>
    </div>
  `;

  const win = window.open('', '_blank');
  win.document.write(`<!DOCTYPE html><html><head><title>ATA - ${visita.title}</title>
    <style>@media print{body{margin:0;padding:0}}</style>
  </head><body>${html}<script>window.onload=function(){window.print()}<\/script></body></html>`);
  win.document.close();
}

export default function Visitas() {
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === 'light';
  const { user } = useAuth();

  const [items, setItems]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [filterStatus, setFilterStatus] = useState(null);
  const [selected, setSelected]   = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing]     = useState(null);
  const [saving, setSaving]       = useState(false);
  const [deleteModal, setDeleteModal] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [form] = Form.useForm();

  const [companies,    setCompanies]    = useState([]);
  const [technicians,  setTechnicians]  = useState([]);
  const [employees,    setEmployees]    = useState([]);
  const [loadingEmpl,  setLoadingEmpl]  = useState(false);

  const [topicConfig, setTopicConfig] = useState(false);
  const [topicTreino, setTopicTreino] = useState(false);
  const [topicOutros, setTopicOutros] = useState(false);

  const [etapasTemplate, setEtapasTemplate] = useState([]);
  const [treinoEtapaIds, setTreinoEtapaIds] = useState([]);
  const [treinoEmpIds,   setTreinoEmpIds]   = useState([]);

  const load = () => {
    setLoading(true);
    visitaService.list().then(setItems).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    companyService.list({ active: true }).then(r => setCompanies(Array.isArray(r) ? r : r.data || []));
    technicianService.list({ active: 'true' }).then(r => {
      const arr = Array.isArray(r) ? r : r.data || [];
      arr.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
      setTechnicians(arr);
    });
    etapaTreinamentoService.list({ active: 'true' }).then(r => {
      const arr = Array.isArray(r) ? r : r.data || [];
      setEtapasTemplate(arr);
    }).catch(() => {});
  }, []);

  const handleCompanyChange = (val) => {
    form.setFieldValue('employeeId', null);
    setEmployees([]);
    if (val) {
      setLoadingEmpl(true);
      employeeService.list({ companyId: val, active: 'true' })
        .then(r => {
          const arr = Array.isArray(r) ? r : r.data || [];
          arr.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
          setEmployees(arr);
        })
        .finally(() => setLoadingEmpl(false));
    }
  };

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ status: 'REALIZADA', visitDate: dayjs() });
    setTopicConfig(false); setTopicTreino(false); setTopicOutros(false);
    setTreinoEtapaIds([]); setTreinoEmpIds([]);
    setEmployees([]);
    setModalOpen(true);
  };

  const openEdit = (record) => {
    setEditing(record);
    form.setFieldsValue({
      title: record.title,
      companyId: record.companyId,
      technicianId: record.technicianId,
      employeeId: record.employeeId,
      visitDate: record.visitDate ? dayjs(record.visitDate) : null,
      status: record.status,
      objectives: record.objectives,
      topicConfigDesc: record.topicConfigDesc,
      topicTreinoDesc: record.topicTreinoDesc,
      topicTreinoMods: record.topicTreinoMods,
      topicOutrosDesc: record.topicOutrosDesc,
      conclusions: record.conclusions,
      nextSteps: record.nextSteps,
    });
    setTopicConfig(!!record.topicConfig);
    setTopicTreino(!!record.topicTreino);
    setTopicOutros(!!record.topicOutros);
    // parse etapa IDs
    try {
      const parsed = JSON.parse(record.topicTreinoMods || '[]');
      setTreinoEtapaIds(Array.isArray(parsed) ? parsed.map(x => (typeof x === 'string' ? x : x?.id)).filter(Boolean) : []);
    } catch { setTreinoEtapaIds([]); }
    // parse employee IDs
    try {
      const parsed = JSON.parse(record.topicTreinoEmps || '[]');
      setTreinoEmpIds(Array.isArray(parsed) ? parsed.map(x => (typeof x === 'string' ? x : x?.id)).filter(Boolean) : []);
    } catch { setTreinoEmpIds([]); }
    if (record.companyId) {
      setLoadingEmpl(true);
      employeeService.list({ companyId: record.companyId, active: 'true' })
        .then(r => {
          const arr = Array.isArray(r) ? r : r.data || [];
          arr.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
          setEmployees(arr);
        })
        .finally(() => setLoadingEmpl(false));
    }
    setModalOpen(true);
  };

  const openDetail = (record) => { setSelected(record); setDetailOpen(true); };

  const handleSubmit = async (values) => {
    setSaving(true);
    try {
      const payload = {
        ...values,
        visitDate: values.visitDate?.toISOString(),
        topicConfig, topicTreino, topicOutros,
        topicConfigDesc: topicConfig ? values.topicConfigDesc : null,
        topicTreinoDesc: topicTreino ? values.topicTreinoDesc : null,
        topicTreinoMods: topicTreino
          ? JSON.stringify(treinoEtapaIds.map(id => {
              const e = etapasTemplate.find(et => et.id === id);
              return { id, title: e?.title || id, moduloName: e?.modulo?.name || null };
            }))
          : null,
        topicTreinoEmps: topicTreino
          ? JSON.stringify(treinoEmpIds.map(id => {
              const emp = employees.find(e => e.id === id);
              return { id, name: emp?.name || id, position: emp?.position || null };
            }))
          : null,
        topicOutrosDesc: topicOutros ? values.topicOutrosDesc : null,
      };
      if (editing) {
        await visitaService.update(editing.id, payload);
        message.success('Visita atualizada');
      } else {
        await visitaService.create(payload);
        message.success('Visita registrada');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      message.error(err.response?.data?.error || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await visitaService.remove(deleteModal.id);
      message.success('Visita removida');
      setDeleteModal(null);
      if (selected?.id === deleteModal.id) { setDetailOpen(false); setSelected(null); }
      load();
    } catch (err) {
      message.error(err.response?.data?.error || 'Erro ao remover');
    } finally {
      setDeleteLoading(false);
    }
  };

  const columns = [
    {
      title: '#', dataIndex: 'code', key: 'code', width: 70,
      render: v => <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#60a5fa', fontSize: 13 }}>{v ? String(v).padStart(4, '0') : 'â€”'}</span>,
    },
    {
      title: 'TÃ­tulo / Empresa', key: 'title',
      render: (_, r) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--cl-text-hi)' }}>{r.title}</div>
          <div style={{ fontSize: 12, color: 'var(--cl-text-muted)', marginTop: 2 }}>{r.company?.name}</div>
        </div>
      ),
    },
    {
      title: 'TÃ©cnico', key: 'technician',
      render: (_, r) => <span style={{ fontSize: 13, color: 'var(--cl-text-soft)' }}>{r.technician?.name || 'â€”'}</span>,
    },
    {
      title: 'Data', dataIndex: 'visitDate', key: 'visitDate', width: 130,
      sorter: (a, b) => new Date(a.visitDate) - new Date(b.visitDate),
      render: v => <span style={{ fontSize: 13, color: 'var(--cl-text-soft)' }}>{v ? dayjs(v).format('DD/MM/YYYY HH:mm') : 'â€”'}</span>,
    },
    {
      title: 'Status', dataIndex: 'status', key: 'status', width: 110,
      render: v => {
        const s = STATUS_MAP[v];
        return <Tag color={s?.color} icon={s?.icon} style={{ borderRadius: 6, fontWeight: 600, fontSize: 11, background: isLight ? 'transparent' : undefined, border: isLight ? 'none' : undefined }}>{s?.label}</Tag>;
      },
    },
    {
      title: 'Temas', key: 'temas', width: 140,
      render: (_, r) => (
        <Space size={4} wrap>
          {r.topicConfig  && <Tag color="blue"    style={{ fontSize: 10, borderRadius: 4, padding: '0 6px' }}>Config.</Tag>}
          {r.topicTreino  && <Tag color="purple"  style={{ fontSize: 10, borderRadius: 4, padding: '0 6px' }}>Treino</Tag>}
          {r.topicOutros  && <Tag color="default" style={{ fontSize: 10, borderRadius: 4, padding: '0 6px' }}>Outros</Tag>}
        </Space>
      ),
    },
    {
      title: '', key: 'actions', width: 110,
      render: (_, record) => (
        <Space onClick={e => e.stopPropagation()}>
          <Tooltip title="Visualizar">
            <Button type="text" icon={<EyeOutlined />} size="small" style={{ color: 'var(--cl-text-soft)' }} onClick={() => openDetail(record)} />
          </Tooltip>
          <Tooltip title="ATA">
            <Button type="text" icon={<PrinterOutlined />} size="small" style={{ color: '#60a5fa' }} onClick={() => gerarATA(record)} />
          </Tooltip>
          <Tooltip title="Editar">
            <Button type="text" icon={<EditOutlined />} size="small" style={{ color: 'var(--cl-text-soft)' }} onClick={() => openEdit(record)} />
          </Tooltip>
          <Tooltip title="Remover">
            <Button type="text" icon={<DeleteOutlined />} size="small" danger onClick={() => setDeleteModal({ id: record.id, title: record.title })} />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const filtered = (() => {
    let list = items;
    if (filterStatus) list = list.filter(i => i.status === filterStatus);
    if (search) {
      const q = normalize(search);
      list = list.filter(i => [i.title, i.company?.name, i.company?.fantasia, i.technician?.name, i.employee?.name, i.objectives, i.conclusions, i.nextSteps].some(f => normalize(f).includes(q)));
    }
    return list;
  })();

  const kpiData = [
    { label: 'Total', value: items.length, color: '#60a5fa' },
    { label: 'Realizadas', value: items.filter(i => i.status === 'REALIZADA').length, color: '#4ade80' },
    { label: 'Agendadas',  value: items.filter(i => i.status === 'AGENDADA').length,  color: '#fbbf24' },
    { label: 'Canceladas', value: items.filter(i => i.status === 'CANCELADA').length, color: '#f87171' },
  ];

  const LABEL = { fontSize: 11, color: 'var(--cl-text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 };

  const DetailField = ({ label, value }) => value ? (
    <div style={{ marginBottom: 16 }}>
      <div style={LABEL}>{label}</div>
      <div style={{ fontSize: 13, color: 'var(--cl-text)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{value}</div>
    </div>
  ) : null;

  return (
    <div className="page-wrap">
      <div className="page-header">
        <div>
          <h1 className="page-title">Visitas TÃ©cnicas</h1>
          <p style={{ color: 'var(--cl-text-muted)', fontSize: 13, margin: '4px 0 0' }}>
            {filtered.length} visita{filtered.length !== 1 ? 's' : ''} encontrada{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate} style={{ borderRadius: 8, fontWeight: 600 }}>
          Nova Visita
        </Button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {kpiData.map(k => (
          <div key={k.label} style={{
            flex: '1 1 100px', background: 'var(--cl-bg)', border: '1px solid var(--cl-border)',
            borderRadius: 10, padding: '14px 18px', minWidth: 100,
          }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: k.color, fontVariantNumeric: 'tabular-nums' }}>{k.value}</div>
            <div style={{ fontSize: 12, color: 'var(--cl-text-muted)', marginTop: 2 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="filter-bar" style={{ display: 'flex', gap: 10 }}>
        <Input
          placeholder="Buscar por tÃ­tulo, empresa, tÃ©cnico..."
          allowClear
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1 }}
        />
        <Select allowClear placeholder="Status" value={filterStatus} onChange={setFilterStatus} style={{ width: 140 }}>
          {Object.entries(STATUS_MAP).map(([k, v]) => <Option key={k} value={k}>{v.label}</Option>)}
        </Select>
      </div>

      <div className="page-table-wrap">
        <Table dataSource={filtered} columns={columns} rowKey="id" loading={loading}
          size="middle" scroll={{ x: 700 }}
          pagination={{ pageSize: 15, showSizeChanger: false, showTotal: t => `${t} visita${t !== 1 ? 's' : ''}` }}
          onRow={record => ({ onClick: () => openEdit(record), style: { cursor: 'pointer' } })}
        />
      </div>

      {/* Modal detalhe */}
      <Modal
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        width={700}
        centered
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <CarOutlined style={{ color: '#60a5fa', fontSize: 18 }} />
            <span style={{ fontWeight: 700, fontSize: 16 }}>Detalhes da Visita</span>
          </div>
        }
        footer={
          <Space onClick={e => e.stopPropagation()}>
            <Button onClick={() => setDetailOpen(false)}>Fechar</Button>
            <Button icon={<PrinterOutlined />} onClick={() => gerarATA(selected)} style={{ borderRadius: 6 }}>
              Gerar ATA
            </Button>
            <Button type="primary" icon={<EditOutlined />} onClick={() => { setDetailOpen(false); openEdit(selected); }} style={{ borderRadius: 6 }}>
              Editar
            </Button>
          </Space>
        }
        styles={{ body: { padding: '20px 0', maxHeight: '70vh', overflowY: 'auto' } }}
      >
        {selected && (
          <div style={{ padding: '0 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <span style={{ fontWeight: 700, fontSize: 17, color: 'var(--cl-text-hi)' }}>{selected.title}</span>
              <Tag color={STATUS_MAP[selected.status]?.color} icon={STATUS_MAP[selected.status]?.icon} style={{ borderRadius: 6, fontWeight: 600, fontSize: 11 }}>
                {STATUS_MAP[selected.status]?.label}
              </Tag>
            </div>
            <Row gutter={[24, 0]}>
              <Col xs={24} sm={12}>
                <DetailField label="Empresa"    value={selected.company?.name} />
                <DetailField label="TÃ©cnico"    value={selected.technician?.name} />
                <DetailField label="Contato"    value={selected.employee ? `${selected.employee.name}${selected.employee.position ? ' â€” ' + selected.employee.position : ''}` : null} />
                <DetailField label="Data"       value={selected.visitDate ? dayjs(selected.visitDate).format('DD/MM/YYYY HH:mm') : null} />
              </Col>
              <Col xs={24} sm={12}>
                <div style={LABEL}>Temas Abordados</div>
                <Space wrap style={{ marginBottom: 16 }}>
                  {selected.topicConfig  && <Tag color="blue">ConfiguraÃ§Ã£o</Tag>}
                  {selected.topicTreino  && <Tag color="purple">Treinamento</Tag>}
                  {selected.topicOutros  && <Tag color="default">Outros</Tag>}
                  {!selected.topicConfig && !selected.topicTreino && !selected.topicOutros && <span style={{ fontSize: 13, color: 'var(--cl-text-faint)' }}>Nenhum tema registrado</span>}
                </Space>
                {selected.topicTreino && (() => {
                  let etapas = [], emps = [];
                  try { etapas = JSON.parse(selected.topicTreinoMods || '[]'); if (!Array.isArray(etapas)) etapas = []; } catch {}
                  try { emps   = JSON.parse(selected.topicTreinoEmps  || '[]'); if (!Array.isArray(emps))   emps   = []; } catch {}
                  const byMod = etapas.reduce((acc, e) => {
                    const k = e.moduloName || 'â€”';
                    if (!acc[k]) acc[k] = [];
                    acc[k].push(e);
                    return acc;
                  }, {});
                  return (
                    <div style={{ marginBottom: 8 }}>
                      {Object.keys(byMod).length > 0 && (
                        <div style={{ marginBottom: 10 }}>
                          <div style={LABEL}>Etapas de Treinamento</div>
                          {Object.entries(byMod).map(([mod, steps]) => (
                            <div key={mod} style={{ marginBottom: 6 }}>
                              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--cl-text-muted)', marginBottom: 3 }}>{mod}</div>
                              {steps.map((s, i) => (
                                <Tag key={i} style={{ marginBottom: 3, borderRadius: 4, fontSize: 11 }}>{s.title || s.id}</Tag>
                              ))}
                            </div>
                          ))}
                        </div>
                      )}
                      {emps.length > 0 && (
                        <div>
                          <div style={LABEL}>FuncionÃ¡rios Treinados</div>
                          <Space wrap>
                            {emps.map((e, i) => (
                              <Tag key={i} color="blue" style={{ borderRadius: 4, fontSize: 11 }}>
                                {e.name || e.id}{e.position ? ` â€” ${e.position}` : ''}
                              </Tag>
                            ))}
                          </Space>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </Col>
            </Row>
            <Divider style={{ margin: '8px 0 16px' }} />
            <DetailField label="Objetivos"          value={selected.objectives} />
            {selected.topicConfig  && <DetailField label="ConfiguraÃ§Ã£o â€” Detalhes"  value={selected.topicConfigDesc} />}
            {selected.topicTreino  && <DetailField label="Treinamento â€” Detalhes"   value={selected.topicTreinoDesc} />}
            {selected.topicOutros  && <DetailField label="Outros â€” Detalhes"        value={selected.topicOutrosDesc} />}
            <DetailField label="ConclusÃµes"          value={selected.conclusions} />
            <DetailField label="PrÃ³ximos Passos"     value={selected.nextSteps} />
          </div>
        )}
      </Modal>

      {/* Modal confirmaÃ§Ã£o exclusÃ£o */}
      <Modal
        open={!!deleteModal}
        onCancel={() => setDeleteModal(null)}
        title={<div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><ExclamationCircleOutlined style={{ color: '#f87171', fontSize: 20 }} /><span style={{ fontWeight: 700 }}>Remover Visita</span></div>}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setDeleteModal(null)}>Cancelar</Button>
            <Button danger type="primary" loading={deleteLoading} onClick={handleDelete}>Remover</Button>
          </div>
        }
      >
        <p style={{ padding: '8px 0' }}>Deseja remover a visita <strong>"{deleteModal?.title}"</strong>? Esta aÃ§Ã£o nÃ£o pode ser desfeita.</p>
      </Modal>

      {/* Modal cadastro / ediÃ§Ã£o */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(37,99,235,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CarOutlined style={{ color: '#60a5fa', fontSize: 16 }} />
            </div>
            <span style={{ fontWeight: 700, fontSize: 16 }}>{editing ? 'Editar Visita' : 'Nova Visita TÃ©cnica'}</span>
          </div>
        }
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        centered
        width={720}
        styles={{ body: { padding: '24px 0 8px', maxHeight: '78vh', overflowY: 'auto' } }}
        footer={
          <Space onClick={e => e.stopPropagation()}>
            <Button onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="primary" loading={saving} onClick={() => form.submit()} style={{ fontWeight: 600 }}>
              {editing ? 'Salvar AlteraÃ§Ãµes' : 'Registrar Visita'}
            </Button>
          </Space>
        }
      >
        <div style={{ padding: '0 24px' }}>
          <Form form={form} layout="vertical" onFinish={handleSubmit}>
            <Row gutter={16}>
              <Col xs={24}>
                <Form.Item name="title" label="TÃ­tulo da Visita" rules={[{ required: true, message: 'Informe o tÃ­tulo' }]}>
                  <Input placeholder="Ex: Visita de implantaÃ§Ã£o â€” mÃ³dulo financeiro" size="large" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item name="companyId" label="Empresa" rules={[{ required: true, message: 'Selecione a empresa' }]}>
                  <Select showSearch placeholder="Selecione a empresa" size="large" onChange={handleCompanyChange}
                    filterOption={(input, option) => {
                      const c = companies.find(co => co.id === option.value);
                      const q = normalize(input);
                      return normalize(c?.name).includes(q) || normalize(c?.fantasia).includes(q);
                    }}
                  >
                    {companies.map(c => (
                      <Option key={c.id} value={c.id}>
                        <div style={{ lineHeight: 1.3 }}>
                          <div>{c.name}</div>
                          {c.fantasia && <div style={{ fontSize: 11, color: 'var(--cl-text-muted)' }}>{c.fantasia}</div>}
                        </div>
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item name="employeeId" label="Contato / FuncionÃ¡rio">
                  <Select allowClear showSearch optionFilterProp="children" placeholder="Selecione o contato" size="large" loading={loadingEmpl}>
                    {employees.map(e => <Option key={e.id} value={e.id}>{e.name}{e.position ? ` â€” ${e.position}` : ''}</Option>)}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24} sm={10}>
                <Form.Item name="technicianId" label="TÃ©cnico ResponsÃ¡vel">
                  <Select allowClear showSearch optionFilterProp="children" placeholder="Selecione o tÃ©cnico" size="large">
                    {technicians.map(t => <Option key={t.id} value={t.id}>{t.name}</Option>)}
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} sm={9}>
                <Form.Item name="visitDate" label="Data da Visita" rules={[{ required: true, message: 'Informe a data' }]}>
                  <DatePicker showTime={{ format: 'HH:mm' }} format="DD/MM/YYYY HH:mm" size="large" style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={5}>
                <Form.Item name="status" label="Status">
                  <Select size="large">
                    {Object.entries(STATUS_MAP).map(([k, v]) => <Option key={k} value={k}>{v.label}</Option>)}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Form.Item name="objectives" label="Objetivos da Visita">
              <TextArea rows={3} placeholder="Descreva os objetivos da visita..." style={{ resize: 'none' }} />
            </Form.Item>

            <Divider orientation="left" style={{ fontSize: 13, fontWeight: 700 }}>Temas Abordados</Divider>

            {/* ConfiguraÃ§Ã£o */}
            <div style={{ marginBottom: 16 }}>
              <Checkbox checked={topicConfig} onChange={e => setTopicConfig(e.target.checked)} style={{ fontWeight: 600, fontSize: 13 }}>
                ConfiguraÃ§Ã£o
              </Checkbox>
              {topicConfig && (
                <Form.Item name="topicConfigDesc" style={{ marginTop: 8, marginBottom: 0 }}>
                  <TextArea rows={2} placeholder="Descreva o que foi configurado..." style={{ resize: 'none' }} />
                </Form.Item>
              )}
            </div>

            {/* Treinamento */}
            <div style={{ marginBottom: 16 }}>
              <Checkbox checked={topicTreino} onChange={e => setTopicTreino(e.target.checked)} style={{ fontWeight: 600, fontSize: 13 }}>
                Treinamento
              </Checkbox>
              {topicTreino && (
                <div style={{ marginTop: 10, padding: '12px 14px', background: 'var(--cl-bg)', border: '1px solid var(--cl-border)', borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {/* Etapas de treinamento */}
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--cl-text-muted)', fontWeight: 600, marginBottom: 6 }}>Etapas de Treinamento</div>
                    <Select
                      mode="multiple"
                      value={treinoEtapaIds}
                      onChange={setTreinoEtapaIds}
                      placeholder="Selecione as etapas abordadas..."
                      showSearch
                      allowClear
                      style={{ width: '100%' }}
                      optionLabelProp="label"
                      filterOption={(input, opt) => normalize(opt?.label || '').includes(normalize(input))}
                    >
                      {etapasTemplate.map(e => (
                        <Option key={e.id} value={e.id} label={e.title}>
                          <div style={{ lineHeight: 1.3, padding: '2px 0' }}>
                            <div style={{ fontSize: 13 }}>{e.title}</div>
                            {e.modulo?.name && (
                              <div style={{ fontSize: 11, color: '#94a3b8' }}>{e.modulo.name}</div>
                            )}
                          </div>
                        </Option>
                      ))}
                    </Select>
                  </div>

                  {/* FuncionÃ¡rios treinados */}
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--cl-text-muted)', fontWeight: 600, marginBottom: 6 }}>FuncionÃ¡rios Treinados</div>
                    <Select
                      mode="multiple"
                      value={treinoEmpIds}
                      onChange={setTreinoEmpIds}
                      placeholder="Selecione os funcionÃ¡rios..."
                      showSearch
                      allowClear
                      style={{ width: '100%' }}
                      optionLabelProp="label"
                      loading={loadingEmpl}
                      filterOption={(input, opt) => normalize(opt?.label || '').includes(normalize(input))}
                      notFoundContent={employees.length === 0 ? 'Selecione uma empresa primeiro' : 'Nenhum funcionÃ¡rio encontrado'}
                    >
                      {employees.map(e => (
                        <Option key={e.id} value={e.id} label={e.name}>
                          <div style={{ lineHeight: 1.3, padding: '2px 0' }}>
                            <div style={{ fontSize: 13 }}>{e.name}</div>
                            {e.position && <div style={{ fontSize: 11, color: '#94a3b8' }}>{e.position}</div>}
                          </div>
                        </Option>
                      ))}
                    </Select>
                  </div>

                  {/* ObservaÃ§Ãµes do treinamento */}
                  <Form.Item name="topicTreinoDesc" style={{ marginBottom: 0 }}>
                    <TextArea rows={2} placeholder="ObservaÃ§Ãµes sobre o treinamento..." style={{ resize: 'none' }} />
                  </Form.Item>
                </div>
              )}
            </div>

            {/* Outros */}
            <div style={{ marginBottom: 20 }}>
              <Checkbox checked={topicOutros} onChange={e => setTopicOutros(e.target.checked)} style={{ fontWeight: 600, fontSize: 13 }}>
                Outros Assuntos
              </Checkbox>
              {topicOutros && (
                <Form.Item name="topicOutrosDesc" style={{ marginTop: 8, marginBottom: 0 }}>
                  <TextArea rows={2} placeholder="Descreva os outros assuntos abordados..." style={{ resize: 'none' }} />
                </Form.Item>
              )}
            </div>

            <Divider orientation="left" style={{ fontSize: 13, fontWeight: 700 }}>ConclusÃ£o</Divider>

            <Form.Item name="conclusions" label="ConclusÃµes">
              <TextArea rows={3} placeholder="ConclusÃµes da visita..." style={{ resize: 'none' }} />
            </Form.Item>

            <Form.Item name="nextSteps" label="PrÃ³ximos Passos">
              <TextArea rows={2} placeholder="AÃ§Ãµes a serem tomadas apÃ³s a visita..." style={{ resize: 'none' }} />
            </Form.Item>
          </Form>
        </div>
      </Modal>
    </div>
  );
}
