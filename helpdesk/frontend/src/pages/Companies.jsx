import { useEffect, useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import {
  Table, Button, Form, Input, Tag, Space, Select,
  Modal, message, Switch, Tooltip, Row, Col, Divider, Avatar, Segmented,
} from 'antd';
import {
  PlusOutlined, EditOutlined, EyeOutlined, DeleteOutlined,
  BankOutlined, ExclamationCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { companyService, stateService, cityService, companyAttachmentService } from '../services/api';
import { normalize } from '../utils/constants';
import CompanyAttachments from '../components/CompanyAttachments';

const { TextArea } = Input;

const avatarColors = [
  ['rgba(37,99,235,0.25)', '#60a5fa'],
  ['rgba(29,78,216,0.25)', '#93c5fd'],
  ['rgba(190,24,93,0.25)', '#f472b6'],
  ['rgba(217,119,6,0.25)', '#fbbf24'],
  ['rgba(124,58,237,0.25)', '#a78bfa'],
  ['rgba(220,38,38,0.25)', '#f87171'],
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
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === 'light';
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
  const [filterActive, setFilterActive] = useState('true'); // 'true' | 'false' | 'all'
  const [allStates, setAllStates] = useState([]);
  const [allCities, setAllCities] = useState([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const [selectedStateSigla, setSelectedStateSigla] = useState(null);
  const [stagedFiles, setStagedFiles] = useState([]);
  const navigate = useNavigate();

  const load = () => {
    setLoading(true);
    companyService.list().then(setCompanies).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    stateService.list().then(setAllStates);
    setLoadingCities(true);
    cityService.list().then(setAllCities).finally(() => setLoadingCities(false));
  }, []);

  const cityOptions = allCities.map(c => ({
    value: c.name,
    label: `${c.name} – ${c.state?.sigla}`,
    data: c,
  }));

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setSelectedStateSigla(null);
    setStagedFiles([]);
    setDrawerOpen(true);
  };
  const openEdit = (record) => {
    setEditing(record);
    form.setFieldsValue({
      ...record,
      cnpj: maskCNPJ(record.cnpj || ''),
      phone: maskPhone(record.phone || ''),
      zipCode: maskCEP(record.zipCode || ''),
    });
    setSelectedStateSigla(record.state || null);
    setStagedFiles([]);
    setDrawerOpen(true);
  };

  const handleSubmit = async (values) => {
    setSaving(true);
    try {
      if (editing) {
        await companyService.update(editing.id, values);
        message.success('Empresa atualizada com sucesso');
      } else {
        const created = await companyService.create(values);
        if (stagedFiles.length > 0) {
          let okCount = 0;
          for (const file of stagedFiles) {
            try {
              await companyAttachmentService.upload(created.id, file);
              okCount++;
            } catch {
              message.warning(`Falha ao anexar ${file.name}`);
            }
          }
          if (okCount > 0) message.success(`Empresa cadastrada · ${okCount} anexo${okCount > 1 ? 's' : ''} enviado${okCount > 1 ? 's' : ''}`);
          else message.success('Empresa cadastrada com sucesso');
        } else {
          message.success('Empresa cadastrada com sucesso');
        }
      }
      setDrawerOpen(false);
      setStagedFiles([]);
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
      sorter: (a, b) => (a.code || 0) - (b.code || 0),
      render: v => (
        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#60a5fa', fontSize: 12 }}>
          {v ? String(v).padStart(4, '0') : '—'}
        </span>
      ),
    },
    {
      title: 'Empresa', key: 'name', minWidth: 200,
      sorter: (a, b) => a.name.localeCompare(b.name, 'pt-BR'),
      render: (_, r) => {
        const [bg, color] = getColor(r.name);
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Avatar size={36} style={{ background: bg, color, fontWeight: 700, fontSize: 15, flexShrink: 0, border: `1px solid ${color}44` }}>
              {r.name?.charAt(0).toUpperCase()}
            </Avatar>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--cl-text-hi)', fontSize: 13, lineHeight: 1.3 }}>{r.name}</div>
              {r.fantasia && <div style={{ fontSize: 11, color: 'var(--cl-text-soft)' }}>{r.fantasia}</div>}
              <div style={{ fontSize: 11, color: 'var(--cl-text-faint)', fontFamily: 'monospace' }}>{maskCNPJ(r.cnpj || '')}</div>
            </div>
          </div>
        );
      },
    },
    {
      title: 'Contato', key: 'contact',
      sorter: (a, b) => a.email.localeCompare(b.email, 'pt-BR'),
      render: (_, r) => (
        <div>
          <div style={{ fontSize: 13, color: 'var(--cl-text-soft)' }}>{r.email}</div>
          {r.phone && <div style={{ fontSize: 12, color: 'var(--cl-text-muted)' }}>{maskPhone(r.phone)}</div>}
        </div>
      ),
    },
    {
      title: 'Localização', key: 'location',
      sorter: (a, b) => (a.city || '').localeCompare(b.city || '', 'pt-BR'),
      render: (_, r) => r.city
        ? <span style={{ color: 'var(--cl-text-soft)', fontSize: 13 }}>{r.city}{r.state ? ` / ${r.state}` : ''}</span>
        : <span style={{ color: 'var(--cl-text-dim)' }}>—</span>,
    },
    {
      title: 'Funcionários', key: 'employees',
      sorter: (a, b) => (a._count?.employees ?? 0) - (b._count?.employees ?? 0),
      render: (_, r) => <span style={{ fontWeight: 600, color: '#60a5fa', fontSize: 13 }}>{r._count?.employees ?? 0}</span>,
    },
    {
      title: 'Chamados', key: 'tickets',
      sorter: (a, b) => (a._count?.tickets ?? 0) - (b._count?.tickets ?? 0),
      render: (_, r) => <span style={{ fontWeight: 600, color: 'var(--cl-text-sub)', fontSize: 13 }}>{r._count?.tickets ?? 0}</span>,
    },
    {
      title: 'Status', dataIndex: 'active', key: 'active',
      sorter: (a, b) => Number(b.active) - Number(a.active),
      render: v => (
        <Tag color={v ? 'success' : 'default'} style={{ borderRadius: 20, fontWeight: 600, fontSize: 11, background: isLight ? 'transparent' : undefined, border: isLight ? 'none' : undefined }}>
          {v ? 'Ativa' : 'Inativa'}
        </Tag>
      ),
    },
    {
      title: 'Desde', dataIndex: 'createdAt', key: 'createdAt',
      sorter: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
      render: v => <span style={{ color: 'var(--cl-text-faint)', fontSize: 12 }}>{dayjs(v).format('DD/MM/YYYY')}</span>,
    },
    {
      title: '', key: 'actions', width: 100,
      onCell: () => ({ onClick: e => e.stopPropagation() }),
      render: (_, record) => (
        <Space size={4}>
          <Tooltip title="Ver detalhes">
            <Button type="text" icon={<EyeOutlined />} size="small"
              style={{ color: '#60a5fa' }} onClick={() => navigate(`/app/companies/${record.id}`)} />
          </Tooltip>
          <Tooltip title="Editar">
            <Button type="text" icon={<EditOutlined />} size="small"
              style={{ color: 'var(--cl-text-soft)' }} onClick={() => openEdit(record)} />
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

  const filteredCompanies = companies.filter(c => {
    if (filterActive === 'true' && !c.active) return false;
    if (filterActive === 'false' && c.active) return false;
    if (search) {
      const q = normalize(search);
      return [c.name, c.fantasia, c.cnpj, c.email, c.phone, c.city, c.state, c.notes].some(f => normalize(f).includes(q));
    }
    return true;
  });

  return (
    <div className="page-wrap">
      <div className="page-header">
        <div>
          <h1 className="page-title">Empresas</h1>
          <p style={{ color: 'var(--cl-text-muted)', fontSize: 13, margin: '4px 0 0' }}>
            {companies.filter(c => c.active).length} ativa{companies.filter(c => c.active).length !== 1 ? 's' : ''} · {companies.length} total
          </p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}
          style={{ borderRadius: 8, fontWeight: 600, height: 38 }}>
          Nova Empresa
        </Button>
      </div>

      <div className="filter-bar" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <Input
          placeholder="Buscar por nome, CNPJ, e-mail, telefone ou localização..."
          allowClear
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1 }}
        />
        <Segmented
          value={filterActive}
          onChange={setFilterActive}
          options={[
            { label: 'Ativas', value: 'true' },
            { label: 'Inativas', value: 'false' },
            { label: 'Todas', value: 'all' },
          ]}
        />
      </div>

      <div className="page-table-wrap">
        <Table
          dataSource={filteredCompanies} columns={columns} rowKey="id"
          loading={loading} scroll={{ x: 900 }} size="middle"
          pagination={{ pageSize: 15, showSizeChanger: false, showTotal: t => `${t} empresa${t !== 1 ? 's' : ''}` }}
          onRow={(record) => ({
            onClick: () => navigate(`/app/companies/${record.id}`),
            style: { cursor: 'pointer' },
          })}
        />
      </div>

      {/* Drawer — Cadastro / Edição */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(37,99,235,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BankOutlined style={{ color: '#60a5fa', fontSize: 16 }} />
            </div>
            <span style={{ fontWeight: 700, fontSize: 16 }}>
              {editing ? 'Editar Empresa' : 'Nova Empresa'}
            </span>
          </div>
        }
        open={drawerOpen}
        onCancel={() => setDrawerOpen(false)}
        centered
        width={780}
        className="company-form-modal"
        style={{ maxWidth: 'calc(100vw - 16px)' }}
        footer={
          <Space>
            <Button onClick={() => setDrawerOpen(false)}>Cancelar</Button>
            <Button type="primary" loading={saving} onClick={() => form.submit()}
              style={{ background: '#2563eb', borderColor: '#2563eb', fontWeight: 600 }}>
              {editing ? 'Salvar Alterações' : 'Cadastrar'}
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit} size="middle" autoComplete="off">
          <div className="form-section-label">Identificação</div>
          <Form.Item name="name" label="Razão Social" rules={[{ required: true, message: 'Informe a razão social' }]} style={{ marginBottom: 12 }}>
            <Input placeholder="Nome oficial da empresa" />
          </Form.Item>
          <Form.Item name="fantasia" label="Nome Fantasia" style={{ marginBottom: 12 }}>
            <Input placeholder="Nome comercial / fantasia" />
          </Form.Item>
          <Row gutter={{ xs: 8, sm: 12 }}>
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

          <Divider style={{ margin: '4px 0 20px', borderColor: 'var(--cl-border)' }} />

          <div className="form-section-label">Contato</div>
          <Row gutter={{ xs: 8, sm: 12 }}>
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


          <Divider style={{ margin: '4px 0 20px', borderColor: 'var(--cl-border)' }} />

          <div className="form-section-label">Endereço</div>
          <Row gutter={{ xs: 8, sm: 12 }}>
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
          <Row gutter={{ xs: 8, sm: 12 }}>
            <Col xs={10} sm={6}>
              <Form.Item name="addressNumber" label="Número" normalize={v => onlyNumbers(v)} style={{ marginBottom: 12 }}>
                <Input placeholder="Nº" maxLength={10} inputMode="numeric" />
              </Form.Item>
            </Col>
            <Col xs={14} sm={18}>
              <Form.Item name="complement" label="Complemento" style={{ marginBottom: 12 }}>
                <Input placeholder="Sala, Andar, Bloco..." />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={{ xs: 8, sm: 12 }}>
            <Col xs={24} sm={10}>
              <Form.Item name="neighborhood" label="Bairro" style={{ marginBottom: 12 }}>
                <Input placeholder="Nome do bairro" />
              </Form.Item>
            </Col>
            <Col xs={16} sm={9}>
              <Form.Item
                name="city" label="Cidade" style={{ marginBottom: 12 }}
                rules={[{ required: true, message: 'Selecione a cidade' }]}
              >
                <Select
                  placeholder="Buscar cidade..."
                  showSearch
                  loading={loadingCities}
                  options={cityOptions}
                  filterOption={(input, opt) => normalize(opt.label).includes(normalize(input))}
                  onSelect={(val, option) => {
                    const sigla = option.data?.state?.sigla;
                    if (sigla) {
                      form.setFieldValue('state', sigla);
                      setSelectedStateSigla(sigla);
                    }
                  }}
                  onClear={() => {
                    form.setFieldValue('state', undefined);
                    setSelectedStateSigla(null);
                  }}
                  allowClear
                />
              </Form.Item>
            </Col>
            <Col xs={8} sm={5}>
              <Form.Item
                name="state" label="UF" style={{ marginBottom: 12 }}
                rules={[{ required: true, message: 'Selecione o estado' }]}
              >
                <Select
                  placeholder="UF"
                  options={allStates.map(s => ({ value: s.sigla, label: s.sigla }))}
                  onChange={(val) => setSelectedStateSigla(val || null)}
                  allowClear
                />
              </Form.Item>
            </Col>
          </Row>

          <Divider style={{ margin: '4px 0 20px', borderColor: 'var(--cl-border)' }} />

          <div className="form-section-label">Observações</div>
          <Form.Item name="notes" style={{ marginBottom: 12 }}>
            <TextArea rows={3} placeholder="Informações adicionais sobre a empresa..." />
          </Form.Item>

          <Divider style={{ margin: '4px 0 20px', borderColor: 'var(--cl-border)' }} />

          <div className="form-section-label">Anexos</div>
          <div style={{ marginBottom: 16 }}>
            <CompanyAttachments
              companyId={editing?.id}
              stagedFiles={stagedFiles}
              onStagedChange={setStagedFiles}
            />
          </div>

          {editing && (
            <>
              <Divider style={{ margin: '4px 0 20px', borderColor: 'var(--cl-border)' }} />
              <Form.Item name="active" label="Status da empresa" valuePropName="checked" style={{ marginBottom: 0 }}>
                <Switch checkedChildren="Ativa" unCheckedChildren="Inativa" />
              </Form.Item>
            </>
          )}
        </Form>
      </Modal>

      {/* Modal — Confirmar exclusão */}
      <Modal
        open={!!deleteModal}
        onCancel={() => setDeleteModal(null)}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ExclamationCircleOutlined style={{ color: '#f87171', fontSize: 20 }} />
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
            <p style={{ marginBottom: 16 }}>
              Você está prestes a excluir <strong>{deleteModal.name}</strong> permanentemente. Esta ação não pode ser desfeita.
            </p>
            {hasLinks ? (
              <div style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 8, padding: '14px 16px' }}>
                <div style={{ fontWeight: 600, color: '#f87171', fontSize: 13, marginBottom: 10 }}>
                  Os seguintes registros vinculados também serão excluídos:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {deleteModal.employees > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span>👤 Funcionários</span>
                      <span style={{ fontWeight: 700, color: '#f87171' }}>{deleteModal.employees}</span>
                    </div>
                  )}
                  {deleteModal.tickets > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span>🎫 Chamados (e comentários)</span>
                      <span style={{ fontWeight: 700, color: '#f87171' }}>{deleteModal.tickets}</span>
                    </div>
                  )}
                  {deleteModal.categories > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span>🏷️ Categorias</span>
                      <span style={{ fontWeight: 700, color: '#f87171' }}>{deleteModal.categories}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#60a5fa' }}>
                Esta empresa não possui registros vinculados.
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
