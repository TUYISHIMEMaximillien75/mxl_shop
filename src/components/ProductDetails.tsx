import { Pencil } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Product } from '../types';
import { formatDate, formatNumber, formatRWF } from '../lib/format';
import { getStockStatus, profitPerUnit } from '../lib/stock';
import { StockBadge } from './StockBadge';
import { useI18n } from '../i18n';

interface ProductDetailsProps {
  product: Product;
  onEdit: () => void;
}

export function ProductDetails({ product: p, onEdit }: ProductDetailsProps) {
  const { t } = useI18n();
  const profit = profitPerUnit(p);
  const sold = Math.max(0, p.initialQuantity - p.currentQuantity);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xl font-bold text-slate-900">{p.name}</p>
          <p className="text-sm text-slate-500">
            {p.category} · {t('details.added', { date: formatDate(p.dateAdded) })}
            {p.isSample && ` · ${t('details.sampleProduct')}`}
          </p>
        </div>
        <StockBadge status={getStockStatus(p)} />
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Item label={t('details.buyingPrice')}>{formatRWF(p.buyingPrice)}</Item>
        <Item label={t('details.sellingPrice')}>{formatRWF(p.sellingPrice)}</Item>
        <Item label={t('col.profitUnit')}>
          <span className={profit < 0 ? 'text-red-600' : 'text-brand-700'}>{formatRWF(profit)}</span>
        </Item>
        <Item label={t('details.initialQuantity')}>{formatNumber(p.initialQuantity)}</Item>
        <Item label={t('details.currentQuantity')}>{formatNumber(p.currentQuantity)}</Item>
        <Item label={t('details.itemsGone')}>{formatNumber(sold)}</Item>
      </dl>

      <dl className="mt-3 grid gap-3 sm:grid-cols-3">
        <Item label={t('details.investment')} muted>{formatRWF(p.buyingPrice * p.initialQuantity)}</Item>
        <Item label={t('details.stockValue')} muted>{formatRWF(p.buyingPrice * p.currentQuantity)}</Item>
        <Item label={t('details.expectedProfit')} muted>
          <span className={profit < 0 ? 'text-red-600' : 'text-brand-700'}>{formatRWF(profit * p.currentQuantity)}</span>
        </Item>
      </dl>

      <div className="mt-6 flex justify-end">
        <button className="btn-primary" onClick={onEdit} id="details-edit">
          <Pencil className="h-4 w-4" /> {t('details.edit')}
        </button>
      </div>
    </div>
  );
}

function Item({ label, children, muted }: { label: string; children: ReactNode; muted?: boolean }) {
  return (
    <div className={`rounded-xl p-3 ${muted ? 'bg-brand-50/60' : 'bg-slate-50'}`}>
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className="mt-0.5 font-semibold text-slate-900">{children}</dd>
    </div>
  );
}
