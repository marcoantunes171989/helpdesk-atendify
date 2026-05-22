import { useEffect, useState, useCallback } from 'react';
import {
  Row, Col, Table, Button, Modal, Form, Input, Select, Space,
  message, Tooltip, Tag, Tabs, DatePicker, InputNumber, Divider, Empty, Spin,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, ExclamationCircleOutlined,
  PhoneOutlined, MailOutlined, TeamOutlined, EnvironmentOutlined,
  CheckSquareOutlined, FileTextOutlined, UserOutlined, RightOutlined,
  TrophyOutlined, CloseCircleOutlined, ClockCircleOutlined, CheckCircleOutlined,
  ContactsOutlined, FundOutlined, CalendarOutlined, BarChartOutlined,
} from '@ant-design/icons';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import dayjs from 'dayjs';
import { crmService, companyService, userService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { normalize } from '../utils/constants';

const { Option } = Select;
const { TextArea } = Input;

// ─── constants ───────────────────────────────────────────────────────────────
const STAGES = {
  LEAD:        { label: 'Lead',       color: '#94a3b8', bg: 'rgba(148,163,184,.18)', border: 'rgba(148,163,184,.35)', order: 0 },
  PROSPECT:    { label: 'Prospect',   color: '#60a5fa', bg: 'rgba(96,165,250,.18)',  border: 'rgba(96,165,250,.35)',  order: 1 },
  PROPOSAL:    { label: 'Proposta',   color: '#fbbf24', bg: 'rgba(251,191,36,.18)',  border: 'rgba(251,191,36,.35)',  order: 2 },
  NEGOTIATION: { label: 'Negociação', color: '#f97316', bg: 'rgba(249,115,22,.18)', border: 'rgba(249,115,22,.35)',  order: 3 },
  WON:         { label: 'Ganho',      color: '#4ade80', bg: 'rgba(74,222,128,.18)',  border: 'rgba(74,222,128,.35)',  order: 4 },
  LOST:        { label: 'Perdido',    color: '#f87171', bg: 'rgba(248,113,113,.18)', border: 'rgba(248,113,113,.35)', order: 5 },
};
const STAGE_FLOW = ['LEAD', 'PROSPECT', 'PROPOSAL', 'NEGOTIATION', 'WON'];

const ACT_TYPES = {
  CALL:    { label: 'Ligação',  color: '#60a5fa', icon: <PhoneOutlined /> },
  EMAIL:   { label: 'E-mail',   color: '#a78bfa', icon: <MailOutlined /> },
  MEETING: { label: 'Reunião',  color: '#fbbf24', icon: <TeamOutlined /> },
  VISIT:   { label: 'Visita',   color: '#4ade80', icon: <EnvironmentOutlined /> },
  TASK:    { label: 'Tarefa',   color: '#f97316', icon: <CheckSquareOutlined /> },
  NOTE:    { label: 'Nota',     color: '#94a3b8', icon: <FileTextOutlined /> },
};

const ACT_STATUS = {
  PENDING:   { label: 'Pendente',   color: '#fbbf24', icon: <ClockCircleOutlined /> },
  DONE:      { label: 'Concluído',  color: '#4ade80', icon: <CheckCircleOutlined /> },
  CANCELLED: { label: 'Cancelado',  color: '#f87171', icon: <CloseCircleOutlined /> },
};

const PIE_COLORS = ['#60a5fa', '#a78bfa', '#fbbf24', '#4ade80', '#f97316', '#94a3b8'];

const fmt = (v) => v ? `R$ ${parseFloat(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—';

// ─── sub-components ───────────────────────────────────────────────────────────
function StageBadge({ stage }) {
  const s = STAGES[stage];
  return s ? (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: s.bg, border: `1px solid ${s.border}`, color: s.color }}>
      {s.label}
    </span>
  ) : null;
}

function ActTypeBadge({ type }) {
  const t = ACT_TYPES[type];
  return t ? (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: `${t.color}20`, border: `1px solid ${t.color}40`, color: t.color }}>
      {t.icon} {t.label}
    </span>
  ) : null;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function Dashboard({ contacts, opportunities, activities }) {
  const activeOpps = opportunities.filter(o => !['WON', 'LOST'].includes(o.stage));
  const wonOpps = opportunities.filter(o => o.stage === 'WON');
  const closedOpps = opportunities.filter(o => ['WON', 'LOST'].includes(o.stage));
  const pipeline = activeOpps.reduce((s, o) => s + parseFloat(o.value || 0), 0);
  const wonValue = wonOpps.reduce((s, o) => s + parseFloat(o.value || 0), 0);
  const convRate = closedOpps.length > 0 ? Math.round(wonOpps.length / closedOpps.length * 100) : 0;
  const pending = activities.filter(a => a.status === 'PENDING').length;

  const stageData = Object.entries(STAGES).map(([k, v]) => ({
    name: v.label,
    count: opportunities.filter(o => o.stage === k).length,
    fill: v.color,
  }));

  const actData = Object.entries(ACT_TYPES)
    .map(([k, v]) => ({ name: v.label, value: activities.filter(a => a.type === k).length }))
    .filter(d => d.value > 0);

  const upcoming = activities
    .filter(a => a.status === 'PENDING' && a.scheduledAt)
    .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt))
    .slice(0, 8);

  const kpis = [
    { label: 'Contatos Ativos', value: contacts.filter(c => c.active).length, color: '#60a5fa', icon: <ContactsOutlined /> },
    { label: 'Oportunidades Ativas', value: activeOpps.length, color: '#fbbf24', icon: <FundOutlined /> },
    { label: 'Pipeline Total', value: fmt(pipeline), color: '#4ade80', icon: <BarChartOutlined />, small: true },
    { label: 'Valor Ganho', value: fmt(wonValue), color: '#a78bfa', icon: <TrophyOutlined />, small: true },
    { label: 'Taxa Conversão', value: `${convRate}%`, color: convRate >= 60 ? '#4ade80' : convRate >= 30 ? '#fbbf24' : '#f87171', icon: <CheckCircleOutlined /> },
    { label: 'Atividades Pendentes', value: pending, color: pending > 0 ? '#f97316' : '#4ade80', icon: <ClockCircleOutlined /> },
  ];

  return (
    <div style={{ padding: '16px 0' }}>
      <Row gutter={[10, 10]} style={{ marginBottom: 20 }}>
        {kpis.map(k => (
          <Col xs={12} sm={8} md={4} key={k.label}>
            <div style={{ background: 'var(--cl-bg-card)', border: '1px solid var(--cl-border)', borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ fontSize: 11, color: 'var(--cl-text-muted)', textTransform: 'uppercase', letterSpacing: '.5px', fontWeight: 600, marginBottom: 4 }}>{k.label}</div>
              <div style={{ fontSize: k.small ? 16 : 26, fontWeight: 700, color: k.color, lineHeight: 1.1 }}>{k.value}</div>
            </div>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={14}>
          <div style={{ background: 'var(--cl-bg-card)', border: '1px solid var(--cl-border)', borderRadius: 10, padding: '16px' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--cl-text-soft)', marginBottom: 12 }}>Oportunidades por Estágio</div>
            {opportunities.length === 0 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Sem oportunidades" /> : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={stageData} barSize={28}>
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--cl-text-muted)' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--cl-text-muted)' }} allowDecimals={false} />
                  <RTooltip contentStyle={{ background: 'var(--cl-bg-card)', border: '1px solid var(--cl-border)', borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="count" name="Qtd." radius={[4, 4, 0, 0]}>
                    {stageData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Col>
        <Col xs={24} md={10}>
          <div style={{ background: 'var(--cl-bg-card)', border: '1px solid var(--cl-border)', borderRadius: 10, padding: '16px', height: '100%' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--cl-text-soft)', marginBottom: 12 }}>Atividades por Tipo</div>
            {actData.length === 0 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Sem atividades" /> : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={actData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {actData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <RTooltip contentStyle={{ background: 'var(--cl-bg-card)', border: '1px solid var(--cl-border)', borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Col>
      </Row>

      {upcoming.length > 0 && (
        <div style={{ marginTop: 16, background: 'var(--cl-bg-card)', border: '1px solid var(--cl-border)', borderRadius: 10, padding: '14px 16px' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--cl-text-soft)', marginBottom: 10 }}>
            <CalendarOutlined style={{ marginRight: 6 }} />Próximas Atividades
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {upcoming.map(a => (
              <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, background: 'var(--cl-bg-input)', border: '1px solid var(--cl-border)' }}>
                <ActTypeBadge type={a.type} />
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--cl-text-hi)', flex: 1 }}>{a.title}</span>
                {a.company && <span style={{ fontSize: 12, color: 'var(--cl-text-muted)' }}>{a.company.name}</span>}
                <span style={{ fontSize: 11, color: 'var(--cl-text-faint)', whiteSpace: 'nowrap' }}>{dayjs(a.scheduledAt).format('DD/MM/YYYY')}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Pipeline ─────────────────────────────────────────────────────────────────
function Pipeline({ opportunities, onEdit, onDelete, onStageChange, movingId }) {
  return (
    <div style={{ overflowX: 'auto', paddingBottom: 8 }}>
      <div style={{ display: 'flex', gap: 12, minWidth: 900, padding: '16px 0 4px' }}>
        {Object.entries(STAGES).map(([stageKey, stageCfg]) => {
          const cards = opportunities.filter(o => o.stage === stageKey);
          const total = cards.reduce((s, o) => s + parseFloat(o.value || 0), 0);
          const nextStage = STAGE_FLOW[STAGE_FLOW.indexOf(stageKey) + 1];
          return (
            <div key={stageKey} style={{ flex: '0 0 200px', minWidth: 200, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ padding: '8px 12px', borderRadius: 8, background: stageCfg.bg, border: `1px solid ${stageCfg.border}` }}>
                <div style={{ fontWeight: 700, fontSize: 12, color: stageCfg.color, textTransform: 'uppercase', letterSpacing: '.5px' }}>{stageCfg.label}</div>
                <div style={{ fontSize: 11, color: 'var(--cl-text-faint)', marginTop: 2 }}>
                  {cards.length} oport. {total > 0 && `· ${fmt(total)}`}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {cards.map(opp => (
                  <div key={opp.id} style={{ background: 'var(--cl-bg-card)', border: `1px solid var(--cl-border)`, borderLeft: `3px solid ${stageCfg.color}`, borderRadius: 8, padding: '10px 12px' }}>
                    <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--cl-text-hi)', marginBottom: 4, lineHeight: 1.3 }}>{opp.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--cl-text-muted)', marginBottom: 2 }}>{opp.company?.name}</div>
                    {opp.contact && <div style={{ fontSize: 11, color: 'var(--cl-text-faint)', marginBottom: 2 }}><UserOutlined /> {opp.contact.name}</div>}
                    {opp.value && <div style={{ fontSize: 12, fontWeight: 700, color: stageCfg.color, marginBottom: 4 }}>{fmt(opp.value)}</div>}
                    {opp.probability > 0 && (
                      <div style={{ marginBottom: 6 }}>
                        <div style={{ height: 4, borderRadius: 2, background: 'var(--cl-border)', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${opp.probability}%`, background: stageCfg.color, borderRadius: 2 }} />
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--cl-text-faint)', marginTop: 2 }}>{opp.probability}% probabilidade</div>
                      </div>
                    )}
                    {opp.expectedClose && <div style={{ fontSize: 10, color: 'var(--cl-text-faint)', marginBottom: 6 }}><CalendarOutlined /> {dayjs(opp.expectedClose).format('DD/MM/YYYY')}</div>}
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                      {nextStage && (
                        <Tooltip title={`Avançar para ${STAGES[nextStage]?.label}`}>
                          <Button size="small" type="text" icon={<RightOutlined />} loading={movingId === opp.id}
                            style={{ fontSize: 10, color: stageCfg.color, padding: '0 6px', height: 22 }}
                            onClick={() => onStageChange(opp.id, nextStage)}>
                            {STAGES[nextStage]?.label}
                          </Button>
                        </Tooltip>
                      )}
                      {stageKey !== 'LOST' && stageKey !== 'WON' && (
                        <Tooltip title="Marcar como Perdido">
                          <Button size="small" type="text" danger icon={<CloseCircleOutlined />}
                            style={{ fontSize: 10, padding: '0 6px', height: 22 }}
                            onClick={() => onStageChange(opp.id, 'LOST')} />
                        </Tooltip>
                      )}
                      <Tooltip title="Editar">
                        <Button size="small" type="text" icon={<EditOutlined />} style={{ fontSize: 10, color: 'var(--cl-text-soft)', padding: '0 6px', height: 22 }} onClick={() => onEdit(opp)} />
                      </Tooltip>
                      <Tooltip title="Excluir">
                        <Button size="small" type="text" danger icon={<DeleteOutlined />} style={{ fontSize: 10, padding: '0 6px', height: 22 }} onClick={() => onDelete(opp)} />
                      </Tooltip>
                    </div>
                  </div>
                ))}
                {cards.length === 0 && (
                  <div style={{ padding: '16px 10px', textAlign: 'center', fontSize: 11, color: 'var(--cl-text-dim)', border: '1px dashed var(--cl-border)', borderRadius: 8 }}>
                    Nenhuma
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main CRM Component ───────────────────────────────────────────────────────
export default function CRM() {
  const [contacts, setContacts] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [activities, setActivities] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [movingId, setMovingId] = useState(null);
  const [search, setSearch] = useState('');

  // modal state (shared for contacts, opportunities, activities)
  const [modal, setModal] = useState(null); // { type: 'contact'|'opp'|'act', editing: obj|null }
  const [saving, setSaving] = useState(false);
  const [deleteModal, setDeleteModal] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [contactForm] = Form.useForm();
  const [oppForm] = Form.useForm();
  const [actForm] = Form.useForm();
  const [selectedCompanyForContact, setSelectedCompanyForContact] = useState(null);

  const { user } = useAuth();
  const canEdit = ['SUPER_ADMIN', 'ADMIN', 'AGENT'].includes(user?.role);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [c, o, a, co, u] = await Promise.all([
        crmService.listContacts(),
        crmService.listOpportunities(),
        crmService.listActivities(),
        companyService.list(),
        userService.list(),
      ]);
      setContacts(c);
      setOpportunities(o);
      setActivities(a);
      setCompanies(co);
      setUsers(u.filter(u => ['SUPER_ADMIN', 'ADMIN', 'AGENT'].includes(u.role)));
    } catch { message.error('Erro ao carregar dados do CRM'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ─── open modals ────
  const openContact = (editing = null) => {
    contactForm.resetFields();
    if (editing) {
      contactForm.setFieldsValue({ name: editing.name, email: editing.email, phone: editing.phone, position: editing.position, department: editing.department, notes: editing.notes, companyId: editing.companyId, active: editing.active });
    }
    setModal({ type: 'contact', editing });
  };
  const openOpp = (editing = null) => {
    oppForm.resetFields();
    if (editing) {
      oppForm.setFieldsValue({ title: editing.title, description: editing.description, stage: editing.stage, value: editing.value ? parseFloat(editing.value) : null, probability: editing.probability, companyId: editing.companyId, contactId: editing.contactId, ownerId: editing.ownerId, notes: editing.notes, expectedClose: editing.expectedClose ? dayjs(editing.expectedClose) : null });
      setSelectedCompanyForContact(editing.companyId);
    }
    setModal({ type: 'opp', editing });
  };
  const openAct = (editing = null) => {
    actForm.resetFields();
    if (editing) {
      actForm.setFieldsValue({ type: editing.type, title: editing.title, description: editing.description, status: editing.status, companyId: editing.companyId, contactId: editing.contactId, opportunityId: editing.opportunityId, userId: editing.userId, scheduledAt: editing.scheduledAt ? dayjs(editing.scheduledAt) : null });
    }
    setModal({ type: 'act', editing });
  };

  // ─── save handlers ────
  const handleSaveContact = async (values) => {
    setSaving(true);
    try {
      if (modal.editing) {
        await crmService.updateContact(modal.editing.id, values);
        message.success('Contato atualizado');
      } else {
        await crmService.createContact(values);
        message.success('Contato cadastrado');
      }
      setModal(null);
      loadAll();
    } catch (err) { message.error(err.response?.data?.error || 'Erro ao salvar contato'); }
    finally { setSaving(false); }
  };

  const handleSaveOpp = async (values) => {
    setSaving(true);
    try {
      const payload = { ...values, expectedClose: values.expectedClose ? values.expectedClose.toISOString() : null };
      if (modal.editing) {
        await crmService.updateOpportunity(modal.editing.id, payload);
        message.success('Oportunidade atualizada');
      } else {
        await crmService.createOpportunity(payload);
        message.success('Oportunidade criada');
      }
      setModal(null);
      loadAll();
    } catch (err) { message.error(err.response?.data?.error || 'Erro ao salvar oportunidade'); }
    finally { setSaving(false); }
  };

  const handleSaveAct = async (values) => {
    setSaving(true);
    try {
      const payload = { ...values, scheduledAt: values.scheduledAt ? values.scheduledAt.toISOString() : null };
      if (modal.editing) {
        await crmService.updateActivity(modal.editing.id, payload);
        message.success('Atividade atualizada');
      } else {
        await crmService.createActivity(payload);
        message.success('Atividade registrada');
      }
      setModal(null);
      loadAll();
    } catch (err) { message.error(err.response?.data?.error || 'Erro ao salvar atividade'); }
    finally { setSaving(false); }
  };

  // ─── delete handler ────
  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      if (deleteModal.type === 'contact') await crmService.removeContact(deleteModal.id);
      else if (deleteModal.type === 'opp') await crmService.removeOpportunity(deleteModal.id);
      else await crmService.removeActivity(deleteModal.id);
      message.success('Registro excluído com sucesso');
      setDeleteModal(null);
      loadAll();
    } catch (err) { message.error(err.response?.data?.error || 'Erro ao excluir'); }
    finally { setDeleteLoading(false); }
  };

  const handleStageChange = async (id, stage) => {
    setMovingId(id);
    try {
      await crmService.updateOpportunity(id, { stage });
      setOpportunities(prev => prev.map(o => o.id === id ? { ...o, stage } : o));
    } catch { message.error('Erro ao atualizar estágio'); }
    finally { setMovingId(null); }
  };

  // ─── filtered data ────
  const filteredContacts = search
    ? contacts.filter(c => [c.name, c.email, c.phone, c.position, c.company?.name].some(f => normalize(f).includes(normalize(search))))
    : contacts;
  const filteredOpps = search
    ? opportunities.filter(o => [o.title, o.company?.name, o.contact?.name].some(f => normalize(f).includes(normalize(search))))
    : opportunities;
  const filteredActs = search
    ? activities.filter(a => [a.title, a.company?.name, a.contact?.name, a.opportunity?.title].some(f => normalize(f).includes(normalize(search))))
    : activities;

  // contacts filtered by company for opportunity modal
  const companyContacts = contacts.filter(c => c.companyId === selectedCompanyForContact);

  // ─── table columns ────
  const contactCols = [
    { title: '#', dataIndex: 'code', width: 60, render: v => <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#60a5fa', fontSize: 12 }}>{v ? String(v).padStart(4, '0') : '—'}</span> },
    { title: 'Nome', key: 'name', render: (_, r) => <div><div style={{ fontWeight: 600, color: 'var(--cl-text-hi)', fontSize: 13 }}>{r.name}</div><div style={{ fontSize: 11, color: 'var(--cl-text-faint)' }}>{r.position}</div></div> },
    { title: 'Empresa', key: 'company', render: (_, r) => <span style={{ fontSize: 12, color: 'var(--cl-text-soft)' }}>{r.company?.name || '—'}</span> },
    { title: 'E-mail', dataIndex: 'email', key: 'email', render: v => <span style={{ fontSize: 12, color: 'var(--cl-text-soft)' }}>{v || '—'}</span> },
    { title: 'Telefone', dataIndex: 'phone', key: 'phone', render: v => <span style={{ fontSize: 12, color: 'var(--cl-text-soft)' }}>{v || '—'}</span> },
    { title: 'Oport.', key: 'opps', width: 70, align: 'center', render: (_, r) => <span style={{ fontSize: 12, color: '#fbbf24', fontWeight: 600 }}>{r._count?.opportunities ?? 0}</span> },
    canEdit && { title: '', key: 'actions', width: 80, render: (_, r) => <Space size={4}><Tooltip title="Editar"><Button type="text" icon={<EditOutlined />} size="small" style={{ color: 'var(--cl-text-soft)' }} onClick={() => openContact(r)} /></Tooltip><Tooltip title="Excluir"><Button type="text" icon={<DeleteOutlined />} size="small" danger onClick={() => setDeleteModal({ type: 'contact', id: r.id, name: r.name })} /></Tooltip></Space> },
  ].filter(Boolean);

  const oppCols = [
    { title: '#', dataIndex: 'code', width: 60, render: v => <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#60a5fa', fontSize: 12 }}>{v ? String(v).padStart(4, '0') : '—'}</span> },
    { title: 'Título', key: 'title', minWidth: 160, render: (_, r) => <div><div style={{ fontWeight: 600, fontSize: 13, color: 'var(--cl-text-hi)' }}>{r.title}</div><div style={{ fontSize: 11, color: 'var(--cl-text-faint)' }}>{r.company?.name}</div></div> },
    { title: 'Estágio', dataIndex: 'stage', width: 110, render: v => <StageBadge stage={v} /> },
    { title: 'Valor', dataIndex: 'value', width: 120, render: v => <span style={{ fontSize: 12, fontWeight: 600, color: '#4ade80' }}>{fmt(v)}</span> },
    { title: 'Prob.', dataIndex: 'probability', width: 60, align: 'center', render: v => v > 0 ? <span style={{ fontSize: 12, color: '#fbbf24', fontWeight: 600 }}>{v}%</span> : <span style={{ color: 'var(--cl-text-dim)' }}>—</span> },
    { title: 'Contato', key: 'contact', render: (_, r) => <span style={{ fontSize: 12, color: 'var(--cl-text-soft)' }}>{r.contact?.name || '—'}</span> },
    { title: 'Responsável', key: 'owner', render: (_, r) => <span style={{ fontSize: 12, color: 'var(--cl-text-soft)' }}>{r.owner?.name || '—'}</span> },
    { title: 'Fechamento', dataIndex: 'expectedClose', width: 105, render: v => v ? <span style={{ fontSize: 11, color: 'var(--cl-text-faint)' }}>{dayjs(v).format('DD/MM/YYYY')}</span> : <span style={{ color: 'var(--cl-text-dim)' }}>—</span> },
    canEdit && { title: '', key: 'actions', width: 80, render: (_, r) => <Space size={4}><Tooltip title="Editar"><Button type="text" icon={<EditOutlined />} size="small" style={{ color: 'var(--cl-text-soft)' }} onClick={() => openOpp(r)} /></Tooltip><Tooltip title="Excluir"><Button type="text" icon={<DeleteOutlined />} size="small" danger onClick={() => setDeleteModal({ type: 'opp', id: r.id, name: r.title })} /></Tooltip></Space> },
  ].filter(Boolean);

  const actCols = [
    { title: 'Tipo', dataIndex: 'type', width: 110, render: v => <ActTypeBadge type={v} /> },
    { title: 'Título', key: 'title', minWidth: 160, render: (_, r) => <div><div style={{ fontWeight: 500, fontSize: 13, color: 'var(--cl-text-hi)' }}>{r.title}</div><div style={{ fontSize: 11, color: 'var(--cl-text-faint)' }}>{r.company?.name}{r.contact ? ` · ${r.contact.name}` : ''}</div></div> },
    { title: 'Status', dataIndex: 'status', width: 110, render: v => { const s = ACT_STATUS[v]; return s ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: s.color }}>{s.icon} {s.label}</span> : null; } },
    { title: 'Oportunidade', key: 'opp', render: (_, r) => r.opportunity ? <span style={{ fontSize: 12, color: 'var(--cl-text-soft)' }}>{r.opportunity.title}</span> : <span style={{ color: 'var(--cl-text-dim)' }}>—</span> },
    { title: 'Responsável', key: 'user', render: (_, r) => <span style={{ fontSize: 12, color: 'var(--cl-text-soft)' }}>{r.user?.name || '—'}</span> },
    { title: 'Agendado', dataIndex: 'scheduledAt', width: 110, render: v => v ? <span style={{ fontSize: 11, color: dayjs(v).isBefore(dayjs()) ? '#f87171' : 'var(--cl-text-faint)' }}>{dayjs(v).format('DD/MM/YYYY')}</span> : <span style={{ color: 'var(--cl-text-dim)' }}>—</span> },
    canEdit && { title: '', key: 'actions', width: 80, render: (_, r) => <Space size={4}><Tooltip title="Editar"><Button type="text" icon={<EditOutlined />} size="small" style={{ color: 'var(--cl-text-soft)' }} onClick={() => openAct(r)} /></Tooltip><Tooltip title="Excluir"><Button type="text" icon={<DeleteOutlined />} size="small" danger onClick={() => setDeleteModal({ type: 'act', id: r.id, name: r.title })} /></Tooltip></Space> },
  ].filter(Boolean);

  const tableProp = { size: 'small', scroll: { x: 700 }, rowKey: 'id', loading, pagination: { pageSize: 15, showSizeChanger: false, showTotal: t => `${t} registros` } };

  const tabItems = [
    { key: 'dashboard', label: <span><BarChartOutlined /> Painel</span>, children: <Dashboard contacts={contacts} opportunities={opportunities} activities={activities} /> },
    { key: 'pipeline', label: <span><FundOutlined /> Pipeline</span>, children: <Pipeline opportunities={opportunities} onEdit={openOpp} onDelete={r => setDeleteModal({ type: 'opp', id: r.id, name: r.title })} onStageChange={handleStageChange} movingId={movingId} /> },
    { key: 'opps', label: <span><TrophyOutlined /> Oportunidades ({opportunities.length})</span>, children: <Table {...tableProp} dataSource={filteredOpps} columns={oppCols} /> },
    { key: 'contacts', label: <span><ContactsOutlined /> Contatos ({contacts.length})</span>, children: <Table {...tableProp} dataSource={filteredContacts} columns={contactCols} /> },
    { key: 'activities', label: <span><CalendarOutlined /> Atividades ({activities.length})</span>, children: <Table {...tableProp} dataSource={filteredActs} columns={actCols} /> },
  ];

  const newBtnLabel = { dashboard: null, pipeline: 'Nova Oportunidade', opps: 'Nova Oportunidade', contacts: 'Novo Contato', activities: 'Nova Atividade' };
  const newBtnAction = {
    pipeline: () => openOpp(),
    opps: () => openOpp(),
    contacts: () => openContact(),
    activities: () => openAct(),
  };

  return (
    <div className="page-wrap">
      <div className="page-header">
        <div>
          <h1 className="page-title">CRM</h1>
          <p style={{ color: 'var(--cl-text-muted)', fontSize: 13, margin: '4px 0 0' }}>
            {contacts.length} contatos · {opportunities.length} oportunidades · {activities.length} atividades
          </p>
        </div>
        <Space>
          <Input placeholder="Buscar..." allowClear value={search} onChange={e => setSearch(e.target.value)} style={{ width: 220 }} />
          {canEdit && newBtnLabel[activeTab] && (
            <Button type="primary" icon={<PlusOutlined />} onClick={newBtnAction[activeTab]} style={{ borderRadius: 8, fontWeight: 600 }}>
              {newBtnLabel[activeTab]}
            </Button>
          )}
        </Space>
      </div>

      <div style={{ background: 'var(--cl-bg-card)', border: '1px solid var(--cl-border)', borderRadius: 12, overflow: 'hidden' }}>
        <Tabs activeKey={activeTab} onChange={setActiveTab}
          tabBarStyle={{ padding: '0 16px', margin: 0, borderBottom: '1px solid var(--cl-border)' }}
          items={tabItems}
          style={{ padding: '0 16px 16px' }}
        />
      </div>

      {/* ── Contact modal ── */}
      <Modal
        title={<span style={{ fontWeight: 700, fontSize: 16 }}>{modal?.editing ? 'Editar Contato' : 'Novo Contato'}</span>}
        open={modal?.type === 'contact'}
        onCancel={() => setModal(null)}
        centered width={520}
        styles={{ body: { padding: '20px 0 8px' } }}
        footer={<Space><Button onClick={() => setModal(null)}>Cancelar</Button><Button type="primary" loading={saving} onClick={() => contactForm.submit()} style={{ background: '#2563eb', borderColor: '#2563eb', fontWeight: 600 }}>{modal?.editing ? 'Salvar' : 'Cadastrar'}</Button></Space>}
      >
        <div style={{ padding: '0 24px' }}>
          <Form form={contactForm} layout="vertical" onFinish={handleSaveContact}>
            <Form.Item name="name" label="Nome" rules={[{ required: true, message: 'Informe o nome' }]}>
              <Input placeholder="Nome completo" size="large" />
            </Form.Item>
            <Form.Item name="companyId" label="Empresa" rules={[{ required: true, message: 'Selecione a empresa' }]}>
              <Select placeholder="Selecione a empresa" showSearch optionFilterProp="children" size="large">
                {companies.map(c => <Option key={c.id} value={c.id}>{c.name}</Option>)}
              </Select>
            </Form.Item>
            <Row gutter={12}>
              <Col span={12}><Form.Item name="email" label="E-mail"><Input placeholder="email@empresa.com" size="large" /></Form.Item></Col>
              <Col span={12}><Form.Item name="phone" label="Telefone"><Input placeholder="(11) 9 9999-9999" size="large" /></Form.Item></Col>
            </Row>
            <Row gutter={12}>
              <Col span={12}><Form.Item name="position" label="Cargo"><Input placeholder="Ex: Gerente Comercial" size="large" /></Form.Item></Col>
              <Col span={12}><Form.Item name="department" label="Departamento"><Input placeholder="Ex: Compras" size="large" /></Form.Item></Col>
            </Row>
            <Form.Item name="notes" label="Observações"><TextArea rows={3} placeholder="Anotações sobre o contato..." /></Form.Item>
          </Form>
        </div>
      </Modal>

      {/* ── Opportunity modal ── */}
      <Modal
        title={<span style={{ fontWeight: 700, fontSize: 16 }}>{modal?.editing ? 'Editar Oportunidade' : 'Nova Oportunidade'}</span>}
        open={modal?.type === 'opp'}
        onCancel={() => setModal(null)}
        centered width={600}
        styles={{ body: { padding: '20px 0 8px' } }}
        footer={<Space><Button onClick={() => setModal(null)}>Cancelar</Button><Button type="primary" loading={saving} onClick={() => oppForm.submit()} style={{ background: '#2563eb', borderColor: '#2563eb', fontWeight: 600 }}>{modal?.editing ? 'Salvar' : 'Criar'}</Button></Space>}
      >
        <div style={{ padding: '0 24px' }}>
          <Form form={oppForm} layout="vertical" onFinish={handleSaveOpp}>
            <Form.Item name="title" label="Título da Oportunidade" rules={[{ required: true, message: 'Informe o título' }]}>
              <Input placeholder="Ex: Renovação Contrato 2025" size="large" />
            </Form.Item>
            <Row gutter={12}>
              <Col span={14}>
                <Form.Item name="companyId" label="Empresa" rules={[{ required: true, message: 'Selecione a empresa' }]}>
                  <Select placeholder="Empresa" showSearch optionFilterProp="children" size="large" onChange={v => { setSelectedCompanyForContact(v); oppForm.setFieldValue('contactId', null); }}>
                    {companies.map(c => <Option key={c.id} value={c.id}>{c.name}</Option>)}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={10}>
                <Form.Item name="stage" label="Estágio" rules={[{ required: true, message: 'Selecione' }]} initialValue="LEAD">
                  <Select size="large">
                    {Object.entries(STAGES).map(([k, v]) => <Option key={k} value={k}><span style={{ color: v.color }}>{v.label}</span></Option>)}
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={12}>
              <Col span={12}>
                <Form.Item name="contactId" label="Contato">
                  <Select placeholder="Selecionar contato" allowClear size="large" disabled={!selectedCompanyForContact}>
                    {companyContacts.map(c => <Option key={c.id} value={c.id}>{c.name}</Option>)}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="ownerId" label="Responsável">
                  <Select placeholder="Responsável" allowClear showSearch optionFilterProp="children" size="large">
                    {users.map(u => <Option key={u.id} value={u.id}>{u.name}</Option>)}
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={12}>
              <Col span={12}><Form.Item name="value" label="Valor (R$)"><InputNumber placeholder="0,00" size="large" style={{ width: '100%' }} min={0} precision={2} /></Form.Item></Col>
              <Col span={6}><Form.Item name="probability" label="Probabilidade (%)" initialValue={0}><InputNumber size="large" style={{ width: '100%' }} min={0} max={100} addonAfter="%" /></Form.Item></Col>
              <Col span={6}><Form.Item name="expectedClose" label="Fechamento"><DatePicker size="large" style={{ width: '100%' }} format="DD/MM/YYYY" /></Form.Item></Col>
            </Row>
            <Form.Item name="description" label="Descrição"><TextArea rows={3} /></Form.Item>
          </Form>
        </div>
      </Modal>

      {/* ── Activity modal ── */}
      <Modal
        title={<span style={{ fontWeight: 700, fontSize: 16 }}>{modal?.editing ? 'Editar Atividade' : 'Nova Atividade'}</span>}
        open={modal?.type === 'act'}
        onCancel={() => setModal(null)}
        centered width={520}
        styles={{ body: { padding: '20px 0 8px' } }}
        footer={<Space><Button onClick={() => setModal(null)}>Cancelar</Button><Button type="primary" loading={saving} onClick={() => actForm.submit()} style={{ background: '#2563eb', borderColor: '#2563eb', fontWeight: 600 }}>{modal?.editing ? 'Salvar' : 'Registrar'}</Button></Space>}
      >
        <div style={{ padding: '0 24px' }}>
          <Form form={actForm} layout="vertical" onFinish={handleSaveAct}>
            <Row gutter={12}>
              <Col span={10}>
                <Form.Item name="type" label="Tipo" rules={[{ required: true, message: 'Selecione' }]}>
                  <Select placeholder="Tipo" size="large">
                    {Object.entries(ACT_TYPES).map(([k, v]) => <Option key={k} value={k}><span style={{ color: v.color }}>{v.icon} {v.label}</span></Option>)}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={14}>
                <Form.Item name="title" label="Título" rules={[{ required: true, message: 'Informe o título' }]}>
                  <Input placeholder="Assunto da atividade" size="large" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={12}>
              <Col span={12}>
                <Form.Item name="companyId" label="Empresa">
                  <Select placeholder="Empresa" allowClear showSearch optionFilterProp="children" size="large">
                    {companies.map(c => <Option key={c.id} value={c.id}>{c.name}</Option>)}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="contactId" label="Contato">
                  <Select placeholder="Contato" allowClear showSearch optionFilterProp="children" size="large">
                    {contacts.map(c => <Option key={c.id} value={c.id}>{c.name}</Option>)}
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={12}>
              <Col span={14}>
                <Form.Item name="opportunityId" label="Oportunidade">
                  <Select placeholder="Oportunidade" allowClear showSearch optionFilterProp="children" size="large">
                    {opportunities.map(o => <Option key={o.id} value={o.id}>{o.title}</Option>)}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={10}>
                <Form.Item name="status" label="Status" initialValue="PENDING">
                  <Select size="large">
                    {Object.entries(ACT_STATUS).map(([k, v]) => <Option key={k} value={k}><span style={{ color: v.color }}>{v.label}</span></Option>)}
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={12}>
              <Col span={12}><Form.Item name="userId" label="Responsável"><Select placeholder="Responsável" allowClear showSearch optionFilterProp="children" size="large">{users.map(u => <Option key={u.id} value={u.id}>{u.name}</Option>)}</Select></Form.Item></Col>
              <Col span={12}><Form.Item name="scheduledAt" label="Data Agendada"><DatePicker size="large" style={{ width: '100%' }} format="DD/MM/YYYY" /></Form.Item></Col>
            </Row>
            <Form.Item name="description" label="Descrição"><TextArea rows={3} /></Form.Item>
          </Form>
        </div>
      </Modal>

      {/* ── Delete modal ── */}
      <Modal
        open={!!deleteModal}
        onCancel={() => setDeleteModal(null)}
        title={<span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><ExclamationCircleOutlined style={{ color: '#f87171', fontSize: 18 }} /><span style={{ fontWeight: 700 }}>Excluir registro</span></span>}
        footer={<Space><Button onClick={() => setDeleteModal(null)}>Cancelar</Button><Button danger type="primary" loading={deleteLoading} onClick={handleDelete}>Excluir permanentemente</Button></Space>}
      >
        {deleteModal && <p style={{ padding: '8px 0' }}>Deseja excluir <strong>"{deleteModal.name}"</strong>? Esta ação não pode ser desfeita.</p>}
      </Modal>
    </div>
  );
}
