import type { StockStatus } from '../types';
import { useI18n } from '../i18n';

const STYLES: Record<StockStatus, { cls: string; dot: string }> = {
  in:  { cls: 'bg-brand-50 text-brand-700 ring-brand-600/20', dot: 'bg-brand-500' },
  low: { cls: 'bg-amber-50 text-amber-700 ring-amber-600/20', dot: 'bg-amber-500' },
  out: { cls: 'bg-red-50 text-red-700 ring-red-600/20',       dot: 'bg-red-500'   },
};

const KEY: Record<StockStatus, 'status.in' | 'status.low' | 'status.out'> = {
  in:  'status.in',
  low: 'status.low',
  out: 'status.out',
};

export function StockBadge({ status }: { status: StockStatus }) {
  const { t } = useI18n();
  const s = STYLES[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ring-1 ring-inset ${s.cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {t(KEY[status])}
    </span>
  );
}
