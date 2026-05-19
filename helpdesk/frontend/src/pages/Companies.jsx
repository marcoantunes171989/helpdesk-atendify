import { useEffect, useState } from 'react';
import {
  Table, Button, Drawer, Form, Input, Tag, Space, Select,
  Popconfirm, message, Switch, Tooltip, Row, Col, Divider,
} from 'antd';
import { PlusOutlined, EditOutlined, StopOutlined, EyeOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { companyService } from '../services/api';

const { TextArea } = Input;
const { Option } = Select;

const BR_STATES = [
  'AC','AL','AM','AP','BA','CE','DF','ES','GO','MA',
  'MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN',
  'RO','RR','RS','SC','SE','SP','TO',
];

function maskCNPJ(value) {
  return value
    .replace(/\D/g, '')
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
    .slice(0, 18);
}

function maskPhone(value) {
  const d = value.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 10) return d.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').trim();
  return d.replace(/^(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').trim();
}

function maskCEP(value) {
  return value.replace(/\D/g, '').slice(0, 8).replace(/^(\d{5})(\d{0,3})/, '$1-$2').replace(/-$/, '');
}

function maskStateReg(value) {
  return value.replace(/[^\d./\-]/g, '').slice(0, 18);
}

function onlyNumbers(value) {
  return value.replace(/\D/g, '');
}

function validateCNPJ(cnpj) {
  const c = cnpj.replace(/\D/g, '');
  if (c.length !== 14 || /^(\d)\1+$/.test(c)) return false;
  const calc = (len) => {
    let sum = 0, weight = len - 7;
    for (let i = 0; i < len; i++) {
      sum += parseInt(c[i]) * weight--;
      if (weight < 2) weight = 9;
    }
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return calc(12) === parseInt(c[12]) && calc(13) === parseInt(c[13]);
}

export default function Companies() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const navigate = useNavigate();

  const load = () => {
    setLoading(true);
    companyService.list().then(setCompanies).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); form.resetFields(); setDrawerOpen(true); };
  const openEdit = (record) => {
    setEditing(record);
    form.setFieldsValue({
      ...record,
      phone: record.phone ? maskPhone(record.phone) : '',
      zipCode: record.zipCode ? maskCEP(record.zipCode) : '',
      cnpj: record.cnpj ? maskCNPJ(record.cnpj) : '',
    });
    setDrawerOpen(true);
  };

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
      title: '#', dataIndex: 'code', key: 'code', width: 70,
      render: v => <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#16a34a', fontSize: 13 }}>{v ? String(v).padStart(4, '0') : '—'}</span>,
    },
    {
      title: 'Empresa', key: 'name',
      render: (_, r) => (
        <div>
          <div style={{ fontWeight: 600, color: '#111827' }}>{r.name}</div>
          <div style={{ fontSize: 12, color: '#9ca3af' }}>{maskCNPJ(r.cnpj || '')}</div>
        </div>
      ),
    },
    { title: 'Email', dataIndex: 'email', key: 'email', render: v => <span style={{ color: '#6b7280' }}>{v}</span> },
    {
      title: 'Telefone', dataIndex: 'phone', key: 'phone',
      render: v => <span style={{ color: '#6b7280' }}>{v ? maskPhone(v) : '—'}</span>,
    },
    {
      title: 'Cidade/UF', key: 'location',
      render: (_, r) => r.city ? <span style={{ color: '#6b7280' }}>{r.city}{r.state ? `/${r.state}` : ''}</span> : <span style={{ color: '#d1d5db' }}>—</span>,
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
          <p style={{ color: '#6b7280', fontSize: 14, margin: '4px 0 0' }}>
            {companies.length} empresa{companies.length !== 1 ? 's' : ''} cadastrada{companies.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate} style={{ borderRadius: 8, fontWeight: 600 }}>
          Nova Empresa
        </Button>
      </div>

      <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <Table dataSource={companies} columns={columns} rowKey="id" loading={loading} scroll={{ x: 900 }} size="middle" />
      </div>

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
              <Form.Item
                name="cnpj" label="CNPJ"
                rules={[
                  { required: !editing, message: 'Informe o CNPJ' },
                  {
                    validator: (_, value) => {
                      if (!value || editing) return Promise.resolve();
                      if (!validateCNPJ(value)) return Promise.reject('CNPJ inválido');
                      return Promise.resolve();
                    },
                  },
                ]}
                normalize={v => maskCNPJ(v || '')}
              >
                <Input placeholder="00.000.000/0001-00" disabled={!!editing} maxLength={18} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="stateRegistration" label="Inscrição Estadual" normalize={v => maskStateReg(v || '')}>
                <Input placeholder="000.000.000.000" maxLength={18} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="email" label="Email"
                rules={[{ required: true, message: 'Informe o email' }, { type: 'email', message: 'Email inválido' }]}
              >
                <Input placeholder="contato@empresa.com.br" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="phone" label="Telefone" normalize={v => maskPhone(v || '')}>
                <Input placeholder="(11) 99999-9999" maxLength={15} />
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

          <Divider orientation="left" style={{ fontSize: 13, color: '#16a34a', borderColor: '#bbf7d0' }}>
            Endereço
          </Divider>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="zipCode" label="CEP" normalize={v => maskCEP(v || '')}>
                <Input placeholder="00000-000" maxLength={9} />
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
              <Form.Item name="addressNumber" label="Número" normalize={v => onlyNumbers(v || '')}>
                <Input placeholder="Nº" maxLength={10} inputMode="numeric" />
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
