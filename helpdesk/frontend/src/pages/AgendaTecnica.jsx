import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Button, Tabs, Table, Modal, Form, Input, Select, DatePicker,
  Space, Tag, Avatar, Tooltip, Upload, message, Row, Col, Divider, Radio, Empty, AutoComplete,
} from 'antd';
import {
  ScheduleOutlined, PlusOutlined, UploadOutlined, EditOutlined, DeleteOutlined,
  InboxOutlined, CalendarOutlined, TeamOutlined, ClockCircleOutlined,
  CarOutlined, LaptopOutlined, HomeOutlined, SearchOutlined, CloseCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { agendaTecnicaService } from '../services/api';

const { TextArea } = Input;
const { Option } = Select;
const { Dragger } = Upload;

// ─── Paletas ──────────────────────────────────────────────────────────────────
const FERIAS_TIPO_COLORS = {
  'Férias':              '#10b981',
  'Licença':             '#f59e0b',
  'Licença Maternidade': '#f472b6',
  'Licença cirurgia':    '#ef4444',
};
const PLANTAO_TIPO_COLORS = { Plantão: '#3b82f6', Férias: '#10b981', Licença: '#f59e0b' };
const EQUIPE_COLORS = { Desenvolvimento: '#8b5cf6', Campo: '#3b82f6', ERP: '#f59e0b', Suporte: '#06b6d4' };

function tipoColor(tipo) {
  const map = {
    'sm louveira': '#3b82f6', 'sm honorato': '#8b5cf6', 'sm ramos': '#6366f1',
    'sm rocha': '#818cf8', 'sm leve': '#a5b4fc', 'sm': '#60a5fa',
    'atendimento externo': '#10b981', 'carro em uso': '#f59e0b',
    'implantacao': '#f97316', 'intersolid': '#06b6d4', 'comercial': '#84cc16',
  };
  const k = normalizeKey(tipo || '');
  for (const [key, color] of Object.entries(map)) { if (k.includes(key)) return color; }
  return '#6b7280';
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function makeId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function initials(n) { return (n || '?').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase(); }
function avatarColor(n) {
  const p = ['#3b82f6','#8b5cf6','#10b981','#f59e0b','#ef4444','#06b6d4','#84cc16','#f97316'];
  let h = 0; for (const c of (n || '')) h = ((h << 5) - h + c.charCodeAt(0)) | 0;
  return p[Math.abs(h) % p.length];
}
function normalizeKey(s) {
  return String(s).normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
}
function capitalize(s) {
  if (!s) return s;
  return String(s).split(' ').map(w => w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : '').join(' ').trim();
}
function uniq(arr) { return [...new Set(arr.filter(Boolean))].sort(); }
function exportCsv(rows, cols) {
  const header = cols.map(c => c.title).join(',');
  const lines = rows.map(r => cols.map(c => `"${(r[c.key] ?? '').toString().replace(/"/g,'""')}"`).join(','));
  const blob = new Blob(['﻿' + [header,...lines].join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob); const a = document.createElement('a');
  a.href = url; a.download = 'agenda.csv'; a.click(); URL.revokeObjectURL(url);
}

// ─── Parsers específicos por aba ──────────────────────────────────────────────

const SECAO_MARKERS = [
  'FÉRIAS','FOLGA','INTERSOLID','SALA REUNIÃO','COMERCIAL',
  'ATENDIMENTO EXTERNO','IMPLANTAÇÕES','CARRO EM USO','SUPORTE INTERNO',
];

function inferTipo(clienteLabel) {
  const c = normalizeKey(clienteLabel || '');
  if (c.startsWith('sm ')) return capitalize(clienteLabel.trim());
  if (c.includes('carro')) return 'Carro em uso';
  if (c.includes('intersolid')) return 'Intersolid';
  if (c.includes('comercial')) return 'Comercial';
  if (c.includes('implantac')) return 'Implantação';
  return 'Atendimento externo';
}

// Converte "jan/26", "fev/26", "Agosto/27" → { month, year }
function parseMonthYear(label) {
  const norm = normalizeKey(label);
  const m = norm.match(/^([a-z]{3,})[\s\/]+(\d+)/);
  if (!m) return null;
  const pfx = m[1].substring(0, 3);
  let yRaw = parseInt(m[2], 10);
  let year = yRaw < 100 ? 2000 + yRaw : (yRaw >= 2000 && yRaw < 2100 ? yRaw : null);
  if (!year) return null;
  const mMap = { jan:1,fev:2,mar:3,abr:4,mai:5,jun:6,jul:7,ago:8,set:9,out:10,nov:11,dez:12 };
  const month = mMap[pfx];
  if (!month) return null;
  return { month, year };
}

const SKIP_TECH = ['CARRO EM USO','IMPLANTAÇ','IMPLANTAC','SUPORTE INTERNO','DEMAIS'];

function parseAgendaTecnica(raw) {
  const visitas = [];

  // Linha 9 (idx 8) = cabeçalhos de mês a partir da col 1513 (idx 1512)
  // Linha 10 (idx 9) = números dos dias
  const monthRow = raw[8] || [];
  const dayRow   = raw[9] || [];
  const CAL = 1512; // 0-indexed

  // Monta mapa: índice de coluna → "YYYY-MM-DD"
  const colToDate = {};
  let curMonth = null;
  for (let c = CAL; c < monthRow.length; c++) {
    const label = String(monthRow[c] || '').trim();
    if (label) {
      const parsed = parseMonthYear(label);
      if (parsed) curMonth = parsed;
    }
    if (!curMonth) continue;
    const day = parseInt(String(dayRow[c] || '').trim(), 10);
    if (day >= 1 && day <= 31) {
      const { month, year } = curMonth;
      colToDate[c] = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    }
  }

  // Linhas 59-87 (idx 58-86): col0 = nome técnico, cols 1512+ = cliente por dia
  for (let ri = 58; ri <= 86; ri++) {
    const row = raw[ri] || [];
    const techName = String(row[0] || '').trim();
    if (!techName) continue;
    const techUp = techName.toUpperCase();
    if (SKIP_TECH.some(s => techUp.includes(s))) continue;
    if (SECAO_MARKERS.some(m => techUp.startsWith(m))) continue;

    for (let c = CAL; c < row.length; c++) {
      const v = String(row[c] || '').trim();
      if (!v) continue;
      const dateStr = colToDate[c];
      if (!dateStr) continue;
      visitas.push({
        id: makeId(),
        tecnico: capitalize(techName),
        cliente: capitalize(v),
        tipo: inferTipo(v),
        data: dateStr,
        mes: dateStr.substring(0, 7), // "YYYY-MM"
        tipoRegistro: 'visita',
      });
    }
  }
  return visitas;
}

function parsePlantoes(raw, sheetName) {
  const plantoes = []; const tecnicos = [];
  // Achar linha de cabeçalho: primeira linha com ≥2 nomes nas colunas 2+
  let tecRow = -1;
  for (let i = 0; i < Math.min(raw.length, 8); i++) {
    if (raw[i].slice(1).filter(v => String(v).trim()).length >= 2) { tecRow = i; break; }
  }
  if (tecRow === -1) return { plantoes, tecnicos };

  const tecs = raw[tecRow].map((v, c) => ({ col: c, nome: String(v || '').trim() })).filter(t => t.col >= 1 && t.nome);
  tecs.forEach(t => tecnicos.push({ nome: t.nome, equipe: '', modalidade: '', horario: '' }));

  const abaLabel = sheetName.replace(/^Agenda\s+(Plantão\s+)?/i, '').replace(/^Nova agenda de\s+/i, 'Nova Agenda - ').trim();

  for (let i = tecRow + 1; i < raw.length; i++) {
    const row = raw[i];
    const data = String(row[0] || '').trim();
    if (!data) continue;
    tecs.forEach(tec => {
      const val = String(row[tec.col] || '').trim();
      if (val && val.toUpperCase() !== 'X' && val !== '0') {
        plantoes.push({ id: makeId(), data, tecnico: tec.nome, tipo: capitalize(val), aba: abaLabel, tipoRegistro: 'plantao' });
      }
    });
  }
  return { plantoes, tecnicos };
}

function parseFerias(raw) {
  const ferias = [];
  // Achar linha de cabeçalho (tem "mes" e "colaborador")
  let hIdx = 1;
  for (let i = 0; i < Math.min(raw.length, 5); i++) {
    const r = raw[i].map(c => normalizeKey(String(c)));
    if (r.some(c => c.includes('colaborador') || c.includes('nome'))) { hIdx = i; break; }
  }
  for (let i = hIdx + 1; i < raw.length; i++) {
    const row = raw[i];
    const mes = String(row[0] || '').trim();
    const colaborador = String(row[1] || '').trim();
    const periodo = String(row[2] || '').trim();
    if (!colaborador) continue;
    ferias.push({ id: makeId(), colaborador: capitalize(colaborador), mes: capitalize(mes), periodo, tipo: 'Férias', equipe: 'Desenvolvimento', tipoRegistro: 'ferias' });
  }
  return ferias;
}

function parseHorarios(raw) {
  const tecnicos = [];
  for (let i = 2; i < raw.length; i++) {
    const nome = String(raw[i][0] || '').trim();
    const horario = String(raw[i][1] || '').trim();
    if (!nome || !horario) continue;
    tecnicos.push({ nome: capitalize(nome), equipe: '', modalidade: '', horario: horario.replace(/ - /g, ' / ') });
  }
  return tecnicos;
}

// ─── Sub-componentes visuais ──────────────────────────────────────────────────
function TecAvatar({ nome, size = 28 }) {
  const color = avatarColor(nome);
  return (
    <Avatar size={size} style={{ background: color+'33', color, fontWeight:700, fontSize:size*0.4, border:`1px solid ${color}55`, flexShrink:0 }}>
      {initials(nome)}
    </Avatar>
  );
}

function TipoBadge({ tipo, colorFn }) {
  const color = colorFn ? colorFn(tipo) : '#6b7280';
  return (
    <Tag style={{ background:color+'22', color, border:`1px solid ${color}44`, borderRadius:20, fontSize:11, fontWeight:600, padding:'0 8px' }}>
      {tipo}
    </Tag>
  );
}

function SummaryCard({ icon, label, value, color }) {
  return (
    <div style={{ background:'var(--cl-bg-soft)', border:'1px solid var(--cl-border)', borderRadius:12, padding:'16px 20px', display:'flex', alignItems:'center', gap:14 }}>
      <div style={{ width:44, height:44, borderRadius:10, flexShrink:0, background:color+'22', border:`1px solid ${color}33`, display:'flex', alignItems:'center', justifyContent:'center' }}>
        <span style={{ color, fontSize:20 }}>{icon}</span>
      </div>
      <div>
        <div style={{ fontSize:22, fontWeight:700, color:'var(--cl-text-hi)', lineHeight:1.1 }}>{value}</div>
        <div style={{ fontSize:12, color:'var(--cl-text-soft)', marginTop:2 }}>{label}</div>
      </div>
    </div>
  );
}

function TecnicoCell({ nome }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
      <TecAvatar nome={nome} />
      <span style={{ fontSize:13, color:'var(--cl-text)', fontWeight:500 }}>{nome}</span>
    </div>
  );
}

function AcoesCell({ onEdit, onDelete }) {
  return (
    <Space size={2}>
      <Tooltip title="Editar"><Button type="text" icon={<EditOutlined />} size="small" style={{ color:'var(--cl-text-soft)' }} onClick={onEdit} /></Tooltip>
      <Tooltip title="Excluir"><Button type="text" icon={<DeleteOutlined />} size="small" danger onClick={onDelete} /></Tooltip>
    </Space>
  );
}

function EmptyImport({ text }) {
  return <Empty description={<span style={{ fontSize:12, color:'var(--cl-text-soft)' }}>{text || 'Nenhum dado. Importe uma planilha para começar.'}</span>} image={Empty.PRESENTED_IMAGE_SIMPLE} />;
}

function TecCard({ tec, color }) {
  return (
    <div style={{ background:'var(--cl-bg-soft)', border:`1px solid ${color}22`, borderRadius:10, padding:'10px 12px', display:'flex', alignItems:'center', gap:10 }}>
      <TecAvatar nome={tec.nome} size={32} />
      <span style={{ fontSize:13, fontWeight:500, color:'var(--cl-text)', lineHeight:1.3 }}>{tec.nome}</span>
    </div>
  );
}

// ─── Formulário ───────────────────────────────────────────────────────────────
function RegistroForm({ tipoRegistro, onTipoChange, tecNomes }) {
  return (
    <>
      <Form.Item label="Tipo de registro" name="tipoRegistro" rules={[{ required:true }]}>
        <Select placeholder="Selecione..." onChange={onTipoChange}>
          <Option value="visita">Visita externa</Option>
          <Option value="plantao">Plantão</Option>
          <Option value="ferias">Férias / Licença</Option>
        </Select>
      </Form.Item>
      {tipoRegistro === 'visita' && <>
        <Form.Item label="Data" name="data"><DatePicker style={{ width:'100%' }} format="DD/MM/YYYY" /></Form.Item>
        <Form.Item label="Tipo de serviço" name="tipo" rules={[{ required:true }]}><Input placeholder="Ex: Atendimento externo, SM Louveira..." /></Form.Item>
        <Form.Item label="Cliente / Local" name="cliente" rules={[{ required:true }]}><Input /></Form.Item>
        <Form.Item label="Técnico" name="tecnico" rules={[{ required:true }]}>
          <Select showSearch allowClear placeholder="Nome do técnico" filterOption={(v,o) => o.value.toLowerCase().includes(v.toLowerCase())}>
            {tecNomes.map(n => <Option key={n} value={n}>{n}</Option>)}
          </Select>
        </Form.Item>
        <Form.Item label="Observações" name="obs"><TextArea rows={3} /></Form.Item>
      </>}
      {tipoRegistro === 'plantao' && <>
        <Form.Item label="Data" name="data" rules={[{ required:true }]}><DatePicker style={{ width:'100%' }} format="DD/MM/YYYY" /></Form.Item>
        <Form.Item label="Aba" name="aba" rules={[{ required:true }]}><Input placeholder="Ex: Plantão Frente, ERP..." /></Form.Item>
        <Form.Item label="Técnico" name="tecnico" rules={[{ required:true }]}>
          <Select showSearch allowClear placeholder="Nome do técnico" filterOption={(v,o) => o.value.toLowerCase().includes(v.toLowerCase())}>
            {tecNomes.map(n => <Option key={n} value={n}>{n}</Option>)}
          </Select>
        </Form.Item>
        <Form.Item label="Tipo" name="tipo" rules={[{ required:true }]}>
          <Select placeholder="Selecione...">
            <Option value="Plantão">Plantão</Option><Option value="Férias">Férias</Option><Option value="Licença">Licença</Option>
          </Select>
        </Form.Item>
      </>}
      {tipoRegistro === 'ferias' && <>
        <Form.Item label="Colaborador" name="colaborador" rules={[{ required:true }]}>
          <Select showSearch allowClear placeholder="Nome" filterOption={(v,o) => o.value.toLowerCase().includes(v.toLowerCase())}>
            {tecNomes.map(n => <Option key={n} value={n}>{n}</Option>)}
          </Select>
        </Form.Item>
        <Form.Item label="Mês" name="mes" rules={[{ required:true }]}><Input placeholder="Ex: Março" /></Form.Item>
        <Form.Item label="Período" name="periodo" rules={[{ required:true }]}><Input placeholder="Ex: 09/03/2026 a 23/03/2026" /></Form.Item>
        <Form.Item label="Tipo" name="tipo" rules={[{ required:true }]}>
          <Select placeholder="Selecione...">
            <Option value="Férias">Férias</Option><Option value="Licença">Licença</Option>
            <Option value="Licença Maternidade">Licença Maternidade</Option><Option value="Licença cirurgia">Licença cirurgia</Option>
          </Select>
        </Form.Item>
        <Form.Item label="Equipe" name="equipe" rules={[{ required:true }]}>
          <Select placeholder="Selecione...">
            <Option value="Desenvolvimento">Desenvolvimento</Option><Option value="Campo">Campo</Option>
            <Option value="ERP">ERP</Option><Option value="Suporte">Suporte</Option>
          </Select>
        </Form.Item>
      </>}
    </>
  );
}

// ─── Componente principal ───────────────────────────────────────────────��──────
export default function AgendaTecnica() {
  const [visitas, setVisitas] = useState([]);
  const [plantoes, setPlantoes] = useState([]);
  const [ferias, setFerias] = useState([]);
  const [tecnicos, setTecnicos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('visitas');

  // Filtros por aba
  const [fVTec, setFVTec] = useState('');
  const [fVTipo, setFVTipo] = useState('');
  const [fVMes, setFVMes] = useState('');
  const [fPAba, setFPAba] = useState('');
  const [fPTec, setFPTec] = useState('');
  const [fFColaborador, setFFColaborador] = useState('');
  const [fFTipo, setFFTipo] = useState('');

  // Busca global por técnico
  const [searchTec, setSearchTec] = useState('');
  const [searchInput, setSearchInput] = useState('');

  // Modal form
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [tipoReg, setTipoReg] = useState('visita');
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  // Modal import
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importPreview, setImportPreview] = useState(null);
  const [importMode, setImportMode] = useState('replace');
  const [importing, setImporting] = useState(false);
  const [clearingAll, setClearingAll] = useState(false);

  // ─── Carregamento inicial ─────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      const [v, p, f, t] = await Promise.all([
        agendaTecnicaService.listVisitas(),
        agendaTecnicaService.listPlantoes(),
        agendaTecnicaService.listFerias(),
        agendaTecnicaService.listTecnicos(),
      ]);
      setVisitas(v); setPlantoes(p); setFerias(f); setTecnicos(t);
    } catch (err) {
      const detail = err?.response?.data?.error || err?.message || 'Erro desconhecido';
      message.error(`Erro ao carregar agenda: ${detail}`, 8);
      console.error('loadAll error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ─── Opções derivadas dos dados ──────────────────────────────────────────────
  const allTecNomes = useMemo(() => uniq([
    ...visitas.map(v => v.tecnico),
    ...plantoes.map(p => p.tecnico),
    ...ferias.map(f => f.colaborador),
    ...tecnicos.map(t => t.nome),
  ]), [visitas, plantoes, ferias, tecnicos]);

  const vTecOpts  = useMemo(() => uniq(visitas.map(v => v.tecnico)),  [visitas]);
  const vTipoOpts = useMemo(() => uniq(visitas.map(v => v.tipo)),     [visitas]);
  const vMesOpts  = useMemo(() => {
    const raw = uniq(visitas.map(v => v.mes).filter(Boolean)).sort();
    const mNames = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    return raw.map(m => {
      const [y, mo] = m.split('-');
      return { value: m, label: `${mNames[parseInt(mo,10)-1]}/${y}` };
    });
  }, [visitas]);
  const pAbaOpts  = useMemo(() => uniq(plantoes.map(p => p.aba)),     [plantoes]);
  const pTecOpts  = useMemo(() => uniq(plantoes.map(p => p.tecnico)), [plantoes]);
  const fTipoOpts = useMemo(() => uniq(ferias.map(f => f.tipo)),      [ferias]);

  // ─── Dados filtrados ──────────────────────────────────────────────────────────
  const visitasFilt = useMemo(() => visitas.filter(v =>
    (!fVTec  || v.tecnico === fVTec) &&
    (!fVTipo || v.tipo    === fVTipo) &&
    (!fVMes  || v.mes     === fVMes)
  ), [visitas, fVTec, fVTipo, fVMes]);

  const plantoessFilt = useMemo(() => plantoes.filter(p =>
    (!fPAba || p.aba === fPAba) && (!fPTec || p.tecnico === fPTec)
  ), [plantoes, fPAba, fPTec]);

  const feriasFilt = useMemo(() => ferias.filter(f =>
    (!fFColaborador || f.colaborador.toLowerCase().includes(fFColaborador.toLowerCase())) &&
    (!fFTipo || f.tipo === fFTipo)
  ), [ferias, fFColaborador, fFTipo]);

  // ─── Busca global por técnico ─────────────────────────────────────────────────
  const searchResults = useMemo(() => {
    if (!searchTec) return null;
    const q = searchTec.toLowerCase();
    return {
      visitas:  visitas.filter(v  => v.tecnico.toLowerCase().includes(q)),
      plantoes: plantoes.filter(p => p.tecnico.toLowerCase().includes(q)),
      ferias:   ferias.filter(f   => f.colaborador.toLowerCase().includes(q)),
    };
  }, [searchTec, visitas, plantoes, ferias]);

  // ─── Técnicos por equipe ──────────────────────────────────────────────────────
  const tecsPorEquipe = useMemo(() => {
    const g = {};
    tecnicos.forEach(t => { const eq = t.equipe || 'Geral'; if (!g[eq]) g[eq] = []; g[eq].push(t); });
    return g;
  }, [tecnicos]);

  const EQ_STYLE = {
    Campo:           { icon: <CarOutlined />,    color: '#3b82f6' },
    ERP:             { icon: <LaptopOutlined />, color: '#f59e0b' },
    Suporte:         { icon: <TeamOutlined />,   color: '#06b6d4' },
    Desenvolvimento: { icon: <LaptopOutlined />, color: '#8b5cf6' },
    Geral:           { icon: <TeamOutlined />,   color: '#6b7280' },
  };

  // ─── CRUD ──────────────────────────────────────────────────────────────────────
  function openForm(record = null, tipo = 'visita') {
    setEditing(record); setTipoReg(record?.tipoRegistro ?? tipo);
    form.resetFields();
    if (record) { const v = { ...record, tipoRegistro: record.tipoRegistro }; if (v.data) v.data = dayjs(v.data); form.setFieldsValue(v); }
    else form.setFieldValue('tipoRegistro', tipo);
    setFormOpen(true);
  }

  function handleDelete(id, tipo) {
    Modal.confirm({
      title: 'Excluir registro', content: 'Confirma exclusão?',
      okText: 'Excluir', okType: 'danger', cancelText: 'Cancelar',
      onOk: async () => {
        try {
          if (tipo === 'visita')  await agendaTecnicaService.removeVisita(id);
          if (tipo === 'plantao') await agendaTecnicaService.removePlantao(id);
          if (tipo === 'ferias')  await agendaTecnicaService.removeFerias(id);
          if (tipo === 'tecnico') await agendaTecnicaService.removeTecnico(id);
          await loadAll();
          message.success('Registro excluído.');
        } catch { message.error('Erro ao excluir.'); }
      },
    });
  }

  function handleClearAll() {
    Modal.confirm({
      title: 'Excluir todos os registros',
      icon: <ExclamationCircleOutlined style={{ color: '#ef4444' }} />,
      content: 'Isso irá remover TODOS os registros de visitas, plantões, férias e técnicos. Esta ação não pode ser desfeita.',
      okText: 'Excluir tudo', okType: 'danger', cancelText: 'Cancelar',
      onOk: async () => {
        setClearingAll(true);
        try {
          await agendaTecnicaService.clearAll();
          setVisitas([]); setPlantoes([]); setFerias([]); setTecnicos([]);
          message.success('Todos os registros foram excluídos.');
        } catch { message.error('Erro ao excluir registros.'); }
        finally { setClearingAll(false); }
      },
    });
  }

  async function handleSave() {
    let values; try { values = await form.validateFields(); } catch { return; }
    setSaving(true);
    const tr = values.tipoRegistro;
    const base = { ...values };
    if (base.data && base.data?.format) base.data = base.data.format('YYYY-MM-DD');
    if (base.mes === undefined && base.data) base.mes = base.data.substring(0, 7);
    try {
      if (editing) {
        if (tr === 'visita')  await agendaTecnicaService.updateVisita(editing.id,  base);
        if (tr === 'plantao') await agendaTecnicaService.updatePlantao(editing.id, base);
        if (tr === 'ferias')  await agendaTecnicaService.updateFerias(editing.id,  base);
        message.success('Registro atualizado.');
      } else {
        if (tr === 'visita')  await agendaTecnicaService.createVisita(base);
        if (tr === 'plantao') await agendaTecnicaService.createPlantao(base);
        if (tr === 'ferias')  await agendaTecnicaService.createFerias(base);
        message.success('Registro adicionado.');
      }
      await loadAll();
      setFormOpen(false);
    } catch { message.error('Erro ao salvar.'); }
    setSaving(false);
  }

  // ─── Import xlsx ─────────────────────────────────────────────────────────────
  async function parseFile(file) {
    setImportFile(file); setImportPreview(null);
    try {
      const XLSX = await import('xlsx');
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const preview = { sheets: wb.SheetNames, visitas: [], plantoes: [], ferias: [], tecnicos: [] };

      wb.SheetNames.forEach(sheetName => {
        const ws = wb.Sheets[sheetName];
        const nameL = normalizeKey(sheetName);
        try {
          const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
          if (raw.length < 2) return;

          if (nameL.includes('horario') || nameL.includes('horário')) {
            parseHorarios(raw).forEach(t => preview.tecnicos.push(t));
          } else if (nameL.includes('ferias') || nameL.includes('férias') || nameL.includes('desenvolvimento')) {
            parseFerias(raw).forEach(f => preview.ferias.push(f));
          } else if (nameL.includes('plantao') || nameL.includes('plantão') || nameL.includes('nova agenda') || nameL.includes('frente') || nameL.includes('erp')) {
            const r = parsePlantoes(raw, sheetName);
            r.plantoes.forEach(p => preview.plantoes.push(p));
            r.tecnicos.forEach(t => { if (!preview.tecnicos.find(pt => pt.nome === t.nome)) preview.tecnicos.push(t); });
          } else if (nameL.includes('agenda tecnica') || nameL.includes('agenda técnica')) {
            parseAgendaTecnica(raw).forEach(v => preview.visitas.push(v));
          }
        } catch (e) { console.warn('Erro aba', sheetName, e); }
      });

      setImportPreview(preview);
    } catch (err) { message.error('Erro ao ler arquivo: ' + err.message); }
    return false;
  }

  async function confirmImport() {
    if (!importPreview) return;
    setImporting(true);
    const { visitas: v, plantoes: p, ferias: f, tecnicos: t } = importPreview;
    const total = v.length + p.length + f.length + t.length;
    try {
      await agendaTecnicaService.bulk({
        visitas: v, plantoes: p, ferias: f, tecnicos: t, mode: importMode,
      });
      await loadAll();
      setImportOpen(false); setImportPreview(null); setImportFile(null);
      message.success(`${total} registro${total !== 1 ? 's' : ''} importado${total !== 1 ? 's' : ''} com sucesso.`);
    } catch { message.error('Erro ao salvar dados no servidor.'); }
    setImporting(false);
  }

  // ─── Colunas ──────────────────────────────────────────────────────────────────
  const mNames = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  const fmtData = v => {
    if (!v) return '—';
    const d = dayjs(v);
    return d.isValid() ? d.format('DD/MM/YYYY') : v;
  };
  const fmtMes = mes => {
    if (!mes) return '';
    const [y, mo] = mes.split('-');
    return `${mNames[parseInt(mo,10)-1]}/${y}`;
  };

  const colsVisitas = [
    { title:'Data', dataIndex:'data', width:110, sorter: (a,b) => (a.data||'').localeCompare(b.data||''),
      render: (v, r) => (
        <div>
          <div style={{ fontWeight:600, fontSize:13, color:'var(--cl-text-hi)' }}>{fmtData(v)}</div>
          {r.mes && <div style={{ fontSize:11, color:'var(--cl-text-soft)' }}>{fmtMes(r.mes)}</div>}
        </div>
      )},
    { title:'Técnico', dataIndex:'tecnico', render: v => <TecnicoCell nome={v} /> },
    { title:'Cliente / Local', dataIndex:'cliente', render: v => <span style={{ fontWeight:500, color:'var(--cl-text-hi)' }}>{v}</span> },
    { title:'Tipo', dataIndex:'tipo', render: v => <TipoBadge tipo={v} colorFn={tipoColor} /> },
    { title:'', key:'acoes', width:72, align:'right', render: (_, r) => <AcoesCell onEdit={() => openForm({ ...r, tipoRegistro:'visita' }, 'visita')} onDelete={() => handleDelete(r.id, 'visita')} /> },
  ];

  const colsPlantoes = [
    { title:'Data', dataIndex:'data', width:110, render: v => v ? <span style={{ color:'var(--cl-text)', fontSize:13 }}>{dayjs(v).isValid() ? dayjs(v).format('DD/MM/YYYY') : v}</span> : '—' },
    { title:'Técnico', dataIndex:'tecnico', render: v => <TecnicoCell nome={v} /> },
    { title:'Tipo', dataIndex:'tipo', render: v => <TipoBadge tipo={v} colorFn={t => PLANTAO_TIPO_COLORS[t] || '#6b7280'} /> },
    { title:'Aba', dataIndex:'aba', render: v => <Tag style={{ borderRadius:20, fontSize:11, color:'var(--cl-text-soft)', borderColor:'var(--cl-border)' }}>{v}</Tag> },
    { title:'', key:'acoes', width:72, align:'right', render: (_, r) => <AcoesCell onEdit={() => openForm({ ...r, tipoRegistro:'plantao' }, 'plantao')} onDelete={() => handleDelete(r.id, 'plantao')} /> },
  ];

  const colsFerias = [
    { title:'Colaborador', dataIndex:'colaborador', render: v => <TecnicoCell nome={v} /> },
    { title:'Mês / Período', key:'mp', render: (_, r) => (
      <div><div style={{ fontWeight:600, fontSize:13, color:'var(--cl-text-hi)' }}>{r.mes}</div>
      <div style={{ fontSize:11, color:'var(--cl-text-soft)' }}>{r.periodo}</div></div>
    )},
    { title:'Tipo', dataIndex:'tipo', render: v => <TipoBadge tipo={v} colorFn={t => FERIAS_TIPO_COLORS[t] || '#6b7280'} /> },
    { title:'Equipe', dataIndex:'equipe', render: v => { const color = EQUIPE_COLORS[v] || '#6b7280'; return <Tag style={{ background:color+'22', color, border:`1px solid ${color}44`, borderRadius:20, fontSize:11 }}>{v || '—'}</Tag>; } },
    { title:'', key:'acoes', width:72, align:'right', render: (_, r) => <AcoesCell onEdit={() => openForm({ ...r, tipoRegistro:'ferias' }, 'ferias')} onDelete={() => handleDelete(r.id, 'ferias')} /> },
  ];

  // ─── Tabs ────────────────────────────────────────────────────────────────────
  const tabItems = [
    {
      key: 'visitas',
      label: <span>Visitas externas <Tag style={{ marginLeft:4, borderRadius:20, fontSize:11, padding:'0 6px' }}>{visitas.length}</Tag></span>,
      children: (
        <div>
          <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginBottom:16 }}>
            <Select allowClear placeholder="Mês" style={{ minWidth:130 }} value={fVMes || undefined} onChange={v => setFVMes(v || '')} disabled={!vMesOpts.length}>
              {vMesOpts.map(m => <Option key={m.value} value={m.value}>{m.label}</Option>)}
            </Select>
            <Select allowClear placeholder="Técnico" style={{ minWidth:160 }} value={fVTec || undefined} onChange={v => setFVTec(v || '')} showSearch disabled={!vTecOpts.length}>
              {vTecOpts.map(t => <Option key={t} value={t}>{t}</Option>)}
            </Select>
            <Select allowClear placeholder="Tipo de serviço" style={{ minWidth:180 }} value={fVTipo || undefined} onChange={v => setFVTipo(v || '')} disabled={!vTipoOpts.length}>
              {vTipoOpts.map(t => <Option key={t} value={t}>{t}</Option>)}
            </Select>
            <Button style={{ marginLeft:'auto' }} disabled={!visitas.length}
              onClick={() => exportCsv(visitasFilt, [
                { title:'Cliente', key:'cliente' }, { title:'Técnico', key:'tecnico' },
                { title:'Tipo', key:'tipo' }, { title:'Data', key:'data' }, { title:'Obs', key:'obs' },
              ])}
            >Exportar CSV</Button>
          </div>
          <div className="page-table-wrap">
            <Table dataSource={visitasFilt} columns={colsVisitas} rowKey="id" size="small" loading={loading}
              pagination={{ pageSize:20, showSizeChanger:false }}
              locale={{ emptyText: <EmptyImport text="Nenhuma visita. Importe uma planilha para começar." /> }}
              footer={() => <span style={{ fontSize:12, color:'var(--cl-text-soft)' }}>{visitasFilt.length} registro{visitasFilt.length !== 1 ? 's' : ''}</span>}
            />
          </div>
        </div>
      ),
    },
    {
      key: 'plantoes',
      label: <span>Plantões <Tag style={{ marginLeft:4, borderRadius:20, fontSize:11, padding:'0 6px' }}>{plantoes.length}</Tag></span>,
      children: (
        <div>
          <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginBottom:16 }}>
            <Select allowClear placeholder="Aba de origem" style={{ minWidth:170 }} value={fPAba || undefined} onChange={v => setFPAba(v || '')} disabled={!pAbaOpts.length}>
              {pAbaOpts.map(a => <Option key={a} value={a}>{a}</Option>)}
            </Select>
            <Select allowClear placeholder="Técnico" style={{ minWidth:160 }} value={fPTec || undefined} onChange={v => setFPTec(v || '')} showSearch disabled={!pTecOpts.length}>
              {pTecOpts.map(t => <Option key={t} value={t}>{t}</Option>)}
            </Select>
          </div>
          <div className="page-table-wrap">
            <Table dataSource={plantoessFilt} columns={colsPlantoes} rowKey="id" size="small" loading={loading}
              pagination={{ pageSize:20, showSizeChanger:false }}
              locale={{ emptyText: <EmptyImport text="Nenhum plantão. Importe uma planilha para começar." /> }}
              footer={() => <span style={{ fontSize:12, color:'var(--cl-text-soft)' }}>{plantoessFilt.length} registro{plantoessFilt.length !== 1 ? 's' : ''}</span>}
            />
          </div>
        </div>
      ),
    },
    {
      key: 'ferias',
      label: <span>Férias / Licenças <Tag style={{ marginLeft:4, borderRadius:20, fontSize:11, padding:'0 6px' }}>{ferias.length}</Tag></span>,
      children: (
        <div>
          <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginBottom:16 }}>
            <Input.Search placeholder="Colaborador..." allowClear style={{ maxWidth:220 }} value={fFColaborador} onChange={e => setFFColaborador(e.target.value)} />
            <Select allowClear placeholder="Tipo" style={{ minWidth:180 }} value={fFTipo || undefined} onChange={v => setFFTipo(v || '')} disabled={!fTipoOpts.length}>
              {fTipoOpts.map(t => <Option key={t} value={t}>{t}</Option>)}
            </Select>
          </div>
          <div className="page-table-wrap">
            <Table dataSource={feriasFilt} columns={colsFerias} rowKey="id" size="small" loading={loading}
              pagination={{ pageSize:20, showSizeChanger:false }}
              locale={{ emptyText: <EmptyImport text="Nenhum registro de férias ou licença." /> }}
              footer={() => <span style={{ fontSize:12, color:'var(--cl-text-soft)' }}>{feriasFilt.length} registro{feriasFilt.length !== 1 ? 's' : ''}</span>}
            />
          </div>
        </div>
      ),
    },
    {
      key: 'tecnicos',
      label: 'Técnicos',
      children: tecnicos.length === 0 ? (
        <EmptyImport text="Nenhum técnico. Importe a planilha com a aba 'Horário dos técnicos' ou Plantão." />
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:28 }}>
          {Object.entries(tecsPorEquipe).map(([equipe, lista], idx) => {
            const { icon, color } = EQ_STYLE[equipe] || { icon:<TeamOutlined />, color:'#6b7280' };
            return (
              <div key={equipe}>
                {idx > 0 && <Divider style={{ margin:'0 0 24px' }} />}
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
                  <span style={{ color, fontSize:16 }}>{icon}</span>
                  <span style={{ fontWeight:700, fontSize:15, color:'var(--cl-text-hi)' }}>Equipe {equipe}</span>
                  <Tag style={{ borderRadius:20, background:color+'22', color, border:`1px solid ${color}44`, fontSize:11 }}>{lista.length} técnico{lista.length !== 1 ? 's' : ''}</Tag>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(160px, 1fr))', gap:10 }}>
                  {lista.map(t => <TecCard key={t.nome + equipe} tec={t} color={color} />)}
                </div>
              </div>
            );
          })}
          {tecnicos.some(t => t.horario) && <>
            <Divider style={{ margin:0 }} />
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
                <ClockCircleOutlined style={{ color:'#10b981', fontSize:16 }} />
                <span style={{ fontWeight:700, fontSize:15, color:'var(--cl-text-hi)' }}>Horários</span>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(240px, 1fr))', gap:10 }}>
                {tecnicos.filter(t => t.horario).map((t, i) => (
                  <div key={t.nome + i} style={{ background:'var(--cl-bg-soft)', border:'1px solid var(--cl-border)', borderRadius:10, padding:'10px 14px', display:'flex', flexDirection:'column', gap:4 }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                      <span style={{ fontWeight:600, fontSize:13, color:'var(--cl-text-hi)' }}>{t.nome}</span>
                      {t.modalidade && (
                        <Tag style={{ borderRadius:20, fontSize:10, padding:'0 6px', background: t.modalidade.toLowerCase().includes('home') ? '#8b5cf622' : '#3b82f622', color: t.modalidade.toLowerCase().includes('home') ? '#8b5cf6' : '#3b82f6', border:`1px solid ${t.modalidade.toLowerCase().includes('home') ? '#8b5cf644' : '#3b82f644'}` }}>
                          {t.modalidade.toLowerCase().includes('home') ? <><HomeOutlined /> HO</> : 'Presencial'}
                        </Tag>
                      )}
                    </div>
                    <div style={{ fontSize:11, color:'var(--cl-text-soft)', display:'flex', alignItems:'center', gap:4 }}>
                      <ClockCircleOutlined /> {t.horario}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>}
        </div>
      ),
    },
  ];

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="page-wrap">
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24, gap:16, flexWrap:'wrap' }}>
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ width:48, height:48, borderRadius:12, flexShrink:0, background:'linear-gradient(135deg,rgba(99,102,241,0.25),rgba(139,92,246,0.18))', border:'1px solid rgba(139,92,246,0.25)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <ScheduleOutlined style={{ fontSize:22, color:'#a78bfa' }} />
          </div>
          <div>
            <h1 className="page-title" style={{ marginBottom:2 }}>Agenda Técnica</h1>
            <p style={{ margin:0, fontSize:13, color:'var(--cl-text-soft)' }}>Visitas externas · Plantões · Férias</p>
          </div>
        </div>
        <Space wrap>
          <Button
            danger
            icon={<DeleteOutlined />}
            loading={clearingAll}
            disabled={visitas.length === 0 && plantoes.length === 0 && ferias.length === 0 && tecnicos.length === 0}
            onClick={handleClearAll}
          >
            Excluir todos
          </Button>
          <Button icon={<UploadOutlined />} onClick={() => { setImportPreview(null); setImportFile(null); setImportOpen(true); }}>Importar planilha</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openForm(null, activeTab === 'plantoes' ? 'plantao' : activeTab === 'ferias' ? 'ferias' : 'visita')}>Novo registro</Button>
        </Space>
      </div>

      {/* Busca por técnico */}
      <div style={{ marginBottom:20 }}>
        <AutoComplete
          options={allTecNomes.map(n => ({ value: n }))}
          value={searchInput}
          onChange={v => { setSearchInput(v); if (!v) setSearchTec(''); }}
          onSelect={v => { setSearchInput(v); setSearchTec(v); }}
          filterOption={(v, o) => o.value.toLowerCase().includes(v.toLowerCase())}
          style={{ width:'100%', maxWidth:400 }}
        >
          <Input
            prefix={<SearchOutlined style={{ color:'var(--cl-text-soft)' }} />}
            suffix={searchTec ? <CloseCircleOutlined style={{ color:'var(--cl-text-soft)', cursor:'pointer' }} onClick={() => { setSearchInput(''); setSearchTec(''); }} /> : null}
            placeholder="Buscar por técnico e ver seus clientes..."
            onPressEnter={() => setSearchTec(searchInput)}
            style={{ borderRadius:8 }}
          />
        </AutoComplete>
      </div>

      {/* Painel de resultados da busca */}
      {searchResults && (
        <div style={{ marginBottom:20, background:'var(--cl-bg-soft)', border:'1px solid var(--cl-border)', borderRadius:12, padding:20 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
            <div style={{ fontWeight:700, fontSize:15, color:'var(--cl-text-hi)' }}>
              Resultados para: <span style={{ color:'#60a5fa' }}>{searchTec}</span>
            </div>
            <Space>
              <Tag style={{ borderRadius:20, background:'#3b82f622', color:'#3b82f6', border:'1px solid #3b82f644' }}>{searchResults.visitas.length} visitas</Tag>
              <Tag style={{ borderRadius:20, background:'#8b5cf622', color:'#8b5cf6', border:'1px solid #8b5cf644' }}>{searchResults.plantoes.length} plantões</Tag>
              <Tag style={{ borderRadius:20, background:'#10b98122', color:'#10b981', border:'1px solid #10b98144' }}>{searchResults.ferias.length} férias</Tag>
            </Space>
          </div>

          {searchResults.visitas.length > 0 && (
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:12, fontWeight:600, color:'var(--cl-text-soft)', marginBottom:8, textTransform:'uppercase', letterSpacing:'0.05em' }}>Clientes / Visitas</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                {searchResults.visitas.map(v => (
                  <div key={v.id} style={{ display:'flex', alignItems:'center', gap:8, background:'var(--cl-bg-input)', border:'1px solid var(--cl-border)', borderRadius:8, padding:'6px 12px' }}>
                    {v.data && <span style={{ fontSize:12, fontWeight:600, color:'var(--cl-text-soft)', whiteSpace:'nowrap' }}>{fmtData(v.data)}</span>}
                    <span style={{ fontWeight:600, fontSize:13, color:'var(--cl-text-hi)' }}>{v.cliente}</span>
                    <TipoBadge tipo={v.tipo} colorFn={tipoColor} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {searchResults.plantoes.length > 0 && (
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:12, fontWeight:600, color:'var(--cl-text-soft)', marginBottom:8, textTransform:'uppercase', letterSpacing:'0.05em' }}>Plantões</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                {searchResults.plantoes.map(p => (
                  <div key={p.id} style={{ display:'flex', alignItems:'center', gap:8, background:'var(--cl-bg-input)', border:'1px solid var(--cl-border)', borderRadius:8, padding:'6px 12px' }}>
                    <span style={{ fontSize:12, color:'var(--cl-text-soft)' }}>{p.data}</span>
                    <TipoBadge tipo={p.tipo} colorFn={t => PLANTAO_TIPO_COLORS[t] || '#6b7280'} />
                    <Tag style={{ borderRadius:20, fontSize:10, color:'var(--cl-text-soft)', borderColor:'var(--cl-border)' }}>{p.aba}</Tag>
                  </div>
                ))}
              </div>
            </div>
          )}

          {searchResults.ferias.length > 0 && (
            <div>
              <div style={{ fontSize:12, fontWeight:600, color:'var(--cl-text-soft)', marginBottom:8, textTransform:'uppercase', letterSpacing:'0.05em' }}>Férias / Licenças</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                {searchResults.ferias.map(f => (
                  <div key={f.id} style={{ display:'flex', alignItems:'center', gap:8, background:'var(--cl-bg-input)', border:'1px solid var(--cl-border)', borderRadius:8, padding:'6px 12px' }}>
                    <span style={{ fontWeight:600, fontSize:13, color:'var(--cl-text-hi)' }}>{f.colaborador}</span>
                    <span style={{ fontSize:12, color:'var(--cl-text-soft)' }}>{f.mes} · {f.periodo}</span>
                    <TipoBadge tipo={f.tipo} colorFn={t => FERIAS_TIPO_COLORS[t] || '#6b7280'} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {searchResults.visitas.length === 0 && searchResults.plantoes.length === 0 && searchResults.ferias.length === 0 && (
            <div style={{ color:'var(--cl-text-soft)', fontSize:13 }}>Nenhum registro encontrado para "{searchTec}".</div>
          )}
        </div>
      )}

      {/* Cards resumo */}
      <Row gutter={[14,14]} style={{ marginBottom:24 }}>
        {[
          { label:'Visitas externas',   value:visitas.length,  icon:<CarOutlined />,         color:'#3b82f6' },
          { label:'Plantões agendados', value:plantoes.length, icon:<CalendarOutlined />,    color:'#8b5cf6' },
          { label:'Férias / Licenças',  value:ferias.length,   icon:<ClockCircleOutlined />, color:'#10b981' },
          { label:'Técnicos ativos',    value:tecnicos.length, icon:<TeamOutlined />,        color:'#f59e0b' },
        ].map(c => <Col xs={12} sm={12} md={6} key={c.label}><SummaryCard {...c} /></Col>)}
      </Row>

      {/* Tabs */}
      <div style={{ background:'var(--cl-bg-soft)', borderRadius:12, border:'1px solid var(--cl-border)', padding:'0 20px 20px' }}>
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
      </div>

      {/* Modal form */}
      <Modal title={editing ? 'Editar registro' : 'Novo registro'} open={formOpen} onOk={handleSave} onCancel={() => setFormOpen(false)} okText={editing ? 'Salvar' : 'Adicionar'} cancelText="Cancelar" confirmLoading={saving} width={520} destroyOnClose>
        <Form form={form} layout="vertical" style={{ marginTop:8 }}>
          <RegistroForm tipoRegistro={tipoReg} onTipoChange={v => setTipoReg(v)} tecNomes={allTecNomes} />
        </Form>
      </Modal>

      {/* Modal import */}
      <Modal title="Importar planilha" open={importOpen} onOk={importPreview ? confirmImport : undefined} onCancel={() => setImportOpen(false)} okText="Confirmar importação" cancelText="Cancelar" okButtonProps={{ disabled:!importPreview }} confirmLoading={importing} width={560} destroyOnClose>
        <Dragger accept=".xlsx,.xls,.csv" beforeUpload={parseFile} showUploadList={false} style={{ marginBottom:16 }}>
          <p className="ant-upload-drag-icon"><InboxOutlined /></p>
          <p style={{ color:'var(--cl-text)', fontWeight:600, marginBottom:4 }}>{importFile ? importFile.name : 'Arraste o arquivo ou clique para selecionar'}</p>
          <p style={{ fontSize:12, color:'var(--cl-text-soft)' }}>Suporta .xlsx, .xls e .csv · Processado 100% no navegador</p>
        </Dragger>

        {importPreview && (
          <div>
            <Divider style={{ margin:'12px 0' }} />
            <div style={{ marginBottom:16 }}>
              <div style={{ fontWeight:600, fontSize:13, color:'var(--cl-text-hi)', marginBottom:10 }}>Dados encontrados</div>
              <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                {[
                  { label:'Visitas',  count:importPreview.visitas.length,  color:'#3b82f6' },
                  { label:'Plantões', count:importPreview.plantoes.length, color:'#8b5cf6' },
                  { label:'Férias',   count:importPreview.ferias.length,   color:'#10b981' },
                  { label:'Técnicos', count:importPreview.tecnicos.length, color:'#f59e0b' },
                ].map(({ label, count, color }) => (
                  <div key={label} style={{ background:color+'18', border:`1px solid ${color}33`, borderRadius:8, padding:'6px 14px', textAlign:'center' }}>
                    <div style={{ fontWeight:700, fontSize:18, color }}>{count}</div>
                    <div style={{ fontSize:11, color:'var(--cl-text-soft)' }}>{label}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop:8, fontSize:12, color:'var(--cl-text-soft)' }}>Abas: {importPreview.sheets.join(', ')}</div>
            </div>
            <div>
              <div style={{ fontWeight:600, fontSize:13, color:'var(--cl-text-hi)', marginBottom:8 }}>Como importar?</div>
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
