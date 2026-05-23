import { useState, useMemo } from 'react';
import {
  Button, Tabs, Table, Modal, Form, Input, Select, DatePicker,
  Space, Tag, Avatar, Tooltip, Upload, message, Row, Col, Divider, Radio,
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

// ─── Paletas ──────────────────────────────────────────────────────────────────
const TIPO_COLORS = {
  'SM Louveira':         '#3b82f6',
  'SM Honorato':         '#8b5cf6',
  'SM Ramos':            '#6366f1',
  'SM':                  '#60a5fa',
  'Atendimento externo': '#10b981',
  'Carro em uso':        '#f59e0b',
  'Implantação':         '#f97316',
  'Intersolid':          '#06b6d4',
  'Comercial':           '#84cc16',
};

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

// ─── Técnicos ─────────────────────────────────────────────────────────────────
const TECNICOS_CAMPO = [
  { nome: 'Alexandre',      equipe: 'Campo', modalidade: 'Presencial',  horario: '08:30 - 12:00 / 13:30 - 18:00' },
  { nome: 'Diego',          equipe: 'Campo', modalidade: 'Presencial',  horario: '08:30 - 12:00 / 13:30 - 18:00' },
  { nome: 'Marco Antunes',  equipe: 'Campo', modalidade: 'Presencial',  horario: '08:30 - 12:00 / 13:30 - 18:00' },
  { nome: 'Valdeir',        equipe: 'Campo', modalidade: 'Presencial',  horario: '08:30 - 12:00 / 13:30 - 18:00' },
  { nome: 'Romario',        equipe: 'Campo', modalidade: 'Presencial',  horario: '08:30 - 12:00 / 13:30 - 18:00' },
  { nome: 'Rodrigo Tsumura',equipe: 'Campo', modalidade: 'Presencial',  horario: '08:30 - 12:00 / 13:30 - 18:00' },
  { nome: 'Lucas',          equipe: 'Campo', modalidade: 'Presencial',  horario: '08:00 - 12:00 / 13:30 - 17:30' },
  { nome: 'Nayara',         equipe: 'Campo', modalidade: 'Presencial',  horario: '08:30 - 12:00 / 13:30 - 18:00' },
  { nome: 'João Marcos',    equipe: 'Campo', modalidade: 'Presencial',  horario: '08:30 - 12:00 / 13:30 - 18:00' },
  { nome: 'André',          equipe: 'Campo', modalidade: 'Presencial',  horario: '08:30 - 12:00 / 13:30 - 18:00' },
  { nome: 'Gabriela',       equipe: 'Campo', modalidade: 'Presencial',  horario: '08:30 - 12:00 / 13:30 - 18:00' },
  { nome: 'Luiz Fernando',  equipe: 'Campo', modalidade: 'Presencial',  horario: '08:30 - 12:00 / 13:30 - 18:00' },
  { nome: 'João Rodrigo',   equipe: 'Campo', modalidade: 'Presencial',  horario: '08:30 - 12:00 / 13:30 - 18:00' },
  { nome: 'Thainá',         equipe: 'Campo', modalidade: 'Presencial',  horario: '08:30 - 12:00 / 13:30 - 18:00' },
];

const TECNICOS_ERP = [
  { nome: 'Alexandre', equipe: 'ERP', modalidade: 'Presencial',  horario: '08:30 - 12:00 / 13:30 - 18:00' },
  { nome: 'Alison',    equipe: 'ERP', modalidade: 'Presencial',  horario: '08:30 - 12:00 / 13:30 - 18:00' },
  { nome: 'Beatriz A', equipe: 'ERP', modalidade: 'Home Office', horario: '08:30 - 12:00 / 13:30 - 18:00' },
  { nome: 'Beatriz V', equipe: 'ERP', modalidade: 'Home Office', horario: '08:30 - 12:00 / 13:30 - 18:00' },
  { nome: 'Camila B',  equipe: 'ERP', modalidade: 'Home Office', horario: '08:30 - 12:00 / 13:30 - 18:00' },
  { nome: 'Camila M',  equipe: 'ERP', modalidade: 'Home Office', horario: '07:30 - 12:00 / 14:00 - 17:30' },
  { nome: 'Caroline',  equipe: 'ERP', modalidade: 'Presencial',  horario: '08:30 - 12:00 / 13:30 - 18:00' },
  { nome: 'Cristiane', equipe: 'ERP', modalidade: 'Presencial',  horario: '08:30 - 12:00 / 13:30 - 18:00' },
  { nome: 'Giedre',    equipe: 'ERP', modalidade: 'Home Office', horario: '07:00 - 12:00 / 14:00 - 17:00' },
  { nome: 'Janaína',   equipe: 'ERP', modalidade: 'Presencial',  horario: '08:30 - 12:00 / 13:30 - 18:00' },
  { nome: 'Igor',      equipe: 'ERP', modalidade: 'Presencial',  horario: '08:30 - 12:00 / 13:30 - 18:00' },
  { nome: 'João Alves',equipe: 'ERP', modalidade: 'Presencial',  horario: '08:30 - 12:00 / 13:30 - 18:00' },
  { nome: 'Manoel',    equipe: 'ERP', modalidade: 'Presencial',  horario: '08:30 - 12:00 / 13:30 - 18:00' },
  { nome: 'Matheus',   equipe: 'ERP', modalidade: 'Presencial',  horario: '08:30 - 12:00 / 13:30 - 18:00' },
  { nome: 'Marcos',    equipe: 'ERP', modalidade: 'Presencial',  horario: '08:30 - 12:00 / 13:30 - 18:00' },
  { nome: 'Matias',    equipe: 'ERP', modalidade: 'Presencial',  horario: '08:30 - 12:00 / 13:30 - 18:00' },
  { nome: 'Natiele',   equipe: 'ERP', modalidade: 'Presencial',  horario: '08:30 - 12:00 / 13:30 - 18:00' },
  { nome: 'Taís',      equipe: 'ERP', modalidade: 'Presencial',  horario: '08:30 - 12:00 / 13:30 - 18:00' },
  { nome: 'Vinícius',  equipe: 'ERP', modalidade: 'Presencial',  horario: '08:30 - 12:00 / 13:30 - 18:00' },
];

const ALL_NOMES = [...new Set([...TECNICOS_CAMPO, ...TECNICOS_ERP].map(t => t.nome))].sort();

// ─── Dados iniciais ───────────────────────────────────────────────────────────
const INITIAL_VISITAS = [
  { id: '1',  cliente: 'Autocom',              tecnico: 'Rodrigo Tsumura', tipo: 'Atendimento externo' },
  { id: '2',  cliente: 'SM Louveira',          tecnico: 'Marco Antunes',   tipo: 'SM Louveira' },
  { id: '3',  cliente: 'SM Louveira',          tecnico: 'Igor',            tipo: 'SM Louveira' },
  { id: '4',  cliente: 'SM Louveira',          tecnico: 'João Rodrigo',    tipo: 'SM Louveira' },
  { id: '5',  cliente: 'SM Louveira',          tecnico: 'Rogério',         tipo: 'SM Louveira' },
  { id: '6',  cliente: 'SM Louveira',          tecnico: 'Romario',         tipo: 'SM Louveira' },
  { id: '7',  cliente: 'SM Louveira',          tecnico: 'Murilo',          tipo: 'SM Louveira' },
  { id: '8',  cliente: 'SM Louveira',          tecnico: 'André',           tipo: 'SM Louveira' },
  { id: '9',  cliente: 'SM Honorato',          tecnico: 'Daniela',         tipo: 'SM Honorato' },
  { id: '10', cliente: 'SM Honorato',          tecnico: 'Luiz Fernando',   tipo: 'SM Honorato' },
  { id: '11', cliente: 'SM Ramos Pernambuco',  tecnico: 'A DEFINIR',       tipo: 'SM Ramos' },
  { id: '12', cliente: 'SM Leve - Goiânia',    tecnico: 'Daniela',         tipo: 'Atendimento externo' },
  { id: '13', cliente: 'SM Leve - Goiânia',    tecnico: 'Diego',           tipo: 'Atendimento externo' },
  { id: '14', cliente: 'Lemon - SP',           tecnico: 'Luiz Fernando',   tipo: 'Atendimento externo' },
  { id: '15', cliente: 'Alcindas - SP',        tecnico: 'Luiz Fernando',   tipo: 'Atendimento externo' },
  { id: '16', cliente: 'Ulian',               tecnico: 'Igor',            tipo: 'Atendimento externo' },
  { id: '17', cliente: 'Ulian',               tecnico: 'Luiz Fernando',   tipo: 'Atendimento externo' },
  { id: '18', cliente: 'Ulian',               tecnico: 'Diego',           tipo: 'Atendimento externo' },
  { id: '19', cliente: 'SM Rocha',            tecnico: 'Igor',            tipo: 'SM' },
  { id: '20', cliente: 'Intersolid',          tecnico: 'Suporte',         tipo: 'Intersolid' },
  { id: '21', cliente: 'Louveira / Marcão',   tecnico: 'Rodrigo Tsumura', tipo: 'Carro em uso' },
  { id: '22', cliente: 'Honorato / Luiz',     tecnico: 'Luiz Fernando',   tipo: 'Carro em uso' },
  { id: '23', cliente: 'José e André (Bauru)',tecnico: 'André',           tipo: 'Carro em uso' },
  { id: '24', cliente: 'Luiz Ulian',          tecnico: 'Luiz Fernando',   tipo: 'Carro em uso' },
  { id: '25', cliente: 'André Louveira',      tecnico: 'André',           tipo: 'Carro em uso' },
];

const INITIAL_FERIAS = [
  { id: 'f1',  colaborador: 'Izabela',          mes: 'Janeiro',   periodo: '05/01/2026 a 23/01/2026', tipo: 'Férias', equipe: 'Desenvolvimento' },
  { id: 'f2',  colaborador: 'Lucas',             mes: 'Janeiro',   periodo: '12/01/2026 a 30/01/2026', tipo: 'Férias', equipe: 'Campo' },
  { id: 'f3',  colaborador: 'Mariana',           mes: 'Fevereiro', periodo: '02/02/2026 a 20/02/2026', tipo: 'Férias', equipe: 'Desenvolvimento' },
  { id: 'f4',  colaborador: 'Jaqueline Mamone',  mes: 'Fevereiro', periodo: '09/02/2026 a 27/02/2026', tipo: 'Férias', equipe: 'Desenvolvimento' },
  { id: 'f5',  colaborador: 'Gabriel',           mes: 'Março',     periodo: '09/03/2026 a 27/03/2026', tipo: 'Férias', equipe: 'Desenvolvimento' },
  { id: 'f6',  colaborador: 'Daiane',            mes: 'Março',     periodo: '16/03/2026 a 30/03/2026', tipo: 'Férias', equipe: 'Suporte' },
  { id: 'f7',  colaborador: 'Claudio',           mes: 'Abril',     periodo: '06/04/2026 a 24/04/2026', tipo: 'Férias', equipe: 'ERP' },
  { id: 'f8',  colaborador: 'Fernanda',          mes: 'Abril',     periodo: '13/04/2026 a 01/05/2026', tipo: 'Férias', equipe: 'Desenvolvimento' },
  { id: 'f9',  colaborador: 'Monaliza',          mes: 'Maio',      periodo: '04/05/2026 a 22/05/2026', tipo: 'Férias', equipe: 'Suporte' },
  { id: 'f10', colaborador: 'Igor',              mes: 'Maio',      periodo: '11/05/2026 a 29/05/2026', tipo: 'Férias', equipe: 'ERP' },
  { id: 'f11', colaborador: 'Camila B',          mes: 'Junho',     periodo: '01/06/2026 a 19/06/2026', tipo: 'Férias', equipe: 'ERP' },
  { id: 'f12', colaborador: 'Beatriz A',         mes: 'Junho',     periodo: '08/06/2026 a 26/06/2026', tipo: 'Férias', equipe: 'ERP' },
  { id: 'f13', colaborador: 'Alison',            mes: 'Julho',     periodo: '06/07/2026 a 24/07/2026', tipo: 'Férias', equipe: 'ERP' },
  { id: 'f14', colaborador: 'Matheus',           mes: 'Julho',     periodo: '13/07/2026 a 31/07/2026', tipo: 'Férias', equipe: 'ERP' },
  { id: 'f15', colaborador: 'Vinícius',          mes: 'Agosto',    periodo: '03/08/2026 a 21/08/2026', tipo: 'Férias', equipe: 'ERP' },
  { id: 'f16', colaborador: 'Natiele',           mes: 'Agosto',    periodo: '10/08/2026 a 28/08/2026', tipo: 'Férias', equipe: 'ERP' },
  { id: 'f17', colaborador: 'Taís',              mes: 'Setembro',  periodo: '07/09/2026 a 25/09/2026', tipo: 'Férias', equipe: 'ERP' },
  { id: 'f18', colaborador: 'Cristiane',         mes: 'Setembro',  periodo: '14/09/2026 a 02/10/2026', tipo: 'Férias', equipe: 'ERP' },
  { id: 'f19', colaborador: 'Camila M',          mes: 'Outubro',   periodo: '05/10/2026 a 23/10/2026', tipo: 'Férias', equipe: 'ERP' },
  { id: 'f20', colaborador: 'Giedre',            mes: 'Outubro',   periodo: '12/10/2026 a 30/10/2026', tipo: 'Férias', equipe: 'ERP' },
  { id: 'f21', colaborador: 'Janaína',           mes: 'Novembro',  periodo: '02/11/2026 a 20/11/2026', tipo: 'Férias', equipe: 'ERP' },
  { id: 'f22', colaborador: 'Caroline',          mes: 'Novembro',  periodo: '09/11/2026 a 27/11/2026', tipo: 'Férias', equipe: 'ERP' },
  { id: 'f23', colaborador: 'Manoel',            mes: 'Dezembro',  periodo: '07/12/2026 a 25/12/2026', tipo: 'Férias', equipe: 'ERP' },
];

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
  return serial != null ? String(serial) : '';
}

const FIELD_ALIASES = {
  data:        ['data', 'date', 'dt', 'dia'],
  tecnico:     ['tecnico', 'responsavel', 'tech'],
  cliente:     ['cliente', 'local', 'empresa', 'company'],
  tipo:        ['tipo', 'servico', 'type', 'atividade'],
  obs:         ['observacoes', 'obs', 'notas'],
  colaborador: ['colaborador', 'nome', 'funcionario'],
  periodo:     ['periodo', 'datas'],
  mes:         ['mes', 'month'],
  equipe:      ['equipe', 'time', 'setor'],
  aba:         ['aba', 'tab', 'folha'],
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

function TipoBadge({ tipo, colors }) {
  const color = colors[tipo] || '#6b7280';
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

// ─── Formulário dinâmico ──────────────────────────────────────────────────────
function RegistroForm({ form, tipoRegistro, onTipoChange }) {
  const nomeOptions = ALL_NOMES.map(n => ({ value: n }));

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
            <Select placeholder="Selecione...">
              {Object.keys(TIPO_COLORS).map(t => <Option key={t} value={t}>{t}</Option>)}
            </Select>
          </Form.Item>
          <Form.Item label="Cliente / Local" name="cliente" rules={[{ required: true }]}>
            <Input placeholder="Nome do cliente ou local" />
          </Form.Item>
          <Form.Item label="Técnico responsável" name="tecnico" rules={[{ required: true }]}>
            <Select showSearch placeholder="Nome do técnico" allowClear filterOption={(v, o) => o.value.toLowerCase().includes(v.toLowerCase())}>
              {ALL_NOMES.map(n => <Option key={n} value={n}>{n}</Option>)}
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
            <Select showSearch placeholder="Nome do técnico" allowClear filterOption={(v, o) => o.value.toLowerCase().includes(v.toLowerCase())}>
              {ALL_NOMES.map(n => <Option key={n} value={n}>{n}</Option>)}
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
            <Select showSearch placeholder="Nome do colaborador" allowClear filterOption={(v, o) => o.value.toLowerCase().includes(v.toLowerCase())}>
              {ALL_NOMES.map(n => <Option key={n} value={n}>{n}</Option>)}
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

// ─── Componente principal ──────────────────────────────────────────────────────
export default function AgendaTecnica() {
  const [visitas, setVisitas] = useState(INITIAL_VISITAS);
  const [plantoes, setPlantoes] = useState([]);
  const [ferias, setFerias] = useState(INITIAL_FERIAS);
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
  const [importMode, setImportMode] = useState('add');
  const [importing, setImporting] = useState(false);

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

  function handleDelete(id, dataset, setDataset) {
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
      if (editing) {
        setVisitas(p => p.map(r => r.id === editing.id ? { ...base, id: editing.id } : r));
      } else {
        setVisitas(p => [...p, { ...base, id: makeId() }]);
      }
    } else if (tr === 'plantao') {
      if (editing) {
        setPlantoes(p => p.map(r => r.id === editing.id ? { ...base, id: editing.id } : r));
      } else {
        setPlantoes(p => [...p, { ...base, id: makeId() }]);
      }
    } else {
      if (editing) {
        setFerias(p => p.map(r => r.id === editing.id ? { ...base, id: editing.id } : r));
      } else {
        setFerias(p => [...p, { ...base, id: makeId() }]);
      }
    }
    setSaving(false);
    setFormOpen(false);
    message.success(editing ? 'Registro atualizado.' : 'Registro adicionado.');
  }

  // ─── Import xlsx ───────────────────────────────────────────────────────────
  async function parseFile(file) {
    setImportFile(file);
    setImportPreview(null);
    try {
      const xlsx = (await import('xlsx')).default;
      const buffer = await file.arrayBuffer();
      const wb = xlsx.read(buffer, { type: 'array' });
      const preview = { sheets: wb.SheetNames, visitas: [], plantoes: [], ferias: [] };

      wb.SheetNames.forEach(sheetName => {
        const ws = wb.Sheets[sheetName];
        const raw = xlsx.utils.sheet_to_json(ws, { header: 1, defval: '' });
        if (raw.length < 2) return;
        const headers = raw[0].map(String);
        const mapped = mapHeaders(headers);
        const rows = raw.slice(1).filter(r => r.some(c => c !== ''));

        const nameL = normalizeKey(sheetName);

        rows.forEach(row => {
          const obj = {};
          mapped.forEach((field, i) => { if (field) obj[field] = excelDateSerial(row[i]); });

          if (nameL.includes('ferias') || nameL.includes('férias') || nameL.includes('licenca')) {
            if (obj.colaborador || obj.nome) {
              preview.ferias.push({ id: makeId(), colaborador: obj.colaborador || obj.nome || '', mes: obj.mes || '', periodo: obj.periodo || '', tipo: obj.tipo || 'Férias', equipe: obj.equipe || 'ERP', tipoRegistro: 'ferias' });
            }
          } else if (nameL.includes('plantao') || nameL.includes('plantão') || nameL.includes('agenda') || nameL.includes('escala')) {
            if (obj.tecnico || obj.data) {
              preview.plantoes.push({ id: makeId(), data: obj.data || '', tecnico: obj.tecnico || '', tipo: obj.tipo || 'Plantão', aba: obj.aba || sheetName, tipoRegistro: 'plantao' });
            }
          } else {
            if (obj.cliente || obj.tecnico) {
              preview.visitas.push({ id: makeId(), cliente: obj.cliente || '', tecnico: obj.tecnico || '', tipo: obj.tipo || 'Atendimento externo', data: obj.data || '', obs: obj.obs || '', tipoRegistro: 'visita' });
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
    const { visitas: v, plantoes: p, ferias: f } = importPreview;
    const total = v.length + p.length + f.length;

    if (importMode === 'replace') {
      if (v.length) setVisitas(v);
      if (p.length) setPlantoes(p);
      if (f.length) setFerias(f);
    } else {
      if (v.length) setVisitas(prev => [...prev, ...v]);
      if (p.length) setPlantoes(prev => [...prev, ...p]);
      if (f.length) setFerias(prev => [...prev, ...f]);
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
    {
      title: 'Técnico', dataIndex: 'tecnico',
      render: v => <TecnicoCell nome={v} />,
    },
    {
      title: 'Tipo', dataIndex: 'tipo',
      render: v => <TipoBadge tipo={v} colors={TIPO_COLORS} />,
      filters: Object.keys(TIPO_COLORS).map(t => ({ text: t, value: t })),
      onFilter: (value, record) => record.tipo === value,
    },
    {
      title: 'Data', dataIndex: 'data',
      render: v => v ? <span style={{ color: 'var(--cl-text-soft)', fontSize: 12 }}>{dayjs(v).isValid() ? dayjs(v).format('DD/MM/YYYY') : v}</span> : '—',
      width: 100,
    },
    {
      title: '', key: 'acoes', width: 72, align: 'right',
      render: (_, r) => (
        <AcoesCell
          onEdit={() => openForm({ ...r, tipoRegistro: 'visita' }, 'visita')}
          onDelete={() => handleDelete(r.id, visitas, setVisitas)}
        />
      ),
    },
  ];

  const colsPlantoes = [
    {
      title: 'Data', dataIndex: 'data',
      render: v => v ? <span style={{ color: 'var(--cl-text)', fontSize: 13 }}>{dayjs(v).isValid() ? dayjs(v).format('DD/MM/YYYY') : v}</span> : '—',
      width: 110,
    },
    { title: 'Técnico', dataIndex: 'tecnico', render: v => <TecnicoCell nome={v} /> },
    { title: 'Tipo', dataIndex: 'tipo', render: v => <TipoBadge tipo={v} colors={PLANTAO_TIPO_COLORS} /> },
    {
      title: 'Aba', dataIndex: 'aba',
      render: v => <Tag style={{ borderRadius: 20, fontSize: 11, color: 'var(--cl-text-soft)', borderColor: 'var(--cl-border)' }}>{v}</Tag>,
    },
    {
      title: '', key: 'acoes', width: 72, align: 'right',
      render: (_, r) => (
        <AcoesCell
          onEdit={() => openForm({ ...r, tipoRegistro: 'plantao' }, 'plantao')}
          onDelete={() => handleDelete(r.id, plantoes, setPlantoes)}
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
    { title: 'Tipo', dataIndex: 'tipo', render: v => <TipoBadge tipo={v} colors={FERIAS_TIPO_COLORS} /> },
    {
      title: 'Equipe', dataIndex: 'equipe',
      render: v => {
        const color = EQUIPE_COLORS[v] || '#6b7280';
        return <Tag style={{ background: color + '22', color, border: `1px solid ${color}44`, borderRadius: 20, fontSize: 11 }}>{v}</Tag>;
      },
    },
    {
      title: '', key: 'acoes', width: 72, align: 'right',
      render: (_, r) => (
        <AcoesCell
          onEdit={() => openForm({ ...r, tipoRegistro: 'ferias' }, 'ferias')}
          onDelete={() => handleDelete(r.id, ferias, setFerias)}
        />
      ),
    },
  ];

  // ─── Itens das tabs ────────────────────────────────────────────────────────
  const tabItems = [
    {
      key: 'visitas',
      label: (
        <span>Visitas externas <Tag style={{ marginLeft: 4, borderRadius: 20, fontSize: 11, padding: '0 6px' }}>{visitas.length}</Tag></span>
      ),
      children: (
        <div>
          {/* Filtros */}
          <div className="filter-bar" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
            <Select
              allowClear placeholder="Técnico" style={{ minWidth: 160 }}
              value={fVisitaTecnico || undefined}
              onChange={v => setFVisitaTecnico(v || '')}
              showSearch
            >
              {[...new Set(visitas.map(v => v.tecnico))].sort().map(t => <Option key={t} value={t}>{t}</Option>)}
            </Select>
            <Select
              allowClear placeholder="Tipo de serviço" style={{ minWidth: 180 }}
              value={fVisitaTipo || undefined}
              onChange={v => setFVisitaTipo(v || '')}
            >
              {Object.keys(TIPO_COLORS).map(t => <Option key={t} value={t}>{t}</Option>)}
            </Select>
            <Button
              style={{ marginLeft: 'auto' }}
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
            <Table
              dataSource={visitasFiltradas}
              columns={colsVisitas}
              rowKey="id"
              size="small"
              pagination={{ pageSize: 15, showSizeChanger: false }}
              locale={{ emptyText: <Empty description="Nenhuma visita encontrada" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
              footer={() => (
                <span style={{ fontSize: 12, color: 'var(--cl-text-soft)' }}>
                  {visitasFiltradas.length} registro{visitasFiltradas.length !== 1 ? 's' : ''}
                </span>
              )}
            />
          </div>
        </div>
      ),
    },
    {
      key: 'plantoes',
      label: (
        <span>Plantões <Tag style={{ marginLeft: 4, borderRadius: 20, fontSize: 11, padding: '0 6px' }}>{plantoes.length}</Tag></span>
      ),
      children: (
        <div>
          <div className="filter-bar" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
            <Select
              allowClear placeholder="Aba de origem" style={{ minWidth: 160 }}
              value={fPlanAba || undefined}
              onChange={v => setFPlanAba(v || '')}
            >
              <Option value="Plantão Frente">Plantão Frente</Option>
              <Option value="Plantão ERP">Plantão ERP</Option>
              <Option value="Nova Agenda">Nova Agenda</Option>
            </Select>
            <Select
              allowClear placeholder="Técnico" style={{ minWidth: 160 }}
              value={fPlanTecnico || undefined}
              onChange={v => setFPlanTecnico(v || '')}
              showSearch
            >
              {[...new Set(plantoes.map(p => p.tecnico))].sort().map(t => <Option key={t} value={t}>{t}</Option>)}
            </Select>
          </div>

          <div className="page-table-wrap">
            <Table
              dataSource={plantoesFilterados}
              columns={colsPlantoes}
              rowKey="id"
              size="small"
              pagination={{ pageSize: 15, showSizeChanger: false }}
              locale={{ emptyText: <Empty description="Nenhum plantão registrado. Importe uma planilha ou adicione manualmente." image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
              footer={() => (
                <span style={{ fontSize: 12, color: 'var(--cl-text-soft)' }}>
                  {plantoesFilterados.length} registro{plantoesFilterados.length !== 1 ? 's' : ''}
                </span>
              )}
            />
          </div>
        </div>
      ),
    },
    {
      key: 'ferias',
      label: (
        <span>Férias / Licenças <Tag style={{ marginLeft: 4, borderRadius: 20, fontSize: 11, padding: '0 6px' }}>{ferias.length}</Tag></span>
      ),
      children: (
        <div>
          <div className="filter-bar" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
            <Input.Search
              placeholder="Colaborador..." allowClear style={{ maxWidth: 220 }}
              value={fFeriasColaborador}
              onChange={e => setFFeriasColaborador(e.target.value)}
            />
            <Select
              allowClear placeholder="Tipo" style={{ minWidth: 180 }}
              value={fFeriasTipo || undefined}
              onChange={v => setFFeriasTipo(v || '')}
            >
              {Object.keys(FERIAS_TIPO_COLORS).map(t => <Option key={t} value={t}>{t}</Option>)}
            </Select>
          </div>

          <div className="page-table-wrap">
            <Table
              dataSource={feriasFiltradas}
              columns={colsFerias}
              rowKey="id"
              size="small"
              pagination={{ pageSize: 15, showSizeChanger: false }}
              locale={{ emptyText: <Empty description="Nenhum registro de férias ou licença" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
              footer={() => (
                <span style={{ fontSize: 12, color: 'var(--cl-text-soft)' }}>
                  {feriasFiltradas.length} registro{feriasFiltradas.length !== 1 ? 's' : ''}
                </span>
              )}
            />
          </div>
        </div>
      ),
    },
    {
      key: 'tecnicos',
      label: 'Técnicos',
      children: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          {/* Campo */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <CarOutlined style={{ color: '#3b82f6', fontSize: 16 }} />
              <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--cl-text-hi)' }}>Equipe de Campo</span>
              <Tag style={{ borderRadius: 20, background: '#3b82f622', color: '#3b82f6', border: '1px solid #3b82f644', fontSize: 11 }}>
                {TECNICOS_CAMPO.length} técnicos
              </Tag>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
              {TECNICOS_CAMPO.map(t => (
                <TecCard key={t.nome + t.equipe} tec={t} color="#3b82f6" />
              ))}
            </div>
          </div>

          <Divider style={{ margin: 0 }} />

          {/* ERP */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <LaptopOutlined style={{ color: '#f59e0b', fontSize: 16 }} />
              <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--cl-text-hi)' }}>Equipe ERP / Suporte</span>
              <Tag style={{ borderRadius: 20, background: '#f59e0b22', color: '#f59e0b', border: '1px solid #f59e0b44', fontSize: 11 }}>
                {TECNICOS_ERP.length} técnicos
              </Tag>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
              {TECNICOS_ERP.map(t => (
                <TecCard key={t.nome + t.equipe} tec={t} color="#f59e0b" />
              ))}
            </div>
          </div>

          <Divider style={{ margin: 0 }} />

          {/* Horários */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <ClockCircleOutlined style={{ color: '#10b981', fontSize: 16 }} />
              <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--cl-text-hi)' }}>Horários</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 10 }}>
              {[...TECNICOS_CAMPO, ...TECNICOS_ERP]
                .filter((t, i, a) => a.findIndex(x => x.nome === t.nome && x.equipe === t.equipe) === i)
                .map(t => (
                  <div key={t.nome + t.equipe} style={{
                    background: 'var(--cl-bg-soft)', border: '1px solid var(--cl-border)',
                    borderRadius: 10, padding: '10px 14px',
                    display: 'flex', flexDirection: 'column', gap: 4,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--cl-text-hi)' }}>{t.nome}</span>
                      <Tag style={{
                        borderRadius: 20, fontSize: 10, padding: '0 6px',
                        background: t.modalidade === 'Home Office' ? '#8b5cf622' : '#3b82f622',
                        color: t.modalidade === 'Home Office' ? '#8b5cf6' : '#3b82f6',
                        border: `1px solid ${t.modalidade === 'Home Office' ? '#8b5cf644' : '#3b82f644'}`,
                      }}>
                        {t.modalidade === 'Home Office' ? <><HomeOutlined /> HO</> : 'Presencial'}
                      </Tag>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--cl-text-soft)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <ClockCircleOutlined /> {t.horario}
                    </div>
                  </div>
                ))}
            </div>
          </div>
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
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openForm(null, activeTab === 'plantoes' ? 'plantao' : activeTab === 'ferias' ? 'ferias' : 'visita')}>
            Novo registro
          </Button>
        </Space>
      </div>

      {/* Cards de resumo */}
      <Row gutter={[14, 14]} style={{ marginBottom: 24 }}>
        {[
          { label: 'Visitas externas',   value: visitas.length,                             icon: <CarOutlined />,         color: '#3b82f6' },
          { label: 'Plantões agendados', value: plantoes.length,                            icon: <CalendarOutlined />,    color: '#8b5cf6' },
          { label: 'Férias / Licenças',  value: ferias.length,                              icon: <ClockCircleOutlined />, color: '#10b981' },
          { label: 'Técnicos ativos',    value: TECNICOS_CAMPO.length + TECNICOS_ERP.length, icon: <TeamOutlined />,        color: '#f59e0b' },
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
        open={formOpen}
        onOk={handleSave}
        onCancel={() => setFormOpen(false)}
        okText={editing ? 'Salvar' : 'Adicionar'}
        cancelText="Cancelar"
        confirmLoading={saving}
        width={520}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 8 }}>
          <RegistroForm form={form} tipoRegistro={tipoRegistro} onTipoChange={v => { setTipoRegistro(v); }} />
        </Form>
      </Modal>

      {/* Modal import */}
      <Modal
        title="Importar planilha"
        open={importOpen}
        onOk={importPreview ? confirmImport : undefined}
        onCancel={() => setImportOpen(false)}
        okText="Confirmar importação"
        cancelText="Cancelar"
        okButtonProps={{ disabled: !importPreview }}
        confirmLoading={importing}
        width={560}
        destroyOnClose
      >
        <Dragger
          accept=".xlsx,.xls,.csv"
          beforeUpload={parseFile}
          showUploadList={false}
          style={{ marginBottom: 16 }}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
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
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--cl-text-hi)', marginBottom: 8 }}>
                Dados encontrados
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {[
                  { label: 'Visitas',  count: importPreview.visitas.length,  color: '#3b82f6' },
                  { label: 'Plantões', count: importPreview.plantoes.length, color: '#8b5cf6' },
                  { label: 'Férias',   count: importPreview.ferias.length,   color: '#10b981' },
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
                Abas: {importPreview.sheets.join(', ')}
              </div>
            </div>

            <div>
              <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--cl-text-hi)', marginBottom: 8 }}>
                Como importar?
              </div>
              <Radio.Group value={importMode} onChange={e => setImportMode(e.target.value)}>
                <Space direction="vertical">
                  <Radio value="add">Adicionar aos dados existentes</Radio>
                  <Radio value="replace">Substituir dados atuais</Radio>
                </Space>
              </Radio.Group>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ─── Card de técnico ──────────────────────────────────────────────────────────
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
