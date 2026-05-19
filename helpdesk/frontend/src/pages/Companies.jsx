import { useEffect, useState } from 'react';
import {
  Table, Button, Modal, Form, Input, Tag, Space,
  Popconfirm, message, Switch, Tooltip,
} from 'antd';
import { PlusOutlined, EditOutlined, StopOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { companyService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export default function Companies() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();
  const { user } = useAuth();

  const load = () => {
    setLoading(true);
    companyService.list().then(setCompanies).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); form.resetFields(); setModalOpen(true); };
  const openEdit = (record) => { setEditing(record); form.setFieldsValue(record); setModalOpen(true); };

  const handleSubmit = async (values) => {
    try {
      if (editing) {
        await companyService.update(editing.id, values);
        message.success('Empresa atualizada');
      } else {
        await companyService.create(values);
        message.success('Empresa criada');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      message.error(err.response?.data?.error || 'Erro ao salvar');
    }
  };

  const handleDeactivate = async (id) => {
    try {
      await companyService.remove(id);
      message.success('Empresa desativada');
      load();
    } catch {
      message.error('Erro ao desativar');
    }
  };

  const columns = [
    {
      title: 'Empresa', key: 'name',
      render: (_, r) => (
        <div>
          <div style={{ fontWeight: 600, color: '#111827' }}>{r.name}</div>
          <div style={{ fontSize: 12, color: '#9ca3af' }}>{r.cnpj}</div>
        </div>
      ),
    },
    { title: 'Email', dataIndex: 'email', key: 'email', render: v => <span style={{ color: '#6b7280' }}>{v}</span> },
    { title: 'Telefone', dataIndex: 'phone', key: 'phone', render: v => <span style={{ color: '#6b7280' }}>{v || '—'}</span> },
    {
      title: 'Usuários', key: 'users',
      render: (_, r) => (
        <span style={{ fontWeight: 600, color: '#16a34a' }}>{r._count?.users ?? '—'}</span>
      ),
    },
    {
      title: 'Chamados', key: 'tickets',
      render: (_, r) => (
        <span style={{ fontWeight: 600, color: '#374151' }}>{r._count?.tickets ?? '—'}</span>
      ),
    },
    {
      title: 'Status', dataIndex: 'active', key: 'active',
      render: v => (
        <Tag color={v ? 'success' : 'error'} style={{ borderRadius: 6 }}>
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
            <Button type="text" icon={<EditOutlined />} size="small" style={{ color: '#6b7280' }} onClick={() => openEdit(record)} />
          </Tooltip>
          {record.active && (
            <Popconfirm title="Desativar empresa?" onConfirm={() => handleDeactivate(record.id)} okText="Sim" cancelText="Não">
              <Tooltip title="Desativar">
                <Button type="text" icon={<StopOutlined />} size="small" danger />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Empresas</h1>
          <p style={{ color: '#6b7280', fontSize: 14, margin: '4px 0 0' }}>{companies.length} empresa{companies.length !== 1 ? 's' : ''} cadastrada{companies.length !== 1 ? 's' : ''}</p>
        </div>
        {user?.role === 'SUPER_ADMIN' && (
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate} style={{ borderRadius: 8, fontWeight: 600 }}>
            Nova Empresa
          </Button>
        )}
      </div>

      <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <Table dataSource={companies} columns={columns} rowKey="id" loading={loading} scroll={{ x: 800 }} size="middle" />
      </div>

      <Modal
        title={<span style={{ fontWeight: 700 }}>{editing ? 'Editar Empresa' : 'Nova Empresa'}</span>}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        okText="Salvar"
        cancelText="Cancelar"
        okButtonProps={{ style: { background: '#16a34a', borderColor: '#16a34a' } }}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ marginTop: 16 }}>
          <Form.Item name="name" label="Nome" rules={[{ required: true }]}>
            <Input placeholder="Razão social da empresa" />
          </Form.Item>
          {!editing && (
            <Form.Item name="cnpj" label="CNPJ" rules={[{ required: true }]}>
              <Input placeholder="00.000.000/0001-00" />
            </Form.Item>
          )}
          <Form.Item name="email" label="Email" rules={[{ required: true }, { type: 'email' }]}>
            <Input placeholder="contato@empresa.com.br" />
          </Form.Item>
          <Form.Item name="phone" label="Telefone">
            <Input placeholder="(11) 99999-9999" />
          </Form.Item>
          <Form.Item name="address" label="Endereço">
            <Input placeholder="Rua, número - Cidade/UF" />
          </Form.Item>
          {editing && (
            <Form.Item name="active" label="Ativo" valuePropName="checked">
              <Switch style={{ background: '#16a34a' }} />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  );
}
