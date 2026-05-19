import { useEffect, useState } from 'react';
import {
  Table, Button, Drawer, Modal, Form, Input, Select, Tag, Space,
  message, Switch, Tooltip, Avatar,
} from 'antd';
import {
  PlusOutlined, EditOutlined, KeyOutlined, DeleteOutlined, TeamOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { userService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { ROLES } from '../utils/constants';

const { Option } = Select;

const roleColors = {
  SUPER_ADMIN: { bg: '#f3e8ff', color: '#7c3aed' },
  ADMIN: { bg: '#dbeafe', color: '#1d4ed8' },
  AGENT: { bg: '#dcfce7', color: '#15803d' },
  CLIENT: { bg: '#f3f4f6', color: '#374151' },
};

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [pwdModal, setPwdModal] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState(undefined);
  const [form] = Form.useForm();
  const [pwdForm] = Form.useForm();
  const { user } = useAuth();

  const load = (params = {}) => {
    setLoading(true);
    userService.list(params).then(setUsers).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [user]);


  const openCreate = () => { setEditing(null); form.resetFields(); setDrawerOpen(true); };
  const openEdit = (record) => { setEditing(record); form.setFieldsValue({ ...record }); setDrawerOpen(true); };

  const handleSubmit = async (values) => {
    setSaving(true);
    try {
      if (editing) {
        await userService.update(editing.id, values);
        message.success('Usuário atualizado');
      } else {
        await userService.create(values);
        message.success('Usuário criado');
      }
      setDrawerOpen(false);
      load();
    } catch (err) {
      message.error(err.response?.data?.error || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await userService.remove(deleteModal.id);
      message.success('Usuário excluído com sucesso');
      setDeleteModal(null);
      load();
    } catch (err) {
      message.error(err.response?.data?.error || 'Erro ao excluir usuário');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleResetPassword = async (values) => {
    try {
      await userService.resetPassword(pwdModal, values);
      message.success('Senha redefinida com sucesso');
      setPwdModal(null);
      pwdForm.resetFields();
    } catch (err) {
      message.error(err.response?.data?.error || 'Erro ao redefinir senha');
    }
  };

  const roleOptions = Object.entries(ROLES).map(([v, { label }]) => <Option key={v} value={v}>{label}</Option>);

  const filteredUsers = (() => {
    let result = users;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(u => [u.name, u.email, ROLES[u.role]?.label].some(f => (f || '').toLowerCase().includes(q)));
    }
    if (roleFilter) result = result.filter(u => u.role === roleFilter);
    return result;
  })();

  const columns = [
    {
      title: '#', dataIndex: 'code', key: 'code', width: 70,
      render: v => <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#16a34a', fontSize: 13 }}>{v ? String(v).padStart(4, '0') : '—'}</span>,
    },
    {
      title: 'Usuário', key: 'name',
      render: (_, r) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar
            size={32}
            style={{ background: roleColors[r.role]?.bg, color: roleColors[r.role]?.color, fontWeight: 700, fontSize: 13, flexShrink: 0 }}
          >
            {r.name?.charAt(0).toUpperCase()}
          </Avatar>
          <div>
            <div style={{ fontWeight: 600, color: '#111827', fontSize: 13 }}>{r.name}</div>
            <div style={{ fontSize: 12, color: '#9ca3af' }}>{r.email}</div>
          </div>
        </div>
      ),
    },
    {
      title: 'Perfil', dataIndex: 'role', key: 'role',
      render: v => (
        <span style={{
          display: 'inline-block', padding: '2px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600,
          background: roleColors[v]?.bg, color: roleColors[v]?.color,
        }}>
          {ROLES[v]?.label}
        </span>
      ),
    },
    {
      title: 'Status', dataIndex: 'active', key: 'active',
      render: v => <Tag color={v ? 'success' : 'error'} style={{ borderRadius: 6 }}>{v ? 'Ativo' : 'Inativo'}</Tag>,
    },
    {
      title: 'Criado em', dataIndex: 'createdAt', key: 'createdAt',
      render: v => <span style={{ color: '#9ca3af', fontSize: 12 }}>{dayjs(v).format('DD/MM/YYYY')}</span>,
    },
    {
      title: '', key: 'actions', width: 110,
      render: (_, record) => (
        <Space>
          <Tooltip title="Editar">
            <Button type="text" icon={<EditOutlined />} size="small" style={{ color: '#6b7280' }} onClick={() => openEdit(record)} />
          </Tooltip>
          <Tooltip title="Redefinir senha">
            <Button type="text" icon={<KeyOutlined />} size="small" style={{ color: '#6b7280' }} onClick={() => setPwdModal(record.id)} />
          </Tooltip>
          {record.id !== user?.id && (
            <Tooltip title="Excluir">
              <Button type="text" icon={<DeleteOutlined />} size="small" danger
                onClick={() => setDeleteModal({ id: record.id, name: record.name })} />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Usuários</h1>
          <p style={{ color: '#6b7280', fontSize: 14, margin: '4px 0 0' }}>{filteredUsers.length} usuário{filteredUsers.length !== 1 ? 's' : ''} cadastrado{filteredUsers.length !== 1 ? 's' : ''}</p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate} style={{ borderRadius: 8, fontWeight: 600 }}>
          Novo Usuário
        </Button>
      </div>

      {/* Filtros */}
      <div style={{
        display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16,
        padding: '12px 16px', background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb',
      }}>
        <Input.Search
          placeholder="Buscar por nome, e-mail ou perfil..."
          style={{ flex: 1, minWidth: 200 }}
          allowClear
          value={search}
          onChange={e => setSearch(e.target.value)}
          onSearch={v => setSearch(v)}
        />
        <Select
          placeholder="Filtrar por perfil"
          style={{ width: 180 }}
          allowClear
          value={roleFilter}
          onChange={v => setRoleFilter(v || undefined)}
        >
          {roleOptions}
        </Select>
      </div>

      <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <Table dataSource={filteredUsers} columns={columns} rowKey="id" loading={loading} scroll={{ x: 700 }} size="middle"
          pagination={{ pageSize: 15, showSizeChanger: false, showTotal: t => `${t} usuário${t !== 1 ? 's' : ''}` }}
        />
      </div>

      {/* Modal — Confirmar exclusão */}
      <Modal
        open={!!deleteModal}
        onCancel={() => setDeleteModal(null)}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ExclamationCircleOutlined style={{ color: '#dc2626', fontSize: 20 }} />
            <span style={{ fontWeight: 700 }}>Excluir usuário</span>
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
              O usuário será removido do sistema e não poderá ser recuperado.
            </div>
          </div>
        )}
      </Modal>

      {/* Drawer — Cadastro / Edição */}
      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TeamOutlined style={{ color: '#1d4ed8', fontSize: 16 }} />
            </div>
            <span style={{ fontWeight: 700, fontSize: 16 }}>{editing ? 'Editar Usuário' : 'Novo Usuário'}</span>
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
        <div className="drawer-form-body" style={{ maxWidth: 560 }}>
          <Form form={form} layout="vertical" onFinish={handleSubmit}>
            <Form.Item name="name" label="Nome" rules={[{ required: true, message: 'Informe o nome' }]}>
              <Input placeholder="Nome completo" size="large" />
            </Form.Item>
            <Form.Item name="email" label="Email" rules={[{ required: true, message: 'Informe o e-mail' }, { type: 'email', message: 'E-mail inválido' }]}>
              <Input placeholder="email@exemplo.com" size="large" />
            </Form.Item>
            {!editing && (
              <Form.Item name="password" label="Senha" rules={[{ required: true, min: 6, message: 'Mínimo 6 caracteres' }]}>
                <Input.Password placeholder="Mínimo 6 caracteres" size="large" />
              </Form.Item>
            )}
            <Form.Item name="role" label="Perfil" rules={[{ required: true, message: 'Selecione o perfil' }]}>
              <Select placeholder="Selecione o perfil" size="large">{roleOptions}</Select>
            </Form.Item>
            {editing && (
              <Form.Item name="active" label="Status" valuePropName="checked">
                <Switch checkedChildren="Ativo" unCheckedChildren="Inativo" />
              </Form.Item>
            )}
          </Form>
        </div>
      </Drawer>

      {/* Modal — Redefinir Senha */}
      <Modal
        title={<span style={{ fontWeight: 700 }}>Redefinir Senha</span>}
        open={!!pwdModal}
        onCancel={() => { setPwdModal(null); pwdForm.resetFields(); }}
        onOk={() => pwdForm.submit()}
        okText="Redefinir"
        cancelText="Cancelar"
        okButtonProps={{ style: { background: '#16a34a', borderColor: '#16a34a' } }}
        width={400}
      >
        <Form form={pwdForm} layout="vertical" onFinish={handleResetPassword} style={{ marginTop: 16 }}>
          <Form.Item name="password" label="Nova Senha" rules={[{ required: true, min: 6, message: 'Mínimo 6 caracteres' }]}>
            <Input.Password placeholder="Mínimo 6 caracteres" size="large" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
