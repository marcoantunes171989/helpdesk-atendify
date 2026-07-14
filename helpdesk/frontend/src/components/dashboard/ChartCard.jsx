import { Skeleton } from 'antd';
import DashboardCard from './DashboardCard';
import EmptyState from './EmptyState';

export default function ChartCard({ title, extra, loading, error, isEmpty, onRetry, height = 260, children, style, padding }) {
  return (
    <DashboardCard title={title} extra={extra} style={style} padding={padding}>
      {loading ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : error ? (
        <EmptyState variant="error" height={height} onRetry={onRetry} />
      ) : isEmpty ? (
        <EmptyState height={height} />
      ) : children}
    </DashboardCard>
  );
}