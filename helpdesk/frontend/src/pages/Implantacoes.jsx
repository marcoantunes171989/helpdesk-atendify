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
  SearchOutlined, CheckOutlined, RightOutlined,
} from '@ant-design/icons';
import { implantacaoService, companyService, userService, technicianService, employeeService, etapaTreinamentoService } from '../services/api';
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

function gerarATAImplantacao(imp, allEmployees = [], etapasTemplate = []) {
  const fmt = d => d ? new Date(d).toLocaleDateString('pt-BR') : '—';

  const statusStyle = {
    PENDENTE:     { bg: '#fff8e1', color: '#b45309', border: '#f59e0b', label: 'Pendente' },
    EM_ANDAMENTO: { bg: '#eff6ff', color: '#1d4ed8', border: '#3b82f6', label: 'Em Andamento' },
    CONCLUIDO:    { bg: '#f0fdf4', color: '#15803d', border: '#22c55e', label: 'Concluído' },
  };
  const statusBadge = s => {
    const st = statusStyle[s] || statusStyle.PENDENTE;
    return `<span style="display:inline-block;padding:2px 10px;border-radius:12px;font-size:10px;font-weight:700;background:${st.bg};color:${st.color};border:1px solid ${st.border};letter-spacing:.3px">${st.label}</span>`;
  };
  const statusLabel = s => ({ PENDENTE: 'Pendente', EM_ANDAMENTO: 'Em Andamento', PAUSADO: 'Pausado', CONCLUIDO: 'Concluído', CANCELADO: 'Cancelado' }[s] || s);

  const fases = imp.fases || [];

  // Enrich each fase with resolved etapa/module metadata
  const fasesWithMeta = fases.map(f => {
    const etapa = f.etapaTreinamentoId ? etapasTemplate.find(e => e.id === f.etapaTreinamentoId) : null;
    return {
      ...f,
      etapa,
      moduloId:    etapa?.modulo?.id    ?? null,
      moduloName:  etapa?.modulo?.name  ?? null,
      moduloOrder: etapa?.modulo?.order ?? 9999,
      etapaOrder:  etapa?.order         ?? f.order ?? 9999,
    };
  });

  // Collect unique employees
  const empMap = {};
  fases.forEach(f => {
    (f.employeeIds || []).forEach(eid => {
      if (!empMap[eid]) {
        const found = allEmployees.find(e => e.id === eid);
        empMap[eid] = found || { id: eid, name: eid, position: '' };
      }
    });
  });
  const employees = Object.values(empMap).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  const unassigned = fasesWithMeta.filter(f => !f.employeeIds || f.employeeIds.length === 0);

  const totalFases = fases.length;
  const totalConcluidas = fases.filter(f => f.status === 'CONCLUIDO').length;
  const progPct = totalFases ? Math.round((totalConcluidas / totalFases) * 100) : 0;
  const progColor = progPct === 100 ? '#22c55e' : progPct >= 50 ? '#2563eb' : '#f59e0b';
  const progTextColor = progPct === 100 ? '#15803d' : '#1e3a5f';

  const infoRow = (label, value) =>
    `<tr><td style="padding:9px 16px;border:1px solid #e2e8f0;font-weight:600;background:#f8fafc;width:33%;font-size:11px;color:#475569;text-transform:uppercase;letter-spacing:.5px">${label}</td><td style="padding:9px 16px;border:1px solid #e2e8f0;font-size:13px;color:#1e293b">${value}</td></tr>`;

  // Build grouped module sections for a list of fases
  function buildModuleSections(empFases) {
    const moduleMap = new Map();
    empFases.forEach(f => {
      const key = f.moduloId || '__none__';
      if (!moduleMap.has(key)) {
        moduleMap.set(key, { name: f.moduloName, order: f.moduloOrder, fases: [] });
      }
      moduleMap.get(key).fases.push(f);
    });

    const modules = [...moduleMap.values()].sort((a, b) =>
      (a.order - b.order) || (a.name || '').localeCompare(b.name || '', 'pt-BR')
    );
    modules.forEach(m => m.fases.sort((a, b) => a.etapaOrder - b.etapaOrder));

    let seq = 0;
    return modules.map(mod => {
      const modDone = mod.fases.filter(f => f.status === 'CONCLUIDO').length;
      const modPct  = mod.fases.length ? Math.round((modDone / mod.fases.length) * 100) : 0;
      const modColor = modPct === 100 ? '#22c55e' : modPct >= 50 ? '#60a5fa' : '#fbbf24';

      const rows = mod.fases.map(f => {
        seq++;
        const bg = seq % 2 === 0 ? '#f8fafc' : '#ffffff';
        return `<tr style="background:${bg}">
          <td style="padding:8px 12px;border:1px solid #e8edf2;font-size:11px;text-align:center;width:34px;font-weight:700;color:#94a3b8">${seq}</td>
          <td style="padding:8px 12px;border:1px solid #e8edf2;font-size:13px;color:#1e293b;font-weight:500">${f.title}</td>
          <td style="padding:8px 12px;border:1px solid #e8edf2;text-align:center;width:128px">${statusBadge(f.status)}</td>
        </tr>`;
      }).join('');

      const modHeader = mod.name
        ? `<div style="background:#334155;color:#fff;padding:8px 14px;display:flex;align-items:center;justify-content:space-between">
             <div style="display:flex;align-items:center;gap:10px">
               <span style="background:rgba(255,255,255,0.12);padding:2px 8px;border-radius:4px;font-size:9px;letter-spacing:.8px;font-weight:700">MÓDULO</span>
               <span style="font-size:12px;font-weight:700;letter-spacing:.2px">${mod.name}</span>
             </div>
             <div style="display:flex;align-items:center;gap:10px">
               <div style="width:80px;height:5px;background:rgba(255,255,255,0.2);border-radius:3px;overflow:hidden">
                 <div style="height:100%;width:${modPct}%;background:${modColor};border-radius:3px"></div>
               </div>
               <span style="font-size:10px;opacity:.75;white-space:nowrap">${modDone}/${mod.fases.length} · ${modPct}%</span>
             </div>
           </div>`
        : `<div style="background:#475569;color:#fff;padding:8px 14px;font-size:11px;font-weight:600;letter-spacing:.3px;font-style:italic">Etapas sem módulo vinculado</div>`;

      return `
        <div style="margin-bottom:14px;border-radius:5px;overflow:hidden;border:1px solid #e2e8f0">
          ${modHeader}
          <table style="width:100%;border-collapse:collapse">
            <thead><tr style="background:#f1f5f9">
              <th style="padding:6px 12px;border:1px solid #e8edf2;font-size:9px;text-align:center;color:#94a3b8;width:34px;letter-spacing:.5px">#</th>
              <th style="padding:6px 12px;border:1px solid #e8edf2;font-size:9px;text-align:left;color:#94a3b8;letter-spacing:.5px">ETAPA / TELA</th>
              <th style="padding:6px 12px;border:1px solid #e8edf2;font-size:9px;text-align:center;color:#94a3b8;width:128px;letter-spacing:.5px">STATUS</th>
            </tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>`;
    }).join('');
  }

  // Employee sections
  const empSections = employees.map(emp => {
    const empFases = fasesWithMeta.filter(f => (f.employeeIds || []).includes(emp.id));
    const done = empFases.filter(f => f.status === 'CONCLUIDO').length;
    const pct  = empFases.length ? Math.round((done / empFases.length) * 100) : 0;
    const barC = pct === 100 ? '#4ade80' : '#93c5fd';
    const pctC = pct === 100 ? '#4ade80' : '#93c5fd';

    return `
      <div style="margin-bottom:28px;border:1px solid #d1dae6;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(30,58,95,.06)">
        <div style="background:linear-gradient(135deg,#1e3a5f 0%,#1e4a80 100%);color:#fff;padding:14px 20px;display:flex;align-items:center;justify-content:space-between">
          <div style="display:flex;align-items:center;gap:14px">
            <div style="width:40px;height:40px;background:rgba(255,255,255,0.15);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:17px;font-weight:800;flex-shrink:0;border:2px solid rgba(255,255,255,0.2)">
              ${emp.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style="font-size:16px;font-weight:700;letter-spacing:.3px">${emp.name}</div>
              ${emp.position ? `<div style="font-size:11px;opacity:.7;margin-top:2px">${emp.position}</div>` : ''}
            </div>
          </div>
          <div style="text-align:right">
            <div style="font-size:22px;font-weight:800;color:${pctC};line-height:1">${pct}%</div>
            <div style="font-size:10px;opacity:.65;margin-top:3px">${done} de ${empFases.length} etapas concluídas</div>
          </div>
        </div>
        <div style="height:5px;background:#e2e8f0"><div style="height:100%;width:${pct}%;background:${barC}"></div></div>
        <div style="padding:16px 16px 4px">
          ${buildModuleSections(empFases)}
        </div>
      </div>`;
  }).join('');

  // Unassigned section
  const unassignedSection = unassigned.length ? `
    <div style="margin-bottom:28px;border:1px solid #d1dae6;border-radius:8px;overflow:hidden">
      <div style="background:#64748b;color:#fff;padding:12px 20px;font-size:13px;font-weight:700">Etapas sem responsável atribuído</div>
      <div style="padding:16px 16px 4px">${buildModuleSections(unassigned)}</div>
    </div>` : '';

  const html = `
    <div style="font-family:'Segoe UI',Arial,sans-serif;color:#1e293b;max-width:840px;margin:0 auto;padding:36px 36px 60px">

      <!-- ── CABEÇALHO ───────────────────────────────────────────── -->
      <div style="background:linear-gradient(135deg,#1e3a5f 0%,#1a3d7a 100%);color:#fff;border-radius:10px;margin-bottom:32px;overflow:hidden">
        <div style="background:rgba(0,0,0,.18);padding:8px 28px;display:flex;justify-content:space-between;align-items:center">
          <span style="font-size:9px;letter-spacing:2.5px;text-transform:uppercase;opacity:.65;font-weight:600">Documento Oficial · Sistema de Implantação</span>
          <span style="font-size:10px;opacity:.6">Emitido em ${new Date().toLocaleString('pt-BR')}</span>
        </div>
        <div style="padding:22px 28px 18px;display:flex;align-items:flex-end;justify-content:space-between;gap:20px">
          <div>
            <h1 style="margin:0 0 6px;font-size:27px;font-weight:800;letter-spacing:.4px;line-height:1.1">ATA DE IMPLANTAÇÃO</h1>
            <div style="font-size:14px;opacity:.8;font-weight:500">${imp.title}</div>
          </div>
          <div style="text-align:right;flex-shrink:0">
            ${imp.company?.fantasia ? `<div style="font-size:15px;font-weight:700;letter-spacing:.2px">${imp.company.fantasia}</div>` : ''}
            ${imp.code ? `<div style="font-size:10px;opacity:.5;margin-top:4px;font-family:monospace">#${String(imp.code).padStart(4,'0')}</div>` : ''}
          </div>
        </div>
        <div style="background:rgba(0,0,0,.12);padding:10px 28px;display:flex;align-items:center;gap:28px;flex-wrap:wrap">
          <div style="display:flex;align-items:center;gap:8px">
            <span style="font-size:9px;opacity:.6;text-transform:uppercase;letter-spacing:.6px">Status</span>
            <span style="font-size:11px;font-weight:700;padding:2px 12px;border-radius:20px;background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.2)">${statusLabel(imp.status)}</span>
          </div>
          ${imp.startDate   ? `<div style="display:flex;gap:6px;align-items:center"><span style="font-size:9px;opacity:.6;text-transform:uppercase;letter-spacing:.6px">Início</span><span style="font-size:11px;font-weight:600">${fmt(imp.startDate)}</span></div>` : ''}
          ${imp.expectedEnd ? `<div style="display:flex;gap:6px;align-items:center"><span style="font-size:9px;opacity:.6;text-transform:uppercase;letter-spacing:.6px">Término</span><span style="font-size:11px;font-weight:600">${fmt(imp.expectedEnd)}</span></div>` : ''}
          ${totalFases > 0 ? `
          <div style="margin-left:auto;display:flex;align-items:center;gap:12px">
            <div style="width:100px;height:6px;background:rgba(255,255,255,.2);border-radius:3px;overflow:hidden">
              <div style="height:100%;width:${progPct}%;background:${progPct===100?'#4ade80':'#60a5fa'};border-radius:3px"></div>
            </div>
            <span style="font-size:14px;font-weight:800;color:${progPct===100?'#4ade80':'#93c5fd'}">${progPct}%</span>
          </div>` : ''}
        </div>
      </div>

      <!-- ── DADOS DA IMPLANTAÇÃO ────────────────────────────────── -->
      <div style="margin-bottom:28px">
        <div style="font-size:10px;font-weight:800;color:#1e3a5f;letter-spacing:1.2px;text-transform:uppercase;margin-bottom:10px;padding-bottom:6px;border-bottom:2px solid #1e3a5f">Dados da Implantação</div>
        <table style="width:100%;border-collapse:collapse">
          ${infoRow('Empresa', imp.company?.name || '—')}
          ${imp.company?.fantasia ? infoRow('Nome Fantasia', imp.company.fantasia) : ''}
          ${imp.responsible ? infoRow('Responsável', imp.responsible.name) : ''}
          ${imp.technician  ? infoRow('Técnico', imp.technician.name) : ''}
          ${imp.employee    ? infoRow('Funcionário / Cliente', `${imp.employee.name}${imp.employee.position ? ` <span style="color:#94a3b8;font-size:11px"> · ${imp.employee.position}</span>` : ''}`) : ''}
          ${infoRow('Status', statusBadge(imp.status))}
          ${imp.startDate   ? infoRow('Início', fmt(imp.startDate)) : ''}
          ${imp.expectedEnd ? infoRow('Previsão de Término', fmt(imp.expectedEnd)) : ''}
          ${imp.completedAt ? infoRow('Concluído em', fmt(imp.completedAt)) : ''}
        </table>
      </div>

      <!-- ── PROGRESSO GERAL ─────────────────────────────────────── -->
      ${totalFases > 0 ? `
      <div style="margin-bottom:28px;padding:16px 20px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;display:flex;align-items:center;gap:20px">
        <div style="flex:1">
          <div style="font-size:10px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:.6px;margin-bottom:8px">Progresso Geral — ${totalConcluidas} de ${totalFases} etapas concluídas</div>
          <div style="background:#e2e8f0;border-radius:8px;height:10px;overflow:hidden">
            <div style="height:100%;width:${progPct}%;background:${progColor};border-radius:8px"></div>
          </div>
        </div>
        <div style="text-align:right;min-width:70px">
          <div style="font-size:26px;font-weight:800;color:${progTextColor};line-height:1">${progPct}%</div>
        </div>
      </div>` : ''}

      <!-- ── DESCRIÇÃO / ESCOPO ──────────────────────────────────── -->
      ${imp.description ? `
      <div style="margin-bottom:28px">
        <div style="font-size:10px;font-weight:800;color:#1e3a5f;letter-spacing:1.2px;text-transform:uppercase;margin-bottom:10px;padding-bottom:6px;border-bottom:2px solid #1e3a5f">Descrição / Escopo</div>
        <p style="font-size:13px;line-height:1.8;color:#334155;white-space:pre-wrap;margin:0;padding:14px 18px;background:#f8fafc;border-left:3px solid #2563eb;border-radius:0 6px 6px 0">${imp.description}</p>
      </div>` : ''}

      <!-- ── CRONOGRAMA POR FUNCIONÁRIO ──────────────────────────── -->
      ${(employees.length || unassigned.length) ? `
      <div style="margin-bottom:28px">
        <div style="font-size:10px;font-weight:800;color:#1e3a5f;letter-spacing:1.2px;text-transform:uppercase;margin-bottom:16px;padding-bottom:6px;border-bottom:2px solid #1e3a5f">Cronograma de Treinamento por Funcionário</div>
        ${empSections}
        ${unassignedSection}
      </div>` : ''}

      <!-- ── OBSERVAÇÕES ─────────────────────────────────────────── -->
      ${imp.notes ? `
      <div style="margin-bottom:36px">
        <div style="font-size:10px;font-weight:800;color:#1e3a5f;letter-spacing:1.2px;text-transform:uppercase;margin-bottom:10px;padding-bottom:6px;border-bottom:2px solid #1e3a5f">Observações</div>
        <p style="font-size:13px;line-height:1.8;color:#334155;white-space:pre-wrap;margin:0;padding:14px 18px;background:#fffbeb;border-left:3px solid #f59e0b;border-radius:0 6px 6px 0">${imp.notes}</p>
      </div>` : ''}

      <!-- ── ASSINATURAS ─────────────────────────────────────────── -->
      <div style="margin-top:70px;border-top:2px solid #e2e8f0;padding-top:36px;display:flex;gap:32px;flex-wrap:wrap">
        <div style="flex:1;min-width:160px;text-align:center">
          <div style="height:52px"></div>
          <div style="border-top:1px solid #94a3b8;padding-top:10px;display:inline-block;min-width:190px">
            <div style="font-size:13px;font-weight:700;color:#1e293b">${imp.technician?.name || '________________________________'}</div>
            <div style="font-size:11px;color:#64748b;margin-top:3px">Técnico Responsável</div>
          </div>
        </div>
        <div style="flex:1;min-width:160px;text-align:center">
          <div style="height:52px"></div>
          <div style="border-top:1px solid #94a3b8;padding-top:10px;display:inline-block;min-width:190px">
            <div style="font-size:13px;font-weight:700;color:#1e293b">${imp.employee?.name || '________________________________'}</div>
            ${imp.employee?.position ? `<div style="font-size:11px;color:#94a3b8">${imp.employee.position}</div>` : ''}
            <div style="font-size:11px;color:#64748b;margin-top:3px">Funcionário / Cliente</div>
          </div>
        </div>
        ${imp.responsible ? `
        <div style="flex:1;min-width:160px;text-align:center">
          <div style="height:52px"></div>
          <div style="border-top:1px solid #94a3b8;padding-top:10px;display:inline-block;min-width:190px">
            <div style="font-size:13px;font-weight:700;color:#1e293b">${imp.responsible.name}</div>
            <div style="font-size:11px;color:#64748b;margin-top:3px">Responsável</div>
          </div>
        </div>` : ''}
      </div>
    </div>`;

  const win = window.open('', '_blank');
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>ATA - ${imp.title}</title><style>*{box-sizing:border-box}body{margin:0;background:#f1f5f9;print-color-adjust:exact;-webkit-print-color-adjust:exact}@media print{body{margin:0;padding:0;background:#fff}@page{margin:12mm;size:A4}}</style></head><body>${html}<script>window.onload=function(){window.print()}<\/script></body></html>`);
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
  const [etapasTemplate, setEtapasTemplate] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const [fasesForm, setFasesForm] = useState([]);
  const [faseSearch, setFaseSearch] = useState('');
  const [collapsedModules, setCollapsedModules] = useState({});

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
    etapaTreinamentoService.list({ active: 'true' }).then(setEtapasTemplate);
  }, [load]);

  const filtered = items.filter(i => {
    if (filterStatus && i.status !== filterStatus) return false;
    if (search) {
      const q = normalize(search);
      return [i.title, i.company?.name, i.company?.fantasia, i.responsible?.name, i.technician?.name, i.description, i.notes].some(f => normalize(f).includes(q));
    }
    return true;
  });

  const buildCollapsedAll = () => {
    const map = {};
    etapasTemplate.forEach(e => { map[e.modulo?.name || 'Sem Módulo'] = true; });
    return map;
  };

  const openCreate = () => {
    setEditing(null);
    setFasesForm([]);
    setFaseSearch('');
    setCollapsedModules(buildCollapsedAll());
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
      startDate: record.startDate ? record.startDate.slice(0, 10) : '',
      expectedEnd: record.expectedEnd ? record.expectedEnd.slice(0, 10) : '',
      notes: record.notes,
    });
    setFasesForm(record.fases?.map(f => ({ ...f, employeeIds: f.employeeIds || [], etapaTreinamentoId: f.etapaTreinamentoId || null })) || []);
    setCollapsedModules(buildCollapsedAll());
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
    { id: null, order: prev.length + 1, title: '', description: '', status: 'PENDENTE', employeeIds: [], etapaTreinamentoId: null },
  ]);

  const updateFaseField = (idx, field, value) => {
    setFasesForm(prev => prev.map((f, i) => i === idx ? { ...f, [field]: value } : f));
  };

  const updateFaseFields = (idx, fields) => {
    setFasesForm(prev => prev.map((f, i) => i === idx ? { ...f, ...fields } : f));
  };

  const removeFase = (idx) => {
    setFasesForm(prev => prev.filter((_, i) => i !== idx).map((f, i) => ({ ...f, order: i + 1 })));
  };

  const addFaseFromEtapa = (etapa) => {
    const alreadyAdded = fasesForm.some(f => f.etapaTreinamentoId === etapa.id);
    if (alreadyAdded) {
      setFasesForm(prev => prev.filter(f => f.etapaTreinamentoId !== etapa.id).map((f, i) => ({ ...f, order: i + 1 })));
    } else {
      setFasesForm(prev => [...prev, { id: null, order: prev.length + 1, title: etapa.title, description: '', status: 'PENDENTE', employeeIds: [], etapaTreinamentoId: etapa.id }]);
    }
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
            <Button type="text" icon={<PrinterOutlined />} size="small" style={{ color: '#60a5fa' }} onClick={() => gerarATAImplantacao(record, allEmployees, etapasTemplate)} />
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
              <Button icon={<PrinterOutlined />} onClick={() => gerarATAImplantacao(selected, allEmployees, etapasTemplate)} style={{ color: '#60a5fa', borderColor: '#2563eb' }}>
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
        centered width={960}
        styles={{ body: { padding: '24px 0 8px', maxHeight: '82vh', overflowY: 'auto' } }}
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

            {/* Bloco 1 — Identificação */}
            <div style={{ background: 'var(--cl-bg-secondary)', border: '1px solid var(--cl-border)', borderRadius: 10, padding: '16px 18px', marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
                Identificação
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Form.Item name="title" label="Título" rules={[{ required: true }]} style={{ marginBottom: 0 }}>
                  <Input placeholder="Título da implantação" size="large" />
                </Form.Item>
                <Form.Item name="companyId" label="Empresa" rules={[{ required: true }]} style={{ marginBottom: 0 }}>
                  <Select
                    placeholder="Selecione a empresa" showSearch size="large"
                    optionLabelProp="label"
                    filterOption={(input, option) => {
                      const q = normalize(input);
                      return normalize(option?.name || '').includes(q) || normalize(option?.fantasia || '').includes(q);
                    }}
                    onChange={v => { setSelectedCompanyId(v || null); setSelectedEmployeeId(null); }}
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
              </div>
              {(() => {
                const co = companies.find(c => c.id === selectedCompanyId);
                return co?.fantasia ? (
                  <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', flexShrink: 0 }}>
                      Fantasia
                    </span>
                    <div style={{
                      flex: 1, padding: '5px 12px', borderRadius: 6,
                      background: 'rgba(37,99,235,0.07)', border: '1px solid rgba(37,99,235,0.18)',
                      fontSize: 13, fontWeight: 600, color: '#3b82f6', letterSpacing: '0.01em',
                    }}>
                      {co.fantasia}
                    </div>
                  </div>
                ) : null;
              })()}
            </div>

            {/* Bloco 2 — Equipe e Prazo */}
            <div style={{ background: 'var(--cl-bg-secondary)', border: '1px solid var(--cl-border)', borderRadius: 10, padding: '16px 18px', marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
                Equipe e Prazo
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 14 }}>
                <Form.Item name="responsibleId" label="Responsável" style={{ marginBottom: 0 }}>
                  <Select placeholder="Selecione" allowClear showSearch size="large"
                    filterOption={(input, option) => normalize(option?.children || '').includes(normalize(input))}>
                    {users.map(u => <Option key={u.id} value={u.id}>{u.name}</Option>)}
                  </Select>
                </Form.Item>
                <Form.Item name="technicianId" label="Técnico" style={{ marginBottom: 0 }}>
                  <Select placeholder="Selecione" allowClear showSearch size="large"
                    filterOption={(input, option) => normalize(option?.children || '').includes(normalize(input))}>
                    {technicians.map(t => <Option key={t.id} value={t.id}>{t.name}</Option>)}
                  </Select>
                </Form.Item>
                <Form.Item name="startDate" label="Data de Início" style={{ marginBottom: 0 }}>
                  <Input type="date" size="large" onChange={e => {
                    const start = e.target.value;
                    const end = form.getFieldValue('expectedEnd');
                    const today = new Date().toISOString().slice(0, 10);
                    const cur = form.getFieldValue('status');
                    if (cur === 'CONCLUIDO' || cur === 'CANCELADO') return;
                    if (start && start > today) form.setFieldValue('status', 'PENDENTE');
                    else if (start && start <= today && (!end || end >= today)) form.setFieldValue('status', 'EM_ANDAMENTO');
                    else if (end && end < today) form.setFieldValue('status', 'EM_ANDAMENTO');
                  }} />
                </Form.Item>
                <Form.Item name="expectedEnd" label="Previsão de Término" style={{ marginBottom: 0 }}>
                  <Input type="date" size="large" onChange={e => {
                    const end = e.target.value;
                    const start = form.getFieldValue('startDate');
                    const today = new Date().toISOString().slice(0, 10);
                    const cur = form.getFieldValue('status');
                    if (cur === 'CONCLUIDO' || cur === 'CANCELADO') return;
                    if (start && start <= today && (!end || end >= today)) form.setFieldValue('status', 'EM_ANDAMENTO');
                    else if (start && start > today) form.setFieldValue('status', 'PENDENTE');
                  }} />
                </Form.Item>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 14, marginTop: 14 }}>
                <Form.Item name="status" label="Status" style={{ marginBottom: 0 }}>
                  <Select size="large" defaultValue="PENDENTE">
                    {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                      <Option key={k} value={k}>
                        <span style={{ color: STATUS_CONFIG[k].color, fontWeight: 500 }}>● {v.label}</span>
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
                <Form.Item name="description" label="Descrição" style={{ marginBottom: 0 }}>
                  <Input placeholder="Descreva brevemente o escopo da implantação..." size="large" />
                </Form.Item>
              </div>
            </div>

            {/* Fases */}
            <Divider orientation="left" style={{ fontSize: 13, fontWeight: 700 }}>
              Fases / Etapas
              {fasesForm.length > 0 && (
                <Tag color="blue" style={{ marginLeft: 8, fontWeight: 600 }}>{fasesForm.length} selecionada{fasesForm.length !== 1 ? 's' : ''}</Tag>
              )}
            </Divider>

            {/* Etapa Picker — etapas + funcionários + status */}
            <div style={{ border: '1px solid var(--cl-border)', borderRadius: 10, overflow: 'hidden', marginBottom: 16 }}>

              {/* Barra de pesquisa */}
              <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--cl-border)', background: 'var(--cl-bg-secondary)', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <Input
                  prefix={<SearchOutlined style={{ color: '#94a3b8', fontSize: 14 }} />}
                  placeholder="Pesquisar etapas ou módulos..."
                  value={faseSearch}
                  onChange={e => setFaseSearch(e.target.value)}
                  allowClear
                  size="middle"
                  style={{ fontSize: 13, width: 'calc((100% - 42px) / 4)' }}
                />
                {fasesForm.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, color: '#64748b' }}>Selecionadas:</span>
                    <span style={{ fontSize: 12, color: '#3b82f6', fontWeight: 600 }}>
                      {fasesForm.length} etapa{fasesForm.length !== 1 ? 's' : ''}
                    </span>
                    <span style={{ fontSize: 11, color: '#64748b', marginLeft: 8 }}>Concluídas:</span>
                    <span style={{ fontSize: 12, color: '#34d399', fontWeight: 600 }}>
                      {fasesForm.filter(f => f.status === 'CONCLUIDO').length}/{fasesForm.length}
                    </span>
                  </div>
                )}
              </div>

              {/* Lista agrupada por módulo */}
              <div style={{ maxHeight: 520, overflowY: 'auto' }}>
                {(() => {
                  const search = normalize(faseSearch);
                  const filtered = etapasTemplate.filter(e =>
                    !search || normalize(e.title).includes(search) || normalize(e.modulo?.name || '').includes(search)
                  );
                  const groups = {};
                  filtered.forEach(e => {
                    const mKey = e.modulo?.id || '__none__';
                    if (!groups[mKey]) groups[mKey] = { name: e.modulo?.name || 'Sem Módulo', order: e.modulo?.order ?? 9999, etapas: [] };
                    groups[mKey].etapas.push(e);
                  });
                  const sortedGroups = Object.values(groups).sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, 'pt-BR'));
                  if (sortedGroups.length === 0) {
                    return <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>Nenhuma etapa encontrada</div>;
                  }
                  const companyEmployees = allEmployees.filter(e => e.companyId === selectedCompanyId);
                  return sortedGroups.map((group, gi) => {
                    const isCollapsed = !!collapsedModules[group.name];
                    const selectedCount = group.etapas.filter(e => fasesForm.some(f => f.etapaTreinamentoId === e.id)).length;
                    return (
                    <div key={group.name}>
                      {/* Cabeçalho do módulo — clicável para recolher/expandir */}
                      <div
                        onClick={() => setCollapsedModules(prev => ({ ...prev, [group.name]: !prev[group.name] }))}
                        style={{
                          padding: '8px 14px 6px',
                          fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase',
                          color: '#e2e8f0', background: '#1e293b',
                          borderTop: gi > 0 ? '2px solid #0f172a' : undefined,
                          display: 'flex', alignItems: 'center', gap: 8,
                          cursor: 'pointer', userSelect: 'none',
                        }}
                      >
                        <RightOutlined style={{
                          fontSize: 9, opacity: .7,
                          transition: 'transform .2s',
                          transform: isCollapsed ? 'rotate(0deg)' : 'rotate(90deg)',
                        }} />
                        <BuildOutlined style={{ fontSize: 11, opacity: .7 }} />
                        {group.name}
                        <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 400, opacity: .7 }}>
                          {selectedCount > 0
                            ? <span style={{ color: '#60a5fa' }}>{selectedCount} selecionada{selectedCount !== 1 ? 's' : ''} · </span>
                            : null}
                          {group.etapas.length} etapa{group.etapas.length !== 1 ? 's' : ''}
                        </span>
                      </div>

                      {!isCollapsed && group.etapas
                        .sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999) || a.title.localeCompare(b.title, 'pt-BR'))
                        .map(etapa => {
                          const faseIdx = fasesForm.findIndex(f => f.etapaTreinamentoId === etapa.id);
                          const isAdded = faseIdx !== -1;
                          const fase = isAdded ? fasesForm[faseIdx] : null;
                          const statusCfg = { PENDENTE: { color: '#94a3b8', label: 'Pendente' }, EM_ANDAMENTO: { color: '#60a5fa', label: 'Andamento' }, CONCLUIDO: { color: '#34d399', label: 'Concluído' } };
                          return (
                            <div key={etapa.id} style={{
                              borderBottom: '1px solid var(--cl-border)',
                              background: isAdded ? 'rgba(37,99,235,0.05)' : 'transparent',
                              transition: 'background .12s',
                            }}>
                              {/* Linha principal — checkbox + título + status (quando selecionado) */}
                              <div
                                onClick={() => addFaseFromEtapa(etapa)}
                                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', cursor: 'pointer', minHeight: 40 }}
                                onMouseEnter={e => { if (!isAdded) e.currentTarget.style.background = 'rgba(148,163,184,0.06)'; }}
                                onMouseLeave={e => { if (!isAdded) e.currentTarget.style.background = 'transparent'; }}
                              >
                                {/* Checkbox visual */}
                                <div style={{
                                  width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                                  border: `2px solid ${isAdded ? '#3b82f6' : '#94a3b8'}`,
                                  background: isAdded ? '#3b82f6' : 'transparent',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  transition: 'all .15s',
                                }}>
                                  {isAdded && <CheckOutlined style={{ fontSize: 10, color: '#fff' }} />}
                                </div>

                                {/* Título da etapa */}
                                <span style={{ fontSize: 13, flex: 1, color: isAdded ? '#3b82f6' : 'var(--cl-text)', fontWeight: isAdded ? 500 : 400 }}>
                                  {etapa.title}
                                </span>

                                {/* Status badge (quando selecionado) */}
                                {isAdded && (
                                  <div onClick={e => e.stopPropagation()}>
                                    <Select
                                      value={fase.status}
                                      onChange={v => updateFaseField(faseIdx, 'status', v)}
                                      size="small"
                                      style={{ width: 130 }}
                                      onClick={e => e.stopPropagation()}
                                    >
                                      {Object.entries(FASE_STATUS).map(([k, v]) => (
                                        <Option key={k} value={k}>
                                          <span style={{ color: statusCfg[k]?.color, fontWeight: 500, fontSize: 12 }}>● {v.label}</span>
                                        </Option>
                                      ))}
                                    </Select>
                                  </div>
                                )}

                                {/* Botão remover */}
                                {isAdded && (
                                  <div onClick={e => e.stopPropagation()}>
                                    <Button type="text" danger size="small" icon={<DeleteOutlined />}
                                      onClick={e => { e.stopPropagation(); removeFase(faseIdx); }} />
                                  </div>
                                )}
                              </div>

                              {/* Funcionários — chips clicáveis, aparecem quando etapa está marcada */}
                              {isAdded && (
                                <div
                                  style={{ padding: '4px 14px 10px 42px', display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}
                                  onClick={e => e.stopPropagation()}
                                >
                                  <span style={{ fontSize: 11, color: '#64748b', marginRight: 2 }}>
                                    <TeamOutlined /> Funcionários:
                                  </span>
                                  {companyEmployees.length === 0 ? (
                                    <span style={{ fontSize: 11, color: '#94a3b8' }}>Selecione a empresa primeiro</span>
                                  ) : (
                                    companyEmployees.map(emp => {
                                      const sel = fase?.employeeIds?.includes(emp.id);
                                      return (
                                        <span
                                          key={emp.id}
                                          onClick={() => {
                                            const cur = fase?.employeeIds || [];
                                            updateFaseField(faseIdx, 'employeeIds', sel ? cur.filter(id => id !== emp.id) : [...cur, emp.id]);
                                          }}
                                          style={{
                                            display: 'inline-flex', alignItems: 'center', gap: 4,
                                            padding: '3px 10px', borderRadius: 20, fontSize: 12,
                                            cursor: 'pointer', userSelect: 'none', transition: 'all .15s',
                                            fontWeight: sel ? 600 : 400,
                                            background: sel ? '#3b82f6' : 'var(--cl-bg-secondary)',
                                            color: sel ? '#fff' : 'var(--cl-text)',
                                            border: `1px solid ${sel ? '#3b82f6' : 'var(--cl-border)'}`,
                                          }}
                                        >
                                          {sel && <CheckOutlined style={{ fontSize: 9 }} />}
                                          {emp.name}
                                        </span>
                                      );
                                    })
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  );
                  });
                })()}
              </div>
            </div>

            <Form.Item name="notes" label="Observações Gerais">
              <TextArea rows={5} placeholder="Registre aqui observações gerais sobre a implantação, ocorrências, pendências ou informações relevantes para o acompanhamento..." style={{ resize: 'vertical', fontSize: 13 }} />
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
