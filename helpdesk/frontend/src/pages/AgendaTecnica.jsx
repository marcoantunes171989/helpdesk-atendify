import { useState, useMemo } from 'react';
import {
  Button, Tabs, Table, Modal, Form, Input, Select, DatePicker,
  Space, Tag, Avatar, Tooltip, Upload, message, Row, Col, Divider, Radio, Empty,
} from 'antd';
import {
  ScheduleOutlined, PlusOutlined, UploadOutlined, EditOutlined, DeleteOutlined,
  InboxOutlined, CalendarOutlined, TeamOutlined, ClockCircleOutlined,
  CarOutlined, LaptopOutlined, HomeOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { Option } = Select;
const { Dragger } = Upload;

// ─── Paletas de cores fixas ───────────────────────────────────────────────────
const FERIAS_TIPO_COLORS = {
  'Férias':              '#10b981',
  'Licença':             '#f59e0b',
  'Licença Maternidade': '#f472b6',
  'Licença cirurgia':    '#ef4444',
};

const PLANTAO_TIPO_COLORS = {
  Plantão: '#3b82f6',
  Férias:  '#10b981',
  Licença: '#f59e0b',
};

const EQUIPE_COLORS = {
  Desenvolvimento: '#8b5cf6',
  Campo:           '#3b82f6',
  ERP:             '#f59e0b',
  Suporte:         '#06b6d4',
};

// cor dinâmica para tipos de visita
function tipoColor(tipo) {
  const map = {
    'sm louveira':         '#3b82f6',
    'sm honorato':         '#8b5cf6',
    'sm ramos':            '#6366f1',
    'sm':                  '#60a5fa',
    'atendimento externo': '#10b981',
    'carro em uso':        '#f59e0b',
    'implantacao':         '#f97316',
    'intersolid':          '#06b6d4',
    'comercial':           '#84cc16',
  };
  const key = String(tipo || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
  for (const [k, v] of Object.entries(map)) { if (key.includes(k)) return v; }
  return '#6b7280';
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function makeId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

function initials(name) {
  return (name || '?').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function avatarColor(name) {
  const palette = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#84cc16', '#f97316'];
  let h = 0;
  for (const c of (name || '')) h = ((h << 5) - h + c.charCodeAt(0)) | 0;
  return palette[Math.abs(h) % palette.length];
}

function normalizeKey(str) {
  return String(str).normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
}

function excelDateSerial(serial) {
  if (typeof serial === 'number' && serial > 1000) {
    return new Date((serial - 25569) * 86400000).toISOString().split('T')[0];
  }
  return serial != null ? String(serial).trim() : '';
}

// mapeamento de cabeçalhos para campos internos
const FIELD_ALIASES = {
  data:        ['data', 'date', 'dt', 'dia'],
  tecnico:     ['tecnico', 'responsavel', 'tech', 'responsável'],
  cliente:     ['cliente', 'local', 'empresa', 'company'],
  tipo:        ['tipo', 'servico', 'type', 'atividade', 'serviço'],
  obs:         ['observacoes', 'obs', 'notas', 'observações'],
  colaborador: ['colaborador', 'nome', 'funcionario', 'funcionário', 'name'],
  periodo:     ['periodo', 'datas', 'período'],
  mes:         ['mes', 'month', 'mês'],
  equipe:      ['equipe', 'time', 'setor', 'area', 'área'],
  aba:         ['aba', 'tab', 'folha'],
  horario:     ['horario', 'horário', 'hora', 'expediente', 'schedule'],
  modalidade:  ['modalidade', 'modo', 'regime', 'presenca', 'presença'],
};

function mapHeaders(headers) {
  return headers.map(h => {
    const nk = normalizeKey(h);
    for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
      if (aliases.some(a => nk.includes(a))) return field;
    }
    return null;
  });
}

function uniq(arr) { return [...new Set(arr)].sort(); }

function exportCsv(rows, columns) {
  const header = columns.map(c => c.title).join(',');
  const lines = rows.map(r => columns.map(c => `"${(r[c.dataIndex] ?? '').toString().replace(/"/g, '""')}"`).join(','));
  const csv = [header, ...lines].join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'agenda.csv'; a.click();
  URL.revokeObjectURL(url);
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────
function TecAvatar({ nome, size = 28 }) {
  const color = avatarColor(nome);
  return (
    <Avatar size={size} style={{ background: color + '33', color, fontWeight: 700, fontSize: size * 0.4, border: `1px solid ${color}55`, flexShrink: 0 }}>
      {initials(nome)}
    </Avatar>
  );
}

function TipoBadge({ tipo, colorFn }) {
  const color = colorFn ? colorFn(tipo) : '#6b7280';
  return (
    <Tag style={{
      background: color + '22', color, border: `1px solid ${color}44`,
      borderRadius: 20, fontSize: 11, fontWeight: 600, padding: '0 8px',
    }}>
      {tipo}
    </Tag>
  );
}

function SummaryCard({ icon, label, value, color }) {
  return (
    <div style={{
      background: 'var(--cl-bg-soft)', border: '1px solid var(--cl-border)',
      borderRadius: 12, padding: '16px 20px',
      display: 'flex', alignItems: 'center', gap: 14,
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 10, flexShrink: 0,
        background: color + '22', border: `1px solid ${color}33`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ color, fontSize: 20 }}>{icon}</span>
      </div>
      <div>
        <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--cl-text-hi)', lineHeight: 1.1 }}>{value}</div>
        <div style={{ fontSize: 12, color: 'var(--cl-text-soft)', marginTop: 2 }}>{label}</div>
      </div>
    </div>
  );
}

function TecnicoCell({ nome }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <TecAvatar nome={nome} />
      <span style={{ fontSize: 13, color: 'var(--cl-text)', fontWeight: 500 }}>{nome}</span>
    </div>
  );
}

function AcoesCell({ onEdit, onDelete }) {
  return (
    <Space size={2}>
      <Tooltip title="Editar">
        <Button type="text" icon={<EditOutlined />} size="small" style={{ color: 'var(--cl-text-soft)' }} onClick={onEdit} />
      </Tooltip>
      <Tooltip title="Excluir">
        <Button type="text" icon={<DeleteOutlined />} size="small" danger onClick={onDelete} />
      </Tooltip>
    </Space>
  );
}

function EmptyImport({ text = 'Nenhum dado. Importe uma planilha para começar.' }) {
  return <Empty description={<span style={{ fontSize: 12, color: 'var(--cl-text-soft)' }}>{text}</span>} image={Empty.PRESENTED_IMAGE_SIMPLE} />;
}

// ─── Formulário dinâmico ──────────────────────────────────────────────────────
function RegistroForm({ tipoRegistro, onTipoChange, tecnicoNomes }) {
  return (
    <>
      <Form.Item label="Tipo de registro" name="tipoRegistro" rules={[{ required: true }]}>
        <Select placeholder="Selecione..." onChange={onTipoChange}>
          <Option value="visita">Visita externa</Option>
          <Option value="plantao">Plantão</Option>
          <Option value="ferias">Férias / Licença</Option>
        </Select>
      </Form.Item>

      {tipoRegistro === 'visita' && (
        <>
          <Form.Item label="Data" name="data">
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item label="Tipo de serviço" name="tipo" rules={[{ required: true }]}>
            <Input placeholder="Ex: Atendimento externo, SM Louveira..." />
          </Form.Item>
          <Form.Item label="Cliente / Local" name="cliente" rules={[{ required: true }]}>
            <Input placeholder="Nome do cliente ou local" />
          </Form.Item>
          <Form.Item label="Técnico responsável" name="tecnico" rules={[{ required: true }]}>
            <Select showSearch allowClear placeholder="Nome do técnico"
              filterOption={(v, o) => o.value.toLowerCase().includes(v.toLowerCase())}
              notFoundContent={<span style={{ fontSize: 12, color: 'var(--cl-text-soft)' }}>Digite para buscar</span>}
            >
              {tecnicoNomes.map(n => <Option key={n} value={n}>{n}</Option>)}
            </Select>
          </Form.Item>
          <Form.Item label="Observações" name="obs">
            <TextArea rows={3} placeholder="Observações opcionais..." />
          </Form.Item>
        </>
      )}

      {tipoRegistro === 'plantao' && (
        <>
          <Form.Item label="Data" name="data" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item label="Aba de origem" name="aba" rules={[{ required: true }]}>
            <Select placeholder="Selecione...">
              <Option value="Plantão Frente">Plantão Frente</Option>
              <Option value="Plantão ERP">Plantão ERP</Option>
              <Option value="Nova Agenda">Nova Agenda</Option>
            </Select>
          </Form.Item>
          <Form.Item label="Técnico" name="tecnico" rules={[{ required: true }]}>
            <Select showSearch allowClear placeholder="Nome do técnico"
              filterOption={(v, o) => o.value.toLowerCase().includes(v.toLowerCase())}
            >
              {tecnicoNomes.map(n => <Option key={n} value={n}>{n}</Option>)}
            </Select>
          </Form.Item>
          <Form.Item label="Tipo" name="tipo" rules={[{ required: true }]}>
            <Select placeholder="Selecione...">
              <Option value="Plantão">Plantão</Option>
              <Option value="Férias">Férias</Option>
              <Option value="Licença">Licença</Option>
            </Select>
          </Form.Item>
        </>
      )}

      {tipoRegistro === 'ferias' && (
        <>
          <Form.Item label="Colaborador" name="colaborador" rules={[{ required: true }]}>
            <Select showSearch allowClear placeholder="Nome do colaborador"
              filterOption={(v, o) => o.value.toLowerCase().includes(v.toLowerCase())}
            >
              {tecnicoNomes.map(n => <Option key={n} value={n}>{n}</Option>)}
            </Select>
          </Form.Item>
          <Form.Item label="Mês" name="mes" rules={[{ required: true }]}>
            <Input placeholder="Ex: Março" />
          </Form.Item>
          <Form.Item label="Período" name="periodo" rules={[{ required: true }]}>
            <Input placeholder="Ex: 09/03/2026 a 23/03/2026" />
          </Form.Item>
          <Form.Item label="Tipo" name="tipo" rules={[{ required: true }]}>
            <Select placeholder="Selecione...">
              <Option value="Férias">Férias</Option>
              <Option value="Licença">Licença</Option>
              <Option value="Licença Maternidade">Licença Maternidade</Option>
              <Option value="Licença cirurgia">Licença cirurgia</Option>
            </Select>
          </Form.Item>
          <Form.Item label="Equipe" name="equipe" rules={[{ required: true }]}>
            <Select placeholder="Selecione...">
              <Option value="Desenvolvimento">Desenvolvimento</Option>
              <Option value="Campo">Campo</Option>
              <Option value="ERP">ERP</Option>
              <Option value="Suporte">Suporte</Option>
            </Select>
          </Form.Item>
        </>
      )}
    </>
  );
}

// ─── Card de técnico (aba Técnicos) ──────────────────────────────────────────
function TecCard({ tec, color }) {
  return (
    <div style={{
      background: 'var(--cl-bg-soft)', border: `1px solid ${color}22`,
      borderRadius: 10, padding: '10px 12px',
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <TecAvatar nome={tec.nome} size={32} />
      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--cl-text)', lineHeight: 1.3 }}>
        {tec.nome}
      </span>
    </div>
  );
}

// ─── Componente principal ──────────────────────────────────────────────────────
export default function AgendaTecnica() {
  // ─── Estado (tudo começa vazio — preenchido via importação) ────────────────
  const [visitas, setVisitas] = useState([]);
  const [plantoes, setPlantoes] = useState([]);
  const [ferias, setFerias] = useState([]);
  const [tecnicos, setTecnicos] = useState([]);
  const [activeTab, setActiveTab] = useState('visitas');

  // Filtros
  const [fVisitaTecnico, setFVisitaTecnico] = useState('');
  const [fVisitaTipo, setFVisitaTipo] = useState('');
  const [fPlanAba, setFPlanAba] = useState('');
  const [fPlanTecnico, setFPlanTecnico] = useState('');
  const [fFeriasColaborador, setFFeriasColaborador] = useState('');
  const [fFeriasTipo, setFFeriasTipo] = useState('');

  // Modal form
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [tipoRegistro, setTipoRegistro] = useState('visita');
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  // Modal import
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importPreview, setImportPreview] = useState(null);
  const [importMode, setImportMode] = useState('replace');
  const [importing, setImporting] = useState(false);

  // ─── Opções de filtro derivadas dos dados importados ──────────────────────
  const tecnicoNomes = useMemo(() => uniq(tecnicos.map(t => t.nome)), [tecnicos]);

  const visitaTecnicoOpts  = useMemo(() => uniq(visitas.map(v => v.tecnico).filter(Boolean)),  [visitas]);
  const visitaTipoOpts     = useMemo(() => uniq(visitas.map(v => v.tipo).filter(Boolean)),     [visitas]);
  const plantaoAbaOpts     = useMemo(() => uniq(plantoes.map(p => p.aba).filter(Boolean)),     [plantoes]);
  const plantaoTecnicoOpts = useMemo(() => uniq(plantoes.map(p => p.tecnico).filter(Boolean)), [plantoes]);
  const feriasTipoOpts     = useMemo(() => uniq(ferias.map(f => f.tipo).filter(Boolean)),      [ferias]);

  // ─── Dados filtrados ────────────────────────────────────────────────────────
  const visitasFiltradas = useMemo(() => visitas.filter(v =>
    (!fVisitaTecnico || v.tecnico === fVisitaTecnico) &&
    (!fVisitaTipo    || v.tipo    === fVisitaTipo)
  ), [visitas, fVisitaTecnico, fVisitaTipo]);

  const plantoesFilterados = useMemo(() => plantoes.filter(p =>
    (!fPlanAba     || p.aba     === fPlanAba) &&
    (!fPlanTecnico || p.tecnico === fPlanTecnico)
  ), [plantoes, fPlanAba, fPlanTecnico]);

  const feriasFiltradas = useMemo(() => ferias.filter(f =>
    (!fFeriasColaborador || f.colaborador.toLowerCase().includes(fFeriasColaborador.toLowerCase())) &&
    (!fFeriasTipo        || f.tipo === fFeriasTipo)
  ), [ferias, fFeriasColaborador, fFeriasTipo]);

  // ─── Técnicos agrupados por equipe ─────────────────────────────────────────
  const tecsPorEquipe = useMemo(() => {
    const groups = {};
    tecnicos.forEach(t => {
      const eq = t.equipe || 'Sem equipe';
      if (!groups[eq]) groups[eq] = [];
      groups[eq].push(t);
    });
    return groups;
  }, [tecnicos]);

  const EQUIPE_ICON_COLOR = {
    Campo:           { icon: <CarOutlined />,    color: '#3b82f6' },
    ERP:             { icon: <LaptopOutlined />, color: '#f59e0b' },
    Suporte:         { icon: <TeamOutlined />,   color: '#06b6d4' },
    Desenvolvimento: { icon: <LaptopOutlined />, color: '#8b5cf6' },
  };

  // ─── CRUD ──────────────────────────────────────────────────────────────────
  function openForm(record = null, tipo = 'visita') {
    setEditing(record);
    setTipoRegistro(record?.tipoRegistro ?? tipo);
    form.resetFields();
    if (record) {
      const values = { ...record, tipoRegistro: record.tipoRegistro };
      if (values.data) values.data = dayjs(values.data);
      form.setFieldsValue(values);
    } else {
      form.setFieldValue('tipoRegistro', tipo);
    }
    setFormOpen(true);
  }

  function handleDelete(id, setDataset) {
    Modal.confirm({
      title: 'Excluir registro',
      content: 'Tem certeza que deseja excluir este registro?',
      okText: 'Excluir', okType: 'danger', cancelText: 'Cancelar',
      onOk: () => setDataset(prev => prev.filter(r => r.id !== id)),
    });
  }

  async function handleSave() {
    let values;
    try { values = await form.validateFields(); } catch { return; }
    setSaving(true);
    const tr = values.tipoRegistro;
    const base = { ...values, tipoRegistro: tr };
    if (base.data) base.data = base.data.format('YYYY-MM-DD');

    if (tr === 'visita') {
      if (editing) setVisitas(p => p.map(r => r.id === editing.id ? { ...base, id: editing.id } : r));
      else setVisitas(p => [...p, { ...base, id: makeId() }]);
    } else if (tr === 'plantao') {
      if (editing) setPlantoes(p => p.map(r => r.id === editing.id ? { ...base, id: editing.id } : r));
      else setPlantoes(p => [...p, { ...base, id: makeId() }]);
    } else {
      if (editing) setFerias(p => p.map(r => r.id === editing.id ? { ...base, id: editing.id } : r));
      else setFerias(p => [...p, { ...base, id: makeId() }]);
    }
    setSaving(false);
    setFormOpen(false);
    message.success(editing ? 'Registro atualizado.' : 'Registro adicionado.');
  }

  // ─── Import xlsx (100% client-side) ────────────────────────────────────────
  async function parseFile(file) {
    setImportFile(file);
    setImportPreview(null);
    try {
      const XLSX = await import('xlsx');
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const preview = { sheets: wb.SheetNames, visitas: [], plantoes: [], ferias: [], tecnicos: [] };

      wb.SheetNames.forEach(sheetName => {
        const ws = wb.Sheets[sheetName];
        const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        if (raw.length < 2) return;

        const headers = raw[0].map(String);
        const mapped = mapHeaders(headers);
        const rows = raw.slice(1).filter(r => r.some(c => c !== ''));
        const nameL = normalizeKey(sheetName);

        // detectar tipo de aba pelo nome
        const isFerLic  = nameL.includes('ferias') || nameL.includes('férias') || nameL.includes('licenca') || nameL.includes('licença') || nameL.includes('folga');
        const isPlantao  = nameL.includes('plantao') || nameL.includes('plantão') || nameL.includes('escala') || nameL.includes('frente') || nameL.includes('erp') || nameL.includes('nova agenda');
        const isTecnico  = nameL.includes('horario') || nameL.includes('horário') || nameL.includes('tecnico') || nameL.includes('técnico') || nameL.includes('colaborador') || nameL.includes('equipe');

        rows.forEach(row => {
          const obj = {};
          mapped.forEach((field, i) => { if (field) obj[field] = excelDateSerial(row[i]); });

          if (isFerLic) {
            const nome = obj.colaborador || '';
            if (nome) {
              preview.ferias.push({
                id: makeId(),
                colaborador: nome,
                mes:     obj.mes     || '',
                periodo: obj.periodo || '',
                tipo:    obj.tipo    || 'Férias',
                equipe:  obj.equipe  || '',
                tipoRegistro: 'ferias',
              });
            }
          } else if (isPlantao) {
            const tec = obj.tecnico || obj.colaborador || '';
            if (tec || obj.data) {
              preview.plantoes.push({
                id: makeId(),
                data:    obj.data  || '',
                tecnico: tec,
                tipo:    obj.tipo  || 'Plantão',
                aba:     obj.aba   || sheetName,
                tipoRegistro: 'plantao',
              });
            }
          } else if (isTecnico) {
            const nome = obj.colaborador || obj.tecnico || '';
            if (nome) {
              preview.tecnicos.push({
                nome,
                equipe:     obj.equipe     || '',
                modalidade: obj.modalidade || '',
                horario:    obj.horario    || '',
              });
            }
          } else {
            // aba genérica — tenta detectar pelo conteúdo
            const tec     = obj.tecnico    || obj.colaborador || '';
            const cliente = obj.cliente    || '';
            if (cliente || tec) {
              preview.visitas.push({
                id: makeId(),
                cliente,
                tecnico: tec,
                tipo:    obj.tipo  || '',
                data:    obj.data  || '',
                obs:     obj.obs   || '',
                tipoRegistro: 'visita',
              });
            }
          }
        });
      });

      setImportPreview(preview);
    } catch (err) {
      message.error('Erro ao ler arquivo: ' + err.message);
    }
    return false;
  }

  function confirmImport() {
    if (!importPreview) return;
    setImporting(true);
    const { visitas: v, plantoes: p, ferias: f, tecnicos: t } = importPreview;
    const total = v.length + p.length + f.length + t.length;

    if (importMode === 'replace') {
      setVisitas(v);
      setPlantoes(p);
      setFerias(f);
      setTecnicos(t);
    } else {
      if (v.length) setVisitas(prev => [...prev, ...v]);
      if (p.length) setPlantoes(prev => [...prev, ...p]);
      if (f.length) setFerias(prev => [...prev, ...f]);
      if (t.length) setTecnicos(prev => [...prev, ...t]);
    }

    setImporting(false);
    setImportOpen(false);
    setImportPreview(null);
    setImportFile(null);
    message.success(`${total} registro${total !== 1 ? 's' : ''} importado${total !== 1 ? 's' : ''} com sucesso.`);
  }

  // ─── Colunas das tabelas ───────────────────────────────────────────────────
  const colsVisitas = [
    {
      title: 'Cliente / Local', dataIndex: 'cliente',
      render: v => <span style={{ fontWeight: 500, color: 'var(--cl-text-hi)' }}>{v}</span>,
    },
    { title: 'Técnico', dataIndex: 'tecnico', render: v => <TecnicoCell nome={v} /> },
    {
      title: 'Tipo', dataIndex: 'tipo',
      render: v => <TipoBadge tipo={v} colorFn={tipoColor} />,
    },
    {
      title: 'Data', dataIndex: 'data', width: 100,
      render: v => v ? <span style={{ color: 'var(--cl-text-soft)', fontSize: 12 }}>{dayjs(v).isValid() ? dayjs(v).format('DD/MM/YYYY') : v}</span> : '—',
    },
    {
      title: '', key: 'acoes', width: 72, align: 'right',
      render: (_, r) => (
        <AcoesCell
          onEdit={() => openForm({ ...r, tipoRegistro: 'visita' }, 'visita')}
          onDelete={() => handleDelete(r.id, setVisitas)}
        />
      ),
    },
  ];

  const colsPlantoes = [
    {
      title: 'Data', dataIndex: 'data', width: 110,
      render: v => v ? <span style={{ color: 'var(--cl-text)', fontSize: 13 }}>{dayjs(v).isValid() ? dayjs(v).format('DD/MM/YYYY') : v}</span> : '—',
    },
    { title: 'Técnico', dataIndex: 'tecnico', render: v => <TecnicoCell nome={v} /> },
    {
      title: 'Tipo', dataIndex: 'tipo',
      render: v => <TipoBadge tipo={v} colorFn={t => PLANTAO_TIPO_COLORS[t] || '#6b7280'} />,
    },
    {
      title: 'Aba', dataIndex: 'aba',
      render: v => <Tag style={{ borderRadius: 20, fontSize: 11, color: 'var(--cl-text-soft)', borderColor: 'var(--cl-border)' }}>{v}</Tag>,
    },
    {
      title: '', key: 'acoes', width: 72, align: 'right',
      render: (_, r) => (
        <AcoesCell
          onEdit={() => openForm({ ...r, tipoRegistro: 'plantao' }, 'plantao')}
          onDelete={() => handleDelete(r.id, setPlantoes)}
        />
      ),
    },
  ];

  const colsFerias = [
    { title: 'Colaborador', dataIndex: 'colaborador', render: v => <TecnicoCell nome={v} /> },
    {
      title: 'Mês / Período', key: 'mesperiodo',
      render: (_, r) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--cl-text-hi)' }}>{r.mes}</div>
          <div style={{ fontSize: 11, color: 'var(--cl-text-soft)' }}>{r.periodo}</div>
        </div>
      ),
    },
    {
      title: 'Tipo', dataIndex: 'tipo',
      render: v => <TipoBadge tipo={v} colorFn={t => FERIAS_TIPO_COLORS[t] || '#6b7280'} />,
    },
    {
      title: 'Equipe', dataIndex: 'equipe',
      render: v => {
        const color = EQUIPE_COLORS[v] || '#6b7280';
        return <Tag style={{ background: color + '22', color, border: `1px solid ${color}44`, borderRadius: 20, fontSize: 11 }}>{v || '—'}</Tag>;
      },
    },
    {
      title: '', key: 'acoes', width: 72, align: 'right',
      render: (_, r) => (
        <AcoesCell
          onEdit={() => openForm({ ...r, tipoRegistro: 'ferias' }, 'ferias')}
          onDelete={() => handleDelete(r.id, setFerias)}
        />
      ),
    },
  ];

  // ─── Tabs ──────────────────────────────────────────────────────────────────
  const tabItems = [
    {
      key: 'visitas',
      label: <span>Visitas externas <Tag style={{ marginLeft: 4, borderRadius: 20, fontSize: 11, padding: '0 6px' }}>{visitas.length}</Tag></span>,
      children: (
        <div>
          <div className="filter-bar" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
            <Select allowClear placeholder="Técnico" style={{ minWidth: 160 }}
              value={fVisitaTecnico || undefined} onChange={v => setFVisitaTecnico(v || '')} showSearch
              disabled={!visitaTecnicoOpts.length}
            >
              {visitaTecnicoOpts.map(t => <Option key={t} value={t}>{t}</Option>)}
            </Select>
            <Select allowClear placeholder="Tipo de serviço" style={{ minWidth: 180 }}
              value={fVisitaTipo || undefined} onChange={v => setFVisitaTipo(v || '')}
              disabled={!visitaTipoOpts.length}
            >
              {visitaTipoOpts.map(t => <Option key={t} value={t}>{t}</Option>)}
            </Select>
            <Button style={{ marginLeft: 'auto' }} disabled={!visitas.length}
              onClick={() => exportCsv(visitasFiltradas, [
                { title: 'Cliente', dataIndex: 'cliente' },
                { title: 'Técnico', dataIndex: 'tecnico' },
                { title: 'Tipo', dataIndex: 'tipo' },
                { title: 'Data', dataIndex: 'data' },
                { title: 'Obs', dataIndex: 'obs' },
              ])}
            >
              Exportar CSV
            </Button>
          </div>
          <div className="page-table-wrap">
            <Table dataSource={visitasFiltradas} columns={colsVisitas} rowKey="id" size="small"
              pagination={{ pageSize: 15, showSizeChanger: false }}
              locale={{ emptyText: <EmptyImport text="Nenhuma visita. Importe uma planilha para começar." /> }}
              footer={() => <span style={{ fontSize: 12, color: 'var(--cl-text-soft)' }}>{visitasFiltradas.length} registro{visitasFiltradas.length !== 1 ? 's' : ''}</span>}
            />
          </div>
        </div>
      ),
    },
    {
      key: 'plantoes',
      label: <span>Plantões <Tag style={{ marginLeft: 4, borderRadius: 20, fontSize: 11, padding: '0 6px' }}>{plantoes.length}</Tag></span>,
      children: (
        <div>
          <div className="filter-bar" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
            <Select allowClear placeholder="Aba de origem" style={{ minWidth: 170 }}
              value={fPlanAba || undefined} onChange={v => setFPlanAba(v || '')}
              disabled={!plantaoAbaOpts.length}
            >
              {plantaoAbaOpts.map(a => <Option key={a} value={a}>{a}</Option>)}
            </Select>
            <Select allowClear placeholder="Técnico" style={{ minWidth: 160 }}
              value={fPlanTecnico || undefined} onChange={v => setFPlanTecnico(v || '')} showSearch
              disabled={!plantaoTecnicoOpts.length}
            >
              {plantaoTecnicoOpts.map(t => <Option key={t} value={t}>{t}</Option>)}
            </Select>
          </div>
          <div className="page-table-wrap">
            <Table dataSource={plantoesFilterados} columns={colsPlantoes} rowKey="id" size="small"
              pagination={{ pageSize: 15, showSizeChanger: false }}
              locale={{ emptyText: <EmptyImport text="Nenhum plantão. Importe uma planilha para começar." /> }}
              footer={() => <span style={{ fontSize: 12, color: 'var(--cl-text-soft)' }}>{plantoesFilterados.length} registro{plantoesFilterados.length !== 1 ? 's' : ''}</span>}
            />
          </div>
        </div>
      ),
    },
    {
      key: 'ferias',
      label: <span>Férias / Licenças <Tag style={{ marginLeft: 4, borderRadius: 20, fontSize: 11, padding: '0 6px' }}>{ferias.length}</Tag></span>,
      children: (
        <div>
          <div className="filter-bar" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
            <Input.Search placeholder="Colaborador..." allowClear style={{ maxWidth: 220 }}
              value={fFeriasColaborador} onChange={e => setFFeriasColaborador(e.target.value)}
            />
            <Select allowClear placeholder="Tipo" style={{ minWidth: 180 }}
              value={fFeriasTipo || undefined} onChange={v => setFFeriasTipo(v || '')}
              disabled={!feriasTipoOpts.length}
            >
              {feriasTipoOpts.map(t => <Option key={t} value={t}>{t}</Option>)}
            </Select>
          </div>
          <div className="page-table-wrap">
            <Table dataSource={feriasFiltradas} columns={colsFerias} rowKey="id" size="small"
              pagination={{ pageSize: 15, showSizeChanger: false }}
              locale={{ emptyText: <EmptyImport text="Nenhum registro de férias ou licença. Importe uma planilha para começar." /> }}
              footer={() => <span style={{ fontSize: 12, color: 'var(--cl-text-soft)' }}>{feriasFiltradas.length} registro{feriasFiltradas.length !== 1 ? 's' : ''}</span>}
            />
          </div>
        </div>
      ),
    },
    {
      key: 'tecnicos',
      label: 'Técnicos',
      children: tecnicos.length === 0 ? (
        <EmptyImport text="Nenhum técnico cadastrado. Importe uma planilha com a aba de horários ou técnicos." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          {/* Grids por equipe */}
          {Object.entries(tecsPorEquipe).map(([equipe, lista], idx) => {
            const { icon, color } = EQUIPE_ICON_COLOR[equipe] || { icon: <TeamOutlined />, color: '#6b7280' };
            return (
              <div key={equipe}>
                {idx > 0 && <Divider style={{ margin: '0 0 24px' }} />}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <span style={{ color, fontSize: 16 }}>{icon}</span>
                  <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--cl-text-hi)' }}>Equipe {equipe}</span>
                  <Tag style={{ borderRadius: 20, background: color + '22', color, border: `1px solid ${color}44`, fontSize: 11 }}>
                    {lista.length} técnico{lista.length !== 1 ? 's' : ''}
                  </Tag>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
                  {lista.map(t => <TecCard key={t.nome + equipe} tec={t} color={color} />)}
                </div>
              </div>
            );
          })}

          {/* Horários — só exibe se algum técnico tiver horário preenchido */}
          {tecnicos.some(t => t.horario) && (
            <>
              <Divider style={{ margin: 0 }} />
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <ClockCircleOutlined style={{ color: '#10b981', fontSize: 16 }} />
                  <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--cl-text-hi)' }}>Horários</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 10 }}>
                  {tecnicos.filter(t => t.horario).map((t, i) => (
                    <div key={t.nome + i} style={{
                      background: 'var(--cl-bg-soft)', border: '1px solid var(--cl-border)',
                      borderRadius: 10, padding: '10px 14px',
                      display: 'flex', flexDirection: 'column', gap: 4,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--cl-text-hi)' }}>{t.nome}</span>
                        {t.modalidade && (
                          <Tag style={{
                            borderRadius: 20, fontSize: 10, padding: '0 6px',
                            background: t.modalidade.toLowerCase().includes('home') ? '#8b5cf622' : '#3b82f622',
                            color: t.modalidade.toLowerCase().includes('home') ? '#8b5cf6' : '#3b82f6',
                            border: `1px solid ${t.modalidade.toLowerCase().includes('home') ? '#8b5cf644' : '#3b82f644'}`,
                          }}>
                            {t.modalidade.toLowerCase().includes('home') ? <><HomeOutlined /> HO</> : 'Presencial'}
                          </Tag>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--cl-text-soft)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <ClockCircleOutlined /> {t.horario}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      ),
    },
  ];

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="page-wrap">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12, flexShrink: 0,
            background: 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(139,92,246,0.18))',
            border: '1px solid rgba(139,92,246,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <ScheduleOutlined style={{ fontSize: 22, color: '#a78bfa' }} />
          </div>
          <div>
            <h1 className="page-title" style={{ marginBottom: 2 }}>Agenda Técnica</h1>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--cl-text-soft)' }}>
              Visitas externas · Plantões · Férias
            </p>
          </div>
        </div>
        <Space wrap>
          <Button icon={<UploadOutlined />} onClick={() => { setImportPreview(null); setImportFile(null); setImportOpen(true); }}>
            Importar planilha
          </Button>
          <Button type="primary" icon={<PlusOutlined />}
            onClick={() => openForm(null, activeTab === 'plantoes' ? 'plantao' : activeTab === 'ferias' ? 'ferias' : 'visita')}
          >
            Novo registro
          </Button>
        </Space>
      </div>

      {/* Cards de resumo */}
      <Row gutter={[14, 14]} style={{ marginBottom: 24 }}>
        {[
          { label: 'Visitas externas',   value: visitas.length,  icon: <CarOutlined />,         color: '#3b82f6' },
          { label: 'Plantões agendados', value: plantoes.length, icon: <CalendarOutlined />,    color: '#8b5cf6' },
          { label: 'Férias / Licenças',  value: ferias.length,   icon: <ClockCircleOutlined />, color: '#10b981' },
          { label: 'Técnicos ativos',    value: tecnicos.length, icon: <TeamOutlined />,        color: '#f59e0b' },
        ].map(c => (
          <Col xs={12} sm={12} md={6} key={c.label}>
            <SummaryCard {...c} />
          </Col>
        ))}
      </Row>

      {/* Tabs */}
      <div style={{ background: 'var(--cl-bg-soft)', borderRadius: 12, border: '1px solid var(--cl-border)', padding: '0 20px 20px' }}>
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
      </div>

      {/* Modal form */}
      <Modal
        title={editing ? 'Editar registro' : 'Novo registro'}
        open={formOpen} onOk={handleSave} onCancel={() => setFormOpen(false)}
        okText={editing ? 'Salvar' : 'Adicionar'} cancelText="Cancelar"
        confirmLoading={saving} width={520} destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 8 }}>
          <RegistroForm
            tipoRegistro={tipoRegistro}
            onTipoChange={v => setTipoRegistro(v)}
            tecnicoNomes={tecnicoNomes}
          />
        </Form>
      </Modal>

      {/* Modal import */}
      <Modal
        title="Importar planilha"
        open={importOpen}
        onOk={importPreview ? confirmImport : undefined}
        onCancel={() => setImportOpen(false)}
        okText="Confirmar importação" cancelText="Cancelar"
        okButtonProps={{ disabled: !importPreview }}
        confirmLoading={importing} width={560} destroyOnClose
      >
        <Dragger accept=".xlsx,.xls,.csv" beforeUpload={parseFile} showUploadList={false} style={{ marginBottom: 16 }}>
          <p className="ant-upload-drag-icon"><InboxOutlined /></p>
          <p style={{ color: 'var(--cl-text)', fontWeight: 600, marginBottom: 4 }}>
            {importFile ? importFile.name : 'Arraste o arquivo ou clique para selecionar'}
          </p>
          <p style={{ fontSize: 12, color: 'var(--cl-text-soft)' }}>
            Suporta .xlsx, .xls e .csv · Processado 100% no navegador
          </p>
        </Dragger>

        {importPreview && (
          <div>
            <Divider style={{ margin: '12px 0' }} />
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--cl-text-hi)', marginBottom: 10 }}>
                Dados encontrados na planilha
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {[
                  { label: 'Visitas',   count: importPreview.visitas.length,   color: '#3b82f6' },
                  { label: 'Plantões',  count: importPreview.plantoes.length,  color: '#8b5cf6' },
                  { label: 'Férias',    count: importPreview.ferias.length,    color: '#10b981' },
                  { label: 'Técnicos',  count: importPreview.tecnicos.length,  color: '#f59e0b' },
                ].map(({ label, count, color }) => (
                  <div key={label} style={{
                    background: color + '18', border: `1px solid ${color}33`,
                    borderRadius: 8, padding: '6px 14px', textAlign: 'center',
                  }}>
                    <div style={{ fontWeight: 700, fontSize: 18, color }}>{count}</div>
                    <div style={{ fontSize: 11, color: 'var(--cl-text-soft)' }}>{label}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 8, fontSize: 12, color: 'var(--cl-text-soft)' }}>
                Abas encontradas: {importPreview.sheets.join(', ')}
              </div>
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--cl-text-hi)', marginBottom: 8 }}>
                Como importar?
              </div>
              <Radio.Group value={importMode} onChange={e => setImportMode(e.target.value)}>
                <Space direction="vertical">
                  <Radio value="replace">Substituir dados atuais (recomendado)</Radio>
                  <Radio value="add">Adicionar aos dados existentes</Radio>
                </Space>
              </Radio.Group>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
