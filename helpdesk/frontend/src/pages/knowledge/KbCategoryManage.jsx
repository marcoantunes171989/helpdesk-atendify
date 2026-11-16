import { useEffect, useState } from 'react';
import { Form, Input, InputNumber, Modal, Select, Switch, message } from 'antd';
import KbIcon from './KbIcon';
import { CATEGORY_ICON_OPTIONS, CATEGORY_TONE_OPTIONS } from './kbModel';

export default function KbCategoryManage({
  categories = [],
  canCreate,
  canUpdate,
  onCreate,
  onUpdate,
  onRemove,
  onSelect,
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    if (!open) return;
    if (editing) {
      form.setFieldsValue({
        label: editing.label,
        icon: editing.icon,
        tone: editing.tone,
        sortOrder: editing.sortOrder,
        active: editing.active !== false,
      });
    } else {
      form.resetFields();
      form.setFieldsValue({ icon: 'layers', tone: 'sky', sortOrder: 100, active: true });
    }
  }, [open, editing, form]);

  const openCreate = () => {
    if (!canCreate) return;
    setEditing(null);
    setOpen(true);
  };

  const openEdit = (cat) => {
    if (!canUpdate) return;
    setEditing(cat);
    setOpen(true);
  };

  const submit = async (values) => {
    setSaving(true);
    try {
      if (editing) await onUpdate(editing.id, values);
      else await onCreate(values);
      message.success(editing ? 'Categoria atualizada' : 'Categoria criada');
      setOpen(false);
    } catch (err) {
      message.error(err.response?.data?.error || 'Não foi possível salvar a categoria');
    } finally {
      setSaving(false);
    }
  };

  const confirmRemove = (cat) => {
    Modal.confirm({
      title: `Remover "${cat.label}"?`,
      content: cat.articleCount > 0
        ? 'Há conteúdos vinculados. A categoria será apenas desativada.'
        : 'A categoria será excluída definitivamente.',
      okText: cat.articleCount > 0 ? 'Desativar' : 'Excluir',
      okButtonProps: { danger: true },
      cancelText: 'Cancelar',
      onOk: async () => {
        try {
          await onRemove(cat.id);
          message.success(cat.articleCount > 0 ? 'Categoria desativada' : 'Categoria excluída');
        } catch (err) {
          message.error(err.response?.data?.error || 'Não foi possível remover');
        }
      },
    });
  };

  return (
    <section className="kb-cat-manage" aria-label="Gerenciar categorias">
      <div className="kb-cat-manage-head">
        <p>Edite nome, ícone e cor das categorias usadas nos cartões da Central.</p>
        {canCreate && (
          <button type="button" className="kb-btn-primary" onClick={openCreate}>
            <KbIcon name="plus" /> Nova categoria
          </button>
        )}
      </div>

      <ul className="kb-cat-manage-list">
        {categories.map(cat => (
          <li key={cat.id || cat.key} className={`kb-cat-manage-item${!cat.active ? ' is-inactive' : ''}`}>
            <span className={`kb-cat-icon tone-${cat.tone}`}><KbIcon name={cat.icon} /></span>
            <span className="kb-cat-manage-info">
              <strong>{cat.label}</strong>
              <span>
                {cat.key}
                {typeof cat.articleCount === 'number' ? ` · ${cat.articleCount} conteúdo${cat.articleCount === 1 ? '' : 's'}` : ''}
                {!cat.active ? ' · inativa' : ''}
              </span>
            </span>
            <span className="kb-cat-manage-actions">
              <button type="button" className="kb-btn-ghost" onClick={() => onSelect?.(cat.key)}>
                Ver conteúdos
              </button>
              {canUpdate && (
                <button type="button" className="kb-btn-ghost" onClick={() => openEdit(cat)}>
                  <KbIcon name="edit" /> Editar
                </button>
              )}
              {canUpdate && (
                <button type="button" className="kb-btn-ghost kb-btn-danger" onClick={() => confirmRemove(cat)}>
                  <KbIcon name="trash" /> {cat.articleCount > 0 ? 'Desativar' : 'Excluir'}
                </button>
              )}
            </span>
          </li>
        ))}
      </ul>

      <Modal
        open={open}
        title={editing ? 'Editar categoria' : 'Nova categoria'}
        onCancel={() => setOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={saving}
        okText={editing ? 'Salvar' : 'Criar'}
        cancelText="Cancelar"
        destroyOnHidden
        centered
        className="kb-form-modal"
      >
        <Form form={form} layout="vertical" onFinish={submit} requiredMark={false}>
          <Form.Item name="label" label="Nome" rules={[{ required: true, whitespace: true, message: 'Informe o nome' }]}>
            <Input maxLength={60} placeholder="Ex.: Integrações" />
          </Form.Item>
          <Form.Item name="icon" label="Ícone" rules={[{ required: true }]}>
            <Select
              options={CATEGORY_ICON_OPTIONS.map(v => ({
                value: v,
                label: <span className="kb-cat-option"><KbIcon name={v} /> {v}</span>,
              }))}
            />
          </Form.Item>
          <Form.Item name="tone" label="Cor" rules={[{ required: true }]}>
            <Select
              options={CATEGORY_TONE_OPTIONS.map(v => ({
                value: v,
                label: <span className={`kb-tone-swatch tone-${v}`}>{v}</span>,
              }))}
            />
          </Form.Item>
          <Form.Item name="sortOrder" label="Ordem">
            <InputNumber className="kb-full" min={0} max={9999} />
          </Form.Item>
          {editing && (
            <Form.Item name="active" label="Ativa" valuePropName="checked">
              <Switch checkedChildren="Sim" uncheckedChildren="Não" />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </section>
  );
}
