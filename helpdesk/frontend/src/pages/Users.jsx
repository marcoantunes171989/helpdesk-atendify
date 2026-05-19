import { useEffect, useState } from 'react';
import {
  Table, Button, Modal, Form, Input, Select, Tag, Space,
  message, Switch, Tooltip, Avatar,
} from 'antd';
import { PlusOutlined, EditOutlined, KeyOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { userService, companyService } from '../services/api';
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
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [pwdModal, setPwdModal] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();
  const [pwdForm] = Form.useForm();
  const { user } = useAuth();

  const load = () => {
    setLoading(true);
    userService.list().then(setUsers).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    if (user?.role === 'SUPER_ADMIN') companyService.list().then(setCompanies);
  }, [user]);

  const openCreate = () => { setEditing(null); form.resetFields(); setModalOpen(true); };
  const openEdit = (record) => { setEditing(record); form.setFieldsValue({ ...record }); setModalOpen(true); };

  const handleSubmit = async (values) => {
    try {
      if (editing) {
        await userService.update(editing.id, values);
        message.success('Usuário atualizado');
      } else {
        await userService.create(values);
        message.success('Usuário criado');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      message.error(err.response?.data?.error || 'Erro ao salvar');
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

  const roleOptions = user?.role === 'SUPER_ADMIN'
    ? Object.entries(ROLES).map(([v, { label }]) => <Option key={v} value={v}>{label}</Option>)
    : Object.entries(ROLES)
        .filter(([v]) => !['SUPER_ADMIN', 'ADMIN'].includes(v))
        .map(([v, { label }]) => <Option key={v} value={v}>{label}</Option>);

  const columns = [
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
    { title: 'Empresa', key: 'company', render: (_, r) => <span style={{ color: '#6b7280', fontSize: 13 }}>{r.company?.name || '—'}</span> },
    {
      title: 'Status', dataIndex: 'active', key: 'active',
      render: v => <Tag color={v ? 'success' : 'error'} style={{ borderRadius: 6 }}>{v ? 'Ativo' : 'Inativo'}</Tag>,
    },
    {
      title: 'Criado em', dataIndex: 'createdAt', key: 'createdAt',
      render: v => <span style={{ color: '#9ca3af', fontSize: 12 }}>{dayjs(v).format('DD/MM/YYYY')}</span>,
    },
    {
      title: '', key: 'actions', width: 80,
      render: (_, record) => (
        <Space>
          <Tooltip title="Editar"><Button type="text" icon={<EditOutlined />} size="small" style={{ color: '#6b7280' }} onClick={() => openEdit(record)} /></Tooltip>
          <Tooltip title="Redefinir senha"><Button type="text" icon={<KeyOutlined />} size="small" style={{ color: '#6b7280' }} onClick={() => setPwdModal(record.id)} /></Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Usuários</h1>
          <p style={{ color: '#6b7280', fontSize: 14, margin: '4px 0 0' }}>{users.length} usuário{users.length !== 1 ? 's' : ''} cadastrado{users.length !== 1 ? 's' : ''}</p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate} style={{ borderRadius: 8, fontWeight: 600 }}>
          Novo Usuário
        </Button>
      </div>

      <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <Table dataSource={users} columns={columns} rowKey="id" loading={loading} scroll={{ x: 700 }} size="middle" />
      </div>

      <Modal
        title={<span style={{ fontWeight: 700 }}>{editing ? 'Editar Usuário' : 'Novo Usuário'}</span>}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        okText="Salvar"
        cancelText="Cancelar"
        okButtonProps={{ style: { background: '#16a34a', borderColor: '#16a34a' } }}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ marginTop: 16 }}>
          <Form.Item name="name" label="Nome" rules={[{ required: true }]}>
            <Input placeholder="Nome completo" />
          </Form.Item>
          <Form.Item name="email" label="Email" rules={[{ required: true }, { type: 'email' }]}>
            <Input placeholder="email@exemplo.com" />
          </Form.Item>
          {!editing && (
            <Form.Item name="password" label="Senha" rules={[{ required: true, min: 6, message: 'Mínimo 6 caracteres' }]}>
              <Input.Password placeholder="Mínimo 6 caracteres" />
            </Form.Item>
          )}
          <Form.Item name="role" label="Perfil" rules={[{ required: true }]}>
            <Select placeholder="Selecione o perfil">{roleOptions}</Select>
          </Form.Item>
          {user?.role === 'SUPER_ADMIN' && !editing && (
            <Form.Item name="companyId" label="Empresa" rules={[{ required: true }]}>
              <Select placeholder="Selecione a empresa">
                {companies.map(c => <Option key={c.id} value={c.id}>{c.name}</Option>)}
              </Select>
            </Form.Item>
          )}
          {editing && (
            <Form.Item name="active" label="Ativo" valuePropName="checked">
              <Switch />
            </Form.Item>
          )}
        </Form>
      </Modal>

      <Modal
        title={<span style={{ fontWeight: 700 }}>Redefinir Senha</span>}
        open={!!pwdModal}
        onCancel={() => { setPwdModal(null); pwdForm.resetFields(); }}
        onOk={() => pwdForm.submit()}
        okText="Redefinir"
        cancelText="Cancelar"
        okButtonProps={{ style: { background: '#16a34a', borderColor: '#16a34a' } }}
      >
        <Form form={pwdForm} layout="vertical" onFinish={handleResetPassword} style={{ marginTop: 16 }}>
          <Form.Item name="password" label="Nova Senha" rules={[{ required: true, min: 6, message: 'Mínimo 6 caracteres' }]}>
            <Input.Password placeholder="Mínimo 6 caracteres" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
