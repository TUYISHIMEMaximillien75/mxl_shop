import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Boxes,
  Coins,
  ChevronRight,
  Package,
  RefreshCw,
  ShoppingCart,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { formatNumber, formatRWF } from '../lib/format';
import { useI18n } from '../i18n';

/* ── Types ── */
interface AnalyticsData {
  openingCash: number;
  cashBalance: number;
  stock: {
    productCount: number;
    totalItems: number;
    stockCostValue: number;
    stockSellValue: number;
    originalInvestment: number;
  };
  sales: {
    salesCount: number;
    totalRevenue: number;
    totalItemsSold: number;
    grossProfit: number;
  };
  purchases: {
    purchaseCount: number;
    totalSpent: number;
    totalExtraCash: number;
  };
  topProducts: { name: string; category: string; qtySold: number; revenue: number; profit: number }[];
  byCategory: { category: string; qtySold: number; revenue: number; profit: number }[];
  daily: { day: string; revenue: number; salesCount: number }[];
}

/* ── Helpers ── */
function pct(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}
function shortDate(iso: string) {
  const d = new Date(iso + 'T00:00:00');
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

/* ── Sub-components ── */
function KpiCard({
  label, value, hint, icon: Icon, tone = 'default', large = false,
}: {
  label: string; value: string; hint?: string;
  icon: typeof TrendingUp; tone?: 'green' | 'blue' | 'amber' | 'red' | 'violet' | 'default';
  large?: boolean;
}) {
  const tones = {
    green:  'bg-emerald-50 text-emerald-600',
    blue:   'bg-sky-50 text-sky-600',
    amber:  'bg-amber-50 text-amber-600',
    red:    'bg-red-50 text-red-600',
    violet: 'bg-violet-50 text-violet-600',
    default:'bg-brand-50 text-brand-600',
  };
  return (
    <div className="card flex flex-col gap-2 p-4">
      <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${tones[tone]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className={`font-bold text-slate-900 ${large ? 'text-2xl' : 'text-xl'}`}>{value}</p>
      <div>
        <p className="text-sm font-medium text-slate-700">{label}</p>
        {hint && <p className="text-xs text-slate-400">{hint}</p>}
      </div>
    </div>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-3">
      <h2 className="text-base font-bold text-slate-900">{title}</h2>
      {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
    </div>
  );
}

/* ── Main Page ── */
export function Calculations() {
  const { t } = useI18n();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      const res = await fetch('/api/analytics');
      if (!res.ok) throw new Error(await res.text());
      setData(await res.json());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const refreshBtn = (
    <button
      className="btn-secondary gap-1.5"
      onClick={() => load(true)}
      disabled={refreshing}
      id="calc-refresh"
    >
      <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
      {t('calc.refresh')}
    </button>
  );

  if (loading) {
    return (
      <>
        <PageHeader title={t('calc.title')} description={t('calc.subtitle')} />
        <div className="card flex items-center justify-center gap-3 py-20 text-sm text-slate-500">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
          {t('common.loading')}
        </div>
      </>
    );
  }

  if (error || !data) {
    return (
      <>
        <PageHeader title={t('calc.title')} description={t('calc.subtitle')} actions={refreshBtn} />
        <div className="card border-red-200 bg-red-50 px-6 py-10 text-center">
          <p className="font-semibold text-red-800">{t('common.loadError')}</p>
          <p className="mt-1 text-sm text-red-700">{error}</p>
          <button className="btn-secondary mt-4" onClick={() => load()}>{t('common.tryAgain')}</button>
        </div>
      </>
    );
  }

  const { stock, sales } = data;
  const potentialProfit = stock.stockSellValue - stock.stockCostValue;
  const netPosition = sales.totalRevenue + stock.stockCostValue - stock.originalInvestment;
  const profitMargin = sales.totalRevenue > 0 ? (sales.grossProfit / sales.totalRevenue) * 100 : 0;
  const maxCatRevenue = data.byCategory[0]?.revenue || 1;
  const dailyMap = new Map(data.daily.map((d) => [d.day, d]));
  const last14 = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return dailyMap.get(key) ?? { day: key, revenue: 0, salesCount: 0 };
  });
  const maxDailyRevenue = Math.max(...last14.map((d) => d.revenue), 1);

  return (
    <>
      <PageHeader title={t('calc.title')} description={t('calc.subtitle')} actions={refreshBtn} />

      <div className="space-y-8">

        {/* ══ Real money balance (cash collected) ══════════════ */}
        <Link
          to="/sales/history"
          id="calc-cash-balance"
          className="group relative flex items-center justify-between gap-4 overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 p-5 text-white shadow-lg shadow-emerald-600/25 transition hover:-translate-y-0.5 hover:shadow-xl sm:p-6"
        >
          <div className="pointer-events-none absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur">
              <Wallet className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-emerald-50">{t('calc.cashTitle')}</p>
              <p className="text-3xl font-extrabold tracking-tight sm:text-4xl">{formatRWF(data.cashBalance)}</p>
              <p className="mt-0.5 text-xs text-emerald-100">
                {t('calc.cashHint')} · {t('calc.openingCashLabel')}: {formatRWF(data.openingCash)} · {t('calc.purchasesLabel')}: −{formatRWF(data.purchases.totalSpent)}
              </p>
            </div>
          </div>
          <ChevronRight className="h-6 w-6 shrink-0 opacity-70 transition group-hover:translate-x-1 group-hover:opacity-100" />
        </Link>

        {/* ══ SECTION 1: Shop Balance ══════════════════════════ */}
        <section>
          <SectionHeader title={t('calc.balanceTitle')} subtitle={t('calc.balanceSubtitle')} />
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KpiCard label={t('calc.stockCost')}     value={formatRWF(stock.stockCostValue)}  hint={t('calc.stockCostHint')}     icon={Wallet}       tone="violet" large />
            <KpiCard label={t('calc.stockSell')}     value={formatRWF(stock.stockSellValue)}  hint={t('calc.stockSellHint')}     icon={Coins}        tone="green"  large />
            <KpiCard label={t('calc.potentialProfit')} value={formatRWF(potentialProfit)}    hint={t('calc.potentialProfitHint')} icon={TrendingUp}  tone={potentialProfit >= 0 ? 'green' : 'red'} large />
            <Link
              to="/inventory"
              id="calc-inventory-link"
              className="card group flex flex-col justify-between gap-2 p-4 transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                <Package className="h-5 w-5" />
              </div>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{t('calc.viewInventory')}</p>
                  <p className="text-xs text-slate-400">{t('calc.viewInventoryHint')}</p>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-slate-400 transition group-hover:translate-x-1 group-hover:text-brand-600" />
              </div>
            </Link>
          </div>
        </section>

        {/* ══ SECTION 2: Sales Performance ════════════════════ */}
        <section>
          <SectionHeader title={t('calc.salesTitle')} subtitle={t('calc.salesSubtitle')} />

          {sales.salesCount === 0 ? (
            <div className="card flex flex-col items-center py-12 text-center">
              <ShoppingCart className="h-10 w-10 text-slate-200" />
              <p className="mt-3 font-semibold text-slate-600">{t('calc.noSales')}</p>
              <p className="text-sm text-slate-400">{t('calc.noSalesHint')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <KpiCard label={t('calc.totalRevenue')} value={formatRWF(sales.totalRevenue)}     hint={t('calc.totalRevenueHint')} icon={Coins}       tone="green"  large />
              <KpiCard label={t('calc.grossProfit')}  value={formatRWF(sales.grossProfit)}      hint={t('calc.grossProfitHint')}  icon={TrendingUp}  tone={sales.grossProfit >= 0 ? 'green' : 'red'} large />
              <Link to="/sales/history" id="calc-sales-link" className="group block transition hover:-translate-y-0.5">
                <KpiCard label={t('calc.salesCount')} value={formatNumber(sales.salesCount)} hint={t('calc.salesCountLinkHint')} icon={ShoppingCart} tone="amber" large />
              </Link>
            </div>
          )}
        </section>

        {/* ══ SECTION 3: Investment Overview ══════════════════ */}
        <section>
          <SectionHeader title={t('calc.investTitle')} subtitle={t('calc.investSubtitle')} />
          <div className="card overflow-hidden">
            {/* Summary row */}
            <div className="grid divide-y divide-slate-100 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4 lg:divide-x">
              {[
                { label: t('calc.originalInvest'), value: stock.originalInvestment, icon: Wallet,       tone: 'text-slate-700' },
                { label: t('calc.recovered'),       value: sales.totalRevenue,       icon: ArrowUpRight,  tone: 'text-emerald-700' },
                { label: t('calc.remaining'),       value: stock.stockCostValue,     icon: Boxes,        tone: 'text-violet-700' },
                { label: t('calc.netPosition'),     value: netPosition,              icon: netPosition >= 0 ? ArrowUpRight : ArrowDownRight, tone: netPosition >= 0 ? 'text-emerald-700' : 'text-red-700' },
              ].map(({ label, value, icon: Icon, tone }) => (
                <div key={label} className="flex flex-col gap-1 p-5">
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                    <Icon className="h-4 w-4" />
                    {label}
                  </div>
                  <p className={`text-2xl font-bold ${tone}`}>{formatRWF(value)}</p>
                </div>
              ))}
            </div>

            {/* Progress bar: investment vs recovered */}
            <div className="border-t border-slate-100 px-5 py-4">
              <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-slate-500">
                <span>{t('calc.recovered')}</span>
                <span>{pct(sales.totalRevenue, stock.originalInvestment)}% {sales.totalRevenue > 0 ? 'recovered' : ''}</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand-500 to-emerald-500 transition-all"
                  style={{ width: `${Math.min(100, pct(sales.totalRevenue, stock.originalInvestment))}%` }}
                />
              </div>
              {sales.totalRevenue > 0 && (
                <div className="mt-3 flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-2.5">
                  <BarChart3 className="h-4 w-4 text-brand-600 shrink-0" />
                  <p className="text-sm text-slate-700">
                    <span className="font-semibold">{t('calc.profitMargin')}:</span>{' '}
                    <span className={`font-bold ${profitMargin >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                      {profitMargin.toFixed(1)}%
                    </span>
                    <span className="text-slate-400 ml-2 text-xs">({t('calc.profitMarginHint')})</span>
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ══ SECTION 4: Last 14 days bar chart ═══════════════ */}
        {data.daily.length > 0 && (
          <section>
            <SectionHeader title={t('calc.dailyTitle')} subtitle={t('calc.dailySubtitle')} />
            <div className="card p-5">
              <div className="flex h-44 items-end gap-1 sm:gap-2">
                {last14.map((d, i) => {
                  const h = d.revenue > 0 ? Math.max(4, (d.revenue / maxDailyRevenue) * 100) : 0;
                  const isToday = i === last14.length - 1;
                  return (
                    <div key={d.day} className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
                      <span className="hidden text-[10px] font-semibold text-slate-500 opacity-0 transition group-hover:opacity-100 sm:block">
                        {d.revenue > 0 ? formatNumber(d.revenue) : ''}
                      </span>
                      <div className="flex w-full flex-1 items-end">
                        <div
                          className={`w-full rounded-t-md transition-all ${d.revenue > 0 ? (isToday ? 'bg-brand-600' : 'bg-brand-400 group-hover:bg-brand-500') : 'bg-slate-100'}`}
                          style={{ height: d.revenue > 0 ? `${h}%` : '3px' }}
                          title={`${shortDate(d.day)}: ${formatRWF(d.revenue)} · ${d.salesCount}`}
                        />
                      </div>
                      <span className={`text-[10px] ${isToday ? 'font-bold text-brand-700' : 'text-slate-400'}`}>
                        {shortDate(d.day)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        <div className="grid gap-6 lg:grid-cols-2">

          {/* ══ SECTION 5: Top products ═══════════════════════ */}
          {data.topProducts.length > 0 && (
            <section>
              <SectionHeader title={t('calc.topTitle')} subtitle={t('calc.topSubtitle')} />
              <div className="card overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-100 bg-slate-50 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                    <tr>
                      <th className="px-4 py-3">{t('calc.colProduct')}</th>
                      <th className="px-4 py-3 text-right">{t('calc.colQtySold')}</th>
                      <th className="px-4 py-3 text-right">{t('calc.colRevenue')}</th>
                      <th className="px-4 py-3 text-right">{t('calc.colProfit')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.topProducts.map((p, i) => (
                      <tr key={p.name} className="hover:bg-slate-50/70">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[10px] font-bold text-brand-700">
                              {i + 1}
                            </span>
                            <div>
                              <p className="font-medium text-slate-900 leading-snug">{p.name}</p>
                              <p className="text-xs text-slate-400">{p.category}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-700">{formatNumber(p.qtySold)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-900">{formatRWF(p.revenue)}</td>
                        <td className={`px-4 py-3 text-right font-semibold ${p.profit >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                          {formatRWF(p.profit)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* ══ SECTION 6: By category ════════════════════════ */}
          {data.byCategory.length > 0 && (
            <section>
              <SectionHeader title={t('calc.catTitle')} subtitle={t('calc.catSubtitle')} />
              <div className="card p-5 space-y-4">
                {data.byCategory.map((c) => (
                  <div key={c.category}>
                    <div className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="truncate font-medium text-slate-700">{c.category}</span>
                      <span className="shrink-0 font-bold text-slate-900">{formatRWF(c.revenue)}</span>
                    </div>
                    <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-brand-500 to-emerald-400"
                        style={{ width: `${Math.max(2, pct(c.revenue, maxCatRevenue))}%` }}
                      />
                    </div>
                    <div className="mt-1 flex gap-3 text-xs text-slate-400">
                      <span>{formatNumber(c.qtySold)} sold</span>
                      <span className={c.profit >= 0 ? 'text-emerald-600' : 'text-red-500'}>
                        {t('calc.colProfit')}: {formatRWF(c.profit)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

        </div>
      </div>
    </>
  );
}
