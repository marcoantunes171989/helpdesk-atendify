import { useEffect, useState } from 'react';
import {
  Table, Button, Drawer, Modal, Form, Input, Select, Switch, Space,
  message, Tooltip, Avatar, Tag, InputNumber, DatePicker, Row, Col,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined,
  UserOutlined, PhoneOutlined, MailOutlined, IdcardOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { employeeService, companyService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const { Option } = Select;

const DEPARTMENTS = [
  'Tecnologia da Informação',
  'Recursos Humanos',
  'Financeiro',
  'Comercial',
  'Marketing',
  'Operações',
  'Jurídico',
  'Administrativo',
  'Suporte',
  'Logística',
];

const avatarColors = [
  { bg: '#dcfce7', color: '#16a34a' },
  { bg: '#dbeafe', color: '#1d4ed8' },
  { bg: '#fce7f3', color: '#be185d' },
  { bg: '#fef3c7', color: '#d97706' },
  { bg: '#ede9fe', color: '#7c3aed' },
  { bg: '#fee2e2', color: '#dc2626' },
];

const getAvatarColor = (name = '') => avatarColors[name.charCodeAt(0) % avatarColors.length];

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteModal, setDeleteModal] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState(null);
  const [form] = Form.useForm();
  const { user } = useAuth();

  const load = (params = {}) => {
    setLoading(true);
    employeeService.list(params).then(setEmployees).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    employeeService.departments().then(setDepartments);
    companyService.list().then(setCompanies);
  }, [user]);

  const applyFilters = (extra = {}) => {
    const params = {};
    if (search) params.search = search;
    if (filterDept) params.department = filterDept;
    load({ ...params, ...extra });
  };

  const openCreate = () => { setEditing(null); form.resetFields(); setDrawerOpen(true); };

  const openEdit = (record) => {
    setEditing(record);
    form.setFieldsValue({
      ...record,
      salary: record.salary ? Number(record.salary) : null,
      hireDate: record.hireDate ? dayjs(record.hireDate) : null,
    });
    setDrawerOpen(true);
  };

  const handleSubmit = async (values) => {
    setSaving(true);
    try {
      const payload = {
        ...values,
        hireDate: values.hireDate ? values.hireDate.toISOString() : null,
        salary: values.salary || null,
      };
      if (editing) {
        await employeeService.update(editing.id, payload);
        message.success('Funcionário atualizado com sucesso');
      } else {
        await employeeService.create(payload);
        message.success('Funcionário cadastrado com sucesso');
      }
      setDrawerOpen(false);
      load();
    } catch (err) {
      message.error(err.response?.data?.error || 'Erro ao salvar funcionário');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await employeeService.remove(deleteModal.id);
      message.success('Funcionário excluído com sucesso');
      setDeleteModal(null);
      load();
    } catch (err) {
      message.error(err.response?.data?.error || 'Erro ao excluir funcionário');
    } finally {
      setDeleteLoading(false);
    }
  };

  const activeCount = employees.filter(e => e.active).length;
  const allDepts = [...new Set([...DEPARTMENTS, ...departments])];

  const columns = [
    {
      title: '#', dataIndex: 'code', key: 'code', width: 70,
      render: v => <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#16a34a', fontSize: 13 }}>{v ? String(v).padStart(4, '0') : '—'}</span>,
    },
    {
      title: 'Funcionário', key: 'name', minWidth: 200,
      render: (_, r) => {
        const c = getAvatarColor(r.name);
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Avatar size={36} style={{ background: c.bg, color: c.color, fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
              {r.name?.charAt(0).toUpperCase()}
            </Avatar>
            <div>
              <div style={{ fontWeight: 600, color: '#111827', fontSize: 13 }}>{r.name}</div>
              {r.email && <div style={{ fontSize: 12, color: '#9ca3af' }}>{r.email}</div>}
            </div>
          </div>
        );
      },
    },
    {
      title: 'Cargo', key: 'position',
      render: (_, r) => (
        <div>
          <div style={{ fontWeight: 500, color: '#374151', fontSize: 13 }}>{r.position}</div>
          {r.department && <div style={{ fontSize: 11, color: '#9ca3af' }}>{r.department}</div>}
        </div>
      ),
    },
    {
      title: 'CPF', dataIndex: 'cpf', key: 'cpf',
      render: v => <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#6b7280' }}>{v || '—'}</span>,
    },
    {
      title: 'Telefone', dataIndex: 'phone', key: 'phone',
      render: v => <span style={{ color: '#6b7280', fontSize: 13 }}>{v || '—'}</span>,
    },
    {
      title: 'Admissão', dataIndex: 'hireDate', key: 'hireDate',
      render: v => v
        ? <span style={{ color: '#6b7280', fontSize: 13 }}>{dayjs(v).format('DD/MM/YYYY')}</span>
        : <span style={{ color: '#d1d5db' }}>—</span>,
    },
    {
      title: 'Empresa', key: 'company',
      render: (_, r) => <span style={{ color: '#6b7280', fontSize: 13 }}>{r.company?.name || '—'}</span>,
    },
    {
      title: 'Status', dataIndex: 'active', key: 'active',
      render: v => <Tag color={v ? 'success' : 'error'} style={{ borderRadius: 6 }}>{v ? 'Ativo' : 'Inativo'}</Tag>,
    },
    {
      title: '', key: 'actions', width: 80,
      render: (_, record) => (
        <Space>
          <Tooltip title="Editar">
            <Button type="text" icon={<EditOutlined />} size="small" style={{ color: '#6b7280' }} onClick={() => openEdit(record)} />
          </Tooltip>
          <Button type="text" icon={<DeleteOutlined />} size="small" danger
            onClick={() => setDeleteModal({ id: record.id, name: record.name })} />
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Funcionários</h1>
          <p style={{ color: '#6b7280', fontSize: 14, margin: '4px 0 0' }}>
            {activeCount} ativo{activeCount !== 1 ? 's' : ''} · {employees.length} total
          </p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate} style={{ borderRadius: 8, fontWeight: 600 }}>
          Novo Funcionário
        </Button>
      </div>

      {/* Resumo */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { label: 'Total', value: employees.length, color: '#6b7280', bg: '#f3f4f6' },
          { label: 'Ativos', value: activeCount, color: '#16a34a', bg: '#f0fdf4' },
          { label: 'Inativos', value: employees.length - activeCount, color: '#9ca3af', bg: '#f9fafb' },
          { label: 'Departamentos', value: new Set(employees.map(e => e.department).filter(Boolean)).size, color: '#2563eb', bg: '#eff6ff' },
        ].map(c => (
          <div key={c.label} style={{
            flex: '1 1 130px', padding: '14px 18px', borderRadius: 10,
            background: '#fff', border: '1px solid #e5e7eb',
          }}>
            <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{c.label}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: c.color, marginTop: 4 }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{
        display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16,
        padding: '14px 16px', background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb',
      }}>
        <Input
          prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
          placeholder="Buscar por nome, email, cargo ou CPF..."
          style={{ flex: 1, minWidth: 200 }}
          allowClear
          value={search}
          onChange={e => setSearch(e.target.value)}
          onPressEnter={() => applyFilters()}
          onClear={() => { setSearch(''); load(); }}
        />
        <Select
          allowClear placeholder="Departamento"
          style={{ width: 200 }}
          value={filterDept}
          onChange={v => { setFilterDept(v); applyFilters({ department: v }); }}
        >
          {allDepts.map(d => <Option key={d} value={d}>{d}</Option>)}
        </Select>
        <Button type="primary" ghost onClick={() => applyFilters()} style={{ borderColor: '#16a34a', color: '#16a34a' }}>
          Buscar
        </Button>
      </div>

      {/* Tabela */}
      <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <Table
          dataSource={employees} columns={columns} rowKey="id" loading={loading}
          scroll={{ x: 900 }} size="middle"
          pagination={{ pageSize: 15, showSizeChanger: false, showTotal: t => `${t} funcionário${t !== 1 ? 's' : ''}` }}
        />
      </div>

      {/* Modal — Confirmar exclusão */}
      <Modal
        open={!!deleteModal}
        onCancel={() => setDeleteModal(null)}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ExclamationCircleOutlined style={{ color: '#dc2626', fontSize: 20 }} />
            <span style={{ fontWeight: 700 }}>Excluir funcionário</span>
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
          <div style={{ padding: '8px 0' }}>
            <p style={{ color: '#374151', marginBottom: 16 }}>
              Você está prestes a excluir <strong>{deleteModal.name}</strong> permanentemente. Esta ação não pode ser desfeita.
            </p>
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#dc2626', fontWeight: 500 }}>
              O funcionário será removido do sistema e não poderá ser recuperado.
            </div>
          </div>
        )}
      </Modal>

      {/* Drawer — Cadastro / Edição */}
      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IdcardOutlined style={{ color: '#16a34a', fontSize: 16 }} />
            </div>
            <span style={{ fontWeight: 700, fontSize: 16 }}>{editing ? 'Editar Funcionário' : 'Novo Funcionário'}</span>
          </div>
        }
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width="100%"
        styles={{ body: { padding: '24px', overflowY: 'auto' } }}
        extra={
          <Space>
            <Button onClick={() => setDrawerOpen(false)}>Cancelar</Button>
            <Button type="primary" loading={saving} onClick={() => form.submit()}
              style={{ background: '#16a34a', borderColor: '#16a34a', fontWeight: 600 }}>
              {editing ? 'Salvar Alterações' : 'Cadastrar'}
            </Button>
          </Space>
        }
      >
        <div className="drawer-form-body">
          <Form form={form} layout="vertical" onFinish={handleSubmit}>

            <div className="form-section-label">Dados Pessoais</div>
            <Form.Item name="name" label="Nome Completo" rules={[{ required: true, message: 'Informe o nome' }]}>
              <Input prefix={<UserOutlined style={{ color: '#9ca3af' }} />} placeholder="Nome completo do funcionário" size="large" />
            </Form.Item>

            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item name="cpf" label="CPF">
                  <Input placeholder="000.000.000-00" maxLength={14} size="large" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item name="phone" label="Telefone">
                  <Input prefix={<PhoneOutlined style={{ color: '#9ca3af' }} />} placeholder="(11) 99999-9999" size="large" />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item name="email" label="E-mail" rules={[{ type: 'email', message: 'E-mail inválido' }]}>
              <Input prefix={<MailOutlined style={{ color: '#9ca3af' }} />} placeholder="funcionario@empresa.com.br" size="large" />
            </Form.Item>

            <div className="form-section-label" style={{ marginTop: 8 }}>Cargo e Empresa</div>

            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item name="position" label="Cargo / Função" rules={[{ required: true, message: 'Informe o cargo' }]}>
                  <Input placeholder="Ex: Analista de Suporte" size="large" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item name="department" label="Departamento / Setor">
                  <Select placeholder="Selecione ou digite" showSearch allowClear size="large">
                    {allDepts.map(d => <Option key={d} value={d}>{d}</Option>)}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            {!editing && (
              <Form.Item name="companyId" label="Empresa" rules={[{ required: true, message: 'Selecione a empresa' }]}>
                <Select placeholder="Selecione a empresa" showSearch optionFilterProp="children" size="large">
                  {companies.map(c => <Option key={c.id} value={c.id}>{c.name}</Option>)}
                </Select>
              </Form.Item>
            )}

            <div className="form-section-label" style={{ marginTop: 8 }}>Contratação</div>

            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item name="hireDate" label="Data de Admissão">
                  <DatePicker format="DD/MM/YYYY" placeholder="Selecione a data" style={{ width: '100%' }} size="large" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item name="salary" label="Salário (R$)">
                  <InputNumber
                    placeholder="0,00"
                    style={{ width: '100%' }}
                    size="large"
                    min={0}
                    precision={2}
                    decimalSeparator=","
                    formatter={v => v ? `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : ''}
                    parser={v => v.replace(/\./g, '').replace(',', '.')}
                  />
                </Form.Item>
              </Col>
            </Row>

            {editing && (
              <Form.Item name="active" label="Status" valuePropName="checked">
                <Switch checkedChildren="Ativo" unCheckedChildren="Inativo" />
              </Form.Item>
            )}
          </Form>
        </div>
      </Drawer>
    </div>
  );
}
