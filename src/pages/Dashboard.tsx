import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Boxes,
  Coins,
  Package,
  PiggyBank,
  PlusCircle,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { useMemo } from 'react';
import { useProducts } from '../context/ProductsContext';
import { computeStats, getStockStatus } from '../lib/stock';
import { formatNumber, formatRWF } from '../lib/format';
import { PageHeader } from '../components/PageHeader';
import { StatCard } from '../components/StatCard';
import { StockBadge } from '../components/StockBadge';
import { EmptyState, ErrorState, LoadingState } from '../components/States';
import { useI18n } from '../i18n';

export function Dashboard() {
  const { products, loading, error, refresh } = useProducts();
  const { t } = useI18n();
  const stats = useMemo(() => computeStats(products), [products]);

  const attention = useMemo(
    () =>
      products
        .filter((p) => getStockStatus(p) !== 'in')
        .sort((a, b) => a.currentQuantity - b.currentQuantity)
        .slice(0, 6),
    [products],
  );

  const byCategory = useMemo(() => {
    const map = new Map<string, { items: number; value: number }>();
    for (const p of products) {
      const c = map.get(p.category) ?? { items: 0, value: 0 };
      c.items += p.currentQuantity;
      c.value += p.sellingPrice * p.currentQuantity;
      map.set(p.category, c);
    }
    return [...map.entries()].sort((a, b) => b[1].value - a[1].value);
  }, [products]);
  const maxCatValue = byCategory[0]?.[1].value || 1;

  const addButton = (
    <Link to="/add" className="btn-primary" id="dashboard-add-product">
      <PlusCircle className="h-4 w-4" /> {t('common.addProduct')}
    </Link>
  );

  return (
    <>
      <PageHeader title={t('dashboard.title')} description={t('dashboard.subtitle')} actions={addButton} />

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={refresh} />
      ) : products.length === 0 ? (
        <EmptyState
          icon={Package}
          title={t('dashboard.emptyTitle')}
          message={t('dashboard.emptyText')}
          action={addButton}
        />
      ) : (
        <div className="space-y-6">
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label={t('dashboard.statsLabel')}>
            <StatCard label={t('stat.totalProducts')} value={formatNumber(stats.totalProducts)} hint={t('stat.totalProductsHint')} icon={Package} tone="blue" />
            <StatCard label={t('stat.items')} value={formatNumber(stats.totalItems)} hint={t('stat.itemsHint')} icon={Boxes} tone="teal" />
            <StatCard label={t('stat.investment')} value={formatRWF(stats.originalInvestment)} hint={t('stat.investmentHint')} icon={Wallet} tone="violet" />
            <StatCard label={t('stat.stockValue')} value={formatRWF(stats.stockValue)} hint={t('stat.stockValueHint')} icon={PiggyBank} tone="amber" />
            <StatCard label={t('stat.revenue')} value={formatRWF(stats.potentialRevenue)} hint={t('stat.revenueHint')} icon={Coins} tone="green" />
            <StatCard label={t('stat.profit')} value={formatRWF(stats.expectedProfit)} hint={t('stat.profitHint')} icon={TrendingUp} highlight />
          </section>

          <div className="grid gap-6 lg:grid-cols-5">
            {/* Needs attention */}
            <section className="card lg:col-span-3">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  <h2 className="font-semibold text-slate-900">{t('dashboard.restock')}</h2>
                </div>
                <div className="flex gap-2 text-xs font-medium">
                  <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-700">{t('dashboard.lowCount', { count: stats.lowStockCount })}</span>
                  <span className="rounded-full bg-red-50 px-2.5 py-1 text-red-700">{t('dashboard.outCount', { count: stats.outOfStockCount })}</span>
                </div>
              </div>
              {attention.length === 0 ? (
                <p className="px-5 py-10 text-center text-sm text-slate-500">{t('dashboard.allGood')}</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {attention.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-3 px-5 py-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-900">{p.name}</p>
                        <p className="text-xs text-slate-500">
                          {p.category} · {t('dashboard.leftOf', { left: formatNumber(p.currentQuantity), total: formatNumber(p.initialQuantity) })}
                        </p>
                      </div>
                      <StockBadge status={getStockStatus(p)} />
                    </li>
                  ))}
                </ul>
              )}
              <div className="border-t border-slate-100 px-5 py-3">
                <Link to="/inventory" className="text-sm font-semibold text-brand-700 hover:text-brand-800">
                  {t('dashboard.viewInventory')}
                </Link>
              </div>
            </section>

            {/* By category */}
            <section className="card lg:col-span-2">
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="font-semibold text-slate-900">{t('dashboard.byCategory')}</h2>
                <p className="text-xs text-slate-500">{t('dashboard.byCategoryHint')}</p>
              </div>
              <ul className="space-y-4 px-5 py-4">
                {byCategory.map(([cat, v]) => (
                  <li key={cat}>
                    <div className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="truncate font-medium text-slate-700">{cat}</span>
                      <span className="shrink-0 font-semibold text-slate-900">{formatRWF(v.value)}</span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-brand-500" style={{ width: `${Math.max(3, (v.value / maxCatValue) * 100)}%` }} />
                    </div>
                    <p className="mt-1 text-xs text-slate-400">{t('common.items', { count: formatNumber(v.items) })}</p>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      )}
    </>
  );
}
