import { useEffect, useState } from 'react';
import {
  Table, Button, Drawer, Form, Input, InputNumber, Select, Space,
  Popconfirm, message, Tooltip, Row, Col,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ClockCircleOutlined, AppstoreOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { categoryService, companyService } from '../services/api';

const { Option } = Select;

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const load = () => {
    setLoading(true);
    categoryService.list().then(setCategories).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    companyService.list().then(setCompanies);
  }, []);

  const openCreate = () => { setEditing(null); form.resetFields(); setDrawerOpen(true); };
  const openEdit = (record) => {
    setEditing(record);
    form.setFieldsValue({ ...record, companyId: record.companyId });
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
        <Table dataSource={categories} columns={columns} rowKey="id" loading={loading} size="middle" scroll={{ x: 600 }} />
      </div>

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
              <Input placeholder="Ex: Suporte Técnico" size="large" />
            </Form.Item>
            <Form.Item name="description" label="Descrição">
              <Input.TextArea rows={3} placeholder="Descreva o tipo de atendimento..." />
            </Form.Item>
            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item name="slaHours" label="Prazo de SLA" rules={[{ required: true, message: 'Informe o SLA' }]} initialValue={24}>
                  <InputNumber
                    min={1} max={720}
                    style={{ width: '100%' }}
                    size="large"
                    addonAfter="horas"
                    placeholder="24"
                  />
                </Form.Item>
              </Col>
              {!editing && (
                <Col xs={24} sm={12}>
                  <Form.Item name="companyId" label="Empresa" rules={[{ required: true, message: 'Selecione a empresa' }]}>
                    <Select placeholder="Selecione a empresa" showSearch optionFilterProp="children" size="large">
                      {companies.map(c => <Option key={c.id} value={c.id}>{c.name}</Option>)}
                    </Select>
                  </Form.Item>
                </Col>
              )}
            </Row>
          </Form>
        </div>
      </Drawer>
    </div>
  );
}
