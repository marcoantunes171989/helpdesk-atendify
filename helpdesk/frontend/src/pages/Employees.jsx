import { useEffect, useState } from 'react';
import {
  Table, Button, Drawer, Modal, Form, Input, Select, Space,
  message, Tooltip, Avatar, Row, Col,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined,
  PhoneOutlined, IdcardOutlined, ExclamationCircleOutlined,
} from '@ant-design/icons';
import { employeeService, companyService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const { Option } = Select;

const avatarColors = [
  { bg: '#dbeafe', color: '#2563eb' },
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
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteModal, setDeleteModal] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [form] = Form.useForm();
  const { user } = useAuth();

  const load = (params = {}) => {
    setLoading(true);
    employeeService.list(params).then(setEmployees).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    companyService.list().then(setCompanies);
  }, [user]);

  const openCreate = () => { setEditing(null); form.resetFields(); setDrawerOpen(true); };

  const openEdit = (record) => {
    setEditing(record);
    form.setFieldsValue({ name: record.name, phone: record.phone, position: record.position });
    setDrawerOpen(true);
  };

  const handleSubmit = async (values) => {
    setSaving(true);
    try {
      if (editing) {
        await employeeService.update(editing.id, values);
        message.success('Funcionário atualizado com sucesso');
      } else {
        await employeeService.create(values);
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

  const columns = [
    {
      title: '#', dataIndex: 'code', key: 'code', width: 70,
      sorter: (a, b) => (a.code || 0) - (b.code || 0),
      render: v => (
        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#2563eb', fontSize: 13 }}>
          {v ? String(v).padStart(4, '0') : '—'}
        </span>
      ),
    },
    {
      title: 'Funcionário', key: 'name', minWidth: 180,
      sorter: (a, b) => a.name.localeCompare(b.name, 'pt-BR'),
      render: (_, r) => {
        const c = getAvatarColor(r.name);
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Avatar size={36} style={{ background: c.bg, color: c.color, fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
              {r.name?.charAt(0).toUpperCase()}
            </Avatar>
            <span style={{ fontWeight: 600, color: '#111827', fontSize: 13 }}>{r.name}</span>
          </div>
        );
      },
    },
    {
      title: 'Cargo', dataIndex: 'position', key: 'position',
      sorter: (a, b) => (a.position || '').localeCompare(b.position || '', 'pt-BR'),
      render: v => <span style={{ color: '#374151', fontSize: 13 }}>{v || '—'}</span>,
    },
    {
      title: 'Telefone', dataIndex: 'phone', key: 'phone',
      sorter: (a, b) => (a.phone || '').localeCompare(b.phone || ''),
      render: v => <span style={{ color: '#6b7280', fontSize: 13 }}>{v || '—'}</span>,
    },
    {
      title: 'Empresa', key: 'company',
      sorter: (a, b) => (a.company?.name || '').localeCompare(b.company?.name || '', 'pt-BR'),
      render: (_, r) => (
        <div>
          <div style={{ color: '#374151', fontSize: 13, fontWeight: 500 }}>{r.company?.name || '—'}</div>
          {r.company?.fantasia && (
            <div style={{ fontSize: 11, color: '#6b7280' }}>{r.company.fantasia}</div>
          )}
        </div>
      ),
    },
    {
      title: '', key: 'actions', width: 80,
      render: (_, record) => (
        <Space>
          <Tooltip title="Editar">
            <Button type="text" icon={<EditOutlined />} size="small"
              style={{ color: '#6b7280' }} onClick={() => openEdit(record)} />
          </Tooltip>
          <Button type="text" icon={<DeleteOutlined />} size="small" danger
            onClick={() => setDeleteModal({ id: record.id, name: record.name })} />
        </Space>
      ),
    },
  ];

  const filteredEmployees = search
    ? (() => { const q = search.toLowerCase(); return employees.filter(e => [e.name, e.position, e.phone, e.company?.name, e.company?.fantasia].some(f => (f || '').toLowerCase().includes(q))); })()
    : employees;

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Funcionários</h1>
          <p style={{ color: '#6b7280', fontSize: 14, margin: '4px 0 0' }}>
            {filteredEmployees.length} funcionário{filteredEmployees.length !== 1 ? 's' : ''} cadastrado{filteredEmployees.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate} style={{ borderRadius: 8, fontWeight: 600 }}>
          Novo Funcionário
        </Button>
      </div>

      {/* Busca */}
      <div style={{ padding: '12px 16px', background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', marginBottom: 16 }}>
        <Input.Search
          placeholder="Buscar por nome, cargo, telefone, empresa ou fantasia..."
          allowClear
          value={search}
          onChange={e => setSearch(e.target.value)}
          onSearch={v => setSearch(v)}
          style={{ width: '100%' }}
        />
      </div>

      {/* Tabela */}
      <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <Table
          dataSource={filteredEmployees} columns={columns} rowKey="id" loading={loading}
          scroll={{ x: 700 }} size="middle"
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
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IdcardOutlined style={{ color: '#2563eb', fontSize: 16 }} />
            </div>
            <span style={{ fontWeight: 700, fontSize: 16 }}>
              {editing ? 'Editar Funcionário' : 'Novo Funcionário'}
            </span>
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
              style={{ background: '#2563eb', borderColor: '#2563eb', fontWeight: 600 }}>
              {editing ? 'Salvar Alterações' : 'Cadastrar'}
            </Button>
          </Space>
        }
      >
        <div className="drawer-form-body" style={{ maxWidth: 560 }}>
          <Form form={form} layout="vertical" onFinish={handleSubmit}>
            <Form.Item
              name="name"
              label="Nome Completo"
              rules={[{ required: true, message: 'Informe o nome' }]}
            >
              <Input placeholder="Nome completo do funcionário" size="large" />
            </Form.Item>

            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="position"
                  label="Cargo"
                  rules={[{ required: true, message: 'Informe o cargo' }]}
                >
                  <Input placeholder="Ex: Analista de Suporte" size="large" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item name="phone" label="Telefone">
                  <Input
                    prefix={<PhoneOutlined style={{ color: '#9ca3af' }} />}
                    placeholder="(11) 99999-9999"
                    size="large"
                  />
                </Form.Item>
              </Col>
            </Row>

            {!editing && (
              <Form.Item
                name="companyId"
                label="Empresa"
                rules={[{ required: true, message: 'Selecione a empresa' }]}
              >
                <Select placeholder="Selecione a empresa" showSearch optionFilterProp="children" size="large">
                  {companies.map(c => <Option key={c.id} value={c.id}>{c.name}</Option>)}
                </Select>
              </Form.Item>
            )}
          </Form>
        </div>
      </Drawer>
    </div>
  );
}
