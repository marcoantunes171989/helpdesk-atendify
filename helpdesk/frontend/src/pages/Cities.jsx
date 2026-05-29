import { useEffect, useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import {
  Table, Button, Modal, Form, Input, Space, Tag,
  message, Tooltip, Switch, Select,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined,
  ExclamationCircleOutlined, EnvironmentOutlined,
  CloudDownloadOutlined, SearchOutlined, ClearOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { cityService, stateService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { canManageCategories, normalize } from '../utils/constants';

export default function Cities() {
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === 'light';

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const [cities, setCities] = useState([]);
  const [states, setStates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteModal, setDeleteModal] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteAllModal, setDeleteAllModal] = useState(false);
  const [deleteAllLoading, setDeleteAllLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStateId, setFilterStateId] = useState(null);
  const [form] = Form.useForm();
  const { user } = useAuth();
  const canEdit = canManageCategories(user?.role);

  const loadCities = () => {
    setLoading(true);
    cityService.list().then(setCities).finally(() => setLoading(false));
  };

  useEffect(() => {
    loadCities();
    stateService.list().then(setStates);
  }, []);

  const filtered = cities.filter(c => {
    if (filterStateId && c.stateId !== filterStateId) return false;
    if (search) {
      const q = normalize(search);
      return normalize(c.name).includes(q) || normalize(c.state?.sigla).includes(q);
    }
    return true;
  });

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (record) => {
    setEditing(record);
    form.setFieldsValue({
      name: record.name,
      ibgeCode: record.ibgeCode || '',
      stateId: record.stateId,
      active: record.active,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (values) => {
    setSaving(true);
    try {
      if (editing) {
        await cityService.update(editing.id, values);
        message.success('Cidade atualizada com sucesso');
      } else {
        await cityService.create(values);
        message.success('Cidade cadastrada com sucesso');
      }
      setModalOpen(false);
      loadCities();
    } catch (err) {
      message.error(err.response?.data?.error || 'Erro ao salvar cidade');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await cityService.remove(deleteModal.id);
      message.success('Cidade excluída com sucesso');
      setDeleteModal(null);
      loadCities();
    } catch (err) {
      message.error(err.response?.data?.error || 'Erro ao excluir cidade');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDeleteAll = async () => {
    setDeleteAllLoading(true);
    try {
      const result = await cityService.removeAll();
      message.success(result.message);
      setDeleteAllModal(false);
      loadCities();
    } catch (err) {
      message.error(err.response?.data?.error || 'Erro ao remover todas as cidades');
    } finally {
      setDeleteAllLoading(false);
    }
  };

  const handleImportIbge = async () => {
    setImportLoading(true);
    try {
      const response = await fetch('https://servicodados.ibge.gov.br/api/v1/localidades/municipios');
      const data = await response.json();
      const payload = data.map(m => ({
        name: m.nome,
        ibgeCode: m.id,
        stateSigla: m.microrregiao?.mesorregiao?.UF?.sigla,
      }));
      const result = await cityService.importFromIbge({ cities: payload });
      message.success(result.message);
      loadCities();
    } catch (err) {
      message.error(err.response?.data?.error || 'Erro ao importar cidades do IBGE');
    } finally {
      setImportLoading(false);
    }
  };

  const columns = [
    {
      title: '#', dataIndex: 'code', key: 'code', width: 60,
      sorter: (a, b) => (a.code || 0) - (b.code || 0),
      render: v => <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#60a5fa', fontSize: 13 }}>{v ? String(v).padStart(3, '0') : '—'}</span>,
    },
    {
      title: 'UF', key: 'uf', width: 70,
      sorter: (a, b) => (a.state?.sigla || '').localeCompare(b.state?.sigla || ''),
      render: (_, r) => <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 13, color: 'var(--cl-text-hi)' }}>{r.state?.sigla || '—'}</span>,
    },
    {
      title: 'Nome', dataIndex: 'name', key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name, 'pt-BR'),
      render: v => <span style={{ fontWeight: 500, color: 'var(--cl-text-hi)', fontSize: 13 }}>{v}</span>,
    },
    {
      title: 'Estado', key: 'state', width: 180,
      sorter: (a, b) => (a.state?.name || '').localeCompare(b.state?.name || '', 'pt-BR'),
      render: (_, r) => r.state ? <span style={{ color: 'var(--cl-text-soft)', fontSize: 13 }}>{r.state.name}</span> : <span style={{ color: 'var(--cl-text-dim)' }}>—</span>,
    },
    {
      title: 'Cód. IBGE', dataIndex: 'ibgeCode', key: 'ibgeCode', width: 110,
      render: v => v ? <span style={{ fontFamily: 'monospace', color: 'var(--cl-text-muted)', fontSize: 12 }}>{v}</span> : <span style={{ color: 'var(--cl-text-dim)' }}>—</span>,
    },
    {
      title: 'Situação', dataIndex: 'active', key: 'active', width: 100,
      sorter: (a, b) => Number(b.active) - Number(a.active),
      render: v => (
        <Tag color={v ? 'success' : 'default'} style={{ borderRadius: 6, fontWeight: 600, fontSize: 11, background: isLight ? 'transparent' : undefined, border: isLight ? 'none' : undefined }}>
          {v ? 'Ativo' : 'Inativo'}
        </Tag>
      ),
    },
    {
      title: 'Cadastrado em', dataIndex: 'createdAt', key: 'createdAt', width: 140,
      sorter: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
      render: v => <span style={{ color: 'var(--cl-text-faint)', fontSize: 12 }}>{dayjs(v).format('DD/MM/YYYY')}</span>,
    },
    canEdit && {
      title: '', key: 'actions', width: 80,
      render: (_, r) => (
        <Space size={4} onClick={e => e.stopPropagation()}>
          <Tooltip title="Editar">
            <Button type="text" icon={<EditOutlined />} size="small" style={{ color: 'var(--cl-text-soft)' }} onClick={() => openEdit(r)} />
          </Tooltip>
          <Tooltip title="Excluir">
            <Button type="text" icon={<DeleteOutlined />} size="small" danger onClick={() => setDeleteModal(r)} />
          </Tooltip>
        </Space>
      ),
    },
  ].filter(Boolean);

  return (
    <div className="page-wrap">
      <div className="page-header">
        <div>
          <h1 className="page-title">Cidades</h1>
          <p style={{ color: 'var(--cl-text-muted)', fontSize: 13, margin: '4px 0 0' }}>
            {filtered.length} cidade{filtered.length !== 1 ? 's' : ''}{(search || filterStateId) ? ` (de ${cities.length})` : ''}
          </p>
        </div>
        {canEdit && (
          <Space>
            <Tooltip title="Importar todos os municípios brasileiros via API do IBGE">
              <Button
                icon={<CloudDownloadOutlined />}
                loading={importLoading}
                onClick={handleImportIbge}
                style={{ borderRadius: 8 }}
              >
                Importar IBGE
              </Button>
            </Tooltip>
            {cities.length > 0 && (
              <Tooltip title="Remover todas as cidades cadastradas">
                <Button
                  danger
                  icon={<ClearOutlined />}
                  onClick={() => setDeleteAllModal(true)}
                  style={{ borderRadius: 8 }}
                >
                  Remover Todos
                </Button>
              </Tooltip>
            )}
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              Nova Cidade
            </Button>
          </Space>
        )}
      </div>

      <div className="filter-bar" style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
        <Input
          prefix={<SearchOutlined style={{ color: 'var(--cl-text-dim)' }} />}
          placeholder="Buscar por nome ou UF..."
          allowClear
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1 }}
        />
        <Select
          allowClear
          placeholder="Filtrar por estado"
          value={filterStateId}
          onChange={setFilterStateId}
          style={{ width: 220 }}
          options={states.map(s => ({ value: s.id, label: `${s.sigla} — ${s.name}` }))}
          showSearch
          filterOption={(input, opt) => normalize(opt.label).includes(normalize(input))}
        />
      </div>

      <div className="page-table-wrap">
        <Table
          dataSource={filtered}
          columns={columns}
          rowKey="id"
          loading={loading}
          scroll={{ y: 'calc(100vh - 420px)', x: false }}
          pagination={{ pageSize: 10, showSizeChanger: true, pageSizeOptions: ['10', '20', '50', '100'], showTotal: (t, r) => `${r[0]}–${r[1]} de ${t}` }}
          size="middle"
          onRow={record => ({ onClick: () => openEdit(record), style: { cursor: 'pointer' } })}
        />
      </div>

      {/* Modal — Cadastro / Edição */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(37,99,235,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <EnvironmentOutlined style={{ color: '#60a5fa', fontSize: 16 }} />
            </div>
            <span style={{ fontWeight: 700, fontSize: 16 }}>{editing ? 'Editar Cidade' : 'Nova Cidade'}</span>
          </div>
        }
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        centered
        width={520}
        styles={{ body: { padding: '24px 0 8px' } }}
        footer={
          <Space>
            <Button onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="primary" loading={saving} onClick={() => form.submit()}
              style={{ background: '#2563eb', borderColor: '#2563eb', fontWeight: 600 }}>
              {editing ? 'Salvar Alterações' : 'Cadastrar'}
            </Button>
          </Space>
        }
      >
        <div style={{ padding: '0 24px' }}>
          <Form form={form} layout="vertical" onFinish={handleSubmit}>
            <Form.Item name="name" label="Nome da Cidade" rules={[{ required: true, message: 'Informe o nome' }]}>
              <Input placeholder="Ex: São Paulo, Belo Horizonte..." size="large" />
            </Form.Item>
            <Form.Item name="stateId" label="Estado" rules={[{ required: true, message: 'Selecione o estado' }]}>
              <Select
                placeholder="Selecione o estado"
                size="large"
                showSearch
                filterOption={(input, opt) => normalize(opt.label).includes(normalize(input))}
                options={states.map(s => ({ value: s.id, label: `${s.sigla} — ${s.name}` }))}
              />
            </Form.Item>
            <Form.Item name="ibgeCode" label="Código IBGE">
              <Input placeholder="Ex: 3550308" size="large" type="number" />
            </Form.Item>
            {editing && (
              <Form.Item name="active" label="Situação" valuePropName="checked">
                <Switch checkedChildren="Ativo" unCheckedChildren="Inativo" />
              </Form.Item>
            )}
          </Form>
        </div>
      </Modal>

      {/* Modal — Confirmar exclusão */}
      <Modal
        open={!!deleteModal}
        onCancel={() => setDeleteModal(null)}
        centered
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ExclamationCircleOutlined style={{ color: '#f87171', fontSize: 20 }} />
            <span style={{ fontWeight: 700 }}>Excluir cidade</span>
          </div>
        }
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setDeleteModal(null)}>Cancelar</Button>
            <Button danger type="primary" loading={deleteLoading} onClick={handleDelete}>
              Excluir
            </Button>
          </div>
        }
      >
        {deleteModal && (
          <p style={{ padding: '8px 0' }}>
            Deseja excluir a cidade <strong>{deleteModal.name} ({deleteModal.state?.sigla})</strong>? Esta ação não pode ser desfeita.
          </p>
        )}
      </Modal>

      {/* Modal — Remover todos */}
      <Modal
        open={deleteAllModal}
        onCancel={() => setDeleteAllModal(false)}
        centered
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ExclamationCircleOutlined style={{ color: '#f87171', fontSize: 20 }} />
            <span style={{ fontWeight: 700 }}>Remover todas as cidades</span>
          </div>
        }
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setDeleteAllModal(false)}>Cancelar</Button>
            <Button danger type="primary" loading={deleteAllLoading} onClick={handleDeleteAll}>
              Remover Todos
            </Button>
          </div>
        }
      >
        <p style={{ padding: '8px 0' }}>
          Deseja remover <strong>todas as {cities.length} cidade{cities.length !== 1 ? 's' : ''}</strong> cadastradas?
          Esta ação não pode ser desfeita.
        </p>
      </Modal>
    </div>
  );
}
