import { useEffect, useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import {
  Table, Button, Modal, Form, Input, Space, Tag,
  message, Tooltip, Switch,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined,
  ExclamationCircleOutlined, GlobalOutlined, CloudDownloadOutlined, SearchOutlined,
  ClearOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { stateService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { canManageCategories, normalize } from '../utils/constants';

export default function States() {
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === 'light';
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
  const [form] = Form.useForm();
  const { user } = useAuth();
  const canEdit = canManageCategories(user?.role);

  const load = () => {
    setLoading(true);
    stateService.list().then(setStates).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = search
    ? states.filter(s => {
        const q = normalize(search);
        return normalize(s.name).includes(q) || normalize(s.sigla).includes(q);
      })
    : states;

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (record) => {
    setEditing(record);
    form.setFieldsValue({
      name: record.name,
      sigla: record.sigla,
      region: record.region || '',
      ibgeCode: record.ibgeCode || '',
      active: record.active,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (values) => {
    setSaving(true);
    try {
      if (editing) {
        await stateService.update(editing.id, values);
        message.success('Estado atualizado com sucesso');
      } else {
        await stateService.create(values);
        message.success('Estado cadastrado com sucesso');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      message.error(err.response?.data?.error || 'Erro ao salvar estado');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await stateService.remove(deleteModal.id);
      message.success('Estado excluído com sucesso');
      setDeleteModal(null);
      load();
    } catch (err) {
      message.error(err.response?.data?.error || 'Erro ao excluir estado');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDeleteAll = async () => {
    setDeleteAllLoading(true);
    try {
      const result = await stateService.removeAll();
      message.success(result.message);
      setDeleteAllModal(false);
      load();
    } catch (err) {
      message.error(err.response?.data?.error || 'Erro ao remover todos os estados');
    } finally {
      setDeleteAllLoading(false);
    }
  };

  const handleImportIbge = async () => {
    setImportLoading(true);
    try {
      const response = await fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados');
      const data = await response.json();
      const payload = data.map(s => ({
        name: s.nome,
        sigla: s.sigla,
        ibgeCode: s.id,
        region: s.regiao?.nome || null,
      }));
      const result = await stateService.importFromIbge({ states: payload });
      message.success(result.message);
      load();
    } catch (err) {
      message.error(err.response?.data?.error || 'Erro ao importar estados do IBGE');
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
      title: 'Sigla', dataIndex: 'sigla', key: 'sigla', width: 80,
      sorter: (a, b) => a.sigla.localeCompare(b.sigla),
      render: v => <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 14, color: 'var(--cl-text-hi)' }}>{v}</span>,
    },
    {
      title: 'Nome', dataIndex: 'name', key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name, 'pt-BR'),
      render: v => <span style={{ fontWeight: 500, color: 'var(--cl-text-hi)', fontSize: 13 }}>{v}</span>,
    },
    {
      title: 'Região', dataIndex: 'region', key: 'region',
      sorter: (a, b) => (a.region || '').localeCompare(b.region || '', 'pt-BR'),
      render: v => v ? <span style={{ color: 'var(--cl-text-soft)', fontSize: 13 }}>{v}</span> : <span style={{ color: 'var(--cl-text-dim)' }}>—</span>,
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
        <Space size={4}>
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
          <h1 className="page-title">Estados</h1>
          <p style={{ color: 'var(--cl-text-muted)', fontSize: 13, margin: '4px 0 0' }}>
            {filtered.length} estado{filtered.length !== 1 ? 's' : ''}{search ? ` (de ${states.length})` : ''}
          </p>
        </div>
        {canEdit && (
          <Space>
            <Tooltip title="Importar todos os estados brasileiros via API do IBGE">
              <Button
                icon={<CloudDownloadOutlined />}
                loading={importLoading}
                onClick={handleImportIbge}
                style={{ borderRadius: 8 }}
              >
                Importar IBGE
              </Button>
            </Tooltip>
            {states.length > 0 && (
              <Tooltip title="Remover todos os estados cadastrados">
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
              Novo Estado
            </Button>
          </Space>
        )}
      </div>

      <div className="filter-bar" style={{ marginBottom: 16 }}>
        <Input
          prefix={<SearchOutlined style={{ color: 'var(--cl-text-dim)' }} />}
          placeholder="Buscar por nome ou sigla..."
          allowClear
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: '100%' }}
        />
      </div>

      <div className="page-table-wrap">
        <Table
          dataSource={filtered}
          columns={columns}
          rowKey="id"
          loading={loading}
          scroll={{ y: 'calc(100vh - 360px)', x: false }}
          pagination={{ pageSize: 50, showSizeChanger: true, pageSizeOptions: ['20', '50', '100'], showTotal: (t, r) => `${r[0]}–${r[1]} de ${t}` }}
          size="middle"
        />
      </div>

      {/* Modal — Cadastro / Edição */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(37,99,235,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <GlobalOutlined style={{ color: '#60a5fa', fontSize: 16 }} />
            </div>
            <span style={{ fontWeight: 700, fontSize: 16 }}>{editing ? 'Editar Estado' : 'Novo Estado'}</span>
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
            <Form.Item name="name" label="Nome do Estado" rules={[{ required: true, message: 'Informe o nome' }]}>
              <Input placeholder="Ex: São Paulo, Minas Gerais..." size="large" />
            </Form.Item>
            <Space style={{ width: '100%' }} size={12}>
              <Form.Item name="sigla" label="Sigla" rules={[{ required: true, message: 'Informe a sigla' }, { max: 2, message: 'Máximo 2 caracteres' }]} style={{ width: 120 }}>
                <Input placeholder="SP" maxLength={2} size="large" style={{ textTransform: 'uppercase' }}
                  onChange={e => form.setFieldValue('sigla', e.target.value.toUpperCase())} />
              </Form.Item>
              <Form.Item name="region" label="Região" style={{ flex: 1, minWidth: 180 }}>
                <Input placeholder="Ex: Sudeste, Norte..." size="large" />
              </Form.Item>
            </Space>
            <Form.Item name="ibgeCode" label="Código IBGE">
              <Input placeholder="Ex: 35" size="large" type="number" />
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
            <span style={{ fontWeight: 700 }}>Excluir estado</span>
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
            Deseja excluir o estado <strong>{deleteModal.name} ({deleteModal.sigla})</strong>? Esta ação não pode ser desfeita.
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
            <span style={{ fontWeight: 700 }}>Remover todos os estados</span>
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
          Deseja remover <strong>todos os {states.length} estado{states.length !== 1 ? 's' : ''}</strong> cadastrados?
          Esta ação não pode ser desfeita.
        </p>
      </Modal>
    </div>
  );
}
