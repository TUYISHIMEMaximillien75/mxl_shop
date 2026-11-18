import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ChevronDown, Receipt, Search } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { formatNumber, formatRWF } from '../lib/format';
import { useI18n } from '../i18n';

interface SaleItem { productId: number; name: string; qty: number; unitPrice: number; subtotal: number }
interface SaleRecord { id: number; soldAt: string; totalRwf: number; note: string | null; items: SaleItem[] }

function dayKey(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}
function timeOf(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export function SalesHistory() {
  const { t } = useI18n();
  const [sales, setSales] = useState<SaleRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/sales')
      .then(async (r) => { if (!r.ok) throw new Error(await r.text()); return r.json(); })
      .then(setSales)
      .catch((e) => setError((e as Error).message));
  }, []);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = (sales ?? []).filter((s) => !q || s.items.some((i) => i.name.toLowerCase().includes(q)));
    const map = new Map<string, { total: number; sales: SaleRecord[] }>();
    for (const s of list) {
      const k = dayKey(s.soldAt);
      const g = map.get(k) ?? { total: 0, sales: [] };
      g.total += s.totalRwf;
      g.sales.push(s);
      map.set(k, g);
    }
    return [...map.entries()];
  }, [sales, query]);

  const back = (
    <Link to="/" className="btn-secondary gap-1.5" id="history-back">
      <ArrowLeft className="h-4 w-4" /> {t('history.newSale')}
    </Link>
  );

  return (
    <>
      <PageHeader title={t('history.title')} description={t('history.subtitle')} actions={back} />

      <div className="relative mb-4">
        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          id="history-search"
          className="input pl-9"
          placeholder={t('history.search')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {error && <div className="card border-red-200 bg-red-50 p-6 text-sm text-red-700">{error}</div>}

      {!sales && !error && (
        <div className="card flex items-center justify-center gap-3 py-16 text-sm text-slate-500">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
          {t('common.loading')}
        </div>
      )}

      {sales && groups.length === 0 && (
        <div className="card flex flex-col items-center py-14 text-center">
          <Receipt className="h-10 w-10 text-slate-200" />
          <p className="mt-3 font-semibold text-slate-600">{t('history.empty')}</p>
        </div>
      )}

      <div className="space-y-6">
        {groups.map(([day, g]) => (
          <section key={day}>
            <div className="mb-2 flex items-baseline justify-between px-1">
              <h2 className="text-sm font-bold text-slate-700">{day}</h2>
              <span className="text-sm font-bold text-emerald-700">{formatRWF(g.total)}</span>
            </div>
            <div className="card divide-y divide-slate-100 overflow-hidden">
              {g.sales.map((s) => {
                const isOpen = open === s.id;
                const qty = s.items.reduce((a, i) => a + i.qty, 0);
                return (
                  <div key={s.id}>
                    <button
                      id={`sale-${s.id}`}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-50"
                      onClick={() => setOpen(isOpen ? null : s.id)}
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-xs font-bold text-brand-700">
                        #{s.id}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900">
                          {s.items.map((i) => i.name).join(', ')}
                        </p>
                        <p className="text-xs text-slate-400">
                          {timeOf(s.soldAt)} · {formatNumber(qty)} {t('history.units')}
                        </p>
                      </div>
                      <span className="shrink-0 font-bold text-slate-900">{formatRWF(s.totalRwf)}</span>
                      <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition ${isOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isOpen && (
                      <div className="bg-slate-50 px-4 py-3">
                        {s.items.map((i, idx) => (
                          <div key={idx} className="flex justify-between gap-2 py-1 text-sm">
                            <span className="text-slate-700">
                              {i.name} <span className="text-slate-400">× {formatNumber(i.qty)} @ {formatRWF(Number(i.unitPrice))}</span>
                            </span>
                            <span className="font-semibold text-slate-900">{formatRWF(Number(i.subtotal))}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
