import { useEffect, useState } from 'react';
import {
  Table, Button, Modal, Form, Input, Select, Tag, Space,
  message, Tooltip, Badge, Upload,
} from 'antd';
import {
  PlusOutlined, EyeOutlined, DeleteOutlined, ExclamationCircleOutlined,
  CustomerServiceOutlined, PaperClipOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { ticketService, categoryService, companyService, employeeService, statusService, technicianService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { TICKET_STATUS, PRIORITY, normalize } from '../utils/constants';
import { useTheme } from '../contexts/ThemeContext';

const { Option } = Select;
const { TextArea } = Input;

const MAX_FILE_SIZE_MB = 5;

const readFileAsBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = (e) => resolve(e.target.result.split(',')[1]);
  reader.onerror = reject;
  reader.readAsDataURL(file.originFileObj || file);
});

export default function Tickets() {
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === 'light';
  const [tickets, setTickets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [companyEmployees, setCompanyEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteModal, setDeleteModal] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [filters, setFilters] = useState({});
  const [search, setSearch] = useState('');
  const [fileList, setFileList] = useState([]);
  const [form] = Form.useForm();
  const { user } = useAuth();
  const navigate = useNavigate();

  const load = (params = {}) => {
    setLoading(true);
    ticketService.list(params).then(setTickets).finally(() => setLoading(false));
  };

  const buildApiParams = (f) => {
    const params = { ...f };
    if (!params.statusIds?.length) params.excludeResolved = 'true';
    return params;
  };

  useEffect(() => {
    load(buildApiParams({}));
    categoryService.list({ active: 'true' }).then(list => {
      const unique = list.filter((c, i, arr) => arr.findIndex(x => x.name.toLowerCase() === c.name.toLowerCase()) === i);
      unique.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
      setCategories(unique);
    });
    companyService.list({ active: true }).then(setCompanies);
    statusService.list({ active: true }).then(setStatuses);
    technicianService.list({ active: 'true' }).then(list => {
      list.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
      setTechnicians(list);
    });
  }, [user]);

  const handleCompanyChange = (companyId) => {
    form.setFieldValue('employeeId', undefined);
    setCompanyEmployees([]);
    if (!companyId) return;
    setLoadingEmployees(true);
    employeeService.list({ companyId, active: 'true' })
      .then(setCompanyEmployees)
      .finally(() => setLoadingEmployees(false));
  };

  const openDrawer = () => {
    form.resetFields();
    setFileList([]);
    setCompanyEmployees([]);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setFileList([]);
    setCompanyEmployees([]);
  };

  const beforeUpload = (file) => {
    const isLt5M = file.size / 1024 / 1024 < MAX_FILE_SIZE_MB;
    if (!isLt5M) {
      message.error(`"${file.name}" excede ${MAX_FILE_SIZE_MB}MB`);
      return Upload.LIST_IGNORE;
    }
    return false;
  };

  const handleCreate = async (values) => {
    setSaving(true);
    try {
      const attachments = await Promise.all(
        fileList.map(async (f) => ({
          name: f.name,
          mimeType: f.type || 'application/octet-stream',
          size: f.size,
          data: await readFileAsBase64(f),
        }))
      );
      const ticket = await ticketService.create({ ...values, attachments });
      message.success('Chamado aberto com sucesso');
      closeDrawer();
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
      load(buildApiParams(filters));
    } catch (err) {
      message.error(err.response?.data?.error || 'Erro ao excluir chamado');
    } finally {
      setDeleteLoading(false);
    }
  };

  const applyFilters = (changed) => {
    const newFilters = { ...filters, ...changed };
    Object.keys(newFilters).forEach(k => { if (newFilters[k] === undefined || newFilters[k] === null || newFilters[k] === '') delete newFilters[k]; });
    setFilters(newFilters);
    load(buildApiParams(newFilters));
  };

  const handleStatusFilterChange = (values) => {
    const newFilters = { ...filters };
    delete newFilters.statusIds;
    if (values.length > 0) newFilters.statusIds = values;
    setFilters(newFilters);
    load(buildApiParams(newFilters));
  };

  const isSlaExpired = (t) =>
    t.slaDeadline && !['RESOLVED', 'CLOSED', 'CANCELLED'].includes(t.status)
    && dayjs(t.slaDeadline).isBefore(dayjs());

  const filteredTickets = search
    ? (() => {
        const q = normalize(search);
        return tickets.filter(r => [
          r.id, r.title, r.description,
          r.company?.name, r.company?.fantasia, r.employee?.name, r.employee?.position,
          r.technician?.name, r.category?.name,
          r.ticketStatus?.name, TICKET_STATUS[r.status]?.label,
          PRIORITY[r.priority]?.label,
        ].some(f => normalize(f).includes(q)));
      })()
    : tickets;

  const statusCounts = statuses.reduce((acc, s) => {
    acc[s.id] = tickets.filter(t => t.statusId === s.id).length;
    return acc;
  }, {});

  const PRIORITY_ORDER = { LOW: 1, MEDIUM: 2, HIGH: 3, URGENT: 4 };

  const columns = [
    {
      title: '#', dataIndex: 'code', key: 'code', width: 70,
      sorter: (a, b) => (a.code || 0) - (b.code || 0),
      defaultSortOrder: 'descend',
      render: v => (
        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#60a5fa', fontSize: 13 }}>
          {v ? String(v).padStart(4, '0') : '—'}
        </span>
      ),
    },
    {
      title: 'Título', dataIndex: 'title', key: 'title',
      sorter: (a, b) => a.title.localeCompare(b.title, 'pt-BR'),
      render: (v, r) => (
        <Space size={6} align="start">
          {isSlaExpired(r) && (
            <Tooltip title="SLA Vencido">
              <ExclamationCircleOutlined style={{ color: '#f87171', fontSize: 13, marginTop: 2 }} />
            </Tooltip>
          )}
          <div>
            <div style={{ fontWeight: 500, color: 'var(--cl-text-hi)', fontSize: 13, whiteSpace: 'normal', wordBreak: 'break-word' }}>{v}</div>
            {r._count?.comments > 0 && (
              <span style={{ fontSize: 11, color: 'var(--cl-text-faint)' }}>
                {r._count.comments} msg{r._count.comments !== 1 ? 's' : ''}
                {r._count?.attachments > 0 ? ` · ${r._count.attachments} anexo${r._count.attachments !== 1 ? 's' : ''}` : ''}
              </span>
            )}
          </div>
        </Space>
      ),
    },
    {
      title: 'Empresa', key: 'company', ellipsis: true,
      sorter: (a, b) => (a.company?.name || '').localeCompare(b.company?.name || '', 'pt-BR'),
      render: (_, r) => (
        <div>
          <div style={{ color: 'var(--cl-text-sub)', fontSize: 13, fontWeight: 500 }}>{r.company?.name || '—'}</div>
          {r.company?.fantasia && (
            <div style={{ fontSize: 11, color: 'var(--cl-text-muted)' }}>{r.company.fantasia}</div>
          )}
        </div>
      ),
    },
    {
      title: 'Funcionário', key: 'employee', ellipsis: true, width: 130,
      sorter: (a, b) => (a.employee?.name || '').localeCompare(b.employee?.name || '', 'pt-BR'),
      render: (_, r) => r.employee ? (
        <div>
          <div style={{ fontSize: 13, color: 'var(--cl-text-soft)' }}>{r.employee.name}</div>
          {r.employee.position && <div style={{ fontSize: 11, color: 'var(--cl-text-faint)' }}>{r.employee.position}</div>}
        </div>
      ) : <span style={{ color: 'var(--cl-text-dim)' }}>—</span>,
    },
    {
      title: 'Técnico', key: 'technician', ellipsis: true, width: 110,
      sorter: (a, b) => (a.technician?.name || '').localeCompare(b.technician?.name || '', 'pt-BR'),
      render: (_, r) => <span style={{ color: 'var(--cl-text-soft)', fontSize: 13 }}>{r.technician?.name || '—'}</span>,
    },
    {
      title: 'Categoria', key: 'category', ellipsis: true, width: 110,
      sorter: (a, b) => (a.category?.name || '').localeCompare(b.category?.name || '', 'pt-BR'),
      render: (_, r) => <span style={{ color: 'var(--cl-text-soft)', fontSize: 13 }}>{r.category?.name || '—'}</span>,
    },
    {
      title: 'Status', key: 'status',
      sorter: (a, b) => (a.ticketStatus?.name || TICKET_STATUS[a.status]?.label || '').localeCompare(b.ticketStatus?.name || TICKET_STATUS[b.status]?.label || '', 'pt-BR'),
      render: (_, r) => {
        if (r.ticketStatus) {
          return (
            <Tag style={{ borderRadius: 6, fontWeight: 600, fontSize: 11, background: isLight ? 'transparent' : r.ticketStatus.color + '22', color: r.ticketStatus.color, borderColor: isLight ? 'transparent' : r.ticketStatus.color + '55' }}>
              <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: r.ticketStatus.color, marginRight: 5, verticalAlign: 'middle' }} />
              {r.ticketStatus.name}
            </Tag>
          );
        }
        return (
          <Tag color={TICKET_STATUS[r.status]?.color} style={{ borderRadius: 6, fontWeight: 600, fontSize: 11, background: isLight ? 'transparent' : undefined, border: isLight ? 'none' : undefined }}>
            {TICKET_STATUS[r.status]?.label}
          </Tag>
        );
      },
    },
    {
      title: 'Prioridade', dataIndex: 'priority', key: 'priority',
      sorter: (a, b) => (PRIORITY_ORDER[a.priority] || 0) - (PRIORITY_ORDER[b.priority] || 0),
      render: v => (
        <Tag color={PRIORITY[v]?.color} style={{ borderRadius: 6, fontSize: 11, background: isLight ? 'transparent' : undefined, border: isLight ? 'none' : undefined }}>
          {PRIORITY[v]?.label}
        </Tag>
      ),
    },
    {
      title: 'Criado em', dataIndex: 'createdAt', key: 'createdAt', width: 130,
      sorter: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
      render: v => <span style={{ color: 'var(--cl-text-faint)', fontSize: 12 }}>{dayjs(v).format('DD/MM/YYYY HH:mm')}</span>,
    },
    {
      title: '', key: 'actions', width: 60,
      render: (_, r) => (
        <Space size={4} onClick={e => e.stopPropagation()}>
          <Tooltip title="Ver detalhes">
            <Button type="text" icon={<EyeOutlined />} size="small" style={{ color: '#60a5fa' }}
              onClick={() => navigate(`/app/tickets/${r.id}`)} />
          </Tooltip>
          {!['CLOSED', 'CANCELLED'].includes(r.status) && (
            <Button type="text" icon={<DeleteOutlined />} size="small" danger
              onClick={() => setDeleteModal({ id: r.id, title: r.title })} />
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="page-wrap">
      <div className="page-header">
        <div>
          <h1 className="page-title">Chamados</h1>
          <p style={{ color: 'var(--cl-text-muted)', fontSize: 13, margin: '4px 0 0' }}>
            {filteredTickets.length} chamado{filteredTickets.length !== 1 ? 's' : ''}{search ? ` (de ${tickets.length})` : ''} · {' '}
            {statuses.filter(s => statusCounts[s.id] > 0).map(s => (
              <Tag
                key={s.id}
                style={{ fontSize: 11, marginRight: 4, background: isLight ? 'transparent' : s.color + '22', color: s.color, borderColor: isLight ? 'transparent' : s.color + '55' }}
              >
                {s.name}: {statusCounts[s.id]}
              </Tag>
            ))}
          </p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openDrawer}
          style={{ borderRadius: 8, fontWeight: 600 }}>
          Abrir Chamado
        </Button>
      </div>

      {/* Filtros */}
      <div className="filter-bar">
        <Select
          mode="multiple"
          allowClear
          placeholder="Todos os status (sem resolvidos)"
          style={{ minWidth: 180, flex: 1 }}
          maxTagCount="responsive"
          onChange={handleStatusFilterChange}
        >
          {statuses.map(s => (
            <Option key={s.id} value={s.id}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, display: 'inline-block' }} />
                {s.name}
              </span>
            </Option>
          ))}
        </Select>
        <Select allowClear placeholder="Todas as prioridades" style={{ minWidth: 160, flex: 1 }} onChange={v => applyFilters({ priority: v })}>
          {Object.entries(PRIORITY).map(([k, { label }]) => <Option key={k} value={k}>{label}</Option>)}
        </Select>
        <Select allowClear placeholder="Todas as categorias" style={{ minWidth: 160, flex: 1 }} onChange={v => applyFilters({ categoryId: v })}>
          {categories.map(c => <Option key={c.id} value={c.id}>{c.name}</Option>)}
        </Select>
        <Input
          placeholder="Buscar em todos os campos..."
          style={{ flex: 2 }}
          allowClear
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="page-table-wrap">
        <Table
          dataSource={filteredTickets} columns={columns} rowKey="id" loading={loading}
          size="middle"
          pagination={{ pageSize: 15, showSizeChanger: false, showTotal: t => `${t} chamados` }}
          onRow={r => ({ onClick: () => navigate(`/app/tickets/${r.id}`), style: { cursor: 'pointer' } })}
        />
      </div>

      {/* Modal — Confirmar exclusão */}
      <Modal
        open={!!deleteModal}
        onCancel={() => setDeleteModal(null)}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ExclamationCircleOutlined style={{ color: '#f87171', fontSize: 20 }} />
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
            <p style={{ marginBottom: 16 }}>
              Você está prestes a excluir o chamado <strong>"{deleteModal.title}"</strong> permanentemente. Esta ação não pode ser desfeita.
            </p>
            <div style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#f87171', fontWeight: 500 }}>
              Todos os comentários vinculados também serão removidos.
            </div>
          </div>
        )}
      </Modal>

      {/* Modal — Abrir Chamado */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(217,119,6,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CustomerServiceOutlined style={{ color: '#fbbf24', fontSize: 16 }} />
            </div>
            <span style={{ fontWeight: 700, fontSize: 16 }}>Abrir Chamado</span>
          </div>
        }
        open={drawerOpen}
        onCancel={closeDrawer}
        centered
        width={660}
        styles={{ body: { padding: '24px 0 8px', maxHeight: '72vh', overflowY: 'auto' } }}
        footer={
          <Space>
            <Button onClick={closeDrawer}>Cancelar</Button>
            <Button type="primary" loading={saving} onClick={() => form.submit()}
              style={{ background: '#2563eb', borderColor: '#2563eb', fontWeight: 600 }}>
              Abrir Chamado
            </Button>
          </Space>
        }
      >
        <div style={{ padding: '0 24px' }}>
          <Form form={form} layout="vertical" onFinish={handleCreate}>
            <Form.Item name="title" label="Título" rules={[{ required: true, message: 'Informe o título' }]}>
              <Input placeholder="Descreva o problema brevemente" size="large" />
            </Form.Item>
            <Form.Item name="description" label="Descrição" rules={[{ required: true, message: 'Descreva o problema' }]}>
              <TextArea rows={5} maxLength={250} showCount placeholder="Detalhe o problema com o máximo de informações possível..." style={{ resize: 'none', borderRadius: 8 }} />
            </Form.Item>
            <Form.Item name="companyId" label="Empresa" rules={[{ required: true, message: 'Selecione a empresa' }]}>
              <Select
                placeholder="Selecione a empresa"
                showSearch
                size="large"
                onChange={handleCompanyChange}
                filterOption={(input, option) => {
                  const c = companies.find(co => co.id === option.value);
                  const q = normalize(input);
                  return (
                    normalize(c?.name).includes(q) ||
                    normalize(c?.fantasia).includes(q)
                  );
                }}
              >
                {companies.map(c => (
                  <Option key={c.id} value={c.id}>
                    <div style={{ lineHeight: 1.3 }}>
                      <div>{c.name}</div>
                      {c.fantasia && (
                        <div style={{ fontSize: 11, color: 'var(--cl-text-faint)', marginTop: 1 }}>{c.fantasia}</div>
                      )}
                    </div>
                  </Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item name="employeeId" label="Funcionário" rules={[{ required: true, message: 'Selecione o funcionário responsável pelo chamado' }]}>
              <Select
                placeholder={companyEmployees.length === 0 && !loadingEmployees ? 'Selecione uma empresa primeiro' : 'Selecione o funcionário'}
                showSearch optionFilterProp="children" size="large"
                loading={loadingEmployees}
                disabled={companyEmployees.length === 0 && !loadingEmployees}
                notFoundContent={loadingEmployees ? 'Carregando...' : 'Nenhum funcionário ativo para esta empresa'}
              >
                {companyEmployees.map(e => (
                  <Option key={e.id} value={e.id}>{e.name}</Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item name="technicianId" label="Técnico" rules={[{ required: true, message: 'Selecione o técnico responsável' }]}>
              <Select placeholder="Selecione o técnico" showSearch optionFilterProp="children" size="large"
                notFoundContent="Nenhum técnico ativo cadastrado">
                {technicians.map(t => (
                  <Option key={t.id} value={t.id}>{t.name}</Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item name="categoryId" label="Categoria" rules={[{ required: true, message: 'Selecione a categoria do chamado' }]}>
              <Select placeholder="Selecione a categoria" size="large" showSearch optionFilterProp="children">
                {categories.map(c => (
                  <Option key={c.id} value={c.id}>{c.name}</Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item name="statusId" label="Status" rules={[{ required: true, message: 'Selecione o status inicial do chamado' }]}>
              <Select placeholder="Selecione o status" size="large">
                {statuses.map(s => (
                  <Option key={s.id} value={s.id}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: s.color, display: 'inline-block', flexShrink: 0 }} />
                      {s.name}
                    </span>
                  </Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item name="priority" label="Prioridade" initialValue="MEDIUM" rules={[{ required: true, message: 'Selecione a prioridade' }]}>
              <Select size="large">
                {Object.entries(PRIORITY).map(([k, { label }]) => <Option key={k} value={k}>{label}</Option>)}
              </Select>
            </Form.Item>

            <Form.Item
              label={
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Badge count={fileList.length} size="small" color="#2563eb" offset={[4, -2]}>
                    <PaperClipOutlined style={{ fontSize: 15 }} />
                  </Badge>
                  <span>Anexos</span>
                  <span style={{ color: 'var(--cl-text-muted)', fontSize: 12, fontWeight: 400 }}>
                    opcional · máx. {MAX_FILE_SIZE_MB}MB por arquivo
                  </span>
                </div>
              }
            >
              <Upload
                multiple
                beforeUpload={beforeUpload}
                fileList={fileList}
                onChange={({ fileList: newList }) => setFileList(newList)}
                showUploadList={{ showRemoveIcon: true }}
              >
                <Button icon={<PaperClipOutlined />} style={{ borderRadius: 8 }}>
                  Adicionar arquivo
                </Button>
              </Upload>
            </Form.Item>
          </Form>
        </div>
      </Modal>
    </div>
  );
}
