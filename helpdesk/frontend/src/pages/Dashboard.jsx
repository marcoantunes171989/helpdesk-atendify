import { useEffect, useState } from 'react';
import { Table, Tag, Spin, Alert, Input, Tooltip, Button } from 'antd';
import {
  ClockCircleOutlined, CheckCircleOutlined, SyncOutlined,
  ExclamationCircleOutlined, CloseCircleOutlined, RiseOutlined, EyeOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { dashboardService } from '../services/api';
import { TICKET_STATUS, PRIORITY } from '../utils/constants';

const STAT_CONFIGS = [
  { key: 'total',      label: 'Total',        grad: ['#4b5563', '#9ca3af'], glow: 'rgba(75,85,99,0.30)',    icon: <ClockCircleOutlined /> },
  { key: 'open',       label: 'Abertos',      grad: ['#1d4ed8', '#60a5fa'], glow: 'rgba(37,99,235,0.35)',   icon: <ExclamationCircleOutlined /> },
  { key: 'inProgress', label: 'Em Andamento', grad: ['#b45309', '#fbbf24'], glow: 'rgba(217,119,6,0.30)',   icon: <SyncOutlined spin /> },
  { key: 'resolved',   label: 'Resolvidos',   grad: ['#15803d', '#4ade80'], glow: 'rgba(22,163,74,0.30)',   icon: <CheckCircleOutlined /> },
  { key: 'closed',     label: 'Fechados',     grad: ['#334155', '#94a3b8'], glow: 'rgba(71,85,105,0.25)',   icon: <CloseCircleOutlined /> },
  { key: 'overdueSla', label: 'SLA Vencido',  grad: ['#b91c1c', '#f87171'], glow: 'rgba(220,38,38,0.35)',   icon: <RiseOutlined /> },
];

const PRIORITY_GRADS = {
  LOW:    ['#15803d', '#4ade80'],
  MEDIUM: ['#1d4ed8', '#60a5fa'],
  HIGH:   ['#b45309', '#fbbf24'],
  URGENT: ['#b91c1c', '#f87171'],
};

const CAT_GRADS = [
  ['#1d4ed8', '#60a5fa'],
  ['#7c3aed', '#a78bfa'],
  ['#0e7490', '#22d3ee'],
  ['#15803d', '#4ade80'],
  ['#b45309', '#fbbf24'],
];

const DB_STYLE = `
  .db-wrap { margin: -24px; padding: 32px 28px 48px; background: linear-gradient(160deg,#090912 0%,#0d0d1a 55%,#080810 100%); min-height: calc(100vh - 64px); }
  .db-stat-grid { display: grid; grid-template-columns: repeat(6,1fr); gap: 14px; margin-bottom: 20px; }
  .db-chart-grid { display: grid; grid-template-columns: 2fr 3fr; gap: 14px; margin-bottom: 20px; }
  @media (max-width: 1280px) { .db-stat-grid { grid-template-columns: repeat(3,1fr); } }
  @media (max-width: 900px)  { .db-stat-grid { grid-template-columns: repeat(2,1fr); } .db-chart-grid { grid-template-columns: 1fr; } }
  @media (max-width: 768px)  { .db-wrap { margin: -16px; padding: 20px 16px 32px; } }

  .db-dark .ant-table-wrapper,.db-dark .ant-spin-nested-loading,.db-dark .ant-spin-container,.db-dark .ant-table,.db-dark .ant-table-container,.db-dark .ant-table-content,.db-dark .ant-table-body { background: transparent !important; }
  .db-dark .ant-table-thead > tr > th,.db-dark .ant-table-thead > tr > td {
    background: rgba(255,255,255,.04) !important; color: rgba(255,255,255,.38) !important;
    border-bottom: 1px solid rgba(255,255,255,.07) !important;
    font-size: 10px !important; font-weight: 700 !important;
    text-transform: uppercase; letter-spacing: .08em !important; padding: 10px 12px !important;
  }
  .db-dark .ant-table-tbody > tr,.db-dark .ant-table-tbody > tr.ant-table-row { background: transparent !important; }
  .db-dark .ant-table-tbody > tr > td,.db-dark .ant-table-tbody > tr > td.ant-table-cell,.db-dark .ant-table-tbody > tr > td.ant-table-cell-row-hover { border-bottom: 1px solid rgba(255,255,255,.05) !important; background: transparent !important; color: rgba(255,255,255,.75) !important; }
  .db-dark .ant-table-tbody > tr.ant-table-row:hover > td,.db-dark .ant-table-tbody > tr:hover > td { background: rgba(255,255,255,.04) !important; }
  .db-dark .ant-table-tbody > tr:last-child > td { border-bottom: none !important; }
  .db-dark .ant-table-placeholder,.db-dark .ant-table-placeholder td { background: transparent !important; border-bottom: none !important; }
  .db-dark .ant-table-column-sorter { color: rgba(255,255,255,.2) !important; }
  .db-dark .ant-table-column-sorter-up.active, .db-dark .ant-table-column-sorter-down.active { color: #60a5fa !important; }
  .db-dark .ant-input-affix-wrapper { background: rgba(255,255,255,.07) !important; border-color: rgba(255,255,255,.12) !important; box-shadow: none !important; }
  .db-dark .ant-input-affix-wrapper:hover,.db-dark .ant-input-affix-wrapper:focus-within { border-color: rgba(255,255,255,.25) !important; box-shadow: none !important; }
  .db-dark .ant-input { background: transparent !important; color: rgba(255,255,255,.82) !important; }
  .db-dark .ant-input::placeholder { color: rgba(255,255,255,.22) !important; }
  .db-dark .anticon { color: rgba(255,255,255,.35) !important; }
  .db-dark .ant-btn-text:hover { background: rgba(255,255,255,.06) !important; }
`;

function GlassCard({ children, style }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 16,
      boxShadow: '0 4px 28px rgba(0,0,0,0.35)',
      ...style,
    }}>
      {children}
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    dashboardService.stats()
      .then(setData)
      .catch(() => setError('Erro ao carregar dados'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300, background: '#090912' }}>
      <Spin size="large" />
    </div>
  );
  if (error) return <Alert type="error" message={error} />;

  const { summary, byPriority, byCategory, recentTickets } = data;

  const filteredTickets = search
    ? (() => {
        const q = search.toLowerCase();
        return recentTickets.filter(r => [
          r.id, r.title, r.category?.name,
          r.company?.name, r.company?.fantasia, r.employee?.name,
          TICKET_STATUS[r.status]?.label, PRIORITY[r.priority]?.label,
        ].some(f => (f || '').toLowerCase().includes(q)));
      })()
    : recentTickets;

  const maxPriority = Math.max(...byPriority.map(p => p._count), 1);
  const maxCategory = Math.max(...byCategory.map(c => c._count), 1);

  const columns = [
    {
      title: '#', dataIndex: 'code', key: 'code', width: 70,
      sorter: (a, b) => (a.code || 0) - (b.code || 0),
      render: v => (
        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#60a5fa', fontSize: 13 }}>
          {v ? String(v).padStart(4, '0') : '—'}
        </span>
      ),
    },
    {
      title: 'Título', dataIndex: 'title', key: 'title', ellipsis: true,
      sorter: (a, b) => a.title.localeCompare(b.title, 'pt-BR'),
      render: v => <span style={{ fontWeight: 500, color: 'rgba(255,255,255,0.85)' }}>{v}</span>,
    },
    {
      title: 'Empresa', key: 'company',
      sorter: (a, b) => (a.company?.name || '').localeCompare(b.company?.name || '', 'pt-BR'),
      render: (_, r) => (
        <div>
          <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: 500 }}>{r.company?.name || '—'}</div>
          {r.company?.fantasia && (
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.32)', marginTop: 1 }}>{r.company.fantasia}</div>
          )}
        </div>
      ),
    },
    {
      title: 'Funcionário', key: 'employee',
      sorter: (a, b) => (a.employee?.name || '').localeCompare(b.employee?.name || '', 'pt-BR'),
      render: (_, r) => r.employee?.name
        ? <span style={{ color: 'rgba(255,255,255,0.52)', fontSize: 13 }}>{r.employee.name}</span>
        : <span style={{ color: 'rgba(255,255,255,0.18)' }}>—</span>,
    },
    {
      title: 'Categoria', dataIndex: ['category', 'name'], key: 'category',
      sorter: (a, b) => (a.category?.name || '').localeCompare(b.category?.name || '', 'pt-BR'),
      render: v => v
        ? <span style={{ color: 'rgba(255,255,255,0.48)' }}>{v}</span>
        : <span style={{ color: 'rgba(255,255,255,0.18)' }}>—</span>,
    },
    {
      title: 'Status', dataIndex: 'status', key: 'status',
      sorter: (a, b) => a.status.localeCompare(b.status),
      render: v => <Tag color={TICKET_STATUS[v]?.color} style={{ borderRadius: 6 }}>{TICKET_STATUS[v]?.label}</Tag>,
    },
    {
      title: 'Prioridade', dataIndex: 'priority', key: 'priority',
      sorter: (a, b) => a.priority.localeCompare(b.priority),
      render: v => <Tag color={PRIORITY[v]?.color} style={{ borderRadius: 6 }}>{PRIORITY[v]?.label}</Tag>,
    },
    {
      title: 'Abertura', dataIndex: 'createdAt', key: 'createdAt',
      sorter: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
      render: v => <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>{dayjs(v).format('DD/MM/YY HH:mm')}</span>,
    },
    {
      title: '', key: 'actions', width: 44,
      render: (_, r) => (
        <Tooltip title="Ver detalhes">
          <Button type="text" icon={<EyeOutlined />} size="small"
            style={{ color: '#60a5fa' }}
            onClick={() => navigate(`/app/tickets/${r.id}`)} />
        </Tooltip>
      ),
    },
  ];

  return (
    <div className="db-wrap">
      <style>{DB_STYLE}</style>

      {/* Header */}
      <div style={{ marginBottom: 30 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 }}>
          <div style={{
            width: 7, height: 7, borderRadius: '50%',
            background: 'linear-gradient(135deg,#2563eb,#60a5fa)',
            boxShadow: '0 0 8px rgba(96,165,250,0.9)',
          }} />
          <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
            Visão Geral
          </span>
        </div>
        <h1 style={{
          fontSize: 26, fontWeight: 700, margin: 0,
          background: 'linear-gradient(135deg,#fff 0%,rgba(255,255,255,0.58) 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          fontFamily: "'Poppins',sans-serif", letterSpacing: '-0.5px',
        }}>
          Dashboard
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, margin: '3px 0 0' }}>
          Resumo dos atendimentos em tempo real
        </p>
      </div>

      {/* Stat cards */}
      <div className="db-stat-grid">
        {STAT_CONFIGS.map(cfg => {
          const value = summary[cfg.key] ?? 0;
          const [c0, c1] = cfg.grad;
          return (
            <div key={cfg.key} style={{
              background: 'rgba(255,255,255,0.04)',
              backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 16, padding: '18px 18px 16px',
              position: 'relative', overflow: 'hidden',
              boxShadow: '0 4px 24px rgba(0,0,0,0.32)',
            }}>
              {/* Top accent line */}
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                background: `linear-gradient(90deg,${c0},${c1})`,
                borderRadius: '16px 16px 0 0',
              }} />
              {/* Glow blob */}
              <div style={{
                position: 'absolute', top: -24, right: -24,
                width: 72, height: 72, borderRadius: '50%',
                background: cfg.glow, filter: 'blur(22px)', pointerEvents: 'none',
              }} />
              {/* Icon */}
              <div style={{
                width: 34, height: 34, borderRadius: 9, marginBottom: 14,
                background: `linear-gradient(135deg,${c0}33,${c1}22)`,
                border: `1px solid ${c0}44`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 15, color: c1,
              }}>
                {cfg.icon}
              </div>
              {/* Value */}
              <div style={{
                fontSize: 32, fontWeight: 800, lineHeight: 1, marginBottom: 5,
                background: `linear-gradient(135deg,${c1} 0%,#fff 100%)`,
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              }}>
                {value}
              </div>
              {/* Label */}
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {cfg.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="db-chart-grid">
        {/* Priority */}
        <GlassCard style={{ padding: '20px 22px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.32)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 20 }}>
            Por Prioridade
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {byPriority.map(p => {
              const [c0, c1] = PRIORITY_GRADS[p.priority] || ['#4b5563', '#9ca3af'];
              const pct = Math.min((p._count / maxPriority) * 100, 100);
              return (
                <div key={p.priority}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.52)', fontWeight: 500 }}>
                      {PRIORITY[p.priority]?.label}
                    </span>
                    <span style={{
                      fontSize: 13, fontWeight: 800,
                      background: `linear-gradient(90deg,${c0},${c1})`,
                      WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                    }}>
                      {p._count}
                    </span>
                  </div>
                  <div style={{ height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                    <div style={{
                      width: `${pct}%`, height: '100%', borderRadius: 3,
                      background: `linear-gradient(90deg,${c0},${c1})`,
                      boxShadow: `0 0 10px ${c1}50`,
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>

        {/* Category */}
        <GlassCard style={{ padding: '20px 22px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.32)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 20 }}>
            Top Categorias
          </div>
          {byCategory.length === 0 ? (
            <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>Sem dados disponíveis</span>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {byCategory.map((c, i) => {
                const [c0, c1] = CAT_GRADS[i % CAT_GRADS.length];
                const pct = Math.min((c._count / maxCategory) * 100, 100);
                return (
                  <div key={c.categoryId}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                        <div style={{
                          width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                          background: `linear-gradient(135deg,${c0},${c1})`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 9, fontWeight: 800, color: '#fff',
                        }}>
                          {i + 1}
                        </div>
                        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.62)', fontWeight: 500 }}>{c.name}</span>
                      </div>
                      <span style={{
                        fontSize: 13, fontWeight: 800,
                        background: `linear-gradient(90deg,${c0},${c1})`,
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                      }}>
                        {c._count}
                      </span>
                    </div>
                    <div style={{ height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                      <div style={{
                        width: `${pct}%`, height: '100%', borderRadius: 3,
                        background: `linear-gradient(90deg,${c0},${c1})`,
                        boxShadow: `0 0 10px ${c1}50`,
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </GlassCard>
      </div>

      {/* Recent tickets */}
      <GlassCard style={{ overflow: 'hidden' }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 22px',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.58)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Chamados Recentes
            </span>
            {search && (
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)' }}>
                {filteredTickets.length} / {recentTickets.length}
              </span>
            )}
          </div>
          <div className="db-dark">
            <Input.Search
              placeholder="Buscar..."
              allowClear
              value={search}
              onChange={e => setSearch(e.target.value)}
              onSearch={v => setSearch(v)}
              style={{ width: 220 }}
              size="small"
            />
          </div>
        </div>
        <div className="db-dark">
          <Table
            dataSource={filteredTickets}
            columns={columns}
            rowKey="id"
            pagination={false}
            size="middle"
            scroll={{ x: 800 }}
          />
        </div>
      </GlassCard>
    </div>
  );
}
