import { useEffect, useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import {
  Table, Button, Drawer, Modal, Form, Input, Space, Tag,
  message, Tooltip, Switch,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined,
  ExclamationCircleOutlined, ToolOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { technicianService } from '../services/api';

const { TextArea } = Input;

export default function Technicians() {
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === 'light';
  const [technicians, setTechnicians] = useState([]);
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
    technicianService.list().then(setTechnicians).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setDrawerOpen(true);
  };

  const openEdit = (record) => {
    setEditing(record);
    form.setFieldsValue({
      name: record.name,
      description: record.description,
      observation: record.observation,
      active: record.active,
    });
    setDrawerOpen(true);
  };

  const handleSubmit = async (values) => {
    setSaving(true);
    try {
      if (editing) {
        await technicianService.update(editing.id, values);
        message.success('Técnico atualizado com sucesso');
      } else {
        await technicianService.create(values);
        message.success('Técnico cadastrado com sucesso');
      }
      setDrawerOpen(false);
      load();
    } catch (err) {
      message.error(err.response?.data?.error || 'Erro ao salvar técnico');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await technicianService.remove(deleteModal.id);
      message.success('Técnico removido com sucesso');
      setDeleteModal(null);
      load();
    } catch (err) {
      message.error(err.response?.data?.error || 'Erro ao remover técnico');
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
          {String(v ?? 0).padStart(4, '0')}
        </span>
      ),
    },
    {
      title: 'Técnico', key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name, 'pt-BR'),
      render: (_, r) => (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--cl-text-hi)', fontSize: 13 }}>{r.name}</div>
          {r.description && (
            <div style={{ fontSize: 12, color: 'var(--cl-text-muted)', marginTop: 2 }}>{r.description}</div>
          )}
        </div>
      ),
    },
    {
      title: 'Observação', dataIndex: 'observation', key: 'observation',
      sorter: (a, b) => (a.observation || '').localeCompare(b.observation || '', 'pt-BR'),
      render: v => <span style={{ color: 'var(--cl-text-soft)', fontSize: 13 }}>{v || '—'}</span>,
    },
    {
      title: 'Chamados', key: 'tickets',
      sorter: (a, b) => (a._count?.tickets ?? 0) - (b._count?.tickets ?? 0),
      render: (_, r) => (
        <span style={{ fontWeight: 600, color: '#60a5fa', fontSize: 13 }}>{r._count?.tickets ?? 0}</span>
      ),
    },
    {
      title: 'Situação', dataIndex: 'active', key: 'active',
      sorter: (a, b) => Number(b.active) - Number(a.active),
      render: v => (
        <Tag color={v ? 'success' : 'default'} style={{ borderRadius: 6, fontWeight: 600, fontSize: 11, background: isLight ? 'transparent' : undefined, border: isLight ? 'none' : undefined }}>
          {v ? 'Ativo' : 'Inativo'}
        </Tag>
      ),
    },
    {
      title: 'Criado em', dataIndex: 'createdAt', key: 'createdAt',
      sorter: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
      render: v => <span style={{ color: 'var(--cl-text-faint)', fontSize: 12 }}>{dayjs(v).format('DD/MM/YYYY')}</span>,
    },
    {
      title: '', key: 'actions', width: 80,
      render: (_, record) => (
        <Space>
          <Tooltip title="Editar">
            <Button type="text" icon={<EditOutlined />} size="small"
              style={{ color: 'var(--cl-text-soft)' }} onClick={() => openEdit(record)} />
          </Tooltip>
          <Tooltip title="Remover">
            <Button type="text" icon={<DeleteOutlined />} size="small" danger
              onClick={() => setDeleteModal({ id: record.id, name: record.name, tickets: record._count?.tickets ?? 0 })} />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const filteredTechnicians = search
    ? (() => { const q = search.toLowerCase(); return technicians.filter(t => [t.name, t.description, t.observation].some(f => (f || '').toLowerCase().includes(q))); })()
    : technicians;

  return (
    <div className="page-wrap">
      <div className="page-header">
        <div>
          <h1 className="page-title">Técnicos</h1>
          <p style={{ color: 'var(--cl-text-muted)', fontSize: 13, margin: '4px 0 0' }}>
            {filteredTechnicians.length} técnico{filteredTechnicians.length !== 1 ? 's' : ''} cadastrado{filteredTechnicians.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}
          style={{ borderRadius: 8, fontWeight: 600 }}>
          Novo Técnico
        </Button>
      </div>

      <div className="filter-bar">
        <Input
          placeholder="Buscar por nome, descrição ou observação..."
          allowClear
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: '100%' }}
        />
      </div>

      <div className="page-table-wrap">
        <Table
          dataSource={filteredTechnicians} columns={columns} rowKey="id"
          loading={loading} size="middle" scroll={{ x: 700 }}
          pagination={{ pageSize: 15, showSizeChanger: false, showTotal: t => `${t} técnico${t !== 1 ? 's' : ''}` }}
        />
      </div>

      {/* Modal — Confirmar exclusão */}
      <Modal
        open={!!deleteModal}
        onCancel={() => setDeleteModal(null)}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ExclamationCircleOutlined style={{ color: '#f87171', fontSize: 20 }} />
            <span style={{ fontWeight: 700 }}>Remover técnico</span>
          </div>
        }
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setDeleteModal(null)}>Cancelar</Button>
            <Button danger type="primary" loading={deleteLoading} onClick={handleDelete}
              disabled={deleteModal?.tickets > 0}>
              Remover permanentemente
            </Button>
          </div>
        }
      >
        {deleteModal && (
          <div style={{ padding: '8px 0' }}>
            <p style={{ marginBottom: 16 }}>
              Você está prestes a remover o técnico <strong>{deleteModal.name}</strong>. Esta ação não pode ser desfeita.
            </p>
            {deleteModal.tickets > 0 ? (
              <div style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#f87171', fontWeight: 500 }}>
                Este técnico está vinculado a <strong>{deleteModal.tickets} chamado{deleteModal.tickets !== 1 ? 's' : ''}</strong> e não pode ser removido.
              </div>
            ) : (
              <div style={{ background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#60a5fa' }}>
                Este técnico não possui chamados vinculados e pode ser removido com segurança.
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Drawer — Cadastro / Edição */}
      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(22,163,74,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ToolOutlined style={{ color: '#4ade80', fontSize: 16 }} />
            </div>
            <span style={{ fontWeight: 700, fontSize: 16 }}>
              {editing ? 'Editar Técnico' : 'Novo Técnico'}
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
            <Form.Item name="name" label="Nome do Técnico" rules={[{ required: true, message: 'Informe o nome do técnico' }]}>
              <Input placeholder="Ex: João Silva, Carlos Ramos..." size="large" />
            </Form.Item>
            <Form.Item name="description" label="Descrição">
              <TextArea rows={3} placeholder="Área de atuação, especialidade..." />
            </Form.Item>
            <Form.Item name="observation" label="Observação">
              <TextArea rows={3} placeholder="Informações adicionais..." />
            </Form.Item>
            {editing && (
              <Form.Item name="active" label="Situação" valuePropName="checked">
                <Switch checkedChildren="Ativo" unCheckedChildren="Inativo" />
              </Form.Item>
            )}
          </Form>
        </div>
      </Drawer>
    </div>
  );
}
