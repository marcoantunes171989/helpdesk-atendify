import { useEffect, useMemo, useState } from 'react';
import {
  Table, Button, Modal, Form, Input, Switch, Tag, Space, message, Tooltip, Checkbox,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, SafetyCertificateOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { accessGroupService, permissionService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { normalize } from '../utils/constants';

export default function AccessGroups() {
  const { can } = useAuth();
  const [groups, setGroups] = useState([]);
  const [catalog, setCatalog] = useState({ modules: {}, permissions: [] });
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [deleteModal, setDeleteModal] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState(new Set());
  const [form] = Form.useForm();

  const canCreate = can('access_groups.create');
  const canUpdate = can('access_groups.update');
  const canDelete = can('access_groups.delete');

  const load = () => {
    setLoading(true);
    accessGroupService.list().then(setGroups).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    permissionService.catalog().then(setCatalog);
  }, []);

  const permissionsByModule = useMemo(() => {
    const map = {};
    for (const perm of catalog.permissions) {
      if (!map[perm.module]) map[perm.module] = { label: perm.moduleLabel, items: [] };
      map[perm.module].items.push(perm);
    }
    return map;
  }, [catalog]);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setSelectedPermissions(new Set());
    setDrawerOpen(true);
  };

  const openEdit = (record) => {
    setEditing(record);
    form.setFieldsValue({ name: record.name, description: record.description, active: record.active });
    setSelectedPermissions(new Set(record.permissions));
    setDrawerOpen(true);
  };

  const togglePermission = (key, checked) => {
    setSelectedPermissions(prev => {
      const next = new Set(prev);
      if (checked) next.add(key); else next.delete(key);
      return next;
    });
  };

  const toggleModule = (moduleKey, checked) => {
    setSelectedPermissions(prev => {
      const next = new Set(prev);
      for (const perm of permissionsByModule[moduleKey].items) {
        if (checked) next.add(perm.key); else next.delete(perm.key);
      }
      return next;
    });
  };

  const handleSubmit = async (values) => {
    setSaving(true);
    try {
      const payload = { ...values, permissions: Array.from(selectedPermissions) };
      if (editing) {
        await accessGroupService.update(editing.id, payload);
        message.success('Grupo de acesso atualizado');
      } else {
        await accessGroupService.create(payload);
        message.success('Grupo de acesso criado');
      }
      setDrawerOpen(false);
      load();
    } catch (err) {
      message.error(err.response?.data?.error || 'Erro ao salvar grupo de acesso');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await accessGroupService.remove(deleteModal.id);
      message.success('Grupo de acesso excluído com sucesso');
      setDeleteModal(null);
      load();
    } catch (err) {
      message.error(err.response?.data?.error || 'Erro ao excluir grupo de acesso');
    } finally {
      setDeleteLoading(false);
    }
  };

  const filteredGroups = search
    ? groups.filter(g => normalize(g.name).includes(normalize(search)))
    : groups;

  const columns = [
    {
      title: 'Perfil', key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name, 'pt-BR'),
      render: (_, r) => (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--cl-text-hi)', fontSize: 13 }}>{r.name}</div>
          {r.description && <div style={{ fontSize: 12, color: 'var(--cl-text-muted)' }}>{r.description}</div>}
        </div>
      ),
    },
    {
      title: 'Permissões', key: 'permissions', width: 110,
      render: (_, r) => <span style={{ fontSize: 12, color: 'var(--cl-text-muted)' }}>{r.permissions.length}</span>,
    },
    {
      title: 'Usuários', key: 'usersCount', width: 100,
      render: (_, r) => <span style={{ fontSize: 12, color: 'var(--cl-text-muted)' }}>{r.usersCount}</span>,
    },
    {
      title: 'Status', dataIndex: 'active', key: 'active', width: 100,
      render: v => <Tag color={v ? 'success' : 'error'}>{v ? 'Ativo' : 'Inativo'}</Tag>,
    },
    {
      title: 'Criado em', dataIndex: 'createdAt', key: 'createdAt', width: 120,
      render: v => <span style={{ color: 'var(--cl-text-faint)', fontSize: 12 }}>{dayjs(v).format('DD/MM/YYYY')}</span>,
    },
    {
      title: '', key: 'actions', width: 90,
      render: (_, record) => (
        <Space>
          {canUpdate && (
            <Tooltip title="Editar">
              <Button type="text" icon={<EditOutlined />} size="small" onClick={() => openEdit(record)} />
            </Tooltip>
          )}
          {canDelete && (
            <Tooltip title="Excluir">
              <Button type="text" icon={<DeleteOutlined />} size="small" danger
                disabled={record.usersCount > 0}
                onClick={() => setDeleteModal(record)} />
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
          <h1 className="page-title">Perfis de Acesso</h1>
          <p style={{ color: 'var(--cl-text-muted)', fontSize: 13, margin: '4px 0 0' }}>
            {filteredGroups.length} perfil{filteredGroups.length !== 1 ? 'is' : ''} cadastrado{filteredGroups.length !== 1 ? 's' : ''}
          </p>
        </div>
        {canCreate && (
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate} style={{ borderRadius: 8, fontWeight: 600 }}>
            Novo Perfil
          </Button>
        )}
      </div>

      <div className="filter-bar">
        <Input placeholder="Buscar por nome..." style={{ flex: 1 }} allowClear value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="page-table-wrap">
        <Table dataSource={filteredGroups} columns={columns} rowKey="id" loading={loading} scroll={{ x: 700 }} size="middle"
          pagination={{ pageSize: 15, showSizeChanger: false }} />
      </div>

      <Modal
        open={!!deleteModal}
        onCancel={() => setDeleteModal(null)}
        title={<div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><ExclamationCircleOutlined style={{ color: 'var(--cl-danger)' }} /><span style={{ fontWeight: 700 }}>Excluir perfil de acesso</span></div>}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setDeleteModal(null)}>Cancelar</Button>
            <Button danger type="primary" loading={deleteLoading} onClick={handleDelete}>Excluir permanentemente</Button>
          </div>
        }
      >
        {deleteModal && <p>Você está prestes a excluir <strong>{deleteModal.name}</strong> permanentemente.</p>}
      </Modal>

      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <SafetyCertificateOutlined style={{ color: 'var(--cl-primary-text)', fontSize: 16 }} />
            <span style={{ fontWeight: 700, fontSize: 16 }}>{editing ? 'Editar Perfil de Acesso' : 'Novo Perfil de Acesso'}</span>
          </div>
        }
        open={drawerOpen}
        onCancel={() => setDrawerOpen(false)}
        centered
        width={760}
        styles={{ body: { maxHeight: '70vh', overflowY: 'auto' } }}
        footer={
          <Space>
            <Button onClick={() => setDrawerOpen(false)}>Cancelar</Button>
            <Button type="primary" loading={saving} onClick={() => form.submit()}>
              {editing ? 'Salvar Alterações' : 'Cadastrar'}
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" label="Nome do perfil" rules={[{ required: true, message: 'Informe o nome' }]}>
            <Input placeholder="Ex.: Suporte Técnico" size="large" />
          </Form.Item>
          <Form.Item name="description" label="Descrição">
            <Input.TextArea placeholder="Descrição opcional" rows={2} />
          </Form.Item>
          {editing && (
            <Form.Item name="active" label="Status" valuePropName="checked">
              <Switch checkedChildren="Ativo" unCheckedChildren="Inativo" />
            </Form.Item>
          )}

          <div style={{ fontWeight: 600, fontSize: 13, margin: '12px 0 8px' }}>Matriz de Permissões</div>
          <div style={{ border: '1px solid var(--cl-border)', borderRadius: 8 }}>
            {Object.entries(permissionsByModule).map(([moduleKey, { label, items }]) => {
              const allChecked = items.every(p => selectedPermissions.has(p.key));
              const someChecked = items.some(p => selectedPermissions.has(p.key));
              return (
                <div key={moduleKey} style={{ padding: '10px 14px', borderBottom: '1px solid var(--cl-border)' }}>
                  <Checkbox
                    checked={allChecked}
                    indeterminate={!allChecked && someChecked}
                    onChange={e => toggleModule(moduleKey, e.target.checked)}
                    style={{ fontWeight: 600, marginBottom: 6 }}
                  >
                    {label}
                  </Checkbox>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, paddingLeft: 24 }}>
                    {items.map(perm => (
                      <Checkbox
                        key={perm.key}
                        checked={selectedPermissions.has(perm.key)}
                        onChange={e => togglePermission(perm.key, e.target.checked)}
                      >
                        {perm.action}
                      </Checkbox>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Form>
      </Modal>
    </div>
  );
}
