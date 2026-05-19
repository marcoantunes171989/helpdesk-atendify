import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Row, Col, Tabs, Table, Button, Tag, Modal, Form,
  Input, Select, Switch, Space, Tooltip, Popconfirm, message,
  Spin, Alert, Avatar, DatePicker,
} from 'antd';
import {
  ArrowLeftOutlined, EditOutlined, PlusOutlined,
  TeamOutlined, UserOutlined, CustomerServiceOutlined,
  IdcardOutlined, StopOutlined, BankOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { companyService, employeeService, userService, ticketService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { ROLES, TICKET_STATUS, PRIORITY } from '../utils/constants';

const { Option } = Select;

const roleColors = {
  SUPER_ADMIN: { bg: '#f3e8ff', color: '#7c3aed' },
  ADMIN: { bg: '#dbeafe', color: '#1d4ed8' },
  AGENT: { bg: '#dcfce7', color: '#15803d' },
  CLIENT: { bg: '#f3f4f6', color: '#374151' },
};

const StatCard = ({ icon, label, value, color, bg }) => (
  <Card className="stat-card" style={{ borderRadius: 12, height: '100%' }} bodyStyle={{ padding: '16px 20px' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <span style={{ color, fontSize: 18 }}>{icon}</span>
      </div>
      <div>
        <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
        <div style={{ fontSize: 24, fontWeight: 700, color: '#111827', lineHeight: 1.2 }}>{value}</div>
      </div>
    </div>
  </Card>
);

export default function CompanyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [company, setCompany] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [users, setUsers] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('employees');

  const [empModal, setEmpModal] = useState(false);
  const [editingEmp, setEditingEmp] = useState(null);
  const [empForm] = Form.useForm();

  const [compModal, setCompModal] = useState(false);
  const [compForm] = Form.useForm();

  const canEdit = ['SUPER_ADMIN', 'ADMIN'].includes(user?.role);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [comp, emps, usrs, tiks] = await Promise.all([
        companyService.get(id),
        employeeService.list({ companyId: id }),
        userService.list({ companyId: id }),
        ticketService.list({ companyId: id }),
      ]);
      setCompany(comp);
      setEmployees(emps);
      setUsers(usrs);
      setTickets(Array.isArray(tiks) ? tiks : tiks?.tickets || []);
    } catch {
      setError('Erro ao carregar dados da empresa');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, [id]);

  // ── Employee handlers ──
  const openCreateEmp = () => { setEditingEmp(null); empForm.resetFields(); setEmpModal(true); };
  const openEditEmp = (r) => { setEditingEmp(r); empForm.setFieldsValue({ ...r, hireDate: r.hireDate ? dayjs(r.hireDate) : null }); setEmpModal(true); };

  const handleSaveEmp = async (values) => {
    try {
      const payload = { ...values, companyId: id, hireDate: values.hireDate ? values.hireDate.toISOString() : null };
      if (editingEmp) {
        await employeeService.update(editingEmp.id, payload);
        message.success('Funcionário atualizado');
      } else {
        await employeeService.create(payload);
        message.success('Funcionário cadastrado');
      }
      setEmpModal(false);
      loadAll();
    } catch (err) {
      message.error(err.response?.data?.error || 'Erro ao salvar funcionário');
    }
  };

  const handleDeactivateEmp = async (empId) => {
    try {
      await employeeService.remove(empId);
      message.success('Funcionário desativado');
      loadAll();
    } catch {
      message.error('Erro ao desativar');
    }
  };

  // ── Company edit handler ──
  const openEditComp = () => { compForm.setFieldsValue(company); setCompModal(true); };
  const handleSaveComp = async (values) => {
    try {
      await companyService.update(id, values);
      message.success('Empresa atualizada');
      setCompModal(false);
      loadAll();
    } catch (err) {
      message.error(err.response?.data?.error || 'Erro ao atualizar empresa');
    }
  };

  // ── Columns ──
  const empColumns = [
    {
      title: 'Funcionário', key: 'name',
      render: (_, r) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar size={32} style={{ background: '#dcfce7', color: '#16a34a', fontWeight: 700, fontSize: 13 }}>
            {r.name?.charAt(0).toUpperCase()}
          </Avatar>
          <div>
            <div style={{ fontWeight: 600, color: '#111827', fontSize: 13 }}>{r.name}</div>
            <div style={{ fontSize: 11, color: '#9ca3af' }}>{r.email || '—'}</div>
          </div>
        </div>
      ),
    },
    { title: 'Cargo', dataIndex: 'position', key: 'position', render: v => <span style={{ color: '#374151', fontSize: 13 }}>{v}</span> },
    { title: 'Departamento', dataIndex: 'department', key: 'department', render: v => v ? <Tag style={{ borderRadius: 6 }}>{v}</Tag> : <span style={{ color: '#d1d5db' }}>—</span> },
    { title: 'Telefone', dataIndex: 'phone', key: 'phone', render: v => <span style={{ color: '#6b7280', fontSize: 13 }}>{v || '—'}</span> },
    {
      title: 'Status', dataIndex: 'active', key: 'active',
      render: v => <Tag color={v ? 'success' : 'error'} style={{ borderRadius: 6 }}>{v ? 'Ativo' : 'Inativo'}</Tag>,
    },
    {
      title: '', key: 'actions', width: 80,
      render: (_, r) => canEdit && (
        <Space>
          <Tooltip title="Editar"><Button type="text" icon={<EditOutlined />} size="small" style={{ color: '#6b7280' }} onClick={() => openEditEmp(r)} /></Tooltip>
          {r.active && (
            <Popconfirm title="Desativar funcionário?" onConfirm={() => handleDeactivateEmp(r.id)} okText="Sim" cancelText="Não">
              <Tooltip title="Desativar"><Button type="text" icon={<StopOutlined />} size="small" danger /></Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const userColumns = [
    {
      title: 'Usuário', key: 'name',
      render: (_, r) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar size={32} style={{ background: roleColors[r.role]?.bg, color: roleColors[r.role]?.color, fontWeight: 700, fontSize: 13 }}>
            {r.name?.charAt(0).toUpperCase()}
          </Avatar>
          <div>
            <div style={{ fontWeight: 600, color: '#111827', fontSize: 13 }}>{r.name}</div>
            <div style={{ fontSize: 11, color: '#9ca3af' }}>{r.email}</div>
          </div>
        </div>
      ),
    },
    {
      title: 'Perfil', dataIndex: 'role', key: 'role',
      render: v => <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600, background: roleColors[v]?.bg, color: roleColors[v]?.color }}>{ROLES[v]?.label}</span>,
    },
    { title: 'Status', dataIndex: 'active', key: 'active', render: v => <Tag color={v ? 'success' : 'error'} style={{ borderRadius: 6 }}>{v ? 'Ativo' : 'Inativo'}</Tag> },
    { title: 'Criado em', dataIndex: 'createdAt', key: 'createdAt', render: v => <span style={{ color: '#9ca3af', fontSize: 12 }}>{dayjs(v).format('DD/MM/YYYY')}</span> },
  ];

  const ticketColumns = [
    {
      title: 'Chamado', key: 'title',
      render: (_, r) => (
        <div>
          <div style={{ fontWeight: 500, color: '#111827', fontSize: 13 }}>{r.title}</div>
          <div style={{ fontSize: 11, color: '#9ca3af' }}>{r.user?.name}</div>
        </div>
      ),
    },
    { title: 'Categoria', dataIndex: ['category', 'name'], key: 'category', render: v => v ? <span style={{ color: '#6b7280', fontSize: 13 }}>{v}</span> : <span style={{ color: '#d1d5db' }}>—</span> },
    { title: 'Status', dataIndex: 'status', key: 'status', render: v => <Tag color={TICKET_STATUS[v]?.color} style={{ borderRadius: 6 }}>{TICKET_STATUS[v]?.label}</Tag> },
    { title: 'Prioridade', dataIndex: 'priority', key: 'priority', render: v => <Tag color={PRIORITY[v]?.color} style={{ borderRadius: 6 }}>{PRIORITY[v]?.label}</Tag> },
    { title: 'Criado em', dataIndex: 'createdAt', key: 'createdAt', render: v => <span style={{ color: '#9ca3af', fontSize: 12 }}>{dayjs(v).format('DD/MM/YYYY')}</span> },
    { title: '', key: 'action', width: 60, render: (_, r) => <Button type="link" size="small" onClick={() => navigate(`/app/tickets/${r.id}`)}>Ver</Button> },
  ];

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}><Spin size="large" /></div>;
  if (error) return <Alert type="error" message={error} />;

  const openTickets = tickets.filter(t => t.status === 'OPEN').length;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/app/companies')} style={{ color: '#6b7280', padding: '4px 8px' }} />
          <div style={{ width: 44, height: 44, borderRadius: 12, background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BankOutlined style={{ color: '#16a34a', fontSize: 20 }} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: 0 }}>{company?.name}</h1>
              <Tag color={company?.active ? 'success' : 'error'} style={{ borderRadius: 6 }}>{company?.active ? 'Ativa' : 'Inativa'}</Tag>
            </div>
            <div style={{ fontSize: 13, color: '#9ca3af', marginTop: 2 }}>
              CNPJ: {company?.cnpj} {company?.email && `· ${company.email}`}
            </div>
          </div>
        </div>
        {canEdit && (
          <Button icon={<EditOutlined />} onClick={openEditComp} style={{ borderRadius: 8, fontWeight: 600 }}>
            Editar Empresa
          </Button>
        )}
      </div>

      {/* Stats */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6} style={{ display: 'flex' }}>
          <StatCard icon={<IdcardOutlined />} label="Funcionários" value={employees.length} color="#16a34a" bg="#dcfce7" />
        </Col>
        <Col xs={12} sm={6} style={{ display: 'flex' }}>
          <StatCard icon={<TeamOutlined />} label="Usuários" value={users.length} color="#2563eb" bg="#dbeafe" />
        </Col>
        <Col xs={12} sm={6} style={{ display: 'flex' }}>
          <StatCard icon={<CustomerServiceOutlined />} label="Chamados" value={tickets.length} color="#d97706" bg="#fffbeb" />
        </Col>
        <Col xs={12} sm={6} style={{ display: 'flex' }}>
          <StatCard icon={<CustomerServiceOutlined />} label="Em Aberto" value={openTickets} color="#dc2626" bg="#fef2f2" />
        </Col>
      </Row>

      {/* Tabs */}
      <Card style={{ borderRadius: 12, border: '1px solid #e5e7eb' }} bodyStyle={{ padding: 0 }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          style={{ padding: '0 24px' }}
          items={[
            {
              key: 'employees',
              label: <span><IdcardOutlined /> Funcionários ({employees.length})</span>,
              children: (
                <div style={{ padding: '0 0 16px' }}>
                  {canEdit && (
                    <div style={{ padding: '16px 24px 8px', display: 'flex', justifyContent: 'flex-end' }}>
                      <Button type="primary" icon={<PlusOutlined />} onClick={openCreateEmp} style={{ background: '#16a34a', borderColor: '#16a34a', borderRadius: 8, fontWeight: 600 }}>
                        Novo Funcionário
                      </Button>
                    </div>
                  )}
                  <Table dataSource={employees} columns={empColumns} rowKey="id" size="middle" scroll={{ x: 700 }} pagination={{ pageSize: 10 }} />
                </div>
              ),
            },
            {
              key: 'users',
              label: <span><UserOutlined /> Usuários ({users.length})</span>,
              children: (
                <div style={{ padding: '16px 0' }}>
                  <Table dataSource={users} columns={userColumns} rowKey="id" size="middle" scroll={{ x: 600 }} pagination={{ pageSize: 10 }} />
                </div>
              ),
            },
            {
              key: 'tickets',
              label: <span><CustomerServiceOutlined /> Chamados ({tickets.length})</span>,
              children: (
                <div style={{ padding: '16px 0' }}>
                  <Table dataSource={tickets} columns={ticketColumns} rowKey="id" size="middle" scroll={{ x: 800 }} pagination={{ pageSize: 10 }} />
                </div>
              ),
            },
          ]}
        />
      </Card>

      {/* Modal — Funcionário */}
      <Modal
        title={<span style={{ fontWeight: 700 }}>{editingEmp ? 'Editar Funcionário' : 'Novo Funcionário'}</span>}
        open={empModal}
        onCancel={() => setEmpModal(false)}
        onOk={() => empForm.submit()}
        okText="Salvar"
        cancelText="Cancelar"
        okButtonProps={{ style: { background: '#16a34a', borderColor: '#16a34a' } }}
        width={560}
      >
        <Form form={empForm} layout="vertical" onFinish={handleSaveEmp} style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="name" label="Nome" rules={[{ required: true, message: 'Obrigatório' }]}>
                <Input placeholder="Nome completo" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="position" label="Cargo" rules={[{ required: true, message: 'Obrigatório' }]}>
                <Input placeholder="Ex: Analista de TI" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="department" label="Departamento">
                <Input placeholder="Ex: TI, RH, Financeiro" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="phone" label="Telefone">
                <Input placeholder="(11) 99999-9999" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="email" label="Email">
                <Input placeholder="funcionario@empresa.com" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="cpf" label="CPF">
                <Input placeholder="000.000.000-00" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="hireDate" label="Data de Admissão">
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="Selecione a data" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="salary" label="Salário (R$)">
                <Input placeholder="0,00" type="number" />
              </Form.Item>
            </Col>
          </Row>
          {editingEmp && (
            <Form.Item name="active" label="Ativo" valuePropName="checked">
              <Switch />
            </Form.Item>
          )}
        </Form>
      </Modal>

      {/* Modal — Editar Empresa */}
      <Modal
        title={<span style={{ fontWeight: 700 }}>Editar Empresa</span>}
        open={compModal}
        onCancel={() => setCompModal(false)}
        onOk={() => compForm.submit()}
        okText="Salvar"
        cancelText="Cancelar"
        okButtonProps={{ style: { background: '#16a34a', borderColor: '#16a34a' } }}
      >
        <Form form={compForm} layout="vertical" onFinish={handleSaveComp} style={{ marginTop: 16 }}>
          <Form.Item name="name" label="Nome" rules={[{ required: true }]}>
            <Input placeholder="Razão social" />
          </Form.Item>
          <Form.Item name="email" label="Email" rules={[{ required: true }, { type: 'email' }]}>
            <Input placeholder="contato@empresa.com.br" />
          </Form.Item>
          <Form.Item name="phone" label="Telefone">
            <Input placeholder="(11) 99999-9999" />
          </Form.Item>
          <Form.Item name="address" label="Endereço">
            <Input placeholder="Rua, número - Cidade/UF" />
          </Form.Item>
          <Form.Item name="active" label="Ativa" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
