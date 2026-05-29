import { useEffect, useState } from 'react';
import { Upload, Button, Tooltip, message, Spin } from 'antd';
import {
  PaperClipOutlined, DownloadOutlined, DeleteOutlined,
  FilePdfOutlined, FileImageOutlined, FileWordOutlined, FileExcelOutlined,
  FileZipOutlined, FileOutlined, InboxOutlined,
} from '@ant-design/icons';
import { companyAttachmentService } from '../services/api';

const MAX_BYTES = 10 * 1024 * 1024;

const formatSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
};

const iconFor = (mime = '', name = '') => {
  const ext = name.split('.').pop()?.toLowerCase();
  if (mime.startsWith('image/')) return <FileImageOutlined style={{ color: '#a78bfa' }} />;
  if (mime === 'application/pdf' || ext === 'pdf') return <FilePdfOutlined style={{ color: '#f87171' }} />;
  if (['doc', 'docx'].includes(ext)) return <FileWordOutlined style={{ color: '#60a5fa' }} />;
  if (['xls', 'xlsx', 'csv'].includes(ext)) return <FileExcelOutlined style={{ color: '#4ade80' }} />;
  if (['zip', 'rar', '7z'].includes(ext)) return <FileZipOutlined style={{ color: '#fbbf24' }} />;
  return <FileOutlined style={{ color: 'var(--cl-text-soft)' }} />;
};

export default function CompanyAttachments({ companyId, stagedFiles, onStagedChange }) {
  const isStaged = !companyId;
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadingName, setUploadingName] = useState(null);

  useEffect(() => {
    if (!companyId) { setItems([]); return; }
    setLoading(true);
    companyAttachmentService.list(companyId)
      .then(setItems)
      .catch((err) => {
        const status = err.response?.status;
        if (status === 404) {
          setItems([]);
        } else {
          const detail = err.response?.data?.error || err.message || 'erro desconhecido';
          message.error(`Erro ao carregar anexos: ${detail}`);
        }
      })
      .finally(() => setLoading(false));
  }, [companyId]);

  const beforeUpload = async (file) => {
    if (file.size > MAX_BYTES) {
      message.error(`${file.name} excede o limite de 10MB`);
      return Upload.LIST_IGNORE;
    }
    if (isStaged) {
      onStagedChange?.([...(stagedFiles || []), file]);
      return false;
    }
    setUploadingName(file.name);
    try {
      const created = await companyAttachmentService.upload(companyId, file);
      setItems(prev => [created, ...prev]);
      message.success(`${file.name} anexado`);
    } catch (err) {
      message.error(err.response?.data?.error || `Erro ao anexar ${file.name}`);
    } finally {
      setUploadingName(null);
    }
    return false;
  };

  const handleRemove = async (att, idx) => {
    if (isStaged) {
      onStagedChange?.((stagedFiles || []).filter((_, i) => i !== idx));
      return;
    }
    try {
      await companyAttachmentService.remove(companyId, att.id);
      setItems(prev => prev.filter(i => i.id !== att.id));
      message.success('Anexo excluído');
    } catch (err) {
      message.error(err.response?.data?.error || 'Erro ao excluir');
    }
  };

  const handleDownload = async (att) => {
    if (isStaged) {
      const url = URL.createObjectURL(att);
      const a = document.createElement('a');
      a.href = url;
      a.download = att.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return;
    }
    try {
      await companyAttachmentService.download(companyId, att.id, att.name);
    } catch {
      message.error('Erro ao baixar anexo');
    }
  };

  const list = isStaged ? (stagedFiles || []) : items;

  return (
    <div>
      <Upload.Dragger
        multiple
        showUploadList={false}
        beforeUpload={beforeUpload}
        disabled={!!uploadingName}
        style={{ background: 'var(--cl-bg-soft)', borderColor: 'var(--cl-border)' }}
      >
        <p style={{ margin: '8px 0 4px' }}>
          <InboxOutlined style={{ fontSize: 28, color: '#60a5fa' }} />
        </p>
        <p style={{ fontSize: 13, color: 'var(--cl-text-hi)', fontWeight: 600, margin: 0 }}>
          {uploadingName ? `Enviando ${uploadingName}...` : 'Clique ou arraste arquivos aqui'}
        </p>
        <p style={{ fontSize: 11, color: 'var(--cl-text-muted)', margin: '4px 0 8px' }}>
          Qualquer formato. Até 10MB por arquivo.
        </p>
      </Upload.Dragger>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 16 }}><Spin size="small" /></div>
      ) : list.length > 0 && (
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {list.map((att, idx) => (
            <div key={att.id || `staged-${idx}`} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 12px', borderRadius: 8,
              background: 'var(--cl-bg-soft)', border: '1px solid var(--cl-border)',
            }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>{iconFor(att.mimeType || att.type, att.name)}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--cl-text-hi)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {att.name}
                </div>
                <div style={{ fontSize: 11, color: 'var(--cl-text-muted)' }}>
                  {formatSize(att.size || 0)}{isStaged && ' · pendente'}
                </div>
              </div>
              <Tooltip title="Baixar">
                <Button type="text" size="small" icon={<DownloadOutlined />} onClick={() => handleDownload(att)} style={{ color: '#60a5fa' }} />
              </Tooltip>
              <Tooltip title="Excluir">
                <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => handleRemove(att, idx)} />
              </Tooltip>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export const PaperClipIcon = PaperClipOutlined;
