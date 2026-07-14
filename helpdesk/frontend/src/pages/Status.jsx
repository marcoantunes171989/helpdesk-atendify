import { useEffect, useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import {
  Table, Button, Modal, Form, Input, Space, Tag, Select,
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
import { normalize } from '../utils/constants';

const { TextArea } = Input;

// Paleta Atendexa — swatches de cor para status customizados
const PRESET_COLORS = [
  { label: 'Cinza',    value: '#94a3b8' },
  { label: 'Azul',    value: '#2563eb' },
  { label: 'Amarelo', value: '#f59e0b' },
  { label: 'Verde',   value: '#10b981' },
  { label: 'Roxo',    value: '#8b5cf6' },
  { label: 'Vermelho',value: '#ef4444' },
  { label: 'Rosa',    value: '#e11d48' },
  { label: 'Ciano',   value: '#06b6d4' },
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
            border: value === c.value ? '3px solid var(--cl-text-hi)' : '2px solid var(--cl-border-input)',
            boxSizing: 'border-box', transition: 'border 0.15s',
            boxShadow: value === c.value ? `0 0 8px ${c.value}80` : 'none',
          }}
        />
      ))}
    </div>
  );
}

export default function Status() {
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === 'light';
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
    form.setFieldValue('color', '#94a3b8');
    setDrawerOpen(true);
  };

  const openEdit = (record) => {
    setEditing(record);
    form.setFieldsValue({
      name: record.name,
      description: record.description,
      observation: record.observation,
      color: record.color || '#94a3b8',
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
      sorter: (a, b) => a.code - b.code,
      render: v => (
        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--cl-primary-text)', fontSize: 13 }}>
          {String(v).padStart(4, '0')}
        </span>
      ),
    },
    {
      title: 'Status', key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name, 'pt-BR'),
      render: (_, r) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: r.color, flexShrink: 0, boxShadow: `0 0 6px ${r.color}80` }} />
          <div>
            <div style={{ fontWeight: 600, color: 'var(--cl-text-hi)', fontSize: 13 }}>{r.name}</div>
            {r.description && (
              <div style={{ fontSize: 12, color: 'var(--cl-text-muted)', marginTop: 2 }}>{r.description}</div>
            )}
          </div>
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
        <span style={{ fontWeight: 600, color: 'var(--cl-primary-text)', fontSize: 13 }}>{r._count?.tickets ?? 0}</span>
      ),
    },
    {
      title: 'Comportamento', dataIndex: 'builtinStatus', key: 'builtinStatus',
      sorter: (a, b) => (a.builtinStatus || '').localeCompare(b.builtinStatus || ''),
      render: v => v ? (
        <Tag style={{ borderRadius: 6, fontSize: 11, fontFamily: 'monospace' }}>{v}</Tag>
      ) : <span style={{ color: 'var(--cl-text-dim)' }}>—</span>,
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

  const filteredStatuses = search
    ? (() => { const q = normalize(search); return statuses.filter(s => [s.name, s.description, s.observation].some(f => normalize(f).includes(q))); })()
    : statuses;

  return (
    <div className="page-wrap">
      <div className="page-header">
        <div>
          <h1 className="page-title">Status de Chamados</h1>
          <p style={{ color: 'var(--cl-text-muted)', fontSize: 13, margin: '4px 0 0' }}>
            {filteredStatuses.length} status cadastrado{filteredStatuses.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}
          style={{ borderRadius: 8, fontWeight: 600 }}>
          Novo Status
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
          dataSource={filteredStatuses} columns={columns} rowKey="id"
          loading={loading} size="middle" scroll={{ x: 700 }}
          pagination={{ pageSize: 15, showSizeChanger: false, showTotal: t => `${t} status` }}
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
            <p style={{ marginBottom: 16 }}>
              Você está prestes a remover o status <strong>{deleteModal.name}</strong>. Esta ação não pode ser desfeita.
            </p>
            {deleteModal.tickets > 0 ? (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--cl-danger)', fontWeight: 500 }}>
                Este status está vinculado a <strong>{deleteModal.tickets} chamado{deleteModal.tickets !== 1 ? 's' : ''}</strong> e não pode ser removido.
              </div>
            ) : (
              <div style={{ background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--cl-primary-text)' }}>
                Este status não possui chamados vinculados e pode ser removido com segurança.
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Modal — Cadastro / Edição */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(139,92,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TagsOutlined style={{ color: 'var(--cl-purple)', fontSize: 16 }} />
            </div>
            <span style={{ fontWeight: 700, fontSize: 16 }}>
              {editing ? 'Editar Status' : 'Novo Status'}
            </span>
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

            {editing && (
              <Form.Item name="active" label="Situação" valuePropName="checked">
                <Switch checkedChildren="Ativo" unCheckedChildren="Inativo" />
              </Form.Item>
            )}
          </Form>
        </div>
      </Modal>
    </div>
  );
}
