import { Select, DatePicker } from 'antd';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

export const PERIOD_OPTIONS = [
  { label: 'Hoje',          value: 'today'  },
  { label: '7 dias',        value: '7d'     },
  { label: '14 dias',       value: '14d'    },
  { label: '30 dias',       value: '30d'    },
  { label: 'Personalizado', value: 'custom' },
];

// value: { period, from?, to? } — from/to em YYYY-MM-DD, só quando period === 'custom'
export default function PeriodFilter({ value, onChange }) {
  const period = value?.period || '14d';
  const range = value?.from && value?.to ? [dayjs(value.from), dayjs(value.to)] : null;

  const handlePeriodChange = (p) => {
    if (p === 'custom') {
      const from = range?.[0] || dayjs().subtract(13, 'day');
      const to = range?.[1] || dayjs();
      onChange({ period: 'custom', from: from.format('YYYY-MM-DD'), to: to.format('YYYY-MM-DD') });
    } else {
      onChange({ period: p });
    }
  };

  const handleRangeChange = (dates) => {
    if (!dates?.[0] || !dates?.[1]) return;
    onChange({ period: 'custom', from: dates[0].format('YYYY-MM-DD'), to: dates[1].format('YYYY-MM-DD') });
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <Select value={period} onChange={handlePeriodChange} options={PERIOD_OPTIONS} style={{ width: 150 }} />
      {period === 'custom' && (
        <RangePicker value={range} onChange={handleRangeChange} format="DD/MM/YYYY" allowClear={false} />
      )}
    </div>
  );
}

export function periodLabel(value) {
  const period = value?.period || '14d';
  if (period === 'custom' && value?.from && value?.to) {
    return `${dayjs(value.from).format('DD/MM/YYYY')} – ${dayjs(value.to).format('DD/MM/YYYY')}`;
  }
  return PERIOD_OPTIONS.find(o => o.value === period)?.label || period;
}