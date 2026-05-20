import { useEffect, useState } from 'react';
import {
  Table, Button, Drawer, Modal, Form, Input, Space, Tag, Select,
  message, Tooltip, Switch, Row, Col,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined,
  ExclamationCircleOutlined, TagsOutlined,
} from '@ant-design/icons';

const { Option } = Select;

const BUILTIN_STATUS_OPTIONS = [
  { value: 'OPEN', label: 'Aberto (OPEN)' },
  { value: 'IN_PROGRESS', label: 'Em Andamento (IN_PROGRESS)' },
  { value: 'RESOLVED', label: 'Resolvido (RESOLVED)' },
  { value: 'CLOSED', label: 'Fechado (CLOSED)' },
  { value: 'CANCELLED', label: 'Cancelado (CANCELLED)' },
];
import dayjs from 'dayjs';
import { statusService } from '../services/api';

const { TextArea } = Input;

const PRESET_COLORS = [
  { label: 'Cinza',    value: '#6b7280' },
  { label: 'Azul',    value: '#1d4ed8' },
  { label: 'Amarelo', value: '#d97706' },
  { label: 'Verde',   value: '#2563eb' },
  { label: 'Roxo',    value: '#7c3aed' },
  { label: 'Vermelho',value: '#dc2626' },
  { label: 'Rosa',    value: '#be185d' },
  { label: 'Ciano',   value: '#0891b2' },
];

function ColorPicker({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', paddingTop: 4 }}>
      {PRESET_COLORS.map(c => (
        <div
          key={c.value}
          onClick={() => onChange(c.value)}
          title={c.label}
          style={{
            width: 28, height: 28, borderRadius: 6, background: c.value, cursor: 'pointer',
            border: value === c.value ? '3px solid #111827' : '2px solid transparent',
            boxSizing: 'border-box', transition: 'border 0.15s',
          }}
        />
      ))}
    </div>
  );
}

export default function Status() {
  const [statuses, setStatuses] = useState([]);
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
    statusService.list().then(setStatuses).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldValue('color', '#6b7280');
    setDrawerOpen(true);
  };

  const openEdit = (record) => {
    setEditing(record);
    form.setFieldsValue({
      name: record.name,
      description: record.description,
      observation: record.observation,
      color: record.color || '#6b7280',
      active: record.active,
      builtinStatus: record.builtinStatus || null,
    });
    setDrawerOpen(true);
  };

  const handleSubmit = async (values) => {
    setSaving(true);
    try {
      if (editing) {
        await statusService.update(editing.id, values);
        message.success('Status atualizado com sucesso');
      } else {
        await statusService.create(values);
        message.success('Status cadastrado com sucesso');
      }
      setDrawerOpen(false);
      load();
    } catch (err) {
      message.error(err.response?.data?.error || 'Erro ao salvar status');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await statusService.remove(deleteModal.id);
      message.success('Status removido com sucesso');
      setDeleteModal(null);
      load();
    } catch (err) {
      message.error(err.response?.data?.error || 'Erro ao remover status');
    } finally {
      setDeleteLoading(false);
    }
  };

  const columns = [
    {
      title: '#', dataIndex: 'code', key: 'code', width: 70,
      render: v => (
        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#2563eb', fontSize: 13 }}>
          {String(v).padStart(4, '0')}
        </span>
      ),
    },
    {
      title: 'Status', key: 'name',
      render: (_, r) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: r.color, flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 600, color: '#111827', fontSize: 13 }}>{r.name}</div>
            {r.description && (
              <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{r.description}</div>
            )}
          </div>
        </div>
      ),
    },
    {
      title: 'Observação', dataIndex: 'observation', key: 'observation',
      render: v => <span style={{ color: '#6b7280', fontSize: 13 }}>{v || '—'}</span>,
    },
    {
      title: 'Chamados', key: 'tickets',
      render: (_, r) => (
        <span style={{ fontWeight: 600, color: '#2563eb', fontSize: 13 }}>{r._count?.tickets ?? 0}</span>
      ),
    },
    {
      title: 'Comportamento', dataIndex: 'builtinStatus', key: 'builtinStatus',
      render: v => v ? (
        <Tag style={{ borderRadius: 6, fontSize: 11, fontFamily: 'monospace' }}>{v}</Tag>
      ) : <span style={{ color: '#d1d5db' }}>—</span>,
    },
    {
      title: 'Situação', dataIndex: 'active', key: 'active',
      render: v => (
        <Tag color={v ? 'success' : 'default'} style={{ borderRadius: 6, fontWeight: 600, fontSize: 11 }}>
          {v ? 'Ativo' : 'Inativo'}
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

  const filteredStatuses = search
    ? (() => { const q = search.toLowerCase(); return statuses.filter(s => [s.name, s.description, s.observation].some(f => (f || '').toLowerCase().includes(q))); })()
    : statuses;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Status de Chamados</h1>
          <p style={{ color: '#6b7280', fontSize: 14, margin: '4px 0 0' }}>
            {filteredStatuses.length} status cadastrado{filteredStatuses.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}
          style={{ borderRadius: 8, fontWeight: 600 }}>
          Novo Status
        </Button>
      </div>

      <div style={{ padding: '12px 16px', background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', marginBottom: 16 }}>
        <Input.Search
          placeholder="Buscar por nome, descrição ou observação..."
          allowClear
          value={search}
          onChange={e => setSearch(e.target.value)}
          onSearch={v => setSearch(v)}
          style={{ width: '100%' }}
        />
      </div>

      <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <Table
          dataSource={filteredStatuses} columns={columns} rowKey="id"
          loading={loading} size="middle" scroll={{ x: 700 }}
          pagination={{ pageSize: 15, showSizeChanger: false, showTotal: t => `${t} status` }}
        />
      </div>

      {/* Modal — Confirmar exclusão */}
      <Modal
        open={!!deleteModal}
        onCancel={() => setDeleteModal(null)}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ExclamationCircleOutlined style={{ color: '#dc2626', fontSize: 20 }} />
            <span style={{ fontWeight: 700 }}>Remover status</span>
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
            <p style={{ color: '#374151', marginBottom: 16 }}>
              Você está prestes a remover o status <strong>{deleteModal.name}</strong>. Esta ação não pode ser desfeita.
            </p>
            {deleteModal.tickets > 0 ? (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#dc2626', fontWeight: 500 }}>
                Este status está vinculado a <strong>{deleteModal.tickets} chamado{deleteModal.tickets !== 1 ? 's' : ''}</strong> e não pode ser removido.
              </div>
            ) : (
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#1e40af' }}>
                Este status não possui chamados vinculados e pode ser removido com segurança.
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Drawer — Cadastro / Edição */}
      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TagsOutlined style={{ color: '#7c3aed', fontSize: 16 }} />
            </div>
            <span style={{ fontWeight: 700, fontSize: 16 }}>
              {editing ? 'Editar Status' : 'Novo Status'}
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
            <Form.Item name="name" label="Nome do Status" rules={[{ required: true, message: 'Informe o nome do status' }]}>
              <Input placeholder="Ex: Aguardando Cliente, Em Análise..." size="large" />
            </Form.Item>

            <Form.Item name="color" label="Cor de identificação">
              <ColorPicker />
            </Form.Item>

            <Form.Item
              name="builtinStatus"
              label="Comportamento do sistema"
              tooltip="Define qual estado interno do sistema este status representa. Determina filtros, SLA e ações automáticas."
            >
              <Select allowClear placeholder="Nenhum (status neutro — mantém estado atual)">
                {BUILTIN_STATUS_OPTIONS.map(o => (
                  <Option key={o.value} value={o.value}>{o.label}</Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item name="description" label="Descrição">
              <TextArea rows={3} placeholder="Descreva o significado deste status..." />
            </Form.Item>

            <Form.Item name="observation" label="Observação">
              <TextArea rows={3} placeholder="Informações adicionais ou regras de uso..." />
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
