import { useEffect, useState } from 'react';
import {
  Table, Button, Modal, Form, Input, Select, Switch, Space,
  Popconfirm, message, Tooltip, Avatar, Tag, InputNumber, DatePicker,
} from 'antd';
import {
  PlusOutlined, EditOutlined, StopOutlined, SearchOutlined,
  UserOutlined, PhoneOutlined, MailOutlined, BankOutlined,
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
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
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

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (record) => {
    setEditing(record);
    form.setFieldsValue({
      ...record,
      salary: record.salary ? Number(record.salary) : null,
      hireDate: record.hireDate ? dayjs(record.hireDate) : null,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (values) => {
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
      setModalOpen(false);
      load();
    } catch (err) {
      message.error(err.response?.data?.error || 'Erro ao salvar funcionário');
    }
  };

  const handleDeactivate = async (id) => {
    try {
      await employeeService.remove(id);
      message.success('Funcionário desativado');
      load();
    } catch {
      message.error('Erro ao desativar funcionário');
    }
  };

  const activeCount = employees.filter(e => e.active).length;

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
            <Avatar
              size={36}
              style={{ background: c.bg, color: c.color, fontWeight: 700, fontSize: 14, flexShrink: 0 }}
            >
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
      render: v => (
        <Tag color={v ? 'success' : 'error'} style={{ borderRadius: 6 }}>
          {v ? 'Ativo' : 'Inativo'}
        </Tag>
      ),
    },
    {
      title: '', key: 'actions', width: 80,
      render: (_, record) => (
        <Space>
          <Tooltip title="Editar">
            <Button
              type="text" icon={<EditOutlined />} size="small"
              style={{ color: '#6b7280' }} onClick={() => openEdit(record)}
            />
          </Tooltip>
          {record.active && (
            <Popconfirm
              title="Desativar funcionário?"
              description="O funcionário não aparecerá mais nas listagens ativas."
              onConfirm={() => handleDeactivate(record.id)}
              okText="Desativar" cancelText="Cancelar"
              okButtonProps={{ danger: true }}
            >
              <Tooltip title="Desativar">
                <Button type="text" icon={<StopOutlined />} size="small" danger />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Funcionários</h1>
          <p style={{ color: '#6b7280', fontSize: 14, margin: '4px 0 0' }}>
            {activeCount} ativo{activeCount !== 1 ? 's' : ''} · {employees.length} total
          </p>
        </div>
        <Button
          type="primary" icon={<PlusOutlined />} onClick={openCreate}
          style={{ borderRadius: 8, fontWeight: 600 }}
        >
          Novo Funcionário
        </Button>
      </div>

      {/* Resumo em cards */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { label: 'Total', value: employees.length, color: '#6b7280', bg: '#f3f4f6' },
          { label: 'Ativos', value: activeCount, color: '#16a34a', bg: '#f0fdf4' },
          { label: 'Inativos', value: employees.length - activeCount, color: '#9ca3af', bg: '#f9fafb' },
          { label: 'Departamentos', value: new Set(employees.map(e => e.department).filter(Boolean)).size, color: '#2563eb', bg: '#eff6ff' },
        ].map(c => (
          <div key={c.label} style={{
            flex: '1 1 140px', padding: '14px 18px', borderRadius: 10,
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
          style={{ flex: 1, minWidth: 220 }}
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
          {[...new Set([...DEPARTMENTS, ...departments])].map(d => (
            <Option key={d} value={d}>{d}</Option>
          ))}
        </Select>
        <Button
          type="primary" ghost onClick={() => applyFilters()}
          style={{ borderColor: '#16a34a', color: '#16a34a' }}
        >
          Buscar
        </Button>
      </div>

      {/* Tabela */}
      <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <Table
          dataSource={employees}
          columns={columns}
          rowKey="id"
          loading={loading}
          scroll={{ x: 900 }}
          size="middle"
          pagination={{
            pageSize: 15, showSizeChanger: false,
            showTotal: t => `${t} funcionário${t !== 1 ? 's' : ''}`,
          }}
        />
      </div>

      {/* Modal CRUD */}
      <Modal
        title={<span style={{ fontWeight: 700, fontSize: 16 }}>{editing ? 'Editar Funcionário' : 'Novo Funcionário'}</span>}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        okText={editing ? 'Salvar Alterações' : 'Cadastrar'}
        cancelText="Cancelar"
        okButtonProps={{ style: { background: '#16a34a', borderColor: '#16a34a', fontWeight: 600 } }}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ marginTop: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Form.Item
              name="name" label="Nome Completo"
              rules={[{ required: true, message: 'Informe o nome' }]}
              style={{ gridColumn: '1 / -1' }}
            >
              <Input prefix={<UserOutlined style={{ color: '#9ca3af' }} />} placeholder="Nome completo do funcionário" />
            </Form.Item>

            <Form.Item
              name="position" label="Cargo / Função"
              rules={[{ required: true, message: 'Informe o cargo' }]}
            >
              <Input placeholder="Ex: Analista de Suporte" />
            </Form.Item>

            <Form.Item name="department" label="Departamento / Setor">
              <Select placeholder="Selecione ou digite" showSearch allowClear>
                {[...new Set([...DEPARTMENTS, ...departments])].map(d => (
                  <Option key={d} value={d}>{d}</Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item name="cpf" label="CPF">
              <Input placeholder="000.000.000-00" maxLength={14} />
            </Form.Item>

            <Form.Item name="phone" label="Telefone">
              <Input prefix={<PhoneOutlined style={{ color: '#9ca3af' }} />} placeholder="(11) 99999-9999" />
            </Form.Item>

            <Form.Item
              name="email" label="E-mail"
              rules={[{ type: 'email', message: 'E-mail inválido' }]}
              style={{ gridColumn: '1 / -1' }}
            >
              <Input prefix={<MailOutlined style={{ color: '#9ca3af' }} />} placeholder="funcionario@empresa.com.br" />
            </Form.Item>

            <Form.Item name="hireDate" label="Data de Admissão">
              <DatePicker
                format="DD/MM/YYYY"
                placeholder="Selecione a data"
                style={{ width: '100%' }}
              />
            </Form.Item>

            <Form.Item name="salary" label="Salário (R$)">
              <InputNumber
                placeholder="0,00"
                style={{ width: '100%' }}
                min={0}
                precision={2}
                decimalSeparator=","
                formatter={v => v ? `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : ''}
                parser={v => v.replace(/\./g, '').replace(',', '.')}
              />
            </Form.Item>

            {!editing && (
              <Form.Item
                name="companyId" label="Empresa"
                rules={[{ required: true, message: 'Selecione a empresa' }]}
                style={{ gridColumn: '1 / -1' }}
              >
                <Select
                  placeholder="Selecione a empresa"
                  showSearch
                  optionFilterProp="children"
                  prefix={<BankOutlined />}
                >
                  {companies.map(c => <Option key={c.id} value={c.id}>{c.name}</Option>)}
                </Select>
              </Form.Item>
            )}

            {editing && (
              <Form.Item name="active" label="Status" valuePropName="checked">
                <Switch
                  checkedChildren="Ativo"
                  unCheckedChildren="Inativo"
                  style={{ background: form.getFieldValue('active') ? '#16a34a' : undefined }}
                />
              </Form.Item>
            )}
          </div>
        </Form>
      </Modal>
    </div>
  );
}
