import { useState, useEffect, useCallback } from 'react';
import { Table, Tooltip, Button, Skeleton, Badge } from 'antd';
import {
  ArrowUpOutlined, ArrowDownOutlined,
  ExclamationCircleOutlined, SyncOutlined, ClockCircleOutlined,
  CheckCircleOutlined, PauseCircleOutlined, AlertOutlined,
  SmileOutlined, PlusCircleOutlined,
} from '@ant-design/icons';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as ChartTooltip, Legend, ResponsiveContainer,
} from 'recharts';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { dashboardService } from '../services/api';
import { useTheme } from '../contexts/ThemeContext';
import DashboardCard from '../components/dashboard/DashboardCard';
import ChartCard from '../components/dashboard/ChartCard';
import EmptyState from '../components/dashboard/EmptyState';
import PeriodFilter, { periodLabel } from '../components/dashboard/PeriodFilter';
import ProgressMetric from '../components/dashboard/ProgressMetric';
import QueueItem from '../components/dashboard/QueueItem';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtMin(min) {
  if (min === null || min === undefined) return '—';
  if (min < 60) return `${Math.round(min)}m`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function fmtCsat(v) {
  return v === null || v === undefined ? '—' : `${v.toFixed(1)}/5`;
}

function Delta({ pct, inverse = false }) {
  if (pct === null || pct === undefined) return null;
  const abs = Math.abs(pct);
  if (abs < 0.1) return <span style={{ color: 'var(--cl-text-dim)', fontSize: 11 }}>{abs}%</span>;
  const isUp = pct > 0;
  const isBetter = inverse ? !isUp : isUp;
  const color = isBetter ? 'var(--cl-success)' : 'var(--cl-danger)';
  return (
    <span style={{ color, fontSize: 11, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 2 }}>
      {isUp ? <ArrowUpOutlined /> : <ArrowDownOutlined />}{abs}%
    </span>
  );
}

function KpiTile({ cfg, kpi, loading, onClick }) {
  if (loading) return <Skeleton.Button active block style={{ height: 104, borderRadius: 12 }} />;
  const value = kpi?.value;
  const display = value === null || value === undefined ? (cfg.nullLabel || '—') : (cfg.format ? cfg.format(value) : value);
  const showDelta = kpi?.delta_pct !== null && kpi?.delta_pct !== undefined;

  return (
    <Tooltip title={cfg.tooltip}>
      <DashboardCard padding="16px 18px" onClick={onClick} style={{ height: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8, background: `${cfg.color}18`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: cfg.color, fontSize: 14,
          }}>
            {cfg.icon}
          </div>
          {showDelta && <Delta pct={kpi.delta_pct} inverse={cfg.inverse} />}
        </div>
        <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--cl-text-hi)', lineHeight: 1, marginBottom: 4 }}>
          {display}
        </div>
        <div style={{ fontSize: 12, color: 'var(--cl-text-muted)', fontWeight: 500 }}>{cfg.label}</div>
      </DashboardCard>
    </Tooltip>
  );
}

function VolumeTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--cl-bg)', border: '1px solid var(--cl-border)', borderRadius: 10, padding: '10px 14px', fontSize: 12, boxShadow: 'var(--cl-shadow)' }}>
      <div style={{ fontWeight: 700, color: 'var(--cl-text-hi)', marginBottom: 6 }}>{dayjs(label).format('DD/MM/YYYY')}</div>
      {payload.map(p => (
        <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', gap: 20, color: p.color, marginBottom: 2 }}>
          <span>{p.name}</span><span style={{ fontWeight: 700 }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
}

const SLA_STATUS_COLOR = { green: 'var(--cl-success)', yellow: 'var(--cl-warning)', red: 'var(--cl-danger)', none: 'var(--cl-text-dim)' };
const PRIORITY_LABEL = { CRITICAL: 'Crítica', HIGH: 'Alta', MEDIUM: 'Média', LOW: 'Baixa' };
const CAT_COLORS = ['#2563eb', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#0891b2', '#7c3aed', '#0ea5e9', '#16a34a'];

// ─── Main component ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const navigate = useNavigate();
  const { resolvedTheme } = useTheme();

  const [period, setPeriod] = useState({ period: '14d' });
  const [kpis,       setKpis]       = useState(null);
  const [volume,     setVolume]     = useState([]);
  const [categories, setCategories] = useState([]);
  const [slaData,    setSlaData]    = useState([]);
  const [byStatus,   setByStatus]   = useState([]);
  const [agents,     setAgents]     = useState([]);
  const [queue,      setQueue]      = useState([]);

  const [loadK, setLoadK] = useState(true);
  const [loadV, setLoadV] = useState(true);
  const [loadC, setLoadC] = useState(true);
  const [loadS, setLoadS] = useState(true);
  const [loadB, setLoadB] = useState(true);
  const [loadA, setLoadA] = useState(true);
  const [loadQ, setLoadQ] = useState(true);
  const [errV, setErrV] = useState(false);
  const [queueTs, setQueueTs] = useState(null);

  const cc = {
    text: resolvedTheme === 'light' ? '#94a3b8' : 'rgba(255,255,255,0.32)',
    grid: resolvedTheme === 'light' ? '#e2e8f0' : 'rgba(255,255,255,0.07)',
    blue: '#2563eb', green: '#10b981', red: '#ef4444',
  };

  const fetchKpis = useCallback(async () => {
    try { const d = await dashboardService.kpis(period); setKpis(d.kpis); }
    catch {} finally { setLoadK(false); }
  }, [period]);

  const fetchVolume = useCallback(async () => {
    setLoadV(true); setErrV(false);
    try { const d = await dashboardService.volume(period); setVolume(d.data || []); }
    catch { setErrV(true); } finally { setLoadV(false); }
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

  const fetchByStatus = useCallback(async () => {
    setLoadB(true);
    try { const d = await dashboardService.byStatus(period); setByStatus(d.data || []); }
    catch {} finally { setLoadB(false); }
  }, [period]);

  const fetchAgents = useCallback(async () => {
    setLoadA(true);
    try { const d = await dashboardService.agents(period); setAgents(d.agents || []); }
    catch {} finally { setLoadA(false); }
  }, [period]);

  const fetchQueue = useCallback(async () => {
    try { const d = await dashboardService.queue(); setQueue(d.data || []); setQueueTs(d.updated_at); }
    catch {} finally { setLoadQ(false); }
  }, []);

  const refetchAll = () => { fetchKpis(); fetchVolume(); fetchCategories(); fetchSla(); fetchByStatus(); fetchAgents(); fetchQueue(); };

  useEffect(() => {
    setLoadK(true);
    fetchKpis(); fetchVolume(); fetchCategories(); fetchSla(); fetchByStatus(); fetchAgents();
    const iv = setInterval(fetchKpis, 60000);
    return () => clearInterval(iv);
  }, [period]);

  useEffect(() => {
    fetchQueue();
    const iv = setInterval(fetchQueue, 30000);
    return () => clearInterval(iv);
  }, []);

  const goToTickets = (state) => navigate('/app/tickets', { state });

  const KPI_CONFIGS = [
    {
      key: 'total_tickets_abertos', label: 'Chamados abertos', icon: <ExclamationCircleOutlined />, color: 'var(--cl-danger)',
      tooltip: 'Chamados com status Aberto neste momento.',
      onClick: () => goToTickets({ builtinStatus: 'OPEN' }),
    },
    {
      key: 'novos_hoje', label: 'Novos hoje', icon: <PlusCircleOutlined />, color: 'var(--cl-primary)',
      tooltip: 'Chamados abertos hoje, independente do período selecionado.',
    },
    {
      key: 'em_andamento', label: 'Em atendimento', icon: <SyncOutlined spin />, color: 'var(--cl-warning)',
      tooltip: 'Chamados com status Em Andamento.',
      onClick: () => goToTickets({ builtinStatus: 'IN_PROGRESS' }),
    },
    {
      key: 'aguardando_cliente', label: 'Aguardando cliente', icon: <PauseCircleOutlined />, color: 'var(--cl-purple)',
      tooltip: 'Chamados no status configurado como "Aguardando Cliente".',
      nullLabel: 'Não configurado',
      onClick: (kpi) => kpi?.status_id && goToTickets({ statusId: kpi.status_id }),
    },
    {
      key: 'sla_vencido', label: 'SLA vencido', icon: <AlertOutlined />, color: 'var(--cl-danger)',
      tooltip: 'Chamados abertos com prazo de SLA já vencido.',
      onClick: () => goToTickets({ slaExpiredOnly: true }),
    },
    {
      key: 'tickets_resolvidos_hoje', label: 'Resolvidos hoje', icon: <CheckCircleOutlined />, color: 'var(--cl-success)',
      tooltip: 'Chamados resolvidos ou fechados hoje.',
    },
    {
      key: 'tma_minutos', label: 'Tempo médio de atendimento', icon: <ClockCircleOutlined />, color: 'var(--cl-secondary)',
      tooltip: 'Tempo médio entre abertura e resolução dos chamados no período.',
      inverse: true, format: fmtMin,
    },
    {
      key: 'satisfacao_media', label: 'Satisfação média', icon: <SmileOutlined />, color: 'var(--cl-purple)',
      tooltip: 'Média das avaliações (1 a 5) dadas pelos clientes nos chamados resolvidos no período.',
      nullLabel: 'Sem dados', format: fmtCsat,
    },
  ];

  const criticalQ = queue.find(q => q.priority === 'CRITICAL')?.count ?? 0;
  const p1Sla     = slaData.find(s => s.priority === 'CRITICAL')?.pct;
  const alerts    = [
    criticalQ > 0    && { msg: `${criticalQ} chamado${criticalQ > 1 ? 's' : ''} crítico${criticalQ > 1 ? 's' : ''} na fila — redistribua imediatamente` },
    p1Sla !== null && p1Sla !== undefined && p1Sla < 80 && { msg: `SLA da prioridade crítica em ${p1Sla}% (meta: 95%) — verifique os atrasos` },
  ].filter(Boolean);

  const agentColumns = [
    {
      title: 'Agente', dataIndex: 'nome_agente', key: 'name', ellipsis: true,
      sorter: (a, b) => a.nome_agente.localeCompare(b.nome_agente, 'pt-BR'),
      render: (v, r) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(37,99,235,0.12)', color: 'var(--cl-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
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
      render: v => <span style={{ fontWeight: 700, color: 'var(--cl-primary)', fontSize: 14 }}>{v}</span>,
    },
    {
      title: 'TMA', dataIndex: 'tma_agente', key: 'tma', width: 90,
      sorter: (a, b) => (a.tma_agente ?? 9999) - (b.tma_agente ?? 9999),
      render: v => <span style={{ color: 'var(--cl-text-soft)', fontSize: 13 }}>{fmtMin(v)}</span>,
    },
    {
      title: 'CSAT', dataIndex: 'csat_agente', key: 'csat', width: 90,
      sorter: (a, b) => (a.csat_agente ?? -1) - (b.csat_agente ?? -1),
      render: v => <span style={{ color: v !== null ? 'var(--cl-text-hi)' : 'var(--cl-text-dim)', fontSize: 13, fontWeight: v !== null ? 600 : 400 }}>{fmtCsat(v)}</span>,
    },
    {
      title: 'SLA', dataIndex: 'sla_agente_pct', key: 'sla', width: 90,
      sorter: (a, b) => (a.sla_agente_pct ?? -1) - (b.sla_agente_pct ?? -1),
      render: v => {
        if (v === null || v === undefined) return <span style={{ color: 'var(--cl-text-dim)' }}>—</span>;
        const color = v >= 85 ? 'var(--cl-success)' : v >= 70 ? 'var(--cl-warning)' : 'var(--cl-danger)';
        return <span style={{ fontWeight: 700, color, fontSize: 13 }}>{v}%</span>;
      },
    },
  ];

  const maxCat = Math.max(...categories.map(c => c.count), 1);
  const maxStatus = Math.max(...byStatus.map(s => s.count), 1);
  const isVolumeEmpty = volume.every(d => d.opened === 0 && d.resolved === 0 && d.expired === 0);

  return (
    <div className="db-wrap">
      <style>{`
        @keyframes pulse-ring {
          0%   { transform: scale(1);   opacity: 0.6; }
          100% { transform: scale(2.5); opacity: 0; }
        }
      `}</style>

      {alerts.map((al, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12,
          padding: '10px 16px', borderRadius: 10,
          background: 'rgba(239,68,68,0.10)',
          border: '1px solid rgba(239,68,68,0.35)',
        }}>
          <ExclamationCircleOutlined style={{ color: 'var(--cl-danger)', fontSize: 15, flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: 'var(--cl-danger)', fontWeight: 500 }}>{al.msg}</span>
        </div>
      ))}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: 'var(--cl-text-hi)', fontFamily: "'Poppins',sans-serif", letterSpacing: '-0.3px' }}>
            Dashboard
          </h1>
          <p style={{ color: 'var(--cl-text-muted)', fontSize: 13, margin: '3px 0 0' }}>
            {queueTs ? `Atualizado às ${dayjs(queueTs).format('HH:mm:ss')}` : 'Indicadores operacionais'}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <PeriodFilter value={period} onChange={setPeriod} />
          <Tooltip title="Atualizar tudo">
            <Button icon={<SyncOutlined />} onClick={refetchAll} />
          </Tooltip>
        </div>
      </div>

      {/* KPI grid */}
      <div className="db-stat-grid">
        {KPI_CONFIGS.map(cfg => (
          <KpiTile
            key={cfg.key}
            cfg={cfg}
            kpi={kpis?.[cfg.key]}
            loading={loadK}
            onClick={cfg.onClick ? () => cfg.onClick(kpis?.[cfg.key]) : undefined}
          />
        ))}
      </div>

      {/* Visão geral dos atendimentos */}
      <ChartCard
        title="Visão geral dos atendimentos"
        extra={<span style={{ fontSize: 11, color: 'var(--cl-text-faint)' }}>{periodLabel(period)}</span>}
        loading={loadV}
        error={errV}
        onRetry={fetchVolume}
        isEmpty={isVolumeEmpty}
        height={260}
        style={{ marginBottom: 24 }}
      >
        <ResponsiveContainer width="100%" height={260} style={{ outline: 'none' }}>
          <LineChart data={volume} margin={{ top: 4, right: 8, bottom: 0, left: -20 }} style={{ outline: 'none' }}>
            <CartesianGrid strokeDasharray="3 3" stroke={cc.grid} />
            <XAxis dataKey="date" tickFormatter={v => dayjs(v).format('DD/MM')} tick={{ fill: cc.text, fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: cc.text, fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
            <ChartTooltip content={<VolumeTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
            <Line type="monotone" dataKey="opened"   name="Abertos"    stroke={cc.blue}  strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            <Line type="monotone" dataKey="resolved" name="Resolvidos" stroke={cc.green} strokeWidth={2} strokeDasharray="5 3" dot={false} activeDot={{ r: 4 }} />
            <Line type="monotone" dataKey="expired"  name="SLA Vencido" stroke={cc.red}  strokeWidth={2} strokeDasharray="2 3" dot={false} activeDot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Fila em tempo real */}
      <DashboardCard
        title="Fila em tempo real"
        extra={criticalQ > 0 && <Badge count={criticalQ} color="var(--cl-danger)" />}
        style={{ marginBottom: 24 }}
      >
        {loadQ ? <Skeleton active paragraph={{ rows: 4 }} /> : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 10 }}>
            {queue.map(item => (
              <QueueItem key={item.priority} item={item} onClick={() => goToTickets({ priority: item.priority })} />
            ))}
          </div>
        )}
      </DashboardCard>

      {/* SLA por prioridade + Chamados por status */}
      <div className="db-section-grid">
        <DashboardCard title="SLA por prioridade">
          {loadS ? <Skeleton active paragraph={{ rows: 4 }} /> : slaData.length === 0 ? <EmptyState /> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {slaData.map(item => (
                <ProgressMetric
                  key={item.priority}
                  label={item.label}
                  pct={item.pct ?? 0}
                  goalPct={item.goal}
                  barColor={SLA_STATUS_COLOR[item.status]}
                  onClick={() => goToTickets({ priority: item.priority })}
                  trailing={<>
                    <span style={{ fontSize: 10, color: 'var(--cl-text-faint)' }}>meta {item.goal}%</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: item.pct !== null ? SLA_STATUS_COLOR[item.status] : 'var(--cl-text-dim)' }}>
                      {item.pct !== null ? `${item.pct}%` : '—'}
                    </span>
                  </>}
                  footer={item.total > 0 ? `${item.compliant}/${item.total} tickets` : 'Sem dados no período'}
                />
              ))}
            </div>
          )}
        </DashboardCard>

        <DashboardCard title="Chamados por status">
          {loadB ? <Skeleton active paragraph={{ rows: 4 }} /> : byStatus.length === 0 ? <EmptyState /> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {byStatus.map(s => (
                <ProgressMetric
                  key={s.key}
                  leading={<span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, display: 'inline-block', flexShrink: 0 }} />}
                  label={s.name}
                  pct={Math.round((s.count / maxStatus) * 100)}
                  barColor={s.color}
                  onClick={() => goToTickets(s.custom ? { statusId: s.key } : { builtinStatus: s.key })}
                  trailing={<>
                    <span style={{ fontSize: 10, color: 'var(--cl-text-faint)' }}>{s.pct}%</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--cl-text-hi)' }}>{s.count}</span>
                  </>}
                />
              ))}
            </div>
          )}
        </DashboardCard>
      </div>

      {/* Principais categorias */}
      <DashboardCard title="Principais categorias" style={{ marginBottom: 24 }}>
        {loadC ? <Skeleton active paragraph={{ rows: 5 }} /> : categories.length === 0 ? <EmptyState /> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {categories.map((cat, i) => (
              <ProgressMetric
                key={cat.categoryId || i}
                leading={
                  <span style={{
                    width: 18, height: 18, borderRadius: 5, background: CAT_COLORS[i % CAT_COLORS.length],
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: '#fff', flexShrink: 0,
                  }}>
                    {i + 1}
                  </span>
                }
                label={cat.name}
                pct={Math.round((cat.count / maxCat) * 100)}
                barColor={CAT_COLORS[i % CAT_COLORS.length]}
                onClick={() => goToTickets({ categoryId: cat.categoryId })}
                trailing={<>
                  <span style={{ fontSize: 10, color: 'var(--cl-text-faint)' }}>{cat.pct}%</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--cl-text-hi)' }}>{cat.count}</span>
                  <Delta pct={cat.delta_pct} />
                </>}
              />
            ))}
          </div>
        )}
      </DashboardCard>

      {/* Desempenho da equipe */}
      <DashboardCard padding="0">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 22px', borderBottom: '1px solid var(--cl-border)' }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--cl-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Desempenho da equipe
            <span style={{ fontSize: 11, color: 'var(--cl-text-faint)', fontWeight: 400, textTransform: 'none', letterSpacing: 0, marginLeft: 8 }}>
              {periodLabel(period)}
            </span>
          </span>
          <span style={{ fontSize: 12, color: 'var(--cl-text-faint)' }}>{agents.length} agente{agents.length !== 1 ? 's' : ''}</span>
        </div>
        {loadA ? (
          <div style={{ padding: 22 }}><Skeleton active paragraph={{ rows: 4 }} /></div>
        ) : agents.length === 0 ? (
          <div style={{ padding: 22 }}><EmptyState height={120} /></div>
        ) : (
          <Table
            dataSource={agents}
            columns={agentColumns}
            rowKey="id"
            size="middle"
            pagination={agents.length > 15 ? { pageSize: 15, showSizeChanger: false } : false}
            scroll={{ x: 600 }}
          />
        )}
      </DashboardCard>
    </div>
  );
}