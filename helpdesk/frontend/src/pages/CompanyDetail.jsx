import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Row, Col, Tabs, Table, Button, Tag, Drawer, Modal, Form,
  Input, Select, Switch, Space, Tooltip, message,
  Spin, Alert, Avatar,
} from 'antd';
import {
  ArrowLeftOutlined, EditOutlined, PlusOutlined,
  CustomerServiceOutlined, IdcardOutlined, DeleteOutlined, BankOutlined,
  PhoneOutlined, ExclamationCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { companyService, employeeService, ticketService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { TICKET_STATUS, PRIORITY } from '../utils/constants';

const { Option } = Select;

const BR_STATES = [
  'AC','AL','AM','AP','BA','CE','DF','ES','GO','MA',
  'MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN',
  'RO','RR','RS','SC','SE','SP','TO',
];

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
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('employees');

  const [empDrawer, setEmpDrawer] = useState(false);
  const [editingEmp, setEditingEmp] = useState(null);
  const [empSaving, setEmpSaving] = useState(false);
  const [empForm] = Form.useForm();
  const [empDeleteModal, setEmpDeleteModal] = useState(null);
  const [empDeleteLoading, setEmpDeleteLoading] = useState(false);

  const [compDrawer, setCompDrawer] = useState(false);
  const [compSaving, setCompSaving] = useState(false);
  const [compForm] = Form.useForm();

  const canEdit = ['SUPER_ADMIN', 'ADMIN'].includes(user?.role);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [comp, emps, tiks] = await Promise.all([
        companyService.get(id),
        employeeService.list({ companyId: id }),
        ticketService.list({ companyId: id }),
      ]);
      setCompany(comp);
      setEmployees(emps);
      setTickets(Array.isArray(tiks) ? tiks : tiks?.tickets || []);
    } catch {
      setError('Erro ao carregar dados da empresa');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, [id]);

  const openCreateEmp = () => { setEditingEmp(null); empForm.resetFields(); setEmpDrawer(true); };
  const openEditEmp = (r) => {
    setEditingEmp(r);
    empForm.setFieldsValue({ name: r.name, phone: r.phone, position: r.position });
    setEmpDrawer(true);
  };

  const handleSaveEmp = async (values) => {
    setEmpSaving(true);
    try {
      const payload = { ...values, companyId: id };
      if (editingEmp) {
        await employeeService.update(editingEmp.id, payload);
        message.success('Funcionário atualizado');
      } else {
        await employeeService.create(payload);
        message.success('Funcionário cadastrado');
      }
      setEmpDrawer(false);
      loadAll();
    } catch (err) {
      message.error(err.response?.data?.error || 'Erro ao salvar funcionário');
    } finally {
      setEmpSaving(false);
    }
  };

  const handleDeleteEmp = async () => {
    setEmpDeleteLoading(true);
    try {
      await employeeService.remove(empDeleteModal.id);
      message.success('Funcionário excluído com sucesso');
      setEmpDeleteModal(null);
      loadAll();
    } catch (err) {
      message.error(err.response?.data?.error || 'Erro ao excluir funcionário');
    } finally {
      setEmpDeleteLoading(false);
    }
  };

  const openEditComp = () => { compForm.setFieldsValue(company); setCompDrawer(true); };
  const handleSaveComp = async (values) => {
    setCompSaving(true);
    try {
      await companyService.update(id, values);
      message.success('Empresa atualizada');
      setCompDrawer(false);
      loadAll();
    } catch (err) {
      message.error(err.response?.data?.error || 'Erro ao atualizar empresa');
    } finally {
      setCompSaving(false);
    }
  };

  const empColumns = [
    {
      title: 'Funcionário', key: 'name',
      render: (_, r) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar size={32} style={{ background: '#dcfce7', color: '#16a34a', fontWeight: 700, fontSize: 13 }}>
            {r.name?.charAt(0).toUpperCase()}
          </Avatar>
          <span style={{ fontWeight: 600, color: '#111827', fontSize: 13 }}>{r.name}</span>
        </div>
      ),
    },
    { title: 'Cargo', dataIndex: 'position', key: 'position', render: v => <span style={{ color: '#374151', fontSize: 13 }}>{v || '—'}</span> },
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
          <Button type="text" icon={<DeleteOutlined />} size="small" danger
            onClick={() => setEmpDeleteModal({ id: r.id, name: r.name })} />
        </Space>
      ),
    },
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
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
        <Col xs={12} sm={8} style={{ display: 'flex' }}>
          <StatCard icon={<IdcardOutlined />} label="Funcionários" value={employees.length} color="#16a34a" bg="#dcfce7" />
        </Col>
        <Col xs={12} sm={8} style={{ display: 'flex' }}>
          <StatCard icon={<CustomerServiceOutlined />} label="Chamados" value={tickets.length} color="#d97706" bg="#fffbeb" />
        </Col>
        <Col xs={24} sm={8} style={{ display: 'flex' }}>
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
                      <Button type="primary" icon={<PlusOutlined />} onClick={openCreateEmp}
                        style={{ background: '#16a34a', borderColor: '#16a34a', borderRadius: 8, fontWeight: 600 }}>
                        Novo Funcionário
                      </Button>
                    </div>
                  )}
                  <Table dataSource={employees} columns={empColumns} rowKey="id" size="middle" scroll={{ x: 700 }} pagination={{ pageSize: 10 }} />
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

      {/* Modal — Confirmar exclusão de funcionário */}
      <Modal
        open={!!empDeleteModal}
        onCancel={() => setEmpDeleteModal(null)}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ExclamationCircleOutlined style={{ color: '#dc2626', fontSize: 20 }} />
            <span style={{ fontWeight: 700 }}>Excluir funcionário</span>
          </div>
        }
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setEmpDeleteModal(null)}>Cancelar</Button>
            <Button danger type="primary" loading={empDeleteLoading} onClick={handleDeleteEmp}>
              Excluir permanentemente
            </Button>
          </div>
        }
      >
        {empDeleteModal && (
          <div style={{ padding: '8px 0' }}>
            <p style={{ color: '#374151', marginBottom: 16 }}>
              Você está prestes a excluir <strong>{empDeleteModal.name}</strong> permanentemente. Esta ação não pode ser desfeita.
            </p>
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#dc2626', fontWeight: 500 }}>
              O funcionário será removido do sistema e não poderá ser recuperado.
            </div>
          </div>
        )}
      </Modal>

      {/* Drawer — Funcionário */}
      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IdcardOutlined style={{ color: '#16a34a', fontSize: 16 }} />
            </div>
            <span style={{ fontWeight: 700, fontSize: 16 }}>{editingEmp ? 'Editar Funcionário' : 'Novo Funcionário'}</span>
          </div>
        }
        open={empDrawer}
        onClose={() => setEmpDrawer(false)}
        width="100%"
        styles={{ body: { padding: '24px', overflowY: 'auto' } }}
        extra={
          <Space>
            <Button onClick={() => setEmpDrawer(false)}>Cancelar</Button>
            <Button type="primary" loading={empSaving} onClick={() => empForm.submit()}
              style={{ background: '#16a34a', borderColor: '#16a34a', fontWeight: 600 }}>
              {editingEmp ? 'Salvar Alterações' : 'Cadastrar'}
            </Button>
          </Space>
        }
      >
        <div className="drawer-form-body" style={{ maxWidth: 560 }}>
          <Form form={empForm} layout="vertical" onFinish={handleSaveEmp}>
            <Form.Item name="name" label="Nome Completo" rules={[{ required: true, message: 'Informe o nome' }]}>
              <Input placeholder="Nome completo do funcionário" size="large" />
            </Form.Item>
            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item name="position" label="Cargo" rules={[{ required: true, message: 'Informe o cargo' }]}>
                  <Input placeholder="Ex: Analista de TI" size="large" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item name="phone" label="Telefone">
                  <Input prefix={<PhoneOutlined style={{ color: '#9ca3af' }} />} placeholder="(11) 99999-9999" size="large" />
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </div>
      </Drawer>

      {/* Drawer — Editar Empresa */}
      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BankOutlined style={{ color: '#16a34a', fontSize: 16 }} />
            </div>
            <span style={{ fontWeight: 700, fontSize: 16 }}>Editar Empresa</span>
          </div>
        }
        open={compDrawer}
        onClose={() => setCompDrawer(false)}
        width="100%"
        styles={{ body: { padding: '24px', overflowY: 'auto' } }}
        extra={
          <Space>
            <Button onClick={() => setCompDrawer(false)}>Cancelar</Button>
            <Button type="primary" loading={compSaving} onClick={() => compForm.submit()}
              style={{ background: '#16a34a', borderColor: '#16a34a', fontWeight: 600 }}>
              Salvar Alterações
            </Button>
          </Space>
        }
      >
        <div className="drawer-form-body" style={{ maxWidth: 640 }}>
          <Form form={compForm} layout="vertical" onFinish={handleSaveComp}>
            <Form.Item name="name" label="Razão Social" rules={[{ required: true }]}>
              <Input placeholder="Razão social" size="large" />
            </Form.Item>
            <Row gutter={16}>
              <Col xs={24} sm={14}>
                <Form.Item name="email" label="E-mail" rules={[{ required: true }, { type: 'email' }]}>
                  <Input placeholder="contato@empresa.com.br" size="large" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={10}>
                <Form.Item name="phone" label="Telefone">
                  <Input placeholder="(11) 99999-9999" size="large" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col xs={16} sm={18}>
                <Form.Item name="street" label="Logradouro">
                  <Input placeholder="Rua, número - Bairro" size="large" />
                </Form.Item>
              </Col>
              <Col xs={8} sm={6}>
                <Form.Item name="state" label="UF">
                  <Select placeholder="UF" showSearch size="large">
                    {BR_STATES.map(s => <Option key={s} value={s}>{s}</Option>)}
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="active" label="Status" valuePropName="checked">
              <Switch checkedChildren="Ativa" unCheckedChildren="Inativa" />
            </Form.Item>
          </Form>
        </div>
      </Drawer>
    </div>
  );
}
