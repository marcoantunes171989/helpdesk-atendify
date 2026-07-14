export default function ProgressMetric({ leading, label, trailing, pct = 0, goalPct, barColor, footer, onClick }) {
  const clickable = !!onClick;

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
      onClick={onClick}
      onKeyDown={handleKeyDown}
      style={{ cursor: clickable ? 'pointer' : 'default' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          {leading}
          <span style={{ fontSize: 12, color: 'var(--cl-text-soft)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {label}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>{trailing}</div>
      </div>
      <div style={{ position: 'relative', height: 8, borderRadius: 4, background: 'var(--cl-bg-soft)', overflow: 'visible' }}>
        <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', borderRadius: 4, background: barColor, transition: 'width 0.4s ease' }} />
        {goalPct !== undefined && goalPct !== null && (
          <div style={{ position: 'absolute', top: -3, left: `${goalPct}%`, width: 2, height: 14, background: 'var(--cl-text-muted)', borderRadius: 1, transform: 'translateX(-50%)' }} />
        )}
      </div>
      {footer && <div style={{ fontSize: 10, color: 'var(--cl-text-faint)', marginTop: 4 }}>{footer}</div>}
    </div>
  );
}