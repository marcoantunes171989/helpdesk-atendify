import { useState, useEffect, useCallback } from 'react';
import { Select, Table, Tooltip, Button, Skeleton, Tag, Badge } from 'antd';
import {
  ArrowUpOutlined, ArrowDownOutlined,
  ExclamationCircleOutlined, SyncOutlined, ClockCircleOutlined,
  CheckCircleOutlined, TeamOutlined, RiseOutlined, FireOutlined,
  AlertOutlined, EyeOutlined,
} from '@ant-design/icons';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as ChartTooltip, Legend, ResponsiveContainer,
  BarChart, Bar, Cell,
} from 'recharts';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { dashboardService } from '../services/api';
import { useTheme } from '../contexts/ThemeContext';

// ─── Constants ────────────────────────────────────────────────────────────────

const PERIOD_OPTIONS = [
  { label: 'Hoje',       value: 'today' },
  { label: '7 dias',     value: '7d'    },
  { label: '14 dias',    value: '14d'   },
  { label: '30 dias',    value: '30d'   },
];

const PRIORITY_COLORS = {
  CRITICAL: { bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.35)',  text: '#f87171',  dot: '#ef4444' },
  HIGH:     { bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.35)', text: '#fb923c',  dot: '#f97316' },
  MEDIUM:   { bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.35)', text: '#60a5fa',  dot: '#3b82f6' },
  LOW:      { bg: 'rgba(100,116,139,0.10)',border: 'rgba(100,116,139,0.25)',text: 'var(--cl-text-soft)', dot: '#64748b' },
};

const CAT_GRADS = [
  ['#1d4ed8','#60a5fa'], ['#7c3aed','#a78bfa'], ['#0e7490','#22d3ee'],
  ['#15803d','#4ade80'], ['#b45309','#fbbf24'], ['#b91c1c','#f87171'],
  ['#0f766e','#2dd4bf'], ['#6d28d9','#c084fc'], ['#0369a1','#38bdf8'],
  ['#166534','#86efac'],
];

const SLA_STATUS_COLORS = { green: '#22c55e', yellow: '#eab308', red: '#f87171', none: 'var(--cl-text-dim)' };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtMin(min) {
  if (min === null || min === undefined) return '—';
  if (min < 60) return `${Math.round(min)}m`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function Delta({ pct, inverse = false }) {
  if (pct === null || pct === undefined) return null;
  const abs = Math.abs(pct);
  if (abs < 0.1) return <span style={{ color: 'var(--cl-text-dim)', fontSize: 11 }}><ArrowUpOutlined style={{ opacity: 0.3 }} /> {abs}%</span>;
  const isUp = pct > 0;
  const isBetter = inverse ? !isUp : isUp;
  const color = isBetter ? '#4ade80' : '#f87171';
  return (
    <span style={{ color, fontSize: 11, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 2 }}>
      {isUp ? <ArrowUpOutlined /> : <ArrowDownOutlined />}{abs}%
    </span>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Card({ children, style, pad = '20px 22px' }) {
  return (
    <div style={{
      background: 'var(--cl-bg)', border: '1px solid var(--cl-border)',
      borderRadius: 16, boxShadow: 'var(--cl-shadow)',
      padding: pad, ...style,
    }}>
      {children}
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--cl-text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 16 }}>
      {children}
    </div>
  );
}

function KpiCard({ cfg, value, delta_pct, trend }) {
  const [c0, c1] = cfg.grad;
  const displayVal = value === null || value === undefined ? '—' : cfg.format ? cfg.format(value) : value;
  const showDelta = delta_pct !== null && delta_pct !== undefined;

  return (
    <div style={{
      background: 'var(--cl-bg)', border: '1px solid var(--cl-border)',
      borderRadius: 16, padding: '18px 18px 16px',
      position: 'relative', overflow: 'hidden',
      boxShadow: 'var(--cl-shadow)',
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,${c0},${c1})`, borderRadius: '16px 16px 0 0' }} />
      <div style={{ position: 'absolute', top: -20, right: -20, width: 64, height: 64, borderRadius: '50%', background: cfg.glow, filter: 'blur(20px)', pointerEvents: 'none' }} />
      <div style={{ width: 32, height: 32, borderRadius: 8, marginBottom: 12, background: `linear-gradient(135deg,${c0}33,${c1}22)`, border: `1px solid ${c0}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: c1 }}>
        {cfg.icon}
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, lineHeight: 1, marginBottom: 4, background: `linear-gradient(135deg,${c1} 0%,var(--cl-text-hi) 100%)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
        {displayVal}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
        <div style={{ fontSize: 10, color: 'var(--cl-text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{cfg.label}</div>
        {showDelta && <Delta pct={delta_pct} inverse={cfg.inverse} />}
      </div>
    </div>
  );
}

function QueueRow({ item }) {
  const pc = PRIORITY_COLORS[item.priority];
  const hasCritical = item.priority === 'CRITICAL' && item.count > 0;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, background: item.count > 0 ? pc.bg : 'transparent', border: `1px solid ${item.count > 0 ? pc.border : 'var(--cl-border)'}`, transition: 'all 0.2s' }}>
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: item.count > 0 ? pc.dot : 'var(--cl-text-dim)' }} />
        {hasCritical && (
          <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: pc.dot, animation: 'pulse-ring 1.5s ease-out infinite', opacity: 0.4 }} />
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: item.count > 0 ? pc.text : 'var(--cl-text-soft)' }}>{item.label}</div>
        {item.count > 0 && (
          <div style={{ fontSize: 11, color: 'var(--cl-text-faint)', marginTop: 1 }}>
            Espera média: {item.avg_wait_min}m
            {item.expired_sla > 0 && <span style={{ color: '#f87171', marginLeft: 8 }}>· {item.expired_sla} SLA vencido{item.expired_sla !== 1 ? 's' : ''}</span>}
          </div>
        )}
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: item.count > 0 ? pc.text : 'var(--cl-text-dim)', lineHeight: 1 }}>
        {item.count}
      </div>
    </div>
  );
}

// ─── Chart tooltips ───────────────────────────────────────────────────────────

function VolumeTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--cl-bg)', border: '1px solid var(--cl-border)', borderRadius: 10, padding: '10px 14px', fontSize: 12 }}>
      <div style={{ fontWeight: 700, color: 'var(--cl-text-hi)', marginBottom: 6 }}>{dayjs(label).format('DD/MM/YYYY')}</div>
      {payload.map(p => (
        <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', gap: 20, color: p.color, marginBottom: 2 }}>
          <span>{p.name}</span><span style={{ fontWeight: 700 }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
}

function PeakTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--cl-bg)', border: '1px solid var(--cl-border)', borderRadius: 10, padding: '10px 14px', fontSize: 12 }}>
      <div style={{ fontWeight: 700, color: 'var(--cl-text-hi)', marginBottom: 6 }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', gap: 20, color: p.color, marginBottom: 2 }}>
          <span>{p.name}</span><span style={{ fontWeight: 700 }}>{p.value.toFixed(1)}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const navigate = useNavigate();
  const { resolvedTheme } = useTheme();

  const [period,     setPeriod]     = useState('14d');
  const [kpis,       setKpis]       = useState(null);
  const [volume,     setVolume]     = useState([]);
  const [categories, setCategories] = useState([]);
  const [slaData,    setSlaData]    = useState([]);
  const [peakHours,  setPeakHours]  = useState([]);
  const [agents,     setAgents]     = useState([]);
  const [queue,      setQueue]      = useState([]);

  const [loadK, setLoadK] = useState(true);
  const [loadV, setLoadV] = useState(true);
  const [loadC, setLoadC] = useState(true);
  const [loadS, setLoadS] = useState(true);
  const [loadP, setLoadP] = useState(true);
  const [loadA, setLoadA] = useState(true);
  const [loadQ, setLoadQ] = useState(true);
  const [queueTs, setQueueTs] = useState(null);

  // Chart colors (theme-aware, resolved values for SVG attributes)
  const cc = {
    text:   resolvedTheme === 'light' ? '#9ca3af' : 'rgba(255,255,255,0.32)',
    grid:   resolvedTheme === 'light' ? '#e5e7eb' : 'rgba(255,255,255,0.07)',
    blue:   '#3b82f6',
    green:  '#22c55e',
    red:    '#ef4444',
    orange: '#f97316',
    yellow: '#eab308',
  };

  const fetchKpis = useCallback(async () => {
    try { const d = await dashboardService.kpis(period); setKpis(d.kpis); }
    catch {} finally { setLoadK(false); }
  }, [period]);

  const fetchVolume = useCallback(async () => {
    setLoadV(true);
    try { const d = await dashboardService.volume(period); setVolume(d.data || []); }
    catch {} finally { setLoadV(false); }
  }, [period]);

  const fetchCategories = useCallback(async () => {
    setLoadC(true);
    try { const d = await dashboardService.categories(period); setCategories(d.data || []); }
    catch {} finally { setLoadC(false); }
  }, [period]);

  const fetchSla = useCallback(async () => {
    setLoadS(true);
    try { const d = await dashboardService.slaByPriority(period); setSlaData(d.data || []); }
    catch {} finally { setLoadS(false); }
  }, [period]);

  const fetchPeakHours = useCallback(async () => {
    setLoadP(true);
    try { const d = await dashboardService.peakHours(); setPeakHours(d.data || []); }
    catch {} finally { setLoadP(false); }
  }, []);

  const fetchAgents = useCallback(async () => {
    setLoadA(true);
    try { const d = await dashboardService.agents(period); setAgents(d.agents || []); }
    catch {} finally { setLoadA(false); }
  }, [period]);

  const fetchQueue = useCallback(async () => {
    try { const d = await dashboardService.queue(); setQueue(d.data || []); setQueueTs(d.updated_at); }
    catch {} finally { setLoadQ(false); }
  }, []);

  // Period-dependent data
  useEffect(() => {
    setLoadK(true);
    fetchKpis(); fetchVolume(); fetchCategories(); fetchSla(); fetchAgents();
    const iv = setInterval(fetchKpis, 60000);
    return () => clearInterval(iv);
  }, [period]);

  // Peak hours — always 30d, load once
  useEffect(() => { fetchPeakHours(); }, []);

  // Queue polling
  useEffect(() => {
    fetchQueue();
    const iv = setInterval(fetchQueue, 30000);
    return () => clearInterval(iv);
  }, []);

  // ─── KPI card definitions ────────────────────────────────────────────────────

  const KPI_CONFIGS = [
    { key: 'total_tickets_abertos',   label: 'Abertos',        icon: <ExclamationCircleOutlined />, grad: ['#b91c1c','#f87171'], glow: 'rgba(220,38,38,0.30)',  inverse: false },
    { key: 'tickets_resolvidos_hoje', label: 'Resolvidos Hoje',icon: <CheckCircleOutlined />,       grad: ['#15803d','#4ade80'], glow: 'rgba(22,163,74,0.30)',   inverse: false },
    { key: 'em_andamento',            label: 'Em Andamento',   icon: <SyncOutlined spin />,          grad: ['#b45309','#fbbf24'], glow: 'rgba(217,119,6,0.28)',   inverse: false },
    { key: 'sla_vencido',             label: 'SLA Vencido',    icon: <AlertOutlined />,              grad: ['#9f1239','#fb7185'], glow: 'rgba(159,18,57,0.30)',   inverse: false },
    { key: 'total_periodo',           label: 'No Período',     icon: <RiseOutlined />,               grad: ['#1d4ed8','#60a5fa'], glow: 'rgba(37,99,235,0.30)',   inverse: false },
    { key: 'tma_minutos',             label: 'TMA',            icon: <ClockCircleOutlined />,        grad: ['#0e7490','#22d3ee'], glow: 'rgba(14,116,144,0.30)',  inverse: true,  format: fmtMin },
    { key: 'sla_cumprido_pct',        label: 'SLA Cumprido',   icon: <FireOutlined />,               grad: ['#7c3aed','#a78bfa'], glow: 'rgba(124,58,237,0.30)', inverse: false, format: v => v !== null ? `${v}%` : '—' },
    { key: 'agentes_online',          label: 'Agentes Ativos', icon: <TeamOutlined />,               grad: ['#334155','#94a3b8'], glow: 'rgba(71,85,105,0.25)',   inverse: false },
  ];

  // ─── Alert conditions ────────────────────────────────────────────────────────

  const criticalQ = queue.find(q => q.priority === 'CRITICAL')?.count ?? 0;
  const p1Sla     = slaData.find(s => s.priority === 'CRITICAL')?.pct;
  const alerts    = [
    criticalQ > 0    && { type: 'error',   msg: `${criticalQ} ticket${criticalQ > 1 ? 's' : ''} crítico${criticalQ > 1 ? 's' : ''} na fila — redistribua imediatamente` },
    p1Sla !== null && p1Sla !== undefined && p1Sla < 80 && { type: 'error', msg: `SLA P1 em ${p1Sla}% (meta: 95%) — verifique os atrasos` },
  ].filter(Boolean);

  // ─── Highest peak hours (top 3) ─────────────────────────────────────────────
  const top3Hours = [...peakHours]
    .sort((a, b) => (b.seg_sex + b.sab_dom) - (a.seg_sex + a.sab_dom))
    .slice(0, 3)
    .map(h => h.hour);

  // ─── Agent table columns ─────────────────────────────────────────────────────

  const agentColumns = [
    {
      title: 'Agente', dataIndex: 'nome_agente', key: 'name', ellipsis: true,
      sorter: (a, b) => a.nome_agente.localeCompare(b.nome_agente, 'pt-BR'),
      render: (v, r) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(37,99,235,0.2)', color: '#60a5fa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
            {v?.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: 600, color: 'var(--cl-text-hi)', fontSize: 13 }}>{v}</div>
            <div style={{ fontSize: 11, color: 'var(--cl-text-muted)' }}>{r.equipe}</div>
          </div>
        </div>
      ),
    },
    {
      title: 'Resolvidos', dataIndex: 'tickets_resolvidos', key: 'resolved', width: 110,
      sorter: (a, b) => a.tickets_resolvidos - b.tickets_resolvidos,
      defaultSortOrder: 'descend',
      render: v => <span style={{ fontWeight: 700, color: '#60a5fa', fontSize: 14 }}>{v}</span>,
    },
    {
      title: 'TMA', dataIndex: 'tma_agente', key: 'tma', width: 90,
      sorter: (a, b) => (a.tma_agente ?? 9999) - (b.tma_agente ?? 9999),
      render: v => <span style={{ color: 'var(--cl-text-soft)', fontSize: 13 }}>{fmtMin(v)}</span>,
    },
    {
      title: 'CSAT', dataIndex: 'csat_agente', key: 'csat', width: 80,
      render: () => <span style={{ color: 'var(--cl-text-dim)' }}>—</span>,
    },
    {
      title: 'SLA', dataIndex: 'sla_agente_pct', key: 'sla', width: 90,
      sorter: (a, b) => (a.sla_agente_pct ?? -1) - (b.sla_agente_pct ?? -1),
      render: v => {
        if (v === null || v === undefined) return <span style={{ color: 'var(--cl-text-dim)' }}>—</span>;
        const color = v >= 85 ? '#4ade80' : v >= 70 ? '#fbbf24' : '#f87171';
        return <span style={{ fontWeight: 700, color, fontSize: 13 }}>{v}%</span>;
      },
    },
    {
      title: 'Status', dataIndex: 'status_atual', key: 'status', width: 90,
      render: v => <Tag color="success" style={{ borderRadius: 6, fontSize: 11, background: resolvedTheme === 'light' ? 'transparent' : undefined, border: resolvedTheme === 'light' ? 'none' : undefined }}>{v}</Tag>,
    },
  ];

  // ─── Render ───────────────────────────────────────────────────────────────────

  const maxCat = Math.max(...categories.map(c => c.count), 1);

  return (
    <div className="db-wrap">
      {/* Pulse keyframe */}
      <style>{`
        @keyframes pulse-ring {
          0%   { transform: scale(1);   opacity: 0.6; }
          100% { transform: scale(2.5); opacity: 0; }
        }
      `}</style>

      {/* Alert banners */}
      {alerts.map((al, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12,
          padding: '10px 16px', borderRadius: 10,
          background: al.type === 'error' ? 'rgba(239,68,68,0.12)' : 'rgba(234,179,8,0.12)',
          border: `1px solid ${al.type === 'error' ? 'rgba(239,68,68,0.4)' : 'rgba(234,179,8,0.4)'}`,
        }}>
          <ExclamationCircleOutlined style={{ color: al.type === 'error' ? '#f87171' : '#fbbf24', fontSize: 15, flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: al.type === 'error' ? '#f87171' : '#fbbf24', fontWeight: 500 }}>{al.msg}</span>
        </div>
      ))}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'linear-gradient(135deg,#2563eb,#60a5fa)', boxShadow: '0 0 8px rgba(96,165,250,0.9)' }} />
            <span style={{ color: 'var(--cl-text-faint)', fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Visão Geral</span>
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0, background: 'var(--cl-title-grad)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', fontFamily: "'Poppins',sans-serif", letterSpacing: '-0.5px' }}>
            Dashboard
          </h1>
          <p style={{ color: 'var(--cl-text-faint)', fontSize: 13, margin: '3px 0 0' }}>
            Indicadores operacionais em tempo real
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Select
            value={period}
            onChange={setPeriod}
            options={PERIOD_OPTIONS}
            style={{ width: 120 }}
          />
          <Tooltip title="Atualizar tudo">
            <Button
              icon={<SyncOutlined />}
              onClick={() => { fetchKpis(); fetchVolume(); fetchCategories(); fetchSla(); fetchAgents(); fetchQueue(); }}
            />
          </Tooltip>
        </div>
      </div>

      {/* KPI grid */}
      <div className="db-stat-grid" style={{ marginBottom: 20 }}>
        {KPI_CONFIGS.map(cfg => {
          const kpi = kpis?.[cfg.key];
          return loadK ? (
            <Skeleton.Button key={cfg.key} active block style={{ height: 110, borderRadius: 16 }} />
          ) : (
            <KpiCard key={cfg.key} cfg={cfg} value={kpi?.value} delta_pct={kpi?.delta_pct} trend={kpi?.trend} />
          );
        })}
      </div>

      {/* Volume + Queue row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, marginBottom: 16 }}>
        {/* Volume chart */}
        <Card pad="20px 22px">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <SectionLabel>Volume de Atendimentos</SectionLabel>
            <span style={{ fontSize: 11, color: 'var(--cl-text-faint)' }}>
              {PERIOD_OPTIONS.find(o => o.value === period)?.label}
            </span>
          </div>
          {loadV ? <Skeleton active paragraph={{ rows: 6 }} /> : volume.length === 0 ? (
            <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--cl-text-dim)', fontSize: 13 }}>Sem dados no período</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={volume} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={cc.grid} />
                <XAxis dataKey="date" tickFormatter={v => dayjs(v).format('DD/MM')} tick={{ fill: cc.text, fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: cc.text, fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <ChartTooltip content={<VolumeTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Line type="monotone" dataKey="opened"   name="Abertos"   stroke={cc.blue}   strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                <Line type="monotone" dataKey="resolved" name="Resolvidos" stroke={cc.green}  strokeWidth={2} strokeDasharray="5 3" dot={false} activeDot={{ r: 4 }} />
                <Line type="monotone" dataKey="expired"  name="SLA Vencido" stroke={cc.red}   strokeWidth={2} strokeDasharray="2 3" dot={false} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Queue real-time */}
        <Card pad="20px 18px" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <SectionLabel>Fila em Tempo Real</SectionLabel>
            {criticalQ > 0 && <Badge count={criticalQ} color="#ef4444" />}
          </div>
          {loadQ ? <Skeleton active paragraph={{ rows: 4 }} /> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {queue.map(item => <QueueRow key={item.priority} item={item} />)}
            </div>
          )}
          {queueTs && (
            <div style={{ fontSize: 10, color: 'var(--cl-text-dim)', marginTop: 'auto', paddingTop: 14, textAlign: 'right' }}>
              Atualizado: {dayjs(queueTs).format('HH:mm:ss')}
            </div>
          )}
        </Card>
      </div>

      {/* Categories + SLA row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Top categories */}
        <Card>
          <SectionLabel>Top Categorias</SectionLabel>
          {loadC ? <Skeleton active paragraph={{ rows: 5 }} /> : categories.length === 0 ? (
            <div style={{ color: 'var(--cl-text-dim)', fontSize: 13 }}>Sem dados no período</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
              {categories.map((cat, i) => {
                const [c0, c1] = CAT_GRADS[i % CAT_GRADS.length];
                const pct = Math.round((cat.count / maxCat) * 100);
                return (
                  <div key={cat.categoryId || i}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 18, height: 18, borderRadius: 5, background: `linear-gradient(135deg,${c0},${c1})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                          {i + 1}
                        </div>
                        <span style={{ fontSize: 12, color: 'var(--cl-text-soft)', fontWeight: 500 }}>{cat.name}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 10, color: 'var(--cl-text-faint)' }}>{cat.pct}%</span>
                        <span style={{ fontSize: 13, fontWeight: 800, background: `linear-gradient(90deg,${c0},${c1})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{cat.count}</span>
                      </div>
                    </div>
                    <div style={{ height: 4, borderRadius: 2, background: 'var(--cl-bg-soft)', overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', borderRadius: 2, background: `linear-gradient(90deg,${c0},${c1})`, boxShadow: `0 0 8px ${c1}50` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* SLA by priority */}
        <Card>
          <SectionLabel>Cumprimento de SLA por Prioridade</SectionLabel>
          {loadS ? <Skeleton active paragraph={{ rows: 4 }} /> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {slaData.map(item => {
                const color = SLA_STATUS_COLORS[item.status];
                const pct = item.pct ?? 0;
                return (
                  <div key={item.priority}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontSize: 12, color: 'var(--cl-text-soft)', fontWeight: 500 }}>{item.label}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 10, color: 'var(--cl-text-faint)' }}>meta {item.goal}%</span>
                        <span style={{ fontSize: 14, fontWeight: 800, color: item.pct !== null ? color : 'var(--cl-text-dim)' }}>
                          {item.pct !== null ? `${item.pct}%` : '—'}
                        </span>
                      </div>
                    </div>
                    <div style={{ position: 'relative', height: 8, borderRadius: 4, background: 'var(--cl-bg-soft)', overflow: 'visible' }}>
                      <div style={{ width: `${pct}%`, height: '100%', borderRadius: 4, background: color, boxShadow: `0 0 8px ${color}60`, transition: 'width 0.5s ease' }} />
                      {/* Goal marker */}
                      <div style={{ position: 'absolute', top: -3, left: `${item.goal}%`, width: 2, height: 14, background: 'var(--cl-text-muted)', borderRadius: 1, transform: 'translateX(-50%)' }} />
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--cl-text-faint)', marginTop: 4 }}>
                      {item.total > 0 ? `${item.compliant}/${item.total} tickets` : 'Sem dados no período'}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Peak hours */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <SectionLabel>Horários de Pico (últimos 30 dias)</SectionLabel>
          {top3Hours.length > 0 && (
            <div style={{ display: 'flex', gap: 6 }}>
              {top3Hours.map(h => (
                <span key={h} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: 'rgba(59,130,246,0.15)', color: '#60a5fa', fontWeight: 600 }}>
                  {h}
                </span>
              ))}
            </div>
          )}
        </div>
        {loadP ? <Skeleton active paragraph={{ rows: 5 }} /> : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={peakHours} margin={{ top: 4, right: 8, bottom: 0, left: -20 }} barCategoryGap="25%">
              <CartesianGrid strokeDasharray="3 3" stroke={cc.grid} vertical={false} />
              <XAxis dataKey="hour" tick={{ fill: cc.text, fontSize: 10 }} tickLine={false} axisLine={false} interval={1} />
              <YAxis tick={{ fill: cc.text, fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
              <ChartTooltip content={<PeakTooltip />} cursor={false} />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              <Bar dataKey="seg_sex" name="Seg–Sex" radius={[3, 3, 0, 0]}>
                {peakHours.map((entry) => (
                  <Cell key={entry.hour} fill={top3Hours.includes(entry.hour) ? cc.blue : `${cc.blue}70`} />
                ))}
              </Bar>
              <Bar dataKey="sab_dom" name="Sáb–Dom" radius={[3, 3, 0, 0]}>
                {peakHours.map((entry) => (
                  <Cell key={entry.hour} fill={top3Hours.includes(entry.hour) ? cc.orange : `${cc.orange}70`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Agent performance table */}
      <Card pad="0">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 22px', borderBottom: '1px solid var(--cl-border)' }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--cl-text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
            Performance por Agente
            <span style={{ fontSize: 11, color: 'var(--cl-text-faint)', fontWeight: 400, textTransform: 'none', letterSpacing: 0, marginLeft: 8 }}>
              {PERIOD_OPTIONS.find(o => o.value === period)?.label}
            </span>
          </span>
          <span style={{ fontSize: 12, color: 'var(--cl-text-faint)' }}>{agents.length} agente{agents.length !== 1 ? 's' : ''}</span>
        </div>
        {loadA ? (
          <div style={{ padding: 22 }}><Skeleton active paragraph={{ rows: 4 }} /></div>
        ) : (
          <Table
            dataSource={agents}
            columns={agentColumns}
            rowKey="id"
            size="middle"
            pagination={agents.length > 15 ? { pageSize: 15, showSizeChanger: false } : false}
            scroll={{ x: 700 }}
          />
        )}
      </Card>
    </div>
  );
}
