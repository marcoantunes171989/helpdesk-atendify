import { useEffect, useState, useCallback } from 'react';
import {
  Table, Button, Modal, Form, Input, Space, Tag, Switch,
  message, Tooltip,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, AppstoreAddOutlined,
  ExclamationCircleOutlined, SearchOutlined,
} from '@ant-design/icons';
import { moduloTreinamentoService } from '../services/api';
import { normalize } from '../utils/constants';
import { useAuth } from '../contexts/AuthContext';

export default function ModulosTreinamento() {
  const { user } = useAuth();
  const canEdit = ['SUPER_ADMIN', 'ADMIN', 'AGENT'].includes(user?.role);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteModal, setDeleteModal] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [form] = Form.useForm();

  const load = useCallback(() => {
    setLoading(true);
    moduloTreinamentoService.list().then(setItems).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = search
    ? (() => {
        const q = normalize(search);
        return items.filter(i => [i.name, i.description].some(f => normalize(f).includes(q)));
      })()
    : items;

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (record) => {
    setEditing(record);
    form.setFieldsValue({
      name: record.name,
      description: record.description,
      active: record.active,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (values) => {
    setSaving(true);
    try {
      if (editing) {
        await moduloTreinamentoService.update(editing.id, values);
        message.success('Módulo atualizado');
      } else {
        await moduloTreinamentoService.create(values);
        message.success('Módulo cadastrado');
      }
      setModalOpen(false);
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
      await moduloTreinamentoService.remove(deleteModal.id);
      message.success('Módulo removido');
      setDeleteModal(null);
      load();
    } catch (err) {
      message.error(err.response?.data?.error || 'Erro ao remover');
    } finally {
      setDeleteLoading(false);
    }
  };

  const columns = [
    {
      title: '#',
      dataIndex: 'order',
      width: 60,
      sorter: (a, b) => (a.order ?? 999) - (b.order ?? 999),
      render: v => v != null
        ? <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--cl-primary-text)' }}>{String(v).padStart(2, '0')}</span>
        : <span style={{ color: 'var(--cl-text-dim)' }}>—</span>,
    },
    {
      title: 'Módulo',
      dataIndex: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name, 'pt-BR'),
      render: (name, r) => (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--cl-text-hi)', fontSize: 13 }}>{name}</div>
          {r.description && (
            <div style={{ fontSize: 11, color: 'var(--cl-text-muted)', marginTop: 2 }}>{r.description}</div>
          )}
        </div>
      ),
    },
    {
      title: 'Etapas',
      dataIndex: ['_count', 'etapas'],
      width: 90,
      sorter: (a, b) => (a._count?.etapas ?? 0) - (b._count?.etapas ?? 0),
      render: v => <span style={{ fontWeight: 600, color: 'var(--cl-primary-text)', fontSize: 13 }}>{v ?? 0}</span>,
    },
    {
      title: 'Situação',
      dataIndex: 'active',
      width: 100,
      render: v => (
        <Tag color={v ? 'success' : 'default'} style={{ borderRadius: 6, fontWeight: 600, fontSize: 11 }}>
          {v ? 'Ativo' : 'Inativo'}
        </Tag>
      ),
    },
    ...(canEdit ? [{
      title: '',
      key: 'actions',
      width: 80,
      render: (_, record) => (
        <Space size={4}>
          <Tooltip title="Editar">
            <Button type="text" icon={<EditOutlined />} size="small"
              style={{ color: 'var(--cl-text-soft)' }} onClick={() => openEdit(record)} />
          </Tooltip>
          <Tooltip title="Remover">
            <Button type="text" icon={<DeleteOutlined />} size="small" danger
              onClick={() => setDeleteModal({ id: record.id, name: record.name, etapas: record._count?.etapas ?? 0 })} />
          </Tooltip>
        </Space>
      ),
    }] : []),
  ];

  return (
    <div className="page-wrap">
      <div className="page-header">
        <div>
          <h1 className="page-title">Módulos de Treinamento</h1>
          <p style={{ color: 'var(--cl-text-muted)', fontSize: 13, margin: '4px 0 0' }}>
            {filtered.length} módulo{filtered.length !== 1 ? 's' : ''} cadastrado{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>
        {canEdit && (
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}
            style={{ borderRadius: 8, fontWeight: 600 }}>
            Novo Módulo
          </Button>
        )}
      </div>

      <div className="filter-bar">
        <Input
          prefix={<SearchOutlined style={{ color: 'var(--cl-text-dim)' }} />}
          placeholder="Buscar por nome ou descrição..."
          allowClear
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: '100%' }}
        />
      </div>

      <div className="page-table-wrap">
        <Table
          dataSource={filtered}
          columns={columns}
          rowKey="id"
          loading={loading}
          size="middle"
          scroll={{ x: 500 }}
          pagination={{ pageSize: 20, showSizeChanger: false, showTotal: t => `${t} módulo${t !== 1 ? 's' : ''}` }}
          onRow={record => ({ onClick: () => openEdit(record), style: { cursor: 'pointer' } })}
        />
      </div>

      {/* Modal — Cadastro / Edição */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(37,99,235,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AppstoreAddOutlined style={{ color: 'var(--cl-primary-text)', fontSize: 16 }} />
            </div>
            <span style={{ fontWeight: 700, fontSize: 16 }}>
              {editing ? 'Editar Módulo' : 'Novo Módulo de Treinamento'}
            </span>
          </div>
        }
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        centered
        width={520}
        styles={{ body: { padding: '24px 0 8px' } }}
        footer={
          <Space>
            <Button onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="primary" loading={saving} onClick={() => form.submit()}
              style={{ background: 'var(--cl-primary)', borderColor: 'var(--cl-primary)', fontWeight: 600 }}>
              {editing ? 'Salvar Alterações' : 'Cadastrar'}
            </Button>
          </Space>
        }
      >
        <div style={{ padding: '0 24px' }}>
          <Form form={form} layout="vertical" onFinish={handleSubmit}>
            <Form.Item name="name" label="Nome do Módulo"
              rules={[{ required: true, message: 'Informe o nome' }]}>
              <Input placeholder="Ex: PDV, Estoque, Financeiro..." size="large" />
            </Form.Item>
            <Form.Item name="description" label="Descrição">
              <Input.TextArea rows={3} placeholder="Descreva o conteúdo deste módulo..."
                style={{ resize: 'none' }} />
            </Form.Item>
            {editing && (
              <Form.Item name="active" label="Situação" valuePropName="checked">
                <Switch checkedChildren="Ativo" unCheckedChildren="Inativo" />
              </Form.Item>
            )}
          </Form>
        </div>
      </Modal>

      {/* Modal — Confirmar exclusão */}
      <Modal
        open={!!deleteModal}
        onCancel={() => setDeleteModal(null)}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ExclamationCircleOutlined style={{ color: 'var(--cl-danger)', fontSize: 20 }} />
            <span style={{ fontWeight: 700 }}>Remover módulo</span>
          </div>
        }
        footer={
          <Space>
            <Button onClick={() => setDeleteModal(null)}>Cancelar</Button>
            <Button danger type="primary" loading={deleteLoading} onClick={handleDelete}>
              Remover
            </Button>
          </Space>
        }
      >
        {deleteModal && (
          <div style={{ padding: '8px 0' }}>
            <p style={{ marginBottom: deleteModal.etapas > 0 ? 12 : 0 }}>
              Remover o módulo <strong>{deleteModal.name}</strong>? Esta ação não pode ser desfeita.
            </p>
            {deleteModal.etapas > 0 && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--cl-danger)', fontWeight: 500 }}>
                Atenção: {deleteModal.etapas} etapa{deleteModal.etapas !== 1 ? 's' : ''} perderá o vínculo com este módulo.
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
