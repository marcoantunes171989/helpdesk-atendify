import { useEffect, useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import {
  Table, Button, Modal, Form, Input, Select, Tag, Space,
  message, Switch, Tooltip, Avatar,
} from 'antd';
import {
  PlusOutlined, EditOutlined, KeyOutlined, DeleteOutlined, TeamOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { userService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { ROLES, normalize } from '../utils/constants';

const { Option } = Select;

const roleColors = {
  SUPER_ADMIN: { bg: 'rgba(139,92,246,0.2)', color: 'var(--cl-purple)' },
  ADMIN:       { bg: 'rgba(37,99,235,0.2)',  color: 'var(--cl-primary-text)' },
  AGENT:       { bg: 'rgba(6,182,212,0.2)',  color: 'var(--cl-secondary)' },
  CLIENT:      { bg: 'var(--cl-bg-input)', color: 'var(--cl-text-soft)' },
};

export default function Users() {
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === 'light';
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [pwdModal, setPwdModal] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
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

  const openDelete = async (record) => {
    setDeletingId(record.id);
    try {
      const links = await userService.checkLinks(record.id);
      setDeleteModal({ id: record.id, name: record.name, ...links });
    } catch {
      message.error('Erro ao verificar vínculos');
    } finally {
      setDeletingId(null);
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
      const q = normalize(search);
      result = result.filter(u => [u.name, u.email, ROLES[u.role]?.label].some(f => normalize(f).includes(q)));
    }
    if (roleFilter) result = result.filter(u => u.role === roleFilter);
    return result;
  })();

  const columns = [
    {
      title: '#', dataIndex: 'code', key: 'code', width: 70,
      sorter: (a, b) => (a.code || 0) - (b.code || 0),
      render: v => <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--cl-primary-text)', fontSize: 13 }}>{v ? String(v).padStart(4, '0') : '—'}</span>,
    },
    {
      title: 'Usuário', key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name, 'pt-BR'),
      render: (_, r) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar
            size={32}
            style={{
              background: roleColors[r.role]?.bg,
              color: roleColors[r.role]?.color,
              fontWeight: 700, fontSize: 13, flexShrink: 0,
              border: `1px solid ${roleColors[r.role]?.color}44`,
            }}
          >
            {r.name?.charAt(0).toUpperCase()}
          </Avatar>
          <div>
            <div style={{ fontWeight: 600, color: 'var(--cl-text-hi)', fontSize: 13 }}>{r.name}</div>
            <div style={{ fontSize: 12, color: 'var(--cl-text-muted)' }}>{r.email}</div>
          </div>
        </div>
      ),
    },
    {
      title: 'Perfil', dataIndex: 'role', key: 'role',
      sorter: (a, b) => a.role.localeCompare(b.role),
      render: v => (
        <span style={{ fontSize: 12, fontWeight: 600, color: roleColors[v]?.color }}>
          {ROLES[v]?.label}
        </span>
      ),
    },
    {
      title: 'Status', dataIndex: 'active', key: 'active',
      sorter: (a, b) => Number(b.active) - Number(a.active),
      render: v => <Tag color={v ? 'success' : 'error'} style={{ borderRadius: 6, background: isLight ? 'transparent' : undefined, border: isLight ? 'none' : undefined }}>{v ? 'Ativo' : 'Inativo'}</Tag>,
    },
    {
      title: 'Criado em', dataIndex: 'createdAt', key: 'createdAt',
      sorter: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
      render: v => <span style={{ color: 'var(--cl-text-faint)', fontSize: 12 }}>{dayjs(v).format('DD/MM/YYYY')}</span>,
    },
    {
      title: '', key: 'actions', width: 110,
      render: (_, record) => (
        <Space>
          <Tooltip title="Editar">
            <Button type="text" icon={<EditOutlined />} size="small" style={{ color: 'var(--cl-text-soft)' }} onClick={() => openEdit(record)} />
          </Tooltip>
          <Tooltip title="Redefinir senha">
            <Button type="text" icon={<KeyOutlined />} size="small" style={{ color: 'var(--cl-text-soft)' }} onClick={() => setPwdModal(record.id)} />
          </Tooltip>
          {record.id !== user?.id && (
            <Tooltip title="Excluir">
              <Button type="text" icon={<DeleteOutlined />} size="small" danger
                loading={deletingId === record.id} onClick={() => openDelete(record)} />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="page-wrap">
      <div className="page-header">
        <div>
          <h1 className="page-title">Usuários</h1>
          <p style={{ color: 'var(--cl-text-muted)', fontSize: 13, margin: '4px 0 0' }}>
            {filteredUsers.length} usuário{filteredUsers.length !== 1 ? 's' : ''} cadastrado{filteredUsers.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate} style={{ borderRadius: 8, fontWeight: 600 }}>
          Novo Usuário
        </Button>
      </div>

      <div className="filter-bar">
        <Input
          placeholder="Buscar por nome, e-mail ou perfil..."
          style={{ flex: 1 }}
          allowClear
          value={search}
          onChange={e => setSearch(e.target.value)}
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

      <div className="page-table-wrap">
        <Table dataSource={filteredUsers} columns={columns} rowKey="id" loading={loading} scroll={{ x: 700 }} size="middle"
          pagination={{ pageSize: 15, showSizeChanger: false, showTotal: t => `${t} usuário${t !== 1 ? 's' : ''}` }}
          onRow={record => ({ onClick: () => openEdit(record), style: { cursor: 'pointer' } })}
        />
      </div>

      {/* Modal — Confirmar exclusão */}
      <Modal
        open={!!deleteModal}
        onCancel={() => setDeleteModal(null)}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ExclamationCircleOutlined style={{ color: 'var(--cl-danger)', fontSize: 20 }} />
            <span style={{ fontWeight: 700 }}>Excluir usuário</span>
          </div>
        }
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setDeleteModal(null)}>Cancelar</Button>
            <Button danger type="primary" loading={deleteLoading}
              disabled={deleteModal?.createdTickets > 0 || deleteModal?.comments > 0}
              onClick={handleDelete}>
              Excluir permanentemente
            </Button>
          </div>
        }
      >
        {deleteModal && (
          <div style={{ padding: '8px 0' }}>
            <p style={{ marginBottom: 16 }}>
              Você está prestes a excluir <strong>{deleteModal.name}</strong> permanentemente. Esta ação não pode ser desfeita.
            </p>
            {(deleteModal.createdTickets > 0 || deleteModal.comments > 0) ? (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '14px 16px' }}>
                <div style={{ fontWeight: 600, color: 'var(--cl-danger)', fontSize: 13, marginBottom: 10 }}>
                  Exclusão bloqueada — vínculos existentes:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {deleteModal.createdTickets > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span>Chamados criados pelo usuário</span>
                      <span style={{ fontWeight: 700, color: 'var(--cl-danger)' }}>{deleteModal.createdTickets}</span>
                    </div>
                  )}
                  {deleteModal.comments > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span>Comentários em chamados</span>
                      <span style={{ fontWeight: 700, color: 'var(--cl-danger)' }}>{deleteModal.comments}</span>
                    </div>
                  )}
                </div>
                <p style={{ fontSize: 12, color: 'var(--cl-text-muted)', marginTop: 10, marginBottom: 0 }}>
                  Exclua ou transfira os chamados antes de remover este usuário.
                </p>
              </div>
            ) : deleteModal.assignedTickets > 0 ? (
              <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 8, padding: '14px 16px' }}>
                <div style={{ fontWeight: 600, color: 'var(--cl-warning)', fontSize: 13, marginBottom: 6 }}>Atenção:</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span>Chamados atribuídos (serão desvinculados)</span>
                  <span style={{ fontWeight: 700, color: 'var(--cl-warning)' }}>{deleteModal.assignedTickets}</span>
                </div>
              </div>
            ) : (
              <div style={{ background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--cl-primary-text)' }}>
                Este usuário não possui vínculos com chamados.
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Modal — Cadastro / Edição */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(37,99,235,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TeamOutlined style={{ color: 'var(--cl-primary-text)', fontSize: 16 }} />
            </div>
            <span style={{ fontWeight: 700, fontSize: 16 }}>{editing ? 'Editar Usuário' : 'Novo Usuário'}</span>
          </div>
        }
        open={drawerOpen}
        onCancel={() => setDrawerOpen(false)}
        centered
        width={560}
        styles={{ body: { padding: '24px 0 8px' } }}
        footer={
          <Space>
            <Button onClick={() => setDrawerOpen(false)}>Cancelar</Button>
            <Button type="primary" loading={saving} onClick={() => form.submit()}
              style={{ background: 'var(--cl-primary)', borderColor: 'var(--cl-primary)', fontWeight: 600 }}>
              {editing ? 'Salvar Alterações' : 'Cadastrar'}
            </Button>
          </Space>
        }
      >
        <div style={{ padding: '0 24px' }}>
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
      </Modal>

      {/* Modal — Redefinir Senha */}
      <Modal
        title={<span style={{ fontWeight: 700 }}>Redefinir Senha</span>}
        open={!!pwdModal}
        onCancel={() => { setPwdModal(null); pwdForm.resetFields(); }}
        onOk={() => pwdForm.submit()}
        okText="Redefinir"
        cancelText="Cancelar"
        okButtonProps={{ style: { background: 'var(--cl-primary)', borderColor: 'var(--cl-primary)' } }}
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
