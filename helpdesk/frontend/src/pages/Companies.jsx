import { useEffect, useState } from 'react';
import {
  Table, Button, Drawer, Form, Input, Tag, Space, Select,
  Popconfirm, message, Switch, Tooltip, Row, Col, Divider,
} from 'antd';
import { PlusOutlined, EditOutlined, StopOutlined, EyeOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { companyService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { canManageCompanies } from '../utils/constants';

const { TextArea } = Input;
const { Option } = Select;

const BR_STATES = [
  'AC','AL','AM','AP','BA','CE','DF','ES','GO','MA',
  'MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN',
  'RO','RR','RS','SC','SE','SP','TO',
];

export default function Companies() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const { user } = useAuth();
  const navigate = useNavigate();

  const load = () => {
    setLoading(true);
    companyService.list().then(setCompanies).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); form.resetFields(); setDrawerOpen(true); };
  const openEdit = (record) => { setEditing(record); form.setFieldsValue(record); setDrawerOpen(true); };

  const handleSubmit = async (values) => {
    setSaving(true);
    try {
      if (editing) {
        await companyService.update(editing.id, values);
        message.success('Empresa atualizada com sucesso');
      } else {
        await companyService.create(values);
        message.success('Empresa cadastrada com sucesso');
      }
      setDrawerOpen(false);
      load();
    } catch (err) {
      message.error(err.response?.data?.error || 'Erro ao salvar empresa');
    } finally {
      setSaving(false);
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
      title: 'Cidade/UF', key: 'location',
      render: (_, r) => r.city ? <span style={{ color: '#6b7280' }}>{r.city}{r.state ? `/${r.state}` : ''}</span> : <span style={{ color: '#d1d5db' }}>—</span>,
    },
    {
      title: 'Usuários', key: 'users',
      render: (_, r) => <span style={{ fontWeight: 600, color: '#16a34a' }}>{r._count?.users ?? '—'}</span>,
    },
    {
      title: 'Chamados', key: 'tickets',
      render: (_, r) => <span style={{ fontWeight: 600, color: '#374151' }}>{r._count?.tickets ?? '—'}</span>,
    },
    {
      title: 'Status', dataIndex: 'active', key: 'active',
      render: v => <Tag color={v ? 'success' : 'error'} style={{ borderRadius: 6 }}>{v ? 'Ativo' : 'Inativo'}</Tag>,
    },
    {
      title: 'Criado em', dataIndex: 'createdAt', key: 'createdAt',
      render: v => <span style={{ color: '#9ca3af', fontSize: 12 }}>{dayjs(v).format('DD/MM/YYYY')}</span>,
    },
    {
      title: '', key: 'actions', width: 110,
      render: (_, record) => (
        <Space>
          <Tooltip title="Ver detalhes">
            <Button type="text" icon={<EyeOutlined />} size="small" style={{ color: '#16a34a' }} onClick={() => navigate(`/app/companies/${record.id}`)} />
          </Tooltip>
          {canManageCompanies(user?.role) && (
            <Tooltip title="Editar">
              <Button type="text" icon={<EditOutlined />} size="small" style={{ color: '#6b7280' }} onClick={() => openEdit(record)} />
            </Tooltip>
          )}
          {canManageCompanies(user?.role) && record.active && (
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
          <p style={{ color: '#6b7280', fontSize: 14, margin: '4px 0 0' }}>
            {companies.length} empresa{companies.length !== 1 ? 's' : ''} cadastrada{companies.length !== 1 ? 's' : ''}
          </p>
        </div>
        {canManageCompanies(user?.role) && (
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate} style={{ borderRadius: 8, fontWeight: 600 }}>
            Nova Empresa
          </Button>
        )}
      </div>

      <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <Table dataSource={companies} columns={columns} rowKey="id" loading={loading} scroll={{ x: 900 }} size="middle" />
      </div>

      {/* Drawer — Cadastro/Edição */}
      <Drawer
        title={<span style={{ fontWeight: 700, fontSize: 16 }}>{editing ? 'Editar Empresa' : 'Nova Empresa'}</span>}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={620}
        extra={
          <Space>
            <Button onClick={() => setDrawerOpen(false)}>Cancelar</Button>
            <Button type="primary" loading={saving} onClick={() => form.submit()}
              style={{ background: '#16a34a', borderColor: '#16a34a', fontWeight: 600 }}>
              Salvar
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>

          {/* Dados da Empresa */}
          <Divider orientation="left" style={{ fontSize: 13, color: '#16a34a', borderColor: '#bbf7d0' }}>
            Dados da Empresa
          </Divider>
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item name="name" label="Razão Social" rules={[{ required: true, message: 'Informe a razão social' }]}>
                <Input placeholder="Nome da empresa" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="cnpj" label="CNPJ" rules={[{ required: !editing, message: 'Informe o CNPJ' }]}>
                <Input placeholder="00.000.000/0001-00" disabled={!!editing} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="stateRegistration" label="Inscrição Estadual">
                <Input placeholder="000.000.000.000" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="email" label="Email" rules={[{ required: true, message: 'Informe o email' }, { type: 'email', message: 'Email inválido' }]}>
                <Input placeholder="contato@empresa.com.br" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="phone" label="Telefone">
                <Input placeholder="(11) 99999-9999" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item name="website" label="Website">
                <Input placeholder="https://www.empresa.com.br" />
              </Form.Item>
            </Col>
          </Row>

          {/* Endereço */}
          <Divider orientation="left" style={{ fontSize: 13, color: '#16a34a', borderColor: '#bbf7d0' }}>
            Endereço
          </Divider>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="zipCode" label="CEP">
                <Input placeholder="00000-000" />
              </Form.Item>
            </Col>
            <Col span={16}>
              <Form.Item name="street" label="Logradouro">
                <Input placeholder="Rua, Avenida, Travessa..." />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={6}>
              <Form.Item name="addressNumber" label="Número">
                <Input placeholder="Nº" />
              </Form.Item>
            </Col>
            <Col span={18}>
              <Form.Item name="complement" label="Complemento">
                <Input placeholder="Sala, Andar, Bloco..." />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={10}>
              <Form.Item name="neighborhood" label="Bairro">
                <Input placeholder="Nome do bairro" />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item name="city" label="Cidade">
                <Input placeholder="Nome da cidade" />
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item name="state" label="UF">
                <Select placeholder="UF" showSearch>
                  {BR_STATES.map(s => <Option key={s} value={s}>{s}</Option>)}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          {/* Informações adicionais */}
          <Divider orientation="left" style={{ fontSize: 13, color: '#16a34a', borderColor: '#bbf7d0' }}>
            Informações Adicionais
          </Divider>
          <Form.Item name="notes" label="Observações">
            <TextArea rows={4} placeholder="Informações adicionais sobre a empresa..." />
          </Form.Item>
          {editing && (
            <Form.Item name="active" label="Empresa Ativa" valuePropName="checked">
              <Switch />
            </Form.Item>
          )}
        </Form>
      </Drawer>
    </div>
  );
}
