import { Button } from 'antd';
import { InboxOutlined, ExclamationCircleOutlined } from '@ant-design/icons';

export default function EmptyState({ variant = 'empty', message, onRetry, height = 200 }) {
  const isError = variant === 'error';
  return (
    <div style={{
      height, display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', gap: 8,
    }}>
      {isError
        ? <ExclamationCircleOutlined style={{ fontSize: 22, color: 'var(--cl-danger)' }} />
        : <InboxOutlined style={{ fontSize: 22, color: 'var(--cl-text-dim)' }} />}
      <span style={{ fontSize: 13, color: isError ? 'var(--cl-danger)' : 'var(--cl-text-faint)' }}>
        {message || (isError ? 'Erro ao carregar dados' : 'Sem dados no período')}
      </span>
      {onRetry && (
        <Button size="small" onClick={onRetry}>Tentar novamente</Button>
      )}
    </div>
  );
}