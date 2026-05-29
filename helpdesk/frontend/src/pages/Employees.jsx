import { useEffect, useState } from 'react';
import {
  Table, Button, Modal, Form, Input, Select, Space,
  message, Tooltip, Avatar, Row, Col,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined,
  PhoneOutlined, IdcardOutlined, ExclamationCircleOutlined,
} from '@ant-design/icons';
import { employeeService, companyService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { normalize } from '../utils/constants';

const { Option } = Select;

const avatarColors = [
  { bg: 'rgba(37,99,235,0.25)', color: '#60a5fa' },
  { bg: 'rgba(29,78,216,0.25)', color: '#93c5fd' },
  { bg: 'rgba(190,24,93,0.25)', color: '#f472b6' },
  { bg: 'rgba(217,119,6,0.25)', color: '#fbbf24' },
  { bg: 'rgba(124,58,237,0.25)', color: '#a78bfa' },
  { bg: 'rgba(220,38,38,0.25)', color: '#f87171' },
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
  const [deletingId, setDeletingId] = useState(null);
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
        message.success('FuncionÃ¡rio atualizado com sucesso');
      } else {
        await employeeService.create(values);
        message.success('FuncionÃ¡rio cadastrado com sucesso');
      }
      setDrawerOpen(false);
      load();
    } catch (err) {
      message.error(err.response?.data?.error || 'Erro ao salvar funcionÃ¡rio');
    } finally {
      setSaving(false);
    }
  };

  const openDelete = async (record) => {
    setDeletingId(record.id);
    try {
      const links = await employeeService.checkLinks(record.id);
      setDeleteModal({ id: record.id, name: record.name, ...links });
    } catch {
      message.error('Erro ao verificar vÃ­nculos');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await employeeService.remove(deleteModal.id);
      message.success('FuncionÃ¡rio excluÃ­do com sucesso');
      setDeleteModal(null);
      load();
    } catch (err) {
      message.error(err.response?.data?.error || 'Erro ao excluir funcionÃ¡rio');
    } finally {
      setDeleteLoading(false);
    }
  };

  const columns = [
    {
      title: '#', dataIndex: 'code', key: 'code', width: 70,
      sorter: (a, b) => (a.code || 0) - (b.code || 0),
      render: v => (
        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#60a5fa', fontSize: 13 }}>
          {v ? String(v).padStart(4, '0') : 'â€”'}
        </span>
      ),
    },
    {
      title: 'FuncionÃ¡rio', key: 'name', minWidth: 180,
      sorter: (a, b) => a.name.localeCompare(b.name, 'pt-BR'),
      render: (_, r) => {
        const c = getAvatarColor(r.name);
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Avatar size={36} style={{ background: c.bg, color: c.color, fontWeight: 700, fontSize: 14, flexShrink: 0, border: `1px solid ${c.color}44` }}>
              {r.name?.charAt(0).toUpperCase()}
            </Avatar>
            <span style={{ fontWeight: 600, color: 'var(--cl-text-hi)', fontSize: 13 }}>{r.name}</span>
          </div>
        );
      },
    },
    {
      title: 'Cargo', dataIndex: 'position', key: 'position',
      sorter: (a, b) => (a.position || '').localeCompare(b.position || '', 'pt-BR'),
      render: v => <span style={{ color: 'var(--cl-text-soft)', fontSize: 13 }}>{v || 'â€”'}</span>,
    },
    {
      title: 'Telefone', dataIndex: 'phone', key: 'phone',
      sorter: (a, b) => (a.phone || '').localeCompare(b.phone || ''),
      render: v => <span style={{ color: 'var(--cl-text-soft)', fontSize: 13 }}>{v || 'â€”'}</span>,
    },
    {
      title: 'Empresa', key: 'company',
      sorter: (a, b) => (a.company?.name || '').localeCompare(b.company?.name || '', 'pt-BR'),
      render: (_, r) => (
        <div>
          <div style={{ color: 'var(--cl-text-sub)', fontSize: 13, fontWeight: 500 }}>{r.company?.name || 'â€”'}</div>
          {r.company?.fantasia && (
            <div style={{ fontSize: 11, color: 'var(--cl-text-muted)' }}>{r.company.fantasia}</div>
          )}
        </div>
      ),
    },
    {
      title: '', key: 'actions', width: 80,
      render: (_, record) => (
        <Space onClick={e => e.stopPropagation()}>
          <Tooltip title="Editar">
            <Button type="text" icon={<EditOutlined />} size="small"
              style={{ color: 'var(--cl-text-soft)' }} onClick={() => openEdit(record)} />
          </Tooltip>
          <Button type="text" icon={<DeleteOutlined />} size="small" danger
            loading={deletingId === record.id} onClick={() => openDelete(record)} />
        </Space>
      ),
    },
  ];

  const filteredEmployees = search
    ? (() => { const q = normalize(search); return employees.filter(e => [e.name, e.position, e.phone, e.company?.name, e.company?.fantasia].some(f => normalize(f).includes(q))); })()
    : employees;

  return (
    <div className="page-wrap">
      <div className="page-header">
        <div>
          <h1 className="page-title">FuncionÃ¡rios</h1>
          <p style={{ color: 'var(--cl-text-muted)', fontSize: 13, margin: '4px 0 0' }}>
            {filteredEmployees.length} funcionÃ¡rio{filteredEmployees.length !== 1 ? 's' : ''} cadastrado{filteredEmployees.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate} style={{ borderRadius: 8, fontWeight: 600 }}>
          Novo FuncionÃ¡rio
        </Button>
      </div>

      <div className="filter-bar">
        <Input
          placeholder="Buscar por nome, cargo, telefone, empresa ou fantasia..."
          allowClear
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: '100%' }}
        />
      </div>

      <div className="page-table-wrap">
        <Table
          dataSource={filteredEmployees} columns={columns} rowKey="id" loading={loading}
          scroll={{ x: 700 }} size="middle"
          pagination={{ pageSize: 15, showSizeChanger: false, showTotal: t => `${t} funcionÃ¡rio${t !== 1 ? 's' : ''}` }}
          onRow={record => ({ onClick: () => openEdit(record), style: { cursor: 'pointer' } })}
        />
      </div>

      {/* Modal â€” Confirmar exclusÃ£o */}
      <Modal
        open={!!deleteModal}
        onCancel={() => setDeleteModal(null)}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ExclamationCircleOutlined style={{ color: '#f87171', fontSize: 20 }} />
            <span style={{ fontWeight: 700 }}>Excluir funcionÃ¡rio</span>
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
            <p style={{ marginBottom: 16 }}>
              VocÃª estÃ¡ prestes a excluir <strong>{deleteModal.name}</strong> permanentemente. Esta aÃ§Ã£o nÃ£o pode ser desfeita.
            </p>
            {deleteModal.tickets > 0 ? (
              <div style={{ background: 'rgba(217,119,6,0.1)', border: '1px solid rgba(217,119,6,0.3)', borderRadius: 8, padding: '14px 16px' }}>
                <div style={{ fontWeight: 600, color: '#fbbf24', fontSize: 13, marginBottom: 6 }}>AtenÃ§Ã£o:</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span>Chamados vinculados (serÃ£o desvinculados)</span>
                  <span style={{ fontWeight: 700, color: '#fbbf24' }}>{deleteModal.tickets}</span>
                </div>
              </div>
            ) : (
              <div style={{ background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#60a5fa' }}>
                Este funcionÃ¡rio nÃ£o possui chamados vinculados.
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Drawer â€” Cadastro / EdiÃ§Ã£o */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(37,99,235,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IdcardOutlined style={{ color: '#60a5fa', fontSize: 16 }} />
            </div>
            <span style={{ fontWeight: 700, fontSize: 16 }}>
              {editing ? 'Editar FuncionÃ¡rio' : 'Novo FuncionÃ¡rio'}
            </span>
          </div>
        }
        open={drawerOpen}
        onCancel={() => setDrawerOpen(false)}
        centered
        width={560}
        styles={{ body: { padding: '24px 0 8px' } }}
        footer={
          <Space onClick={e => e.stopPropagation()}>
            <Button onClick={() => setDrawerOpen(false)}>Cancelar</Button>
            <Button type="primary" loading={saving} onClick={() => form.submit()}
              style={{ background: '#2563eb', borderColor: '#2563eb', fontWeight: 600 }}>
              {editing ? 'Salvar AlteraÃ§Ãµes' : 'Cadastrar'}
            </Button>
          </Space>
        }
      >
        <div style={{ padding: '0 24px' }}>
          <Form form={form} layout="vertical" onFinish={handleSubmit}>
            <Form.Item
              name="name"
              label="Nome Completo"
              rules={[{ required: true, message: 'Informe o nome' }]}
            >
              <Input placeholder="Nome completo do funcionÃ¡rio" size="large" />
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
                    prefix={<PhoneOutlined style={{ color: 'var(--cl-text-faint)' }} />}
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
                <Select
                  placeholder="Selecione a empresa"
                  showSearch
                  size="large"
                  optionFilterProp="label"
                  filterOption={(input, option) => {
                    const q = normalize(input);
                    return normalize(option?.name || '').includes(q) || normalize(option?.fantasia || '').includes(q);
                  }}
                >
                  {companies.map(c => (
                    <Option key={c.id} value={c.id} label={[c.name, c.fantasia].filter(Boolean).join(' ')} name={c.name} fantasia={c.fantasia || ''}>
                      <div style={{ lineHeight: 1.35 }}>
                        <div style={{ fontWeight: 500, fontSize: 13 }}>{c.name}</div>
                        {c.fantasia && <div style={{ fontSize: 11, color: 'var(--cl-text-muted)' }}>{c.fantasia}</div>}
                      </div>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            )}
          </Form>
        </div>
      </Modal>
    </div>
  );
}
