import { useEffect, useState } from 'react';
import {
  Table, Button, Modal, Form, Input, InputNumber, Space,
  Popconfirm, message, Tooltip, Tag,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ClockCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { categoryService } from '../services/api';

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();

  const load = () => {
    setLoading(true);
    categoryService.list().then(setCategories).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); form.resetFields(); setModalOpen(true); };
  const openEdit = (record) => { setEditing(record); form.setFieldsValue(record); setModalOpen(true); };

  const handleSubmit = async (values) => {
    try {
      if (editing) {
        await categoryService.update(editing.id, values);
        message.success('Categoria atualizada');
      } else {
        await categoryService.create(values);
        message.success('Categoria criada');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      message.error(err.response?.data?.error || 'Erro ao salvar');
    }
  };

  const handleDelete = async (id) => {
    try {
      await categoryService.remove(id);
      message.success('Categoria removida');
      load();
    } catch {
      message.error('Erro ao remover');
    }
  };

  const getSlaColor = (hours) => {
    if (hours <= 4) return { bg: '#fef2f2', color: '#dc2626' };
    if (hours <= 8) return { bg: '#fffbeb', color: '#d97706' };
    return { bg: '#f0fdf4', color: '#16a34a' };
  };

  const columns = [
    {
      title: 'Categoria', key: 'name',
      render: (_, r) => (
        <div>
          <div style={{ fontWeight: 600, color: '#111827' }}>{r.name}</div>
          {r.description && <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{r.description}</div>}
        </div>
      ),
    },
    { title: 'Empresa', key: 'company', render: (_, r) => <span style={{ color: '#6b7280', fontSize: 13 }}>{r.company?.name || '—'}</span> },
    {
      title: 'SLA', dataIndex: 'slaHours', key: 'slaHours',
      render: v => {
        const c = getSlaColor(v);
        return (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '2px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600,
            background: c.bg, color: c.color,
          }}>
            <ClockCircleOutlined style={{ fontSize: 11 }} />
            {v}h
          </span>
        );
      },
    },
    {
      title: 'Chamados', key: 'tickets',
      render: (_, r) => <span style={{ fontWeight: 600, color: '#16a34a' }}>{r._count?.tickets ?? '—'}</span>,
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
            <Button type="text" icon={<EditOutlined />} size="small" style={{ color: '#6b7280' }} onClick={() => openEdit(record)} />
          </Tooltip>
          <Popconfirm
            title="Remover categoria?"
            description="Chamados vinculados perderão a categoria."
            onConfirm={() => handleDelete(record.id)}
            okText="Remover"
            cancelText="Cancelar"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Remover">
              <Button type="text" icon={<DeleteOutlined />} size="small" danger />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Categorias</h1>
          <p style={{ color: '#6b7280', fontSize: 14, margin: '4px 0 0' }}>{categories.length} categoria{categories.length !== 1 ? 's' : ''} cadastrada{categories.length !== 1 ? 's' : ''}</p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate} style={{ borderRadius: 8, fontWeight: 600 }}>
          Nova Categoria
        </Button>
      </div>

      <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <Table dataSource={categories} columns={columns} rowKey="id" loading={loading} size="middle" />
      </div>

      <Modal
        title={<span style={{ fontWeight: 700 }}>{editing ? 'Editar Categoria' : 'Nova Categoria'}</span>}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        okText="Salvar"
        cancelText="Cancelar"
        okButtonProps={{ style: { background: '#16a34a', borderColor: '#16a34a' } }}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ marginTop: 16 }}>
          <Form.Item name="name" label="Nome" rules={[{ required: true }]}>
            <Input placeholder="Ex: Suporte Técnico" />
          </Form.Item>
          <Form.Item name="description" label="Descrição">
            <Input.TextArea rows={2} placeholder="Descreva o tipo de atendimento..." />
          </Form.Item>
          <Form.Item name="slaHours" label="Prazo de SLA (horas)" rules={[{ required: true }]} initialValue={24}>
            <InputNumber
              min={1} max={720}
              style={{ width: '100%' }}
              addonAfter="horas"
              placeholder="24"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
