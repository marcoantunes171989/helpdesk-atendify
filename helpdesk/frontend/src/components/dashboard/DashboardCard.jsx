export default function DashboardCard({ children, title, extra, onClick, padding = '20px 22px', style }) {
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
      style={{
        background: 'var(--cl-bg)',
        border: '1px solid var(--cl-border)',
        borderRadius: 12,
        boxShadow: 'var(--cl-shadow)',
        padding,
        cursor: clickable ? 'pointer' : 'default',
        transition: 'border-color 0.15s',
        ...style,
      }}
    >
      {(title || extra) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 8 }}>
          {title && (
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--cl-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {title}
            </div>
          )}
          {extra}
        </div>
      )}
      {children}
    </div>
  );
}