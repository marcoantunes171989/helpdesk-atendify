import { useEffect, useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import {
  Table, Button, Modal, Form, Input, Space, Tag,
  message, Tooltip, Switch,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined,
  ExclamationCircleOutlined, ToolOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { technicianService } from '../services/api';
import { normalize } from '../utils/constants';

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
        message.success('TÃ©cnico atualizado com sucesso');
      } else {
        await technicianService.create(values);
        message.success('TÃ©cnico cadastrado com sucesso');
      }
      setDrawerOpen(false);
      load();
    } catch (err) {
      message.error(err.response?.data?.error || 'Erro ao salvar tÃ©cnico');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await technicianService.remove(deleteModal.id);
      message.success('TÃ©cnico removido com sucesso');
      setDeleteModal(null);
      load();
    } catch (err) {
      message.error(err.response?.data?.error || 'Erro ao remover tÃ©cnico');
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
      title: 'TÃ©cnico', key: 'name',
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
      title: 'ObservaÃ§Ã£o', dataIndex: 'observation', key: 'observation',
      sorter: (a, b) => (a.observation || '').localeCompare(b.observation || '', 'pt-BR'),
      render: v => <span style={{ color: 'var(--cl-text-soft)', fontSize: 13 }}>{v || 'â€”'}</span>,
    },
    {
      title: 'Chamados', key: 'tickets',
      sorter: (a, b) => (a._count?.tickets ?? 0) - (b._count?.tickets ?? 0),
      render: (_, r) => (
        <span style={{ fontWeight: 600, color: '#60a5fa', fontSize: 13 }}>{r._count?.tickets ?? 0}</span>
      ),
    },
    {
      title: 'SituaÃ§Ã£o', dataIndex: 'active', key: 'active',
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
        <Space onClick={e => e.stopPropagation()}>
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
    ? (() => { const q = normalize(search); return technicians.filter(t => [t.name, t.description, t.observation].some(f => normalize(f).includes(q))); })()
    : technicians;

  return (
    <div className="page-wrap">
      <div className="page-header">
        <div>
          <h1 className="page-title">TÃ©cnicos</h1>
          <p style={{ color: 'var(--cl-text-muted)', fontSize: 13, margin: '4px 0 0' }}>
            {filteredTechnicians.length} tÃ©cnico{filteredTechnicians.length !== 1 ? 's' : ''} cadastrado{filteredTechnicians.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}
          style={{ borderRadius: 8, fontWeight: 600 }}>
          Novo TÃ©cnico
        </Button>
      </div>

      <div className="filter-bar">
        <Input
          placeholder="Buscar por nome, descriÃ§Ã£o ou observaÃ§Ã£o..."
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
          pagination={{ pageSize: 15, showSizeChanger: false, showTotal: t => `${t} tÃ©cnico${t !== 1 ? 's' : ''}` }}
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
            <span style={{ fontWeight: 700 }}>Remover tÃ©cnico</span>
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
              VocÃª estÃ¡ prestes a remover o tÃ©cnico <strong>{deleteModal.name}</strong>. Esta aÃ§Ã£o nÃ£o pode ser desfeita.
            </p>
            {deleteModal.tickets > 0 ? (
              <div style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#f87171', fontWeight: 500 }}>
                Este tÃ©cnico estÃ¡ vinculado a <strong>{deleteModal.tickets} chamado{deleteModal.tickets !== 1 ? 's' : ''}</strong> e nÃ£o pode ser removido.
              </div>
            ) : (
              <div style={{ background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#60a5fa' }}>
                Este tÃ©cnico nÃ£o possui chamados vinculados e pode ser removido com seguranÃ§a.
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Modal â€” Cadastro / EdiÃ§Ã£o */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(22,163,74,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ToolOutlined style={{ color: '#4ade80', fontSize: 16 }} />
            </div>
            <span style={{ fontWeight: 700, fontSize: 16 }}>
              {editing ? 'Editar TÃ©cnico' : 'Novo TÃ©cnico'}
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
            <Form.Item name="name" label="Nome do TÃ©cnico" rules={[{ required: true, message: 'Informe o nome do tÃ©cnico' }]}>
              <Input placeholder="Ex: JoÃ£o Silva, Carlos Ramos..." size="large" />
            </Form.Item>
            <Form.Item name="description" label="DescriÃ§Ã£o">
              <TextArea rows={3} placeholder="Ãrea de atuaÃ§Ã£o, especialidade..." style={{ resize: 'none' }} />
            </Form.Item>
            {editing && (
              <Form.Item name="active" label="SituaÃ§Ã£o" valuePropName="checked">
                <Switch checkedChildren="Ativo" unCheckedChildren="Inativo" />
              </Form.Item>
            )}
          </Form>
        </div>
      </Modal>
    </div>
  );
}
