import { useEffect, useState } from 'react';
import { Row, Col, Card, Table, Tag, Typography, Spin, Alert, Input, Tooltip, Button, Space } from 'antd';
import {
  ClockCircleOutlined, CheckCircleOutlined, SyncOutlined,
  ExclamationCircleOutlined, CloseCircleOutlined, RiseOutlined, EyeOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { dashboardService } from '../services/api';
import { TICKET_STATUS, PRIORITY } from '../utils/constants';

const { Text } = Typography;

const StatCard = ({ title, value, icon, color, bg }) => (
  <Card className="stat-card" style={{ borderRadius: 12, height: '100%', width: '100%' }} bodyStyle={{ padding: '20px 24px', height: '100%' }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '100%' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {title}
        </div>
        <div style={{ fontSize: 28, fontWeight: 700, color: '#111827', lineHeight: 1 }}>
          {value}
        </div>
      </div>
      <div style={{
        width: 44, height: 44, borderRadius: 10, flexShrink: 0, marginLeft: 12,
        background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ color, fontSize: 20 }}>{icon}</span>
      </div>
    </div>
  </Card>
);

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
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
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

  const stats = [
    { title: 'Total de Chamados', value: summary.total, icon: <ClockCircleOutlined />, color: '#6b7280', bg: '#f3f4f6' },
    { title: 'Abertos', value: summary.open, icon: <ExclamationCircleOutlined />, color: '#2563eb', bg: '#eff6ff' },
    { title: 'Em Andamento', value: summary.inProgress, icon: <SyncOutlined spin />, color: '#d97706', bg: '#fffbeb' },
    { title: 'Resolvidos', value: summary.resolved, icon: <CheckCircleOutlined />, color: '#2563eb', bg: '#eff6ff' },
    { title: 'Fechados', value: summary.closed, icon: <CloseCircleOutlined />, color: '#9ca3af', bg: '#f9fafb' },
    { title: 'SLA Vencido', value: summary.overdueSla, icon: <RiseOutlined />, color: '#dc2626', bg: '#fef2f2' },
  ];

  const columns = [
    {
      title: 'ID', dataIndex: 'id', key: 'id', width: 80,
      sorter: (a, b) => a.id.localeCompare(b.id),
      render: v => <code style={{ fontSize: 11, color: '#9ca3af', background: '#f3f4f6', padding: '2px 6px', borderRadius: 4 }}>{v.slice(-6).toUpperCase()}</code>,
    },
    {
      title: 'Título', dataIndex: 'title', key: 'title', ellipsis: true,
      sorter: (a, b) => a.title.localeCompare(b.title, 'pt-BR'),
      render: v => <span style={{ fontWeight: 500, color: '#111827' }}>{v}</span>,
    },
    {
      title: 'Empresa', key: 'company',
      sorter: (a, b) => (a.company?.name || '').localeCompare(b.company?.name || '', 'pt-BR'),
      render: (_, r) => (
        <div>
          <div style={{ color: '#374151', fontSize: 13, fontWeight: 500 }}>{r.company?.name || '—'}</div>
          {r.company?.fantasia && (
            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>{r.company.fantasia}</div>
          )}
        </div>
      ),
    },
    {
      title: 'Funcionário', key: 'employee',
      sorter: (a, b) => (a.employee?.name || '').localeCompare(b.employee?.name || '', 'pt-BR'),
      render: (_, r) => r.employee?.name
        ? <span style={{ color: '#6b7280', fontSize: 13 }}>{r.employee.name}</span>
        : <span style={{ color: '#d1d5db' }}>—</span>,
    },
    { title: 'Categoria', dataIndex: ['category', 'name'], key: 'category', sorter: (a, b) => (a.category?.name || '').localeCompare(b.category?.name || '', 'pt-BR'), render: v => v ? <span style={{ color: '#6b7280' }}>{v}</span> : <span style={{ color: '#d1d5db' }}>—</span> },
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
      title: 'Data Abertura', dataIndex: 'createdAt', key: 'createdAt',
      sorter: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
      render: v => <span style={{ color: '#9ca3af', fontSize: 13 }}>{dayjs(v).format('DD/MM/YYYY HH:mm')}</span>,
    },
    {
      title: '', key: 'actions', width: 50,
      render: (_, r) => (
        <Tooltip title="Ver detalhes">
          <Button type="text" icon={<EyeOutlined />} size="small" style={{ color: '#2563eb' }}
            onClick={() => navigate(`/app/tickets/${r.id}`)} />
        </Tooltip>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: 0 }}>Dashboard</h1>
        <p style={{ color: '#6b7280', fontSize: 14, margin: '4px 0 0' }}>Visão geral dos atendimentos</p>
      </div>

      <Row gutter={[16, 16]} style={{ alignItems: 'stretch' }}>
        {stats.map(s => (
          <Col key={s.title} xs={12} sm={8} md={4} style={{ display: 'flex' }}>
            <StatCard {...s} />
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 20 }}>
        <Col xs={24} md={10}>
          <Card
            title={<span style={{ fontWeight: 600, fontSize: 14 }}>Por Prioridade</span>}
            style={{ borderRadius: 12, border: '1px solid #e5e7eb' }}
            bodyStyle={{ padding: '16px 24px' }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {byPriority.map(p => (
                <div key={p.priority} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Tag color={PRIORITY[p.priority]?.color} style={{ margin: 0 }}>{PRIORITY[p.priority]?.label}</Tag>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 100, height: 6, borderRadius: 3, background: '#f3f4f6', overflow: 'hidden',
                    }}>
                      <div style={{
                        width: `${Math.min((p._count / summary.total) * 100, 100)}%`,
                        height: '100%', borderRadius: 3, background: '#2563eb',
                      }} />
                    </div>
                    <Text strong style={{ fontSize: 13, minWidth: 20, textAlign: 'right' }}>{p._count}</Text>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </Col>
        <Col xs={24} md={14}>
          <Card
            title={<span style={{ fontWeight: 600, fontSize: 14 }}>Top Categorias</span>}
            style={{ borderRadius: 12, border: '1px solid #e5e7eb' }}
            bodyStyle={{ padding: '16px 24px' }}
          >
            {byCategory.length === 0 ? (
              <span style={{ color: '#d1d5db' }}>Sem dados disponíveis</span>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {byCategory.map((c, i) => (
                  <div key={c.categoryId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: i === 0 ? '#2563eb' : i === 1 ? '#3b82f6' : '#86efac',
                      }} />
                      <span style={{ fontSize: 13, color: '#374151' }}>{c.name}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 80, height: 6, borderRadius: 3, background: '#f3f4f6', overflow: 'hidden' }}>
                        <div style={{
                          width: `${Math.min((c._count / summary.total) * 100, 100)}%`,
                          height: '100%', borderRadius: 3, background: '#2563eb',
                        }} />
                      </div>
                      <Text strong style={{ fontSize: 13, minWidth: 20, textAlign: 'right' }}>{c._count}</Text>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </Col>
      </Row>

      <Card
        title={
          <span style={{ fontWeight: 600, fontSize: 14 }}>
            Chamados Recentes
            {search && <span style={{ fontSize: 12, fontWeight: 400, color: '#9ca3af', marginLeft: 8 }}>{filteredTickets.length} de {recentTickets.length}</span>}
          </span>
        }
        extra={
          <Input.Search
            placeholder="Buscar em todos os campos..."
            allowClear
            value={search}
            onChange={e => setSearch(e.target.value)}
            onSearch={v => setSearch(v)}
            style={{ width: 320 }}
            size="small"
          />
        }
        style={{ marginTop: 20, borderRadius: 12, border: '1px solid #e5e7eb' }}
        bodyStyle={{ padding: 0 }}
      >
        <Table
          dataSource={filteredTickets}
          columns={columns}
          rowKey="id"
          pagination={false}
          size="middle"
          scroll={{ x: 800 }}
        />
      </Card>
    </div>
  );
}
