import { useEffect, useState } from 'react';
import {
  Table, Button, Drawer, Modal, Form, Input, Select, Tag, Space,
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
import { TICKET_STATUS, PRIORITY } from '../utils/constants';

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

  useEffect(() => {
    load();
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
      load(filters);
    } catch (err) {
      message.error(err.response?.data?.error || 'Erro ao excluir chamado');
    } finally {
      setDeleteLoading(false);
    }
  };

  const applyFilters = (changed) => {
    const newFilters = { ...filters, ...changed };
    Object.keys(newFilters).forEach(k => { if (!newFilters[k]) delete newFilters[k]; });
    setFilters(newFilters);
    load(newFilters);
  };

  const isSlaExpired = (t) =>
    t.slaDeadline && !['RESOLVED', 'CLOSED', 'CANCELLED'].includes(t.status)
    && dayjs(t.slaDeadline).isBefore(dayjs());

  const filteredTickets = search
    ? (() => {
        const q = search.toLowerCase();
        return tickets.filter(r => [
          r.id, r.title, r.description,
          r.company?.name, r.employee?.name, r.employee?.position,
          r.technician?.name, r.category?.name,
          r.ticketStatus?.name, TICKET_STATUS[r.status]?.label,
          PRIORITY[r.priority]?.label,
        ].some(f => (f || '').toLowerCase().includes(q)));
      })()
    : tickets;

  const statusCounts = Object.keys(TICKET_STATUS).reduce((acc, k) => {
    acc[k] = tickets.filter(t => t.status === k).length;
    return acc;
  }, {});

  const columns = [
    {
      title: 'ID', dataIndex: 'id', key: 'id', width: 80,
      render: v => (
        <code style={{ fontSize: 11, color: '#9ca3af', background: '#f3f4f6', padding: '2px 6px', borderRadius: 4 }}>
          {v.slice(-6).toUpperCase()}
        </code>
      ),
    },
    {
      title: 'Título', dataIndex: 'title', key: 'title', minWidth: 180,
      render: (v, r) => (
        <Space size={6}>
          {isSlaExpired(r) && (
            <Tooltip title="SLA Vencido">
              <ExclamationCircleOutlined style={{ color: '#dc2626', fontSize: 13 }} />
            </Tooltip>
          )}
          <div>
            <div style={{ fontWeight: 500, color: '#111827', fontSize: 13 }}>{v}</div>
            {r._count?.comments > 0 && (
              <span style={{ fontSize: 11, color: '#9ca3af' }}>
                {r._count.comments} msg{r._count.comments !== 1 ? 's' : ''}
                {r._count?.attachments > 0 ? ` · ${r._count.attachments} anexo${r._count.attachments !== 1 ? 's' : ''}` : ''}
              </span>
            )}
          </div>
        </Space>
      ),
    },
    {
      title: 'Empresa', key: 'company',
      render: (_, r) => <span style={{ color: '#374151', fontSize: 13, fontWeight: 500 }}>{r.company?.name || '—'}</span>,
    },
    {
      title: 'Funcionário', key: 'employee',
      render: (_, r) => r.employee ? (
        <div>
          <div style={{ fontSize: 13, color: '#374151' }}>{r.employee.name}</div>
          {r.employee.position && <div style={{ fontSize: 11, color: '#9ca3af' }}>{r.employee.position}</div>}
        </div>
      ) : <span style={{ color: '#d1d5db' }}>—</span>,
    },
    {
      title: 'Técnico', key: 'technician',
      render: (_, r) => <span style={{ color: '#374151', fontSize: 13 }}>{r.technician?.name || '—'}</span>,
    },
    {
      title: 'Categoria', key: 'category',
      render: (_, r) => <span style={{ color: '#6b7280', fontSize: 13 }}>{r.category?.name || '—'}</span>,
    },
    {
      title: 'Status', key: 'status',
      render: (_, r) => {
        if (r.ticketStatus) {
          return (
            <Tag style={{ borderRadius: 6, fontWeight: 600, fontSize: 11, background: r.ticketStatus.color + '22', color: r.ticketStatus.color, borderColor: r.ticketStatus.color + '55' }}>
              <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: r.ticketStatus.color, marginRight: 5, verticalAlign: 'middle' }} />
              {r.ticketStatus.name}
            </Tag>
          );
        }
        return (
          <Tag color={TICKET_STATUS[r.status]?.color} style={{ borderRadius: 6, fontWeight: 600, fontSize: 11 }}>
            {TICKET_STATUS[r.status]?.label}
          </Tag>
        );
      },
    },
    {
      title: 'Prioridade', dataIndex: 'priority', key: 'priority',
      render: v => (
        <Tag color={PRIORITY[v]?.color} style={{ borderRadius: 6, fontSize: 11 }}>
          {PRIORITY[v]?.label}
        </Tag>
      ),
    },
    {
      title: 'Criado em', dataIndex: 'createdAt', key: 'createdAt', width: 130,
      render: v => <span style={{ color: '#9ca3af', fontSize: 12 }}>{dayjs(v).format('DD/MM/YYYY HH:mm')}</span>,
    },
    {
      title: '', key: 'actions', width: 60,
      render: (_, r) => (
        <Space size={4}>
          <Tooltip title="Ver detalhes">
            <Button type="text" icon={<EyeOutlined />} size="small" style={{ color: '#16a34a' }}
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
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Chamados</h1>
          <p style={{ color: '#6b7280', fontSize: 14, margin: '4px 0 0' }}>
            {filteredTickets.length} chamado{filteredTickets.length !== 1 ? 's' : ''}{search ? ` (de ${tickets.length})` : ''} · {' '}
            {Object.entries(TICKET_STATUS).map(([k, { label, color }]) =>
              statusCounts[k] > 0 ? (
                <Tag key={k} color={color} style={{ fontSize: 11, marginRight: 4 }}>
                  {label}: {statusCounts[k]}
                </Tag>
              ) : null
            )}
          </p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openDrawer}
          style={{ borderRadius: 8, fontWeight: 600 }}>
          Abrir Chamado
        </Button>
      </div>

      {/* Filtros */}
      <div style={{
        display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16,
        padding: '14px 16px', background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb',
      }}>
        <Select allowClear placeholder="Todos os status" style={{ minWidth: 150, flex: 1 }} onChange={v => applyFilters({ statusId: v })}>
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
        <Input.Search
          placeholder="Buscar em todos os campos..."
          style={{ flex: 2, minWidth: 200 }}
          allowClear
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <Table
          dataSource={filteredTickets} columns={columns} rowKey="id" loading={loading}
          scroll={{ x: 1300 }} size="middle"
          pagination={{ pageSize: 15, showSizeChanger: false, showTotal: t => `${t} chamados` }}
        />
      </div>

      {/* Modal — Confirmar exclusão */}
      <Modal
        open={!!deleteModal}
        onCancel={() => setDeleteModal(null)}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ExclamationCircleOutlined style={{ color: '#dc2626', fontSize: 20 }} />
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
            <p style={{ color: '#374151', marginBottom: 16 }}>
              Você está prestes a excluir o chamado <strong>"{deleteModal.title}"</strong> permanentemente. Esta ação não pode ser desfeita.
            </p>
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#dc2626', fontWeight: 500 }}>
              Todos os comentários vinculados também serão removidos.
            </div>
          </div>
        )}
      </Modal>

      {/* Drawer — Abrir Chamado */}
      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CustomerServiceOutlined style={{ color: '#d97706', fontSize: 16 }} />
            </div>
            <span style={{ fontWeight: 700, fontSize: 16 }}>Abrir Chamado</span>
          </div>
        }
        open={drawerOpen}
        onClose={closeDrawer}
        width="100%"
        styles={{ body: { padding: '24px', overflowY: 'auto' } }}
        extra={
          <Space>
            <Button onClick={closeDrawer}>Cancelar</Button>
            <Button type="primary" loading={saving} onClick={() => form.submit()}
              style={{ background: '#16a34a', borderColor: '#16a34a', fontWeight: 600 }}>
              Abrir Chamado
            </Button>
          </Space>
        }
      >
        <div className="drawer-form-body" style={{ maxWidth: 640 }}>
          <Form form={form} layout="vertical" onFinish={handleCreate}>
            <Form.Item name="title" label="Título" rules={[{ required: true, message: 'Informe o título' }]}>
              <Input placeholder="Descreva o problema brevemente" size="large" />
            </Form.Item>
            <Form.Item name="description" label="Descrição" rules={[{ required: true, message: 'Descreva o problema' }]}>
              <TextArea rows={5} placeholder="Detalhe o problema com o máximo de informações possível..." />
            </Form.Item>
            <Form.Item name="companyId" label="Empresa" rules={[{ required: true, message: 'Selecione a empresa' }]}>
              <Select
                placeholder="Selecione a empresa" showSearch optionFilterProp="children" size="large"
                onChange={handleCompanyChange}
              >
                {companies.map(c => <Option key={c.id} value={c.id}>{c.name}</Option>)}
              </Select>
            </Form.Item>
            <Form.Item name="employeeId" label="Funcionário" rules={[{ required: true, message: 'Selecione o funcionário responsável pelo chamado' }]}>
              <Select
                placeholder={companyEmployees.length === 0 && !loadingEmployees ? 'Selecione uma empresa primeiro' : 'Selecione o funcionário'}
                showSearch
                optionFilterProp="children"
                size="large"
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
              <Select
                placeholder="Selecione o técnico"
                showSearch
                optionFilterProp="children"
                size="large"
                notFoundContent="Nenhum técnico ativo cadastrado"
              >
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

            {/* Anexos */}
            <Form.Item
              label={
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Badge count={fileList.length} size="small" color="#16a34a" offset={[4, -2]}>
                    <PaperClipOutlined style={{ fontSize: 15, color: '#374151' }} />
                  </Badge>
                  <span>Anexos</span>
                  <span style={{ color: '#9ca3af', fontSize: 12, fontWeight: 400 }}>
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
      </Drawer>
    </div>
  );
}
