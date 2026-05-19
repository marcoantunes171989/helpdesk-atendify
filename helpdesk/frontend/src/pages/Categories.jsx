import { useEffect, useState } from 'react';
import {
  Table, Button, Drawer, Modal, Form, Input, Space, Tag, Switch,
  message, Tooltip,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, AppstoreOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { categoryService } from '../services/api';

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteModal, setDeleteModal] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [form] = Form.useForm();
  const [search, setSearch] = useState('');

  const load = () => {
    setLoading(true);
    categoryService.list().then(setCategories).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); form.resetFields(); setDrawerOpen(true); };
  const openEdit = (record) => {
    setEditing(record);
    form.setFieldsValue({ name: record.name, description: record.description, active: record.active });
    setDrawerOpen(true);
  };

  const handleSubmit = async (values) => {
    setSaving(true);
    try {
      if (editing) {
        await categoryService.update(editing.id, values);
        message.success('Categoria atualizada');
      } else {
        await categoryService.create(values);
        message.success('Categoria criada');
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
      await categoryService.remove(deleteModal.id);
      message.success('Categoria removida com sucesso');
      setDeleteModal(null);
      load();
    } catch (err) {
      message.error(err.response?.data?.error || 'Erro ao remover categoria');
    } finally {
      setDeleteLoading(false);
    }
  };

  const columns = [
    {
      title: 'Categoria', key: 'name',
      render: (_, r) => (
        <div>
          <div style={{ fontWeight: 600, color: '#111827', fontSize: 13 }}>{r.name}</div>
          {r.description && <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{r.description}</div>}
        </div>
      ),
    },
    {
      title: 'Chamados', key: 'tickets',
      render: (_, r) => <span style={{ fontWeight: 600, color: '#16a34a', fontSize: 13 }}>{r._count?.tickets ?? 0}</span>,
    },
    {
      title: 'Situação', dataIndex: 'active', key: 'active',
      render: v => (
        <Tag color={v !== false ? 'success' : 'default'} style={{ borderRadius: 6, fontWeight: 600, fontSize: 11 }}>
          {v !== false ? 'Ativa' : 'Inativa'}
        </Tag>
      ),
    },
    {
      title: 'Criado em', dataIndex: 'createdAt', key: 'createdAt',
      render: v => <span style={{ color: '#9ca3af', fontSize: 12 }}>{dayjs(v).format('DD/MM/YYYY')}</span>,
    },
    {
      title: '', key: 'actions', width: 80,
      render: (_, record) => (
        <Space>
          <Tooltip title="Editar">
            <Button type="text" icon={<EditOutlined />} size="small"
              style={{ color: '#6b7280' }} onClick={() => openEdit(record)} />
          </Tooltip>
          <Tooltip title="Remover">
            <Button type="text" icon={<DeleteOutlined />} size="small" danger
              onClick={() => setDeleteModal({ id: record.id, name: record.name, tickets: record._count?.tickets ?? 0 })} />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const filteredCategories = search
    ? (() => { const q = search.toLowerCase(); return categories.filter(c => [c.name, c.description].some(f => (f || '').toLowerCase().includes(q))); })()
    : categories;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Categorias</h1>
          <p style={{ color: '#6b7280', fontSize: 14, margin: '4px 0 0' }}>
            {filteredCategories.length} categoria{filteredCategories.length !== 1 ? 's' : ''} cadastrada{filteredCategories.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate} style={{ borderRadius: 8, fontWeight: 600 }}>
          Nova Categoria
        </Button>
      </div>

      <div style={{ padding: '12px 16px', background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', marginBottom: 16 }}>
        <Input.Search
          placeholder="Buscar por nome ou descrição..."
          allowClear
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: 420 }}
        />
      </div>

      <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <Table dataSource={filteredCategories} columns={columns} rowKey="id" loading={loading}
          size="middle" scroll={{ x: 500 }}
          pagination={{ pageSize: 15, showSizeChanger: false, showTotal: t => `${t} categoria${t !== 1 ? 's' : ''}` }}
        />
      </div>

      {/* Modal — Confirmar exclusão */}
      <Modal
        open={!!deleteModal}
        onCancel={() => setDeleteModal(null)}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ExclamationCircleOutlined style={{ color: '#dc2626', fontSize: 20 }} />
            <span style={{ fontWeight: 700 }}>Remover categoria</span>
          </div>
        }
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setDeleteModal(null)}>Cancelar</Button>
            <Button danger type="primary" loading={deleteLoading} onClick={handleDelete}>
              Remover permanentemente
            </Button>
          </div>
        }
      >
        {deleteModal && (
          <div style={{ padding: '8px 0' }}>
            <p style={{ color: '#374151', marginBottom: 16 }}>
              Você está prestes a remover <strong>{deleteModal.name}</strong>. Esta ação não pode ser desfeita.
            </p>
            {deleteModal.tickets > 0 ? (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#dc2626', fontWeight: 500 }}>
                Atenção: {deleteModal.tickets} chamado{deleteModal.tickets !== 1 ? 's' : ''} perderá a categoria ao confirmar.
              </div>
            ) : (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#166534' }}>
                Esta categoria não possui chamados vinculados.
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Drawer — Cadastro / Edição */}
      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AppstoreOutlined style={{ color: '#d97706', fontSize: 16 }} />
            </div>
            <span style={{ fontWeight: 700, fontSize: 16 }}>{editing ? 'Editar Categoria' : 'Nova Categoria'}</span>
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
            <Form.Item name="name" label="Nome da Categoria" rules={[{ required: true, message: 'Informe o nome' }]}>
              <Input placeholder="Ex: Suporte Técnico, Financeiro..." size="large" />
            </Form.Item>
            <Form.Item name="description" label="Descrição">
              <Input.TextArea rows={3} placeholder="Descreva o tipo de atendimento..." />
            </Form.Item>
            {editing && (
              <Form.Item name="active" label="Situação" valuePropName="checked">
                <Switch checkedChildren="Ativa" unCheckedChildren="Inativa" />
              </Form.Item>
            )}
          </Form>
        </div>
      </Drawer>
    </div>
  );
}
