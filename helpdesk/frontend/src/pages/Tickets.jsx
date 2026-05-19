import { useEffect, useState } from 'react';
import {
  Table, Button, Drawer, Modal, Form, Input, Select, Tag, Space,
  message, Tooltip, Badge,
} from 'antd';
import { PlusOutlined, EyeOutlined, DeleteOutlined, ExclamationCircleOutlined, CustomerServiceOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { ticketService, categoryService, userService, companyService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { TICKET_STATUS, PRIORITY } from '../utils/constants';

const { Option } = Select;
const { TextArea } = Input;

export default function Tickets() {
  const [tickets, setTickets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteModal, setDeleteModal] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [filters, setFilters] = useState({});
  const [form] = Form.useForm();
  const { user } = useAuth();
  const navigate = useNavigate();

  const load = (params = {}) => {
    setLoading(true);
    ticketService.list(params).then(setTickets).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    categoryService.list().then(setCategories);
    companyService.list().then(setCompanies);
  }, [user]);

  const handleCreate = async (values) => {
    setSaving(true);
    try {
      const ticket = await ticketService.create(values);
      message.success('Chamado aberto com sucesso');
      setDrawerOpen(false);
      form.resetFields();
      navigate(`/app/tickets/${ticket.id}`);
    } catch (err) {
      message.error(err.response?.data?.error || 'Erro ao abrir chamado');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await ticketService.remove(deleteModal.id);
      message.success('Chamado excluído com sucesso');
      setDeleteModal(null);
      load(filters);
    } catch (err) {
      message.error(err.response?.data?.error || 'Erro ao excluir chamado');
    } finally {
      setDeleteLoading(false);
    }
  };

  const applyFilters = (changed) => {
    const newFilters = { ...filters, ...changed };
    Object.keys(newFilters).forEach(k => { if (!newFilters[k]) delete newFilters[k]; });
    setFilters(newFilters);
    load(newFilters);
  };

  const isSlaExpired = (t) =>
    t.slaDeadline && !['RESOLVED', 'CLOSED', 'CANCELLED'].includes(t.status)
    && dayjs(t.slaDeadline).isBefore(dayjs());

  const columns = [
    {
      title: 'ID', dataIndex: 'id', key: 'id', width: 90,
      render: v => (
        <code style={{ fontSize: 11, color: '#9ca3af', background: '#f3f4f6', padding: '2px 6px', borderRadius: 4 }}>
          {v.slice(-6).toUpperCase()}
        </code>
      ),
    },
    {
      title: 'Título', dataIndex: 'title', key: 'title',
      render: (v, r) => (
        <Space size={6}>
          {isSlaExpired(r) && (
            <Tooltip title="SLA Vencido">
              <ExclamationCircleOutlined style={{ color: '#dc2626', fontSize: 13 }} />
            </Tooltip>
          )}
          <span style={{ fontWeight: 500, color: '#111827' }}>{v}</span>
        </Space>
      ),
    },
    {
      title: 'Solicitante', key: 'user',
      render: (_, r) => <span style={{ color: '#6b7280', fontSize: 13 }}>{r.user?.name || '—'}</span>,
    },
    {
      title: 'Categoria', key: 'category',
      render: (_, r) => <span style={{ color: '#6b7280', fontSize: 13 }}>{r.category?.name || '—'}</span>,
    },
    {
      title: 'Atribuído a', key: 'assignee',
      render: (_, r) => <span style={{ color: '#6b7280', fontSize: 13 }}>{r.assignee?.name || '—'}</span>,
    },
    {
      title: 'Status', dataIndex: 'status', key: 'status',
      render: v => <Tag color={TICKET_STATUS[v]?.color}>{TICKET_STATUS[v]?.label}</Tag>,
    },
    {
      title: 'Prioridade', dataIndex: 'priority', key: 'priority',
      render: v => <Tag color={PRIORITY[v]?.color}>{PRIORITY[v]?.label}</Tag>,
    },
    {
      title: 'Msgs', key: 'comments',
      render: (_, r) => <Badge count={r._count?.comments} showZero color="#16a34a" style={{ fontSize: 11 }} />,
    },
    {
      title: 'Criado em', dataIndex: 'createdAt', key: 'createdAt',
      render: v => <span style={{ color: '#9ca3af', fontSize: 12 }}>{dayjs(v).format('DD/MM/YYYY HH:mm')}</span>,
    },
    {
      title: '', key: 'actions', width: 80,
      render: (_, r) => (
        <Space size={4}>
          <Tooltip title="Ver detalhes">
            <Button type="text" icon={<EyeOutlined />} size="small" style={{ color: '#6b7280' }}
              onClick={() => navigate(`/app/tickets/${r.id}`)} />
          </Tooltip>
          {!['CLOSED', 'CANCELLED'].includes(r.status) && (
            <Button type="text" icon={<DeleteOutlined />} size="small" danger
              onClick={() => setDeleteModal({ id: r.id, title: r.title, status: r.status })} />
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Chamados</h1>
          <p style={{ color: '#6b7280', fontSize: 14, margin: '4px 0 0' }}>
            {tickets.length} chamado{tickets.length !== 1 ? 's' : ''} encontrado{tickets.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setDrawerOpen(true); }}
          style={{ borderRadius: 8, fontWeight: 600 }}>
          Abrir Chamado
        </Button>
      </div>

      {/* Filtros */}
      <div style={{
        display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16,
        padding: '14px 16px', background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb',
      }}>
        <Select allowClear placeholder="Status" style={{ minWidth: 130, flex: 1 }} onChange={v => applyFilters({ status: v })}>
          {Object.entries(TICKET_STATUS).map(([k, { label }]) => <Option key={k} value={k}>{label}</Option>)}
        </Select>
        <Select allowClear placeholder="Prioridade" style={{ minWidth: 120, flex: 1 }} onChange={v => applyFilters({ priority: v })}>
          {Object.entries(PRIORITY).map(([k, { label }]) => <Option key={k} value={k}>{label}</Option>)}
        </Select>
        <Select allowClear placeholder="Categoria" style={{ minWidth: 160, flex: 1 }} onChange={v => applyFilters({ categoryId: v })}>
          {categories.map(c => <Option key={c.id} value={c.id}>{c.name}</Option>)}
        </Select>
        <Input.Search
          placeholder="Buscar título ou descrição..."
          style={{ flex: 2, minWidth: 200 }}
          allowClear
          onSearch={v => applyFilters({ search: v })}
        />
      </div>

      <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <Table
          dataSource={tickets} columns={columns} rowKey="id" loading={loading}
          scroll={{ x: 1000 }} size="middle"
          pagination={{ pageSize: 15, showSizeChanger: false, showTotal: t => `${t} chamados` }}
        />
      </div>

      {/* Modal — Confirmar exclusão */}
      <Modal
        open={!!deleteModal}
        onCancel={() => setDeleteModal(null)}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ExclamationCircleOutlined style={{ color: '#dc2626', fontSize: 20 }} />
            <span style={{ fontWeight: 700 }}>Excluir chamado</span>
          </div>
        }
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setDeleteModal(null)}>Cancelar</Button>
            <Button danger type="primary" loading={deleteLoading} onClick={handleDelete}>
              Excluir permanentemente
            </Button>
          </div>
        }
      >
        {deleteModal && (
          <div style={{ padding: '8px 0' }}>
            <p style={{ color: '#374151', marginBottom: 16 }}>
              Você está prestes a excluir o chamado <strong>"{deleteModal.title}"</strong> permanentemente. Esta ação não pode ser desfeita.
            </p>
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#dc2626', fontWeight: 500 }}>
              Todos os comentários vinculados também serão removidos.
            </div>
          </div>
        )}
      </Modal>

      {/* Drawer — Abrir Chamado */}
      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CustomerServiceOutlined style={{ color: '#d97706', fontSize: 16 }} />
            </div>
            <span style={{ fontWeight: 700, fontSize: 16 }}>Abrir Chamado</span>
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
              Abrir Chamado
            </Button>
          </Space>
        }
      >
        <div className="drawer-form-body" style={{ maxWidth: 640 }}>
          <Form form={form} layout="vertical" onFinish={handleCreate}>
            <Form.Item name="title" label="Título" rules={[{ required: true, message: 'Informe o título' }]}>
              <Input placeholder="Descreva o problema brevemente" size="large" />
            </Form.Item>
            <Form.Item name="description" label="Descrição" rules={[{ required: true, message: 'Descreva o problema' }]}>
              <TextArea rows={5} placeholder="Detalhe o problema com o máximo de informações possível..." />
            </Form.Item>
            <Form.Item name="companyId" label="Empresa" rules={[{ required: true, message: 'Selecione a empresa' }]}>
              <Select placeholder="Selecione a empresa" showSearch optionFilterProp="children" size="large">
                {companies.map(c => <Option key={c.id} value={c.id}>{c.name}</Option>)}
              </Select>
            </Form.Item>
            <Form.Item name="categoryId" label="Categoria">
              <Select allowClear placeholder="Selecione a categoria" size="large">
                {categories.map(c => (
                  <Option key={c.id} value={c.id}>
                    {c.name} <span style={{ color: '#9ca3af', fontSize: 12 }}>· SLA {c.slaHours}h</span>
                  </Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item name="priority" label="Prioridade" initialValue="MEDIUM">
              <Select size="large">
                {Object.entries(PRIORITY).map(([k, { label }]) => <Option key={k} value={k}>{label}</Option>)}
              </Select>
            </Form.Item>
          </Form>
        </div>
      </Drawer>
    </div>
  );
}
