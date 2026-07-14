import { useEffect, useState, useCallback } from 'react';
import {
  Table, Button, Modal, Form, Input, Space, Tag, Switch,
  Select, message, Tooltip,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, UnorderedListOutlined,
  ExclamationCircleOutlined, SearchOutlined,
} from '@ant-design/icons';
import { etapaTreinamentoService, moduloTreinamentoService } from '../services/api';
import { normalize } from '../utils/constants';
import { useAuth } from '../contexts/AuthContext';

const { Option } = Select;

export default function EtapasTreinamento() {
  const { user } = useAuth();
  const canEdit = ['SUPER_ADMIN', 'ADMIN', 'AGENT'].includes(user?.role);

  const [items, setItems] = useState([]);
  const [modulos, setModulos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterModulo, setFilterModulo] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteModal, setDeleteModal] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [form] = Form.useForm();

  const loadAll = useCallback(() => {
    setLoading(true);
    Promise.all([
      etapaTreinamentoService.list(),
      moduloTreinamentoService.list({ active: 'true' }),
    ]).then(([etapas, mods]) => {
      setItems(etapas);
      setModulos(mods);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const filtered = items.filter(i => {
    if (filterModulo && i.moduloId !== filterModulo) return false;
    if (search) {
      const q = normalize(search);
      return [i.title, i.description, i.modulo?.name].some(f => normalize(f).includes(q));
    }
    return true;
  });

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (record) => {
    setEditing(record);
    form.setFieldsValue({
      title: record.title,
      description: record.description,
      moduloId: record.moduloId || undefined,
      active: record.active,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (values) => {
    setSaving(true);
    try {
      if (editing) {
        await etapaTreinamentoService.update(editing.id, values);
        message.success('Etapa atualizada');
      } else {
        await etapaTreinamentoService.create(values);
        message.success('Etapa cadastrada');
      }
      setModalOpen(false);
      loadAll();
    } catch (err) {
      message.error(err.response?.data?.error || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await etapaTreinamentoService.remove(deleteModal.id);
      message.success('Etapa removida');
      setDeleteModal(null);
      loadAll();
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
      title: 'Etapa / Módulo',
      dataIndex: 'title',
      sorter: (a, b) => a.title.localeCompare(b.title, 'pt-BR'),
      render: (title, r) => (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--cl-text-hi)', fontSize: 13 }}>{title}</div>
          {r.description && (
            <div style={{ fontSize: 11, color: 'var(--cl-text-muted)', marginTop: 2, maxWidth: 400,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {r.description}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Módulo',
      dataIndex: ['modulo', 'name'],
      width: 180,
      sorter: (a, b) => (a.modulo?.name || '').localeCompare(b.modulo?.name || '', 'pt-BR'),
      render: (name) => name
        ? <Tag color="blue" style={{ borderRadius: 6, fontWeight: 600, fontSize: 11 }}>{name}</Tag>
        : <span style={{ color: 'var(--cl-text-dim)', fontSize: 12 }}>—</span>,
    },
    {
      title: 'Situação',
      dataIndex: 'active',
      width: 100,
      render: v => (
        <Tag color={v ? 'success' : 'default'} style={{ borderRadius: 6, fontWeight: 600, fontSize: 11 }}>
          {v ? 'Ativa' : 'Inativa'}
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
              onClick={() => setDeleteModal({ id: record.id, title: record.title })} />
          </Tooltip>
        </Space>
      ),
    }] : []),
  ];

  return (
    <div className="page-wrap">
      <div className="page-header">
        <div>
          <h1 className="page-title">Etapas de Treinamento</h1>
          <p style={{ color: 'var(--cl-text-muted)', fontSize: 13, margin: '4px 0 0' }}>
            {filtered.length} etapa{filtered.length !== 1 ? 's' : ''} cadastrada{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>
        {canEdit && (
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}
            style={{ borderRadius: 8, fontWeight: 600 }}>
            Nova Etapa
          </Button>
        )}
      </div>

      <div className="filter-bar" style={{ display: 'flex', gap: 12 }}>
        <Input
          prefix={<SearchOutlined style={{ color: 'var(--cl-text-dim)' }} />}
          placeholder="Buscar por título, descrição ou módulo..."
          allowClear
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1 }}
        />
        <Select
          placeholder="Filtrar por módulo"
          allowClear
          value={filterModulo || undefined}
          onChange={v => setFilterModulo(v || '')}
          style={{ width: 220 }}
          showSearch
          filterOption={(input, option) => normalize(option?.children || '').includes(normalize(input))}
        >
          {modulos.map(m => <Option key={m.id} value={m.id}>{m.name}</Option>)}
        </Select>
      </div>

      <div className="page-table-wrap">
        <Table
          dataSource={filtered}
          columns={columns}
          rowKey="id"
          loading={loading}
          size="middle"
          scroll={{ x: 600 }}
          pagination={{ pageSize: 20, showSizeChanger: false, showTotal: t => `${t} etapa${t !== 1 ? 's' : ''}` }}
          onRow={record => ({ onClick: () => openEdit(record), style: { cursor: 'pointer' } })}
        />
      </div>

      {/* Modal — Cadastro / Edição */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(37,99,235,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <UnorderedListOutlined style={{ color: 'var(--cl-primary-text)', fontSize: 16 }} />
            </div>
            <span style={{ fontWeight: 700, fontSize: 16 }}>
              {editing ? 'Editar Etapa' : 'Nova Etapa de Treinamento'}
            </span>
          </div>
        }
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        centered
        width={560}
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
            <Form.Item name="title" label="Título da Etapa"
              rules={[{ required: true, message: 'Informe o título' }]}>
              <Input placeholder="Ex: Cadastro de Produtos, Programação de Oferta..." size="large" />
            </Form.Item>

            <Form.Item name="moduloId" label="Módulo">
              <Select
                placeholder="Selecione o módulo"
                allowClear
                showSearch
                size="large"
                filterOption={(input, option) => normalize(option?.children || '').includes(normalize(input))}
              >
                {modulos.map(m => <Option key={m.id} value={m.id}>{m.name}</Option>)}
              </Select>
            </Form.Item>

            <Form.Item name="description" label="Descrição / Observação">
              <Input.TextArea rows={3} placeholder="Descreva o que é realizado nesta etapa..."
                style={{ resize: 'none' }} />
            </Form.Item>

            {editing && (
              <Form.Item name="active" label="Situação" valuePropName="checked">
                <Switch checkedChildren="Ativa" unCheckedChildren="Inativa" />
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
            <span style={{ fontWeight: 700 }}>Remover etapa</span>
          </div>
        }
        footer={
          <Space>
            <Button onClick={() => setDeleteModal(null)}>Cancelar</Button>
            <Button danger type="primary" loading={deleteLoading} onClick={handleDelete}>Remover</Button>
          </Space>
        }
      >
        {deleteModal && (
          <p style={{ padding: '8px 0', margin: 0 }}>
            Remover <strong>{deleteModal.title}</strong>? Esta ação não pode ser desfeita.
          </p>
        )}
      </Modal>
    </div>
  );
}
