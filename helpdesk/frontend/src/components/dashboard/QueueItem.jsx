import dayjs from 'dayjs';

const PRIORITY_COLORS = {
  CRITICAL: { bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.25)',  text: '#dc2626', dot: '#ef4444' },
  HIGH:     { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)', text: '#b45309', dot: '#f59e0b' },
  MEDIUM:   { bg: 'rgba(37,99,235,0.08)',  border: 'rgba(37,99,235,0.20)',  text: '#1d4ed8', dot: '#2563eb' },
  LOW:      { bg: 'var(--cl-bg-soft)',     border: 'var(--cl-border)',      text: 'var(--cl-text-soft)', dot: 'var(--cl-text-dim)' },
};

export default function QueueItem({ item, onClick }) {
  const pc = PRIORITY_COLORS[item.priority];
  const hasCritical = item.priority === 'CRITICAL' && item.count > 0;
  const clickable = !!onClick && item.count > 0;

  const handleKeyDown = (e) => {
    if (!clickable) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick(e);
    }
  };

  return (
    <div
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={clickable ? onClick : undefined}
      onKeyDown={handleKeyDown}
      style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10,
        background: item.count > 0 ? pc.bg : 'transparent',
        border: `1px solid ${item.count > 0 ? pc.border : 'var(--cl-border)'}`,
        cursor: clickable ? 'pointer' : 'default',
      }}
    >
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: item.count > 0 ? pc.dot : 'var(--cl-text-dim)' }} />
        {hasCritical && (
          <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: pc.dot, animation: 'pulse-ring 1.5s ease-out infinite', opacity: 0.4 }} />
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: item.count > 0 ? pc.text : 'var(--cl-text-soft)' }}>{item.label}</div>
        {item.count > 0 && (
          <div style={{ fontSize: 11, color: 'var(--cl-text-faint)', marginTop: 1 }}>
            Espera média: {item.avg_wait_min}m
            {item.oldest_ticket_at && ` · mais antigo: ${dayjs(item.oldest_ticket_at).format('DD/MM HH:mm')}`}
            {item.expired_sla > 0 && <span style={{ color: 'var(--cl-danger)', marginLeft: 8 }}>· {item.expired_sla} SLA vencido{item.expired_sla !== 1 ? 's' : ''}</span>}
          </div>
        )}
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: item.count > 0 ? pc.text : 'var(--cl-text-dim)', lineHeight: 1 }}>
        {item.count}
      </div>
    </div>
  );
}