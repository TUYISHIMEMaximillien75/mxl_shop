import { Eye, Pencil, Trash2 } from 'lucide-react';
import type { Product } from '../types';
import { formatNumber, formatRWF } from '../lib/format';
import { getStockStatus, profitPerUnit } from '../lib/stock';
import { StockBadge } from './StockBadge';
import { useI18n } from '../i18n';

interface ProductTableProps {
  products: Product[];
  onView: (p: Product) => void;
  onEdit: (p: Product) => void;
  onDelete: (p: Product) => void;
}

function SampleTag() {
  const { t } = useI18n();
  return (
    <span className="ml-2 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-slate-500 uppercase">
      {t('common.sample')}
    </span>
  );
}

function Actions({ p, onView, onEdit, onDelete }: { p: Product } & Omit<ProductTableProps, 'products'>) {
  const { t } = useI18n();
  return (
    <div className="flex items-center justify-end gap-1">
      <button className="icon-btn" onClick={() => onView(p)} title={t('common.view')} aria-label={`${t('common.view')} ${p.name}`}>
        <Eye className="h-4 w-4" />
      </button>
      <button className="icon-btn hover:bg-brand-50! hover:text-brand-700!" onClick={() => onEdit(p)} title={t('common.edit')} aria-label={`${t('common.edit')} ${p.name}`}>
        <Pencil className="h-4 w-4" />
      </button>
      <button className="icon-btn hover:bg-red-50! hover:text-red-600!" onClick={() => onDelete(p)} title={t('common.delete')} aria-label={`${t('common.delete')} ${p.name}`}>
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

export function ProductTable({ products, onView, onEdit, onDelete }: ProductTableProps) {
  const { t } = useI18n();

  return (
    <>
      {/* Desktop / tablet table */}
      <div className="card hidden overflow-hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold tracking-wide text-slate-500 uppercase">
              <tr>
                <th className="px-5 py-3.5">{t('col.product')}</th>
                <th className="px-4 py-3.5">{t('col.category')}</th>
                <th className="px-4 py-3.5 text-right">{t('col.buying')}</th>
                <th className="px-4 py-3.5 text-right">{t('col.selling')}</th>
                <th className="px-4 py-3.5 text-right">{t('col.quantity')}</th>
                <th className="px-4 py-3.5 text-right" title={t('col.totalCostHint')}>
                  {t('col.totalCost')}
                </th>
                <th className="px-4 py-3.5 text-right">{t('col.profitUnit')}</th>
                <th className="px-4 py-3.5">{t('col.status')}</th>
                <th className="px-5 py-3.5 text-right">{t('col.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.map((p) => {
                const profit = profitPerUnit(p);
                const totalCost = p.buyingPrice * p.currentQuantity;
                return (
                  <tr key={p.id} className="transition-colors hover:bg-slate-50/70">
                    <td className="px-5 py-3.5 font-medium text-slate-900">
                      <button className="text-left hover:text-brand-700 hover:underline" onClick={() => onView(p)}>
                        {p.name}
                      </button>
                      {p.isSample && <SampleTag />}
                    </td>
                    <td className="px-4 py-3.5 text-slate-600">{p.category}</td>
                    <td className="px-4 py-3.5 text-right whitespace-nowrap text-slate-600">{formatRWF(p.buyingPrice)}</td>
                    <td className="px-4 py-3.5 text-right whitespace-nowrap text-slate-900">{formatRWF(p.sellingPrice)}</td>
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <span className="font-semibold text-slate-900">{formatNumber(p.currentQuantity)}</span>
                      <span className="text-slate-400"> / {formatNumber(p.initialQuantity)}</span>
                    </td>
                    <td className="px-4 py-3.5 text-right whitespace-nowrap font-semibold text-slate-700">
                      {formatRWF(totalCost)}
                    </td>
                    <td className={`px-4 py-3.5 text-right font-semibold whitespace-nowrap ${profit < 0 ? 'text-red-600' : 'text-brand-700'}`}>
                      {formatRWF(profit)}
                    </td>
                    <td className="px-4 py-3.5">
                      <StockBadge status={getStockStatus(p)} />
                    </td>
                    <td className="px-5 py-2">
                      <Actions p={p} onView={onView} onEdit={onEdit} onDelete={onDelete} />
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* Totals footer row */}
            {products.length > 1 && (() => {
              const grandTotalCost = products.reduce((s, p) => s + p.buyingPrice * p.currentQuantity, 0);
              const grandTotalProfit = products.reduce((s, p) => s + profitPerUnit(p) * p.currentQuantity, 0);
              return (
                <tfoot className="border-t-2 border-slate-200 bg-slate-50/80 text-sm font-semibold text-slate-700">
                  <tr>
                    <td className="px-5 py-3" colSpan={5}>
                      <span className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                        {t('col.quantity')}: {formatNumber(products.reduce((s, p) => s + p.currentQuantity, 0))}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap text-slate-800">{formatRWF(grandTotalCost)}</td>
                    <td className={`px-4 py-3 text-right whitespace-nowrap ${grandTotalProfit < 0 ? 'text-red-600' : 'text-brand-700'}`}>
                      {formatRWF(grandTotalProfit)}
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              );
            })()}
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      <ul className="space-y-3 md:hidden">
        {products.map((p) => {
          const profit = profitPerUnit(p);
          const totalCost = p.buyingPrice * p.currentQuantity;
          return (
            <li key={p.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <button className="min-w-0 text-left" onClick={() => onView(p)}>
                  <p className="truncate font-semibold text-slate-900">
                    {p.name}
                    {p.isSample && <SampleTag />}
                  </p>
                  <p className="text-xs text-slate-500">{p.category}</p>
                </button>
                <StockBadge status={getStockStatus(p)} />
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div>
                  <dt className="text-xs text-slate-400">{t('col.buying')}</dt>
                  <dd className="font-medium text-slate-700">{formatRWF(p.buyingPrice)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-400">{t('col.selling')}</dt>
                  <dd className="font-medium text-slate-900">{formatRWF(p.sellingPrice)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-400">{t('col.quantity')}</dt>
                  <dd className="font-medium text-slate-900">
                    {formatNumber(p.currentQuantity)} <span className="text-slate-400">/ {formatNumber(p.initialQuantity)}</span>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-400">{t('col.totalCost')}</dt>
                  <dd className="font-semibold text-slate-700">{formatRWF(totalCost)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-400">{t('col.profitUnit')}</dt>
                  <dd className={`font-semibold ${profit < 0 ? 'text-red-600' : 'text-brand-700'}`}>{formatRWF(profit)}</dd>
                </div>
              </dl>
              <div className="mt-3 border-t border-slate-100 pt-2">
                <Actions p={p} onView={onView} onEdit={onEdit} onDelete={onDelete} />
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
