import { useEffect, useState } from 'react';
import { Modal, Form, Input, Radio, Switch, Upload, message } from 'antd';
import KbIcon from './KbIcon';
import { CATEGORIES, CONTENT_TYPE_OPTIONS, extractUrls, fileExt, splitTags } from './kbModel';

const { TextArea } = Input;

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_EXT = ['pdf', 'txt', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'png', 'jpg', 'jpeg', 'zip', 'rar'];

const MODE_TYPE = { article: 'ARTIGO', file: 'DOWNLOAD', link: 'LINK' };

const MODES = {
  article: { title: 'Novo Artigo', icon: 'fileText', contentLabel: 'Conteúdo', contentPlaceholder: 'Descreva o procedimento, a solução ou a configuração passo a passo...' },
  file: { title: 'Enviar Arquivo', icon: 'upload', contentLabel: 'Descrição', contentPlaceholder: 'Explique para que serve o arquivo e como utilizá-lo...' },
  link: { title: 'Cadastrar Link', icon: 'link', contentLabel: 'Descrição', contentPlaceholder: 'Para que serve este link e quando utilizá-lo.' },
};

const readFileAsBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = (e) => resolve(String(e.target.result).split(',')[1]);
  reader.onerror = reject;
  reader.readAsDataURL(file.originFileObj || file);
});

export default function KbArticleForm({ open, mode = 'article', editing, categories = CATEGORIES, onCancel, onSubmit }) {
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState([]);
  const [saving, setSaving] = useState(false);
  const contentType = Form.useWatch('contentType', form);
  const cfg = MODES[mode] || MODES.article;
  const categoryOptions = (categories.length ? categories : CATEGORIES)
    .filter(c => c.active !== false || (editing && (editing.categoryId === c.id || editing.categoryRef?.id === c.id)))
    .map(c => ({ value: c.id || c.key, label: c.label, key: c.key }));

  useEffect(() => {
    if (!open) return;
    const defaultCat = categoryOptions.find(c => c.key === 'configuracoes') || categoryOptions[0];
    if (editing) {
      const current = editing.categoryId
        || editing.categoryRef?.id
        || categoryOptions.find(c => c.key === editing.categoryRef?.key)?.value
        || categoryOptions.find(c => (CATEGORIES.find(x => x.key === c.key)?.sources || []).includes(editing.category))?.value
        || defaultCat?.value;
      form.setFieldsValue({
        title: editing.title,
        content: editing.content,
        categoryId: current,
        contentType: editing.contentType || MODE_TYPE[mode] || 'ARTIGO',
        externalUrl: editing.externalUrl || '',
        featured: editing.featured === true,
        tags: editing.tags || '',
        active: editing.active !== false,
      });
      setFileList((editing.attachments || []).map(a => ({
        uid: a.id, id: a.id, name: a.name, type: a.mimeType, size: a.size, status: 'done',
      })));
    } else {
      form.resetFields();
      form.setFieldsValue({
        categoryId: defaultCat?.value,
        contentType: MODE_TYPE[mode] || 'ARTIGO',
        externalUrl: '',
        featured: false,
        tags: '',
        active: true,
      });
      setFileList([]);
    }
  }, [open, editing, mode, form, categories]);

  const beforeUpload = (file) => {
    if (!ALLOWED_EXT.includes(fileExt(file.name))) {
      message.error(`${file.name}: formato não permitido`);
      return Upload.LIST_IGNORE;
    }
    if (file.size > MAX_FILE_BYTES) {
      message.error(`${file.name} excede o limite de 10 MB`);
      return Upload.LIST_IGNORE;
    }
    return false;
  };

  const handleFinish = async (values) => {
    if (mode === 'file' && !editing && fileList.length === 0) {
      message.warning('Selecione ao menos um arquivo');
      return;
    }
    setSaving(true);
    try {
      const attachments = await Promise.all(fileList.map(async f => {
        if (f.id) return { id: f.id };
        const data = await readFileAsBase64(f);
        return { name: f.name, mimeType: f.type || 'application/octet-stream', size: f.size, data };
      }));
      const tags = splitTags(values.tags).join(', ') || null;
      const selected = (categories.length ? categories : CATEGORIES)
        .find(c => (c.id || c.key) === values.categoryId);
      const payload = {
        title: values.title.trim(),
        content: values.content,
        tags,
        attachments,
        contentType: values.contentType,
        externalUrl: values.externalUrl?.trim() || null,
        featured: Boolean(values.featured),
        mode,
      };
      if (selected?.id) payload.categoryId = selected.id;
      else {
        const key = selected?.key || values.categoryId;
        payload.category = key === 'configuracoes' ? 'CONFIGURACAO' : 'DUVIDA';
      }
      if (editing) payload.active = values.active;
      await onSubmit(payload);
    } catch {
      // onSubmit já exibe a mensagem de erro; o modal continua aberto para correção.
    } finally {
      setSaving(false);
    }
  };

  const needsUrl = contentType === 'LINK' || contentType === 'VIDEO' || mode === 'link';

  return (
    <Modal
      open={open}
      onCancel={onCancel}
      centered
      width={680}
      className="kb-form-modal"
      title={(
        <span className="kb-form-title">
          <span className="kb-form-title-icon"><KbIcon name={editing ? 'edit' : cfg.icon} /></span>
          {editing ? 'Editar Conteúdo' : cfg.title}
        </span>
      )}
      okText={editing ? 'Salvar alterações' : 'Cadastrar'}
      cancelText="Cancelar"
      confirmLoading={saving}
      onOk={() => form.submit()}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" onFinish={handleFinish} requiredMark={false}>
        <Form.Item name="title" label="Título" rules={[{ required: true, whitespace: true, message: 'Informe o título' }]}>
          <Input placeholder="Ex.: Configuração da impressora fiscal" maxLength={200} />
        </Form.Item>

        <Form.Item name="categoryId" label="Categoria" rules={[{ required: true, message: 'Selecione a categoria' }]}>
          <Radio.Group
            optionType="button"
            buttonStyle="solid"
            options={categoryOptions.map(c => ({ value: c.value, label: c.label }))}
          />
        </Form.Item>

        <Form.Item name="contentType" label="Tipo de conteúdo" rules={[{ required: true, message: 'Selecione o tipo' }]}>
          <Radio.Group
            optionType="button"
            buttonStyle="solid"
            options={CONTENT_TYPE_OPTIONS.map(t => ({ value: t.value, label: t.label }))}
          />
        </Form.Item>

        {needsUrl && (
          <Form.Item
            name="externalUrl"
            label="URL externa"
            rules={[
              { required: contentType === 'LINK' || mode === 'link', message: 'Informe a URL https://' },
              {
                validator: (_, v) => {
                  if (!v?.trim()) return Promise.resolve();
                  try {
                    const u = new URL(v.trim());
                    if (u.protocol !== 'https:') return Promise.reject(new Error('Use apenas https://'));
                    return Promise.resolve();
                  } catch {
                    return Promise.reject(new Error('URL inválida'));
                  }
                },
              },
            ]}
            extra="Somente endereços https:// (sem javascript: ou data:)."
          >
            <Input placeholder="https://exemplo.com.br/recurso" maxLength={500} />
          </Form.Item>
        )}

        <Form.Item name="tags" label="Palavras-chave"
          extra="Separe por vírgula. Opcional — o tipo agora é escolhido no campo acima.">
          <Input placeholder="Ex.: impressora, nfc-e, pdv" />
        </Form.Item>

        <Form.Item name="featured" label="Primeiros Passos" valuePropName="checked"
          extra="Marque para destacar em Destaques / Comece por aqui.">
          <Switch checkedChildren="Sim" unCheckedChildren="Não" />
        </Form.Item>

        <Form.Item
          name="content"
          label={cfg.contentLabel}
          rules={[
            { required: true, whitespace: true, message: 'Preencha este campo' },
            ...(mode === 'link' && !needsUrl ? [{
              validator: (_, v) => (extractUrls(v).length ? Promise.resolve() : Promise.reject(new Error('Inclua um endereço começando com https://'))),
            }] : []),
          ]}
        >
          <TextArea rows={mode === 'link' ? 4 : 8} placeholder={cfg.contentPlaceholder} />
        </Form.Item>

        {editing && (
          <Form.Item name="active" label="Visível para os usuários" valuePropName="checked">
            <Switch checkedChildren="Ativo" unCheckedChildren="Inativo" />
          </Form.Item>
        )}

        {mode !== 'link' && contentType !== 'LINK' && (
          <Form.Item label={`Anexos${mode === 'file' ? '' : ' (opcional)'}`}
            extra="Até 10 MB por arquivo · PDF, Word, Excel, CSV, TXT, imagens PNG/JPG, ZIP e RAR.">
            <Upload.Dragger
              multiple
              fileList={fileList}
              beforeUpload={beforeUpload}
              onChange={({ fileList: nl }) => setFileList(nl.map(f => ({ ...f, status: 'done' })))}
              accept={ALLOWED_EXT.map(e => `.${e}`).join(',')}
            >
              <p className="kb-drop-icon"><KbIcon name="upload" /></p>
              <p className="kb-drop-text">Arraste arquivos ou clique para selecionar</p>
            </Upload.Dragger>
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
}
