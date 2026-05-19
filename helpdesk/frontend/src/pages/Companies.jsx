import { useEffect, useState } from 'react';
import {
  Table, Button, Drawer, Form, Input, Tag, Space, Select,
  Modal, message, Switch, Tooltip, Row, Col, Divider, Avatar,
} from 'antd';
import {
  PlusOutlined, EditOutlined, EyeOutlined, DeleteOutlined,
  BankOutlined, ExclamationCircleOutlined,
} from '@ant-design/icons';
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

const avatarColors = [
  ['#dcfce7','#16a34a'], ['#dbeafe','#1d4ed8'], ['#fce7f3','#be185d'],
  ['#fef3c7','#d97706'], ['#ede9fe','#7c3aed'], ['#fee2e2','#dc2626'],
];
const getColor = (name = '') => avatarColors[(name.charCodeAt(0) || 0) % avatarColors.length];

function maskCNPJ(v) {
  return (v || '').replace(/\D/g, '').replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2').slice(0, 18);
}
function maskPhone(v) {
  const d = (v || '').replace(/\D/g, '').slice(0, 11);
  if (d.length <= 10) return d.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '');
  return d.replace(/^(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '');
}
function maskCEP(v) {
  return (v || '').replace(/\D/g, '').slice(0, 8).replace(/^(\d{5})(\d{0,3})/, '$1-$2').replace(/-$/, '');
}
function maskStateReg(v) { return (v || '').replace(/[^\d./-]/g, '').slice(0, 18); }
function onlyNumbers(v) { return (v || '').replace(/\D/g, ''); }
function validateCNPJ(cnpj) {
  const c = cnpj.replace(/\D/g, '');
  if (c.length !== 14 || /^(\d)\1+$/.test(c)) return false;
  const calc = (len) => {
    let sum = 0, w = len - 7;
    for (let i = 0; i < len; i++) { sum += parseInt(c[i]) * w--; if (w < 2) w = 9; }
    const r = sum % 11; return r < 2 ? 0 : 11 - r;
  };
  return calc(12) === parseInt(c[12]) && calc(13) === parseInt(c[13]);
}

export default function Companies() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteModal, setDeleteModal] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [form] = Form.useForm();
  const [search, setSearch] = useState('');
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
      cnpj: maskCNPJ(record.cnpj || ''),
      phone: maskPhone(record.phone || ''),
      zipCode: maskCEP(record.zipCode || ''),
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

  const openDelete = async (record) => {
    setDeletingId(record.id);
    try {
      const links = await companyService.checkLinks(record.id);
      setDeleteModal({ id: record.id, ...links });
    } catch {
      message.error('Erro ao verificar vínculos');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await companyService.delete(deleteModal.id);
      message.success('Empresa excluída com sucesso');
      setDeleteModal(null);
      load();
    } catch (err) {
      message.error(err.response?.data?.error || 'Erro ao excluir empresa');
    } finally {
      setDeleteLoading(false);
    }
  };

  const columns = [
    {
      title: '#', dataIndex: 'code', key: 'code', width: 60,
      render: v => (
        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#16a34a', fontSize: 12 }}>
          {v ? String(v).padStart(4, '0') : '—'}
        </span>
      ),
    },
    {
      title: 'Empresa', key: 'name', minWidth: 200,
      render: (_, r) => {
        const [bg, color] = getColor(r.name);
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Avatar size={36} style={{ background: bg, color, fontWeight: 700, fontSize: 15, flexShrink: 0 }}>
              {r.name?.charAt(0).toUpperCase()}
            </Avatar>
            <div>
              <div style={{ fontWeight: 600, color: '#111827', fontSize: 13, lineHeight: 1.3 }}>{r.name}</div>
              <div style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'monospace' }}>{maskCNPJ(r.cnpj || '')}</div>
            </div>
          </div>
        );
      },
    },
    {
      title: 'Contato', key: 'contact',
      render: (_, r) => (
        <div>
          <div style={{ fontSize: 13, color: '#374151' }}>{r.email}</div>
          {r.phone && <div style={{ fontSize: 12, color: '#9ca3af' }}>{maskPhone(r.phone)}</div>}
        </div>
      ),
    },
    {
      title: 'Localização', key: 'location',
      render: (_, r) => r.city
        ? <span style={{ color: '#6b7280', fontSize: 13 }}>{r.city}{r.state ? ` / ${r.state}` : ''}</span>
        : <span style={{ color: '#d1d5db' }}>—</span>,
    },
    {
      title: 'Funcionários', key: 'employees',
      render: (_, r) => <span style={{ fontWeight: 600, color: '#16a34a', fontSize: 13 }}>{r._count?.employees ?? 0}</span>,
    },
    {
      title: 'Chamados', key: 'tickets',
      render: (_, r) => <span style={{ fontWeight: 600, color: '#374151', fontSize: 13 }}>{r._count?.tickets ?? 0}</span>,
    },
    {
      title: 'Status', dataIndex: 'active', key: 'active',
      render: v => (
        <Tag color={v ? 'success' : 'default'} style={{ borderRadius: 20, fontWeight: 600, fontSize: 11 }}>
          {v ? 'Ativa' : 'Inativa'}
        </Tag>
      ),
    },
    {
      title: 'Desde', dataIndex: 'createdAt', key: 'createdAt',
      render: v => <span style={{ color: '#9ca3af', fontSize: 12 }}>{dayjs(v).format('DD/MM/YYYY')}</span>,
    },
    {
      title: '', key: 'actions', width: 100,
      render: (_, record) => (
        <Space size={4}>
          <Tooltip title="Ver detalhes">
            <Button type="text" icon={<EyeOutlined />} size="small"
              style={{ color: '#16a34a' }} onClick={() => navigate(`/app/companies/${record.id}`)} />
          </Tooltip>
          <Tooltip title="Editar">
            <Button type="text" icon={<EditOutlined />} size="small"
              style={{ color: '#6b7280' }} onClick={() => openEdit(record)} />
          </Tooltip>
          <Tooltip title="Excluir">
            <Button type="text" icon={<DeleteOutlined />} size="small"
              danger loading={deletingId === record.id} onClick={() => openDelete(record)} />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const hasLinks = deleteModal && (deleteModal.employees > 0 || deleteModal.tickets > 0 || deleteModal.categories > 0);

  const filteredCompanies = search
    ? (() => { const q = search.toLowerCase(); return companies.filter(c => [c.name, c.cnpj, c.email, c.phone, c.city, c.state].some(f => (f || '').toLowerCase().includes(q))); })()
    : companies;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Empresas</h1>
          <p style={{ color: '#6b7280', fontSize: 14, margin: '4px 0 0' }}>
            {filteredCompanies.filter(c => c.active).length} ativa{filteredCompanies.filter(c => c.active).length !== 1 ? 's' : ''} · {filteredCompanies.length} total
          </p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}
          style={{ borderRadius: 8, fontWeight: 600, height: 38 }}>
          Nova Empresa
        </Button>
      </div>

      <div style={{ padding: '12px 16px', background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', marginBottom: 16 }}>
        <Input.Search
          placeholder="Buscar por nome, CNPJ, e-mail, telefone ou localização..."
          allowClear
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: 500 }}
        />
      </div>

      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <Table
          dataSource={filteredCompanies} columns={columns} rowKey="id"
          loading={loading} scroll={{ x: 900 }} size="middle"
          pagination={{ pageSize: 15, showSizeChanger: false, showTotal: t => `${t} empresa${t !== 1 ? 's' : ''}` }}
        />
      </div>

      {/* Drawer — Cadastro / Edição */}
      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BankOutlined style={{ color: '#16a34a', fontSize: 16 }} />
            </div>
            <span style={{ fontWeight: 700, fontSize: 16 }}>
              {editing ? 'Editar Empresa' : 'Nova Empresa'}
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
              style={{ background: '#16a34a', borderColor: '#16a34a', fontWeight: 600 }}>
              {editing ? 'Salvar Alterações' : 'Cadastrar'}
            </Button>
          </Space>
        }
      >
        <div className="drawer-form-body">
          <Form form={form} layout="vertical" onFinish={handleSubmit} size="middle">

            {/* Identificação */}
            <div className="form-section-label">Identificação</div>
            <Form.Item name="name" label="Razão Social" rules={[{ required: true, message: 'Informe a razão social' }]} style={{ marginBottom: 12 }}>
              <Input placeholder="Nome oficial da empresa" />
            </Form.Item>
            <Row gutter={12}>
              <Col xs={24} sm={13}>
                <Form.Item
                  name="cnpj" label="CNPJ"
                  rules={[
                    { required: true, message: 'Informe o CNPJ' },
                    { validator: (_, v) => !v || validateCNPJ(v) ? Promise.resolve() : Promise.reject('CNPJ inválido') },
                  ]}
                  normalize={v => maskCNPJ(v)}
                  style={{ marginBottom: 12 }}
                >
                  <Input placeholder="00.000.000/0001-00" maxLength={18} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={11}>
                <Form.Item name="stateRegistration" label="Inscrição Estadual" normalize={v => maskStateReg(v)} style={{ marginBottom: 12 }}>
                  <Input placeholder="000.000.000.000" maxLength={18} />
                </Form.Item>
              </Col>
            </Row>

            <Divider style={{ margin: '4px 0 20px', borderColor: '#f3f4f6' }} />

            {/* Contato */}
            <div className="form-section-label">Contato</div>
            <Row gutter={12}>
              <Col xs={24} sm={14}>
                <Form.Item name="email" label="E-mail"
                  rules={[{ required: true, message: 'Informe o e-mail' }, { type: 'email', message: 'E-mail inválido' }]}
                  style={{ marginBottom: 12 }}>
                  <Input placeholder="contato@empresa.com.br" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={10}>
                <Form.Item name="phone" label="Telefone" normalize={v => maskPhone(v)} style={{ marginBottom: 12 }}>
                  <Input placeholder="(11) 99999-9999" maxLength={15} />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="website" label="Website" style={{ marginBottom: 12 }}>
              <Input placeholder="https://www.empresa.com.br" />
            </Form.Item>

            <Divider style={{ margin: '4px 0 20px', borderColor: '#f3f4f6' }} />

            {/* Endereço */}
            <div className="form-section-label">Endereço</div>
            <Row gutter={12}>
              <Col xs={24} sm={8}>
                <Form.Item name="zipCode" label="CEP" normalize={v => maskCEP(v)} style={{ marginBottom: 12 }}>
                  <Input placeholder="00000-000" maxLength={9} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={16}>
                <Form.Item name="street" label="Logradouro" style={{ marginBottom: 12 }}>
                  <Input placeholder="Rua, Avenida, Travessa..." />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={12}>
              <Col xs={8} sm={6}>
                <Form.Item name="addressNumber" label="Número" normalize={v => onlyNumbers(v)} style={{ marginBottom: 12 }}>
                  <Input placeholder="Nº" maxLength={10} inputMode="numeric" />
                </Form.Item>
              </Col>
              <Col xs={16} sm={18}>
                <Form.Item name="complement" label="Complemento" style={{ marginBottom: 12 }}>
                  <Input placeholder="Sala, Andar, Bloco..." />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={12}>
              <Col xs={24} sm={10}>
                <Form.Item name="neighborhood" label="Bairro" style={{ marginBottom: 12 }}>
                  <Input placeholder="Nome do bairro" />
                </Form.Item>
              </Col>
              <Col xs={16} sm={10}>
                <Form.Item name="city" label="Cidade" style={{ marginBottom: 12 }}>
                  <Input placeholder="Nome da cidade" />
                </Form.Item>
              </Col>
              <Col xs={8} sm={4}>
                <Form.Item name="state" label="UF" style={{ marginBottom: 12 }}>
                  <Select placeholder="UF" showSearch>
                    {BR_STATES.map(s => <Option key={s} value={s}>{s}</Option>)}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Divider style={{ margin: '4px 0 20px', borderColor: '#f3f4f6' }} />

            {/* Observações */}
            <div className="form-section-label">Observações</div>
            <Form.Item name="notes" style={{ marginBottom: 12 }}>
              <TextArea rows={3} placeholder="Informações adicionais sobre a empresa..." />
            </Form.Item>

            {editing && (
              <>
                <Divider style={{ margin: '4px 0 20px', borderColor: '#f3f4f6' }} />
                <Form.Item name="active" label="Status da empresa" valuePropName="checked" style={{ marginBottom: 0 }}>
                  <Switch checkedChildren="Ativa" unCheckedChildren="Inativa" />
                </Form.Item>
              </>
            )}
          </Form>
        </div>
      </Drawer>

      {/* Modal — Confirmar exclusão */}
      <Modal
        open={!!deleteModal}
        onCancel={() => setDeleteModal(null)}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ExclamationCircleOutlined style={{ color: '#dc2626', fontSize: 20 }} />
            <span style={{ fontWeight: 700 }}>Excluir empresa</span>
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
              Você está prestes a excluir <strong>{deleteModal.name}</strong> permanentemente. Esta ação não pode ser desfeita.
            </p>
            {hasLinks ? (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '14px 16px' }}>
                <div style={{ fontWeight: 600, color: '#dc2626', fontSize: 13, marginBottom: 10 }}>
                  Os seguintes registros vinculados também serão excluídos:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {deleteModal.employees > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#374151' }}>
                      <span>👤 Funcionários</span>
                      <span style={{ fontWeight: 700, color: '#dc2626' }}>{deleteModal.employees}</span>
                    </div>
                  )}
                  {deleteModal.tickets > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#374151' }}>
                      <span>🎫 Chamados (e comentários)</span>
                      <span style={{ fontWeight: 700, color: '#dc2626' }}>{deleteModal.tickets}</span>
                    </div>
                  )}
                  {deleteModal.categories > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#374151' }}>
                      <span>🏷️ Categorias</span>
                      <span style={{ fontWeight: 700, color: '#dc2626' }}>{deleteModal.categories}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#166534' }}>
                Esta empresa não possui registros vinculados.
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
