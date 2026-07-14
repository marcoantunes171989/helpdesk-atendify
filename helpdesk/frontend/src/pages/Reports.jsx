import { useEffect, useRef, useState } from 'react';
import {
  Row, Col, Button, Select, Space, Table, Tag, Tabs,
  message, Tooltip, DatePicker, Modal, Spin, Statistic,
} from 'antd';
import {
  FilterOutlined, PrinterOutlined, FileExcelOutlined, FilePdfOutlined,
  EyeOutlined, ReloadOutlined, BarChartOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { reportService, companyService, categoryService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const { RangePicker } = DatePicker;
const { Option } = Select;

// ─── constants ───────────────────────────────────────────────────────────────
const PRIORITY_LABEL = { LOW: 'Baixa', MEDIUM: 'Média', HIGH: 'Alta', CRITICAL: 'Crítica' };
// Hex literais (não var()) — usados com sufixo de alpha (`${cor}44`) nas Tags abaixo
const PRIORITY_COLOR = { LOW: '#94a3b8', MEDIUM: '#38bdf8', HIGH: '#f59e0b', CRITICAL: '#ef4444' };
const STATUS_LABEL = {
  OPEN: 'Aberto', IN_PROGRESS: 'Em Andamento',
  RESOLVED: 'Resolvido', CLOSED: 'Fechado', CANCELLED: 'Cancelado',
};
const STATUS_COLOR = {
  OPEN: '#2563eb', IN_PROGRESS: '#8b5cf6',
  RESOLVED: '#10b981', CLOSED: '#94a3b8', CANCELLED: '#ef4444',
};

// ─── aggregation helpers ──────────────────────────────────────────────────────
const emptyGroup = () => ({ total: 0, open: 0, inProgress: 0, resolved: 0, closed: 0, cancelled: 0 });

function tally(group, ticket) {
  group.total++;
  if (ticket.status === 'OPEN') group.open++;
  else if (ticket.status === 'IN_PROGRESS') group.inProgress++;
  else if (ticket.status === 'RESOLVED') group.resolved++;
  else if (ticket.status === 'CLOSED') group.closed++;
  else if (ticket.status === 'CANCELLED') group.cancelled++;
}

function groupBy(tickets, keyFn, labelFn) {
  const map = {};
  tickets.forEach(t => {
    const key = keyFn(t) || '__none__';
    if (!map[key]) map[key] = { name: labelFn(t) || '—', ...emptyGroup() };
    tally(map[key], t);
  });
  return Object.values(map).sort((a, b) => b.total - a.total);
}

function getSummary(tickets) {
  const s = { total: tickets.length, ...emptyGroup() };
  tickets.forEach(t => tally(s, t));
  s.critical = tickets.filter(t => t.priority === 'CRITICAL').length;
  s.high = tickets.filter(t => t.priority === 'HIGH').length;
  return s;
}

// ─── print HTML builder ───────────────────────────────────────────────────────
function buildPrintHtml({ title, subtitle, headers, rows, summary, generatedAt }) {
  const kpiHtml = summary ? `
    <div class="kpi-row">
      <div class="kpi"><div class="kv">${summary.total}</div><div class="kl">Total</div></div>
      <div class="kpi"><div class="kv" style="color:#2563eb">${summary.open}</div><div class="kl">Abertos</div></div>
      <div class="kpi"><div class="kv" style="color:#7c3aed">${summary.inProgress}</div><div class="kl">Em Andamento</div></div>
      <div class="kpi"><div class="kv" style="color:#16a34a">${summary.resolved}</div><div class="kl">Resolvidos</div></div>
      <div class="kpi"><div class="kv" style="color:#dc2626">${summary.critical}</div><div class="kl">Críticos</div></div>
    </div>` : '';

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Atendexa — ${title}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#1e293b;background:#fff;padding:24px}
.header{border-bottom:2px solid #2563eb;padding-bottom:10px;margin-bottom:14px}
.header h1{font-size:18px;color:#2563eb;margin-bottom:2px}
.header p{color:#64748b;font-size:10px;margin-top:3px}
.kpi-row{display:flex;gap:12px;margin-bottom:14px}
.kpi{flex:1;border:1px solid #e2e8f0;border-radius:6px;padding:10px;text-align:center}
.kv{font-size:22px;font-weight:700;color:#1e293b}
.kl{font-size:9px;color:#94a3b8;margin-top:2px;text-transform:uppercase;letter-spacing:.5px}
table{width:100%;border-collapse:collapse}
th{background:#2563eb;color:#fff;padding:7px 10px;text-align:left;font-size:10px;font-weight:700}
td{padding:6px 10px;border-bottom:1px solid #e2e8f0;font-size:10px;vertical-align:top}
tr:nth-child(even) td{background:#f8fafc}
.footer{margin-top:16px;border-top:1px solid #e2e8f0;padding-top:8px;font-size:9px;color:#94a3b8;display:flex;justify-content:space-between}
@media print{@page{margin:1.5cm}body{padding:0}}
</style></head><body>
<div class="header">
  <h1>Atendexa · ${title}</h1>
  ${subtitle ? `<p>${subtitle}</p>` : ''}
  <p>Gerado em ${generatedAt}</p>
</div>
${kpiHtml}
<table>
  <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
  <tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c ?? '—'}</td>`).join('')}</tr>`).join('')}</tbody>
</table>
<div class="footer">
  <span>Atendexa Helpdesk</span>
  <span>${rows.length} registro${rows.length !== 1 ? 's' : ''}</span>
</div>
</body></html>`;
}

// ─── export helpers ───────────────────────────────────────────────────────────
async function doExportXLSX(sheetName, headers, rows, summaryRows = []) {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Atendexa';
  wb.created = new Date();

  const ws = wb.addWorksheet(sheetName.slice(0, 31));

  // optional summary block
  if (summaryRows.length > 0) {
    summaryRows.forEach(([label, value]) => {
      const r = ws.addRow([label, value]);
      r.getCell(1).font = { bold: true, size: 10 };
      r.getCell(2).font = { size: 10 };
    });
    ws.addRow([]);
  }

  // header row
  const hr = ws.addRow(headers);
  hr.height = 22;
  hr.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: false };
    cell.border = { bottom: { style: 'medium', color: { argb: 'FF1D4ED8' } } };
  });

  // data rows
  rows.forEach((row, i) => {
    const r = ws.addRow(row);
    r.height = 17;
    if (i % 2 === 1) {
      r.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      });
    }
    r.eachCell(cell => { cell.alignment = { vertical: 'middle' }; });
  });

  // auto column widths
  ws.columns.forEach((col, i) => {
    const maxLen = Math.max(
      (headers[i] || '').length,
      ...rows.map(r => String(r[i] ?? '').length),
    );
    col.width = Math.min(Math.max(maxLen + 4, 12), 50);
  });
  ws.views = [{ state: 'frozen', ySplit: summaryRows.length > 0 ? summaryRows.length + 2 : 1 }];

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `relatorio-${sheetName.toLowerCase().replace(/\s+/g, '-')}-${dayjs().format('YYYY-MM-DD')}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

async function doExportPDF(title, subtitle, headers, rows, summary) {
  const { jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const landscape = headers.length > 6;
  const doc = new jsPDF({ orientation: landscape ? 'landscape' : 'portrait', unit: 'mm', format: 'a4' });
  const pw = doc.internal.pageSize.getWidth();

  doc.setFontSize(16);
  doc.setTextColor(37, 99, 235);
  doc.text('Atendexa — Relatório de Chamados', 14, 16);

  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  let y = 23;
  if (subtitle) { doc.text(subtitle, 14, y); y += 6; }
  doc.text(`Gerado em: ${dayjs().format('DD/MM/YYYY [às] HH:mm')}`, 14, y);
  y += 4;

  if (summary) {
    const kpis = [
      ['Total', summary.total], ['Abertos', summary.open],
      ['Em Andamento', summary.inProgress], ['Resolvidos', summary.resolved],
      ['Críticos', summary.critical],
    ];
    const boxW = (pw - 28) / kpis.length;
    y += 6;
    kpis.forEach(([label, val], i) => {
      const x = 14 + i * (boxW + 2);
      doc.setDrawColor(226, 232, 240);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(x, y, boxW, 14, 2, 2, 'FD');
      doc.setFontSize(14);
      doc.setTextColor(30, 41, 59);
      doc.text(String(val), x + boxW / 2, y + 7, { align: 'center' });
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(label.toUpperCase(), x + boxW / 2, y + 12, { align: 'center' });
    });
    y += 20;
  }

  autoTable(doc, {
    startY: y + 2,
    head: [headers],
    body: rows.map(r => r.map(c => c ?? '—')),
    styles: { fontSize: 8, cellPadding: 3, overflow: 'linebreak' },
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold', fontSize: 8 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    theme: 'striped',
    margin: { left: 14, right: 14 },
  });

  const pages = doc.internal.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(`Atendexa Helpdesk · Página ${p} de ${pages}`, 14, doc.internal.pageSize.getHeight() - 6);
    doc.text(`${rows.length} registros`, pw - 14, doc.internal.pageSize.getHeight() - 6, { align: 'right' });
  }

  doc.save(`relatorio-${dayjs().format('YYYY-MM-DD')}.pdf`);
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KPICard({ title, value, color = 'var(--cl-primary-text)', sub }) {
  return (
    <div style={{
      background: 'var(--cl-bg-card)', border: '1px solid var(--cl-border)',
      borderRadius: 10, padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 4,
    }}>
      <div style={{ fontSize: 11, color: 'var(--cl-text-muted)', textTransform: 'uppercase', letterSpacing: '.5px', fontWeight: 600 }}>
        {title}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color, lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--cl-text-faint)' }}>{sub}</div>}
    </div>
  );
}

// ─── shared table columns by group ───────────────────────────────────────────
function groupColumns(labelTitle) {
  return [
    {
      title: labelTitle, dataIndex: 'name', key: 'name', minWidth: 180,
      render: v => <span style={{ fontWeight: 600, color: 'var(--cl-text-hi)', fontSize: 13 }}>{v}</span>,
    },
    { title: 'Total', dataIndex: 'total', key: 'total', width: 80, align: 'center', sorter: (a, b) => b.total - a.total, defaultSortOrder: 'ascend', render: v => <strong style={{ color: 'var(--cl-text-hi)' }}>{v}</strong> },
    { title: 'Abertos', dataIndex: 'open', key: 'open', width: 90, align: 'center', sorter: (a, b) => b.open - a.open, render: v => v > 0 ? <span style={{ color: 'var(--cl-primary-text)', fontWeight: 600 }}>{v}</span> : <span style={{ color: 'var(--cl-text-dim)' }}>—</span> },
    { title: 'Em Andamento', dataIndex: 'inProgress', key: 'inProgress', width: 120, align: 'center', sorter: (a, b) => b.inProgress - a.inProgress, render: v => v > 0 ? <span style={{ color: 'var(--cl-purple)', fontWeight: 600 }}>{v}</span> : <span style={{ color: 'var(--cl-text-dim)' }}>—</span> },
    { title: 'Resolvidos', dataIndex: 'resolved', key: 'resolved', width: 100, align: 'center', sorter: (a, b) => b.resolved - a.resolved, render: v => v > 0 ? <span style={{ color: 'var(--cl-success)', fontWeight: 600 }}>{v}</span> : <span style={{ color: 'var(--cl-text-dim)' }}>—</span> },
    { title: 'Fechados', dataIndex: 'closed', key: 'closed', width: 90, align: 'center', sorter: (a, b) => b.closed - a.closed, render: v => v > 0 ? <span style={{ color: 'var(--cl-text-faint)', fontWeight: 600 }}>{v}</span> : <span style={{ color: 'var(--cl-text-dim)' }}>—</span> },
    {
      title: '% Resolvidos', key: 'pct', width: 110, align: 'center',
      sorter: (a, b) => (b.resolved / (b.total || 1)) - (a.resolved / (a.total || 1)),
      render: (_, r) => {
        const pct = r.total > 0 ? Math.round((r.resolved + r.closed) / r.total * 100) : 0;
        return (
          <span style={{ fontSize: 12, fontWeight: 600, color: pct >= 75 ? 'var(--cl-success)' : pct >= 40 ? 'var(--cl-warning)' : 'var(--cl-danger)' }}>
            {pct}%
          </span>
        );
      },
    },
  ];
}

function groupToRows(data) {
  return data.map(r => [r.name, r.total, r.open, r.inProgress, r.resolved, r.closed,
    r.total > 0 ? `${Math.round((r.resolved + r.closed) / r.total * 100)}%` : '0%',
  ]);
}

// ─── main component ────────────────────────────────────────────────────────────
export default function Reports() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [categories, setCategories] = useState([]);
  const [reportTab, setReportTab] = useState('summary');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const iframeRef = useRef(null);

  // filters
  const [dateRange, setDateRange] = useState([dayjs().subtract(30, 'day'), dayjs()]);
  const [companyId, setCompanyId] = useState(undefined);
  const [categoryId, setCategoryId] = useState(undefined);
  const [priority, setPriority] = useState(undefined);
  const [statusFilter, setStatusFilter] = useState(undefined);

  const { user } = useAuth();

  useEffect(() => {
    companyService.list().then(setCompanies);
    categoryService.list().then(setCategories);
    loadReport();
  }, []);

  const loadReport = async () => {
    setLoading(true);
    try {
      const params = {};
      if (dateRange?.[0]) params.dateFrom = dateRange[0].startOf('day').toISOString();
      if (dateRange?.[1]) params.dateTo = dateRange[1].endOf('day').toISOString();
      if (companyId) params.companyId = companyId;
      if (categoryId) params.categoryId = categoryId;
      if (priority) params.priority = priority;
      if (statusFilter) params.status = statusFilter;
      const data = await reportService.tickets(params);
      setTickets(data);
    } catch {
      message.error('Erro ao carregar dados do relatório');
    } finally {
      setLoading(false);
    }
  };

  // aggregated views
  const summary = getSummary(tickets);
  const byCompany = groupBy(tickets, t => t.companyId, t => t.company?.name);
  const byEmployee = groupBy(tickets, t => t.employeeId, t => t.employee?.name);
  const byCategory = groupBy(tickets, t => t.categoryId, t => t.category?.name);
  const byTechnician = groupBy(tickets, t => t.technicianId || t.assignee?.id, t => t.technician?.name || t.assignee?.name);
  const byPriority = groupBy(tickets, t => t.priority, t => PRIORITY_LABEL[t.priority]);

  // filter info string
  const filterParts = [
    dateRange?.[0] && dateRange?.[1]
      ? `Período: ${dateRange[0].format('DD/MM/YYYY')} a ${dateRange[1].format('DD/MM/YYYY')}`
      : null,
    companyId ? `Empresa: ${companies.find(c => c.id === companyId)?.name}` : null,
    categoryId ? `Categoria: ${categories.find(c => c.id === categoryId)?.name}` : null,
    priority ? `Prioridade: ${PRIORITY_LABEL[priority]}` : null,
    statusFilter ? `Status: ${STATUS_LABEL[statusFilter]}` : null,
  ].filter(Boolean);
  const filterStr = filterParts.join('  |  ') || 'Todos os registros';
  const generatedAt = dayjs().format('DD/MM/YYYY [às] HH:mm');

  // current tab's export data
  const getExportData = () => {
    const GCOLS = ['Nome', 'Total', 'Abertos', 'Em Andamento', 'Resolvidos', 'Fechados', '% Resolvidos'];
    const tabs = {
      summary: {
        title: 'Resumo Geral',
        headers: ['Métrica', 'Qtd.'],
        rows: [
          ['Total de chamados', summary.total],
          ['Abertos', summary.open],
          ['Em Andamento', summary.inProgress],
          ['Resolvidos', summary.resolved],
          ['Fechados', summary.closed],
          ['Cancelados', summary.cancelled],
          ['Prioridade Crítica', summary.critical],
          ['Prioridade Alta', summary.high],
        ],
      },
      company: { title: 'Por Empresa', headers: GCOLS, rows: groupToRows(byCompany) },
      employee: { title: 'Por Funcionário', headers: GCOLS, rows: groupToRows(byEmployee) },
      category: { title: 'Por Categoria', headers: GCOLS, rows: groupToRows(byCategory) },
      technician: { title: 'Por Técnico/Responsável', headers: GCOLS, rows: groupToRows(byTechnician) },
      priority: { title: 'Por Prioridade', headers: GCOLS, rows: groupToRows(byPriority) },
      detailed: {
        title: 'Detalhado',
        headers: ['#', 'Título', 'Empresa', 'Funcionário', 'Categoria', 'Prioridade', 'Status', 'Técnico/Resp.', 'Abertura'],
        rows: tickets.map(t => [
          t.code ? String(t.code).padStart(4, '0') : '—',
          t.title,
          t.company?.name || '—',
          t.employee?.name || '—',
          t.category?.name || '—',
          PRIORITY_LABEL[t.priority] || t.priority,
          STATUS_LABEL[t.status] || t.status,
          t.technician?.name || t.assignee?.name || '—',
          dayjs(t.createdAt).format('DD/MM/YYYY'),
        ]),
      },
    };
    return tabs[reportTab] || tabs.summary;
  };

  const handleExportXLSX = async () => {
    const { title, headers, rows } = getExportData();
    const summaryRows = [
      ['Relatório:', title],
      ['Filtros:', filterStr],
      ['Gerado em:', generatedAt],
    ];
    try {
      await doExportXLSX(title, headers, rows, summaryRows);
      message.success('Arquivo XLSX exportado com sucesso');
    } catch (err) {
      message.error('Erro ao exportar XLSX');
      console.error(err);
    }
  };

  const handleExportPDF = async () => {
    const { title, headers, rows } = getExportData();
    try {
      await doExportPDF(title, filterStr, headers, rows, summary);
      message.success('PDF exportado com sucesso');
    } catch (err) {
      message.error('Erro ao exportar PDF');
      console.error(err);
    }
  };

  const handlePreview = () => {
    const { title, headers, rows } = getExportData();
    const html = buildPrintHtml({ title, subtitle: filterStr, headers, rows, summary, generatedAt });
    setPreviewHtml(html);
    setPreviewOpen(true);
  };

  const handlePrint = () => {
    const { title, headers, rows } = getExportData();
    const html = buildPrintHtml({ title, subtitle: filterStr, headers, rows, summary, generatedAt });
    const w = window.open('', '_blank', 'width=960,height=720');
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 300);
  };

  // ─── tab items ───────────────────────────────────────────────────────────────
  const summaryStatusRows = [
    { key: 'OPEN', name: 'Aberto', count: summary.open, color: STATUS_COLOR.OPEN },
    { key: 'IN_PROGRESS', name: 'Em Andamento', count: summary.inProgress, color: STATUS_COLOR.IN_PROGRESS },
    { key: 'RESOLVED', name: 'Resolvido', count: summary.resolved, color: STATUS_COLOR.RESOLVED },
    { key: 'CLOSED', name: 'Fechado', count: summary.closed, color: STATUS_COLOR.CLOSED },
    { key: 'CANCELLED', name: 'Cancelado', count: summary.cancelled, color: STATUS_COLOR.CANCELLED },
  ];
  const priorityRows = [
    { key: 'CRITICAL', name: 'Crítica', count: tickets.filter(t => t.priority === 'CRITICAL').length, color: PRIORITY_COLOR.CRITICAL },
    { key: 'HIGH', name: 'Alta', count: tickets.filter(t => t.priority === 'HIGH').length, color: PRIORITY_COLOR.HIGH },
    { key: 'MEDIUM', name: 'Média', count: tickets.filter(t => t.priority === 'MEDIUM').length, color: PRIORITY_COLOR.MEDIUM },
    { key: 'LOW', name: 'Baixa', count: tickets.filter(t => t.priority === 'LOW').length, color: PRIORITY_COLOR.LOW },
  ];

  const detailedColumns = [
    {
      title: '#', dataIndex: 'code', key: 'code', width: 70,
      render: v => <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--cl-primary-text)', fontSize: 12 }}>{v ? String(v).padStart(4, '0') : '—'}</span>,
    },
    {
      title: 'Título', dataIndex: 'title', key: 'title', minWidth: 160,
      ellipsis: true,
      render: v => <span style={{ fontSize: 12, color: 'var(--cl-text-hi)' }}>{v}</span>,
    },
    {
      title: 'Empresa', key: 'company', width: 140,
      render: (_, r) => <span style={{ fontSize: 12, color: 'var(--cl-text-soft)' }}>{r.company?.name || '—'}</span>,
    },
    {
      title: 'Funcionário', key: 'employee', width: 130,
      render: (_, r) => <span style={{ fontSize: 12, color: 'var(--cl-text-soft)' }}>{r.employee?.name || '—'}</span>,
    },
    {
      title: 'Categoria', key: 'category', width: 120,
      render: (_, r) => <span style={{ fontSize: 12, color: 'var(--cl-text-soft)' }}>{r.category?.name || '—'}</span>,
    },
    {
      title: 'Prioridade', dataIndex: 'priority', key: 'priority', width: 100,
      render: v => <Tag style={{ fontSize: 11, borderRadius: 20, color: PRIORITY_COLOR[v], borderColor: `${PRIORITY_COLOR[v]}44`, background: `${PRIORITY_COLOR[v]}18` }}>{PRIORITY_LABEL[v]}</Tag>,
    },
    {
      title: 'Status', dataIndex: 'status', key: 'status', width: 120,
      render: v => <Tag style={{ fontSize: 11, borderRadius: 20, color: STATUS_COLOR[v], borderColor: `${STATUS_COLOR[v]}44`, background: `${STATUS_COLOR[v]}18` }}>{STATUS_LABEL[v]}</Tag>,
    },
    {
      title: 'Técnico / Resp.', key: 'tech', width: 130,
      render: (_, r) => <span style={{ fontSize: 12, color: 'var(--cl-text-soft)' }}>{r.technician?.name || r.assignee?.name || '—'}</span>,
    },
    {
      title: 'Abertura', dataIndex: 'createdAt', key: 'createdAt', width: 100,
      render: v => <span style={{ fontSize: 11, color: 'var(--cl-text-faint)' }}>{dayjs(v).format('DD/MM/YYYY')}</span>,
    },
  ];

  const tableProps = { loading, size: 'small', scroll: { x: 700 }, rowKey: 'key', pagination: { pageSize: 20, showSizeChanger: true, pageSizeOptions: ['10', '20', '50', '100'], showTotal: t => `${t} registros` } };

  const tabItems = [
    {
      key: 'summary',
      label: 'Resumo Geral',
      children: (
        <div style={{ padding: '16px 0 8px' }}>
          <Row gutter={[12, 16]}>
            <Col xs={24} md={12}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--cl-text-soft)', marginBottom: 8 }}>Chamados por Status</div>
              <Table
                dataSource={summaryStatusRows}
                rowKey="key"
                size="small"
                pagination={false}
                columns={[
                  { title: 'Status', dataIndex: 'name', key: 'name', render: (v, r) => <span style={{ fontWeight: 600, color: r.color }}>{v}</span> },
                  { title: 'Qtd.', dataIndex: 'count', key: 'count', align: 'center', render: v => <strong>{v}</strong> },
                  { title: '%', key: 'pct', align: 'center', render: (_, r) => <span style={{ color: 'var(--cl-text-muted)' }}>{summary.total > 0 ? Math.round(r.count / summary.total * 100) : 0}%</span> },
                ]}
              />
            </Col>
            <Col xs={24} md={12}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--cl-text-soft)', marginBottom: 8 }}>Chamados por Prioridade</div>
              <Table
                dataSource={priorityRows}
                rowKey="key"
                size="small"
                pagination={false}
                columns={[
                  { title: 'Prioridade', dataIndex: 'name', key: 'name', render: (v, r) => <span style={{ fontWeight: 600, color: r.color }}>{v}</span> },
                  { title: 'Qtd.', dataIndex: 'count', key: 'count', align: 'center', render: v => <strong>{v}</strong> },
                  { title: '%', key: 'pct', align: 'center', render: (_, r) => <span style={{ color: 'var(--cl-text-muted)' }}>{summary.total > 0 ? Math.round(r.count / summary.total * 100) : 0}%</span> },
                ]}
              />
            </Col>
          </Row>
        </div>
      ),
    },
    {
      key: 'company',
      label: 'Por Empresa',
      children: (
        <Table {...tableProps} dataSource={byCompany} columns={groupColumns('Empresa')} />
      ),
    },
    {
      key: 'employee',
      label: 'Por Funcionário',
      children: (
        <Table {...tableProps} dataSource={byEmployee} columns={groupColumns('Funcionário')} />
      ),
    },
    {
      key: 'category',
      label: 'Por Categoria',
      children: (
        <Table {...tableProps} dataSource={byCategory} columns={groupColumns('Categoria')} />
      ),
    },
    {
      key: 'technician',
      label: 'Por Técnico',
      children: (
        <Table {...tableProps} dataSource={byTechnician} columns={groupColumns('Técnico / Responsável')} />
      ),
    },
    {
      key: 'priority',
      label: 'Por Prioridade',
      children: (
        <Table {...tableProps} dataSource={byPriority} columns={groupColumns('Prioridade')} />
      ),
    },
    {
      key: 'detailed',
      label: 'Detalhado',
      children: (
        <Table {...tableProps} dataSource={tickets} columns={detailedColumns} rowKey="id"
          pagination={{ pageSize: 20, showSizeChanger: true, pageSizeOptions: ['10', '20', '50', '100'], showTotal: t => `${t} chamados` }}
        />
      ),
    },
  ];

  return (
    <div className="page-wrap">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Relatórios</h1>
          <p style={{ color: 'var(--cl-text-muted)', fontSize: 13, margin: '4px 0 0' }}>
            {loading ? 'Carregando...' : `${tickets.length} chamado${tickets.length !== 1 ? 's' : ''} no período · ${filterStr}`}
          </p>
        </div>
        <Space wrap>
          <Tooltip title="Visualizar impressão">
            <Button icon={<EyeOutlined />} onClick={handlePreview} disabled={tickets.length === 0}>
              Visualizar
            </Button>
          </Tooltip>
          <Tooltip title="Imprimir relatório">
            <Button icon={<PrinterOutlined />} onClick={handlePrint} disabled={tickets.length === 0}>
              Imprimir
            </Button>
          </Tooltip>
          <Tooltip title="Exportar planilha XLSX">
            <Button icon={<FileExcelOutlined />} onClick={handleExportXLSX} disabled={tickets.length === 0}
              style={{ color: 'var(--cl-success)', borderColor: 'rgba(16,185,129,0.3)' }}>
              XLSX
            </Button>
          </Tooltip>
          <Tooltip title="Exportar PDF">
            <Button icon={<FilePdfOutlined />} onClick={handleExportPDF} disabled={tickets.length === 0}
              style={{ color: 'var(--cl-danger)', borderColor: 'rgba(239,68,68,0.3)' }}>
              PDF
            </Button>
          </Tooltip>
        </Space>
      </div>

      {/* Filters */}
      <div className="filter-bar" style={{ flexWrap: 'wrap', gap: 8 }}>
        <RangePicker
          value={dateRange}
          onChange={setDateRange}
          format="DD/MM/YYYY"
          allowClear={false}
          style={{ minWidth: 240 }}
        />
        <Select
          placeholder="Todas as empresas"
          value={companyId}
          onChange={setCompanyId}
          allowClear
          showSearch
          optionFilterProp="children"
          style={{ minWidth: 180 }}
        >
          {companies.map(c => <Option key={c.id} value={c.id}>{c.name}</Option>)}
        </Select>
        <Select
          placeholder="Todas as categorias"
          value={categoryId}
          onChange={setCategoryId}
          allowClear
          showSearch
          optionFilterProp="children"
          style={{ minWidth: 180 }}
        >
          {categories.map(c => <Option key={c.id} value={c.id}>{c.name}</Option>)}
        </Select>
        <Select
          placeholder="Prioridade"
          value={priority}
          onChange={setPriority}
          allowClear
          style={{ minWidth: 130 }}
        >
          {Object.entries(PRIORITY_LABEL).map(([k, v]) => (
            <Option key={k} value={k}><span style={{ color: PRIORITY_COLOR[k] }}>{v}</span></Option>
          ))}
        </Select>
        <Select
          placeholder="Status"
          value={statusFilter}
          onChange={setStatusFilter}
          allowClear
          style={{ minWidth: 150 }}
        >
          {Object.entries(STATUS_LABEL).map(([k, v]) => (
            <Option key={k} value={k}><span style={{ color: STATUS_COLOR[k] }}>{v}</span></Option>
          ))}
        </Select>
        <Button type="primary" icon={<FilterOutlined />} onClick={loadReport} loading={loading}>
          Aplicar Filtros
        </Button>
        <Button icon={<ReloadOutlined />} onClick={() => {
          setDateRange([dayjs().subtract(30, 'day'), dayjs()]);
          setCompanyId(undefined); setCategoryId(undefined);
          setPriority(undefined); setStatusFilter(undefined);
        }}>
          Limpar
        </Button>
      </div>

      {/* KPI Cards */}
      {!loading && tickets.length > 0 && (
        <Row gutter={[10, 10]} style={{ marginBottom: 16 }}>
          <Col xs={12} sm={8} md={4}>
            <KPICard title="Total" value={summary.total} color="var(--cl-text-hi)" />
          </Col>
          <Col xs={12} sm={8} md={4}>
            <KPICard title="Abertos" value={summary.open} color="var(--cl-primary-text)" />
          </Col>
          <Col xs={12} sm={8} md={4}>
            <KPICard title="Em Andamento" value={summary.inProgress} color="var(--cl-purple)" />
          </Col>
          <Col xs={12} sm={8} md={4}>
            <KPICard title="Resolvidos" value={summary.resolved} color="var(--cl-success)" />
          </Col>
          <Col xs={12} sm={8} md={4}>
            <KPICard title="Fechados" value={summary.closed} color="var(--cl-text-faint)" />
          </Col>
          <Col xs={12} sm={8} md={4}>
            <KPICard title="Críticos" value={summary.critical} color="var(--cl-danger)"
              sub={summary.total > 0 ? `${Math.round(summary.critical / summary.total * 100)}% do total` : null}
            />
          </Col>
        </Row>
      )}

      {/* Report Tabs */}
      <div style={{ background: 'var(--cl-bg-card)', border: '1px solid var(--cl-border)', borderRadius: 12, overflow: 'hidden' }}>
        <Tabs
          activeKey={reportTab}
          onChange={setReportTab}
          tabBarStyle={{ padding: '0 16px', margin: 0, borderBottom: '1px solid var(--cl-border)' }}
          tabBarExtraContent={
            tickets.length > 0 && (
              <span style={{ fontSize: 12, color: 'var(--cl-text-faint)', paddingRight: 8 }}>
                <BarChartOutlined /> {tickets.length} chamado{tickets.length !== 1 ? 's' : ''}
              </span>
            )
          }
          items={tabItems}
          style={{ padding: '0 16px 16px' }}
        />
      </div>

      {/* Print Preview Modal */}
      <Modal
        title={
          <Space>
            <EyeOutlined style={{ color: 'var(--cl-primary-text)' }} />
            <span style={{ fontWeight: 700 }}>Visualização de Impressão</span>
          </Space>
        }
        open={previewOpen}
        onCancel={() => setPreviewOpen(false)}
        width="85%"
        styles={{ body: { padding: 0 } }}
        footer={
          <Space>
            <Button onClick={() => setPreviewOpen(false)}>Fechar</Button>
            <Button icon={<PrinterOutlined />} type="primary" onClick={() => {
              iframeRef.current?.contentWindow?.print();
            }}>
              Imprimir
            </Button>
          </Space>
        }
      >
        <iframe
          ref={iframeRef}
          srcDoc={previewHtml}
          style={{ width: '100%', height: '72vh', border: 'none', display: 'block' }}
          title="Visualização de impressão"
        />
      </Modal>
    </div>
  );
}
