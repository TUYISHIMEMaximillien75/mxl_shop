import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, Check, CheckSquare, ChevronRight, Package, Plus, ShoppingBag,
  Square, Trash2, X,
} from 'lucide-react';
import { useProducts } from '../context/ProductsContext';
import { useToast } from '../context/ToastContext';
import { formatRWF, formatNumber } from '../lib/format';
import { useI18n } from '../i18n';

interface RestockItem {
  id: number;
  productId: number | null;
  name: string;
  category: string;
  sellingPrice: number | null;
  qty: number;
  buyPrice: number;
  checked: boolean;
}

type Mode = 'plan' | 'market';

/* ── Quantity input with − / + ── */
function NumInput({ value, onChange, placeholder, min = 1, label }: {
  value: string; onChange: (v: string) => void;
  placeholder?: string; min?: number; label: string;
}) {
  return (
    <div className="flex items-center rounded-xl border border-slate-200 overflow-hidden focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-100">
      <button type="button" aria-label="decrease"
        className="flex h-10 w-10 shrink-0 items-center justify-center text-slate-500 hover:bg-slate-50 transition"
        onClick={() => { const n = Number(value) - 1; if (n >= min) onChange(String(n)); }}>
        <span className="text-lg font-bold leading-none">−</span>
      </button>
      <input
        type="number" inputMode="numeric" aria-label={label}
        className="w-full min-w-0 border-0 py-2 text-center text-sm font-semibold text-slate-900 focus:outline-none focus:ring-0 bg-transparent"
        value={value} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)} />
      <button type="button" aria-label="increase"
        className="flex h-10 w-10 shrink-0 items-center justify-center text-slate-500 hover:bg-slate-50 transition"
        onClick={() => { const n = Number(value) + 1; if (n >= min) onChange(String(n)); }}>
        <span className="text-lg font-bold leading-none">+</span>
      </button>
    </div>
  );
}

export function Restock() {
  const { t } = useI18n();
  const { products } = useProducts();
  const toast = useToast();

  const [mode, setMode] = useState<Mode>('plan');
  const [items, setItems] = useState<RestockItem[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Add-item form state ──
  const [showAddForm, setShowAddForm] = useState(false);
  const [selPid, setSelPid] = useState<number | null>(null);
  const [formName, setFormName] = useState('');
  const [formCat, setFormCat] = useState('');
  const [formSp, setFormSp] = useState('');
  const [formQty, setFormQty] = useState('');
  const [formBp, setFormBp] = useState('');
  const [formSaving, setFormSaving] = useState(false);
  const [search, setSearch] = useState('');

  // ── Complete purchase state ──
  const [completing, setCompleting] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const [extraCash, setExtraCash] = useState('');
  const [cashBalance, setCashBalance] = useState<number | null>(null);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/restock');
      setItems(await r.json());
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch cash balance for the warning
  const fetchBalance = useCallback(async () => {
    try {
      const r = await fetch('/api/analytics');
      const d = await r.json();
      setCashBalance(d.cashBalance ?? 0);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadItems(); fetchBalance(); }, [loadItems, fetchBalance]);

  // ── Product picker: auto-fill form when picking existing product ──
  const pickProduct = (pid: number) => {
    const p = products.find((x) => x.id === pid);
    if (!p) return;
    setSelPid(pid);
    setFormName(p.name);
    setFormCat(p.category);
    setFormSp(String(p.sellingPrice));
    setFormBp(String(p.buyingPrice));
    setFormQty('');
  };

  const resetForm = () => {
    setSelPid(null); setFormName(''); setFormCat(''); setFormSp('');
    setFormQty(''); setFormBp(''); setSearch(''); setShowAddForm(false);
  };

  const saveItem = async () => {
    if (!formName || !formQty || !formBp) return;
    setFormSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: formName, category: formCat,
        qty: Number(formQty), buyPrice: Number(formBp),
      };
      if (selPid) body.productId = selPid;
      if (formSp) body.sellingPrice = Number(formSp);
      const r = await fetch('/api/restock', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error((await r.json()).error);
      await loadItems();
      resetForm();
    } catch (e) { toast((e as Error).message, 'error'); }
    finally { setFormSaving(false); }
  };

  const toggleCheck = async (item: RestockItem) => {
    const checked = !item.checked;
    setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, checked } : i));
    await fetch(`/api/restock?id=${item.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checked }),
    });
  };

  const deleteItem = async (id: number) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    await fetch(`/api/restock?id=${id}`, { method: 'DELETE' });
  };

  const patchQty = async (id: number, qty: number) => {
    if (qty < 1) return;
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, qty } : i));
    await fetch(`/api/restock?id=${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qty }),
    });
  };

  const patchBp = async (id: number, buyPrice: number) => {
    if (buyPrice <= 0) return;
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, buyPrice } : i));
    await fetch(`/api/restock?id=${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ buyPrice }),
    });
  };

  const tickedItems  = items.filter((i) => i.checked);
  const tickedTotal  = tickedItems.reduce((s, i) => s + i.qty * i.buyPrice, 0);
  const allTotal     = items.reduce((s, i) => s + i.qty * i.buyPrice, 0);
  // shortfall computed inline in JSX
  const extra        = Number(extraCash) || 0;


  const completePurchase = async () => {
    if (tickedItems.length === 0) { toast(t('restock.noTicked'), 'error'); return; }
    setCompleting(true);
    try {
      const r = await fetch('/api/restock?action=complete', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ extraCash: extra }),
      });
      if (!r.ok) throw new Error((await r.json()).error);
      await loadItems();
      await fetchBalance();
      setShowComplete(false);
      setExtraCash('');
      toast(t('restock.done'));
    } catch (e) { toast((e as Error).message, 'error'); }
    finally { setCompleting(false); }
  };

  /* ── filter products for picker ── */
  const q = search.toLowerCase();
  const filteredProducts = products.filter((p) =>
    !q || p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
  );
  const isNewProduct = !selPid;

  return (
    <>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 hover:bg-slate-50 transition" id="restock-back">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{t('restock.title')}</h1>
            <p className="text-sm text-slate-500">{t('restock.subtitle')}</p>
          </div>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-2">
          <button id="restock-plan-btn"
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition ${mode === 'plan' ? 'bg-brand-600 text-white shadow' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            onClick={() => setMode('plan')}>
            <Package className="h-4 w-4" /> {t('restock.planMode')}
          </button>
          <button id="restock-market-btn"
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition ${mode === 'market' ? 'bg-amber-500 text-white shadow' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            onClick={() => setMode('market')}>
            <ShoppingBag className="h-4 w-4" /> {t('restock.marketMode')}
          </button>
        </div>
      </div>

      {/* ══ PLAN MODE ══════════════════════════════════════════════════ */}
      {mode === 'plan' && (
        <>
          {/* Product picker */}
          {!showAddForm ? (
            <button id="restock-add-btn"
              className="card mb-4 flex w-full items-center gap-3 p-4 text-left hover:border-brand-300 hover:shadow-md transition group"
              onClick={() => setShowAddForm(true)}>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 group-hover:bg-brand-100 transition">
                <Plus className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">{t('restock.addItem')}</p>
                <p className="text-xs text-slate-400">{t('restock.addItemHint')}</p>
              </div>
              <ChevronRight className="ml-auto h-5 w-5 text-slate-300 group-hover:translate-x-1 group-hover:text-brand-500 transition" />
            </button>
          ) : (
            <div className="card mb-4 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <p className="font-bold text-slate-900">{t('restock.addItem')}</p>
                <button onClick={resetForm} className="text-slate-400 hover:text-slate-700"><X className="h-5 w-5" /></button>
              </div>

              {/* Search existing products */}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{t('restock.pickExisting')}</p>
                <input
                  className="input mb-2" placeholder={t('restock.searchProduct')}
                  value={search} onChange={(e) => { setSearch(e.target.value); setSelPid(null); setFormName(e.target.value); }} />
                {search && (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                    {filteredProducts.slice(0, 12).map((p) => (
                      <button key={p.id} id={`restock-pick-${p.id}`}
                        className={`card flex flex-col gap-1 p-3 text-left transition hover:border-brand-300 hover:shadow-sm ${selPid === p.id ? 'border-brand-400 bg-brand-50' : ''}`}
                        onClick={() => pickProduct(p.id)}>
                        {selPid === p.id && <Check className="h-3.5 w-3.5 text-brand-600 self-end" />}
                        <p className="text-sm font-semibold text-slate-900 leading-tight">{p.name}</p>
                        <p className="text-xs text-slate-400">{p.category}</p>
                        <p className="text-xs font-bold text-brand-700">{formatRWF(p.buyingPrice)}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Name & category */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="label">{t('restock.productName')}</label>
                  <input className="input" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder={t('restock.productName')} />
                </div>
                <div>
                  <label className="label">{t('restock.category')}</label>
                  <input className="input" value={formCat} onChange={(e) => setFormCat(e.target.value)} placeholder={t('restock.category')} />
                </div>
              </div>

              {/* Only ask selling price for new products */}
              {isNewProduct && (
                <div>
                  <label className="label">{t('restock.sellingPrice')}</label>
                  <input className="input" type="number" value={formSp} onChange={(e) => setFormSp(e.target.value)} placeholder="0" />
                  <p className="mt-1 text-xs text-slate-400">{t('restock.spHint')}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">{t('restock.qty')}</label>
                  <NumInput value={formQty} onChange={setFormQty} placeholder="0" label={t('restock.qty')} />
                </div>
                <div>
                  <label className="label">{t('restock.buyPrice')}</label>
                  <input className="input" type="number" value={formBp} onChange={(e) => setFormBp(e.target.value)} placeholder="0" />
                </div>
              </div>

              {formQty && formBp && (
                <p className="text-sm text-slate-600">{t('restock.total')}: <span className="font-bold text-slate-900">{formatRWF(Number(formQty) * Number(formBp))}</span></p>
              )}

              <button id="restock-save-item"
                disabled={!formName || !formQty || !formBp || formSaving}
                className="btn-primary w-full disabled:opacity-50"
                onClick={saveItem}>
                {formSaving ? t('common.saving') : t('restock.saveItem')}
              </button>
            </div>
          )}

          {/* List */}
          {loading ? (
            <div className="card flex justify-center py-10 text-sm text-slate-500">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
            </div>
          ) : items.length === 0 ? (
            <div className="card flex flex-col items-center py-14 text-center">
              <ShoppingBag className="h-10 w-10 text-slate-200" />
              <p className="mt-3 font-semibold text-slate-600">{t('restock.empty')}</p>
              <p className="text-sm text-slate-400">{t('restock.emptyHint')}</p>
            </div>
          ) : (
            <div className="card divide-y divide-slate-100 overflow-hidden">
              {items.map((item) => (
                <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900">{item.name}</p>
                    <p className="text-xs text-slate-400">{item.category} · {formatRWF(item.buyPrice)} {t('restock.each')}</p>
                  </div>
                  <div className="w-24 shrink-0">
                    <NumInput value={String(item.qty)} onChange={(v) => patchQty(item.id, Number(v))} label={t('restock.qty')} />
                  </div>
                  <span className="w-20 shrink-0 text-right text-sm font-bold text-slate-900">{formatRWF(item.qty * item.buyPrice)}</span>
                  <button onClick={() => deleteItem(item.id)} className="text-slate-300 hover:text-red-500 transition">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <div className="flex items-center justify-between bg-slate-50 px-4 py-3">
                <span className="text-sm font-semibold text-slate-700">{t('restock.planTotal')} ({formatNumber(items.length)} {t('restock.products')})</span>
                <span className="text-lg font-extrabold text-slate-900">{formatRWF(allTotal)}</span>
              </div>
            </div>
          )}

          {items.length > 0 && (() => {
            const afterBuy   = cashBalance != null ? cashBalance + extra - allTotal : null;
            const hasShortfall = cashBalance != null && allTotal > cashBalance + extra;
            const isOk         = cashBalance != null && allTotal <= cashBalance + extra;
            return (
              <>
                {/* ── Cash planning card – always shown when list has items ── */}
                {cashBalance != null && (
                  <div className={`mt-3 rounded-2xl border px-5 py-4 space-y-3 ${
                    hasShortfall ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'
                  }`}>
                    {/* Status badge */}
                    {hasShortfall && (
                      <div className="flex items-start gap-3">
                        <span className="text-lg">⚠️</span>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-amber-900">
                            {t('restock.shortfall')}: <span className="font-extrabold">{formatRWF(allTotal - cashBalance - extra)}</span>
                          </p>
                          <p className="text-xs text-amber-700 mt-0.5">{t('restock.shortfallHint')}</p>
                        </div>
                      </div>
                    )}
                    {isOk && (
                      <div className="flex items-center gap-2">
                        <span className="text-base">✅</span>
                        <p className="text-sm font-semibold text-emerald-800">
                          {t('restock.balanceOk')} — {t('restock.newBalance')}: <span className="font-extrabold">{formatRWF(afterBuy!)}</span>
                        </p>
                      </div>
                    )}

                    {/* Extra cash input – always visible, never hides */}
                    <div>
                      <label className="label text-xs" htmlFor="plan-extra-cash">
                        {t('restock.extraCash')}
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          id="plan-extra-cash"
                          type="number"
                          inputMode="decimal"
                          className="input flex-1"
                          value={extraCash}
                          onChange={(e) => setExtraCash(e.target.value)}
                          placeholder="0"
                        />
                        <span className="text-sm text-slate-500 shrink-0">RWF</span>
                      </div>
                    </div>
                  </div>
                )}

                <button id="restock-go-market"
                  className="mt-4 w-full rounded-2xl bg-amber-500 py-4 text-base font-bold text-white shadow-lg shadow-amber-500/30 transition hover:-translate-y-0.5 hover:bg-amber-600 active:translate-y-0"
                  onClick={() => setMode('market')}>
                  {t('restock.goMarket')} →
                </button>
              </>
            );
          })()}
        </>
      )}

      {/* ══ MARKET MODE ══════════════════════════════════════════════ */}
      {mode === 'market' && (
        <>
          {items.length === 0 ? (
            <div className="card flex flex-col items-center py-14 text-center">
              <ShoppingBag className="h-10 w-10 text-slate-200" />
              <p className="mt-3 font-semibold text-slate-600">{t('restock.empty')}</p>
            </div>
          ) : (
            <>
              <div className="card mb-4 divide-y divide-slate-100 overflow-hidden">
                {items.map((item) => {
                  const subtotal = item.qty * item.buyPrice;
                  return (
                    <div key={item.id} className={`px-4 py-3 transition ${item.checked ? 'bg-emerald-50' : ''}`}>

                      {/* ── Single flex row on sm+, two rows on xs ── */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">

                        {/* Checkbox + name */}
                        <div
                          className="flex min-w-0 flex-1 cursor-pointer select-none items-center gap-3"
                          onClick={() => toggleCheck(item)}>
                          <div className={`shrink-0 ${item.checked ? 'text-emerald-600' : 'text-slate-300'}`}>
                            {item.checked ? <CheckSquare className="h-6 w-6" /> : <Square className="h-6 w-6" />}
                          </div>
                          <p className={`min-w-0 truncate font-semibold leading-tight ${item.checked ? 'text-emerald-800 line-through decoration-emerald-400' : 'text-slate-900'}`}>
                            {item.name}
                          </p>
                        </div>

                        {/* Editors — always visible, wrap under name on small screens */}
                        <div className="flex w-full items-center gap-2 pl-9 sm:w-auto sm:pl-0" onClick={(e) => e.stopPropagation()}>

                          {/* Qty stepper */}
                          <div className="flex items-center rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm">
                            <button type="button"
                              className="flex h-9 w-9 items-center justify-center text-slate-500 hover:bg-slate-100 active:bg-slate-200 transition text-base font-bold"
                              onClick={() => patchQty(item.id, item.qty - 1)}>−</button>
                            <input
                              type="number" inputMode="numeric"
                              className="w-12 border-0 py-1 text-center text-sm font-bold text-slate-900 focus:outline-none focus:ring-0 bg-transparent"
                              value={item.qty}
                              onChange={(e) => { const v = Number(e.target.value); if (v >= 1) patchQty(item.id, v); }}
                            />
                            <button type="button"
                              className="flex h-9 w-9 items-center justify-center text-slate-500 hover:bg-slate-100 active:bg-slate-200 transition text-base font-bold"
                              onClick={() => patchQty(item.id, item.qty + 1)}>+</button>
                          </div>

                          {/* Price input */}
                          <div className="flex flex-1 items-center gap-1 sm:flex-initial">
                            <input
                              type="number" inputMode="decimal"
                              className="h-9 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-2 text-center text-sm font-bold text-slate-900 shadow-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 sm:w-24"
                              value={item.buyPrice}
                              onChange={(e) => { const v = Number(e.target.value); if (v > 0) patchBp(item.id, v); }}
                            />
                            <span className="text-xs text-slate-400 shrink-0">RWF</span>
                          </div>

                          {/* Subtotal */}
                          <p className={`shrink-0 min-w-[64px] text-right font-bold ${item.checked ? 'text-emerald-700' : 'text-slate-900'}`}>
                            {formatRWF(subtotal)}
                          </p>
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Running ticked total */}
              {tickedItems.length > 0 && (
                <div className="mb-4 flex items-center justify-between rounded-2xl bg-emerald-600 px-5 py-4 text-white">
                  <div>
                    <p className="text-sm font-medium text-emerald-100">{t('restock.tickedTotal')} ({tickedItems.length})</p>
                    <p className="text-2xl font-extrabold">{formatRWF(tickedTotal)}</p>
                  </div>
                  <button id="restock-add-inventory"
                    className="rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-emerald-700 shadow transition hover:bg-emerald-50"
                    onClick={() => setShowComplete(true)}>
                    {t('restock.addInventory')}
                  </button>
                </div>
              )}
            </>
          )}

          {/* Complete dialog */}
          {showComplete && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <div className="card w-full max-w-sm space-y-4 p-6">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-slate-900">{t('restock.confirmTitle')}</h2>
                  <button onClick={() => setShowComplete(false)}><X className="h-5 w-5 text-slate-400" /></button>
                </div>

                <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-600">{t('restock.buying')}</span>
                    <span className="font-bold text-slate-900">{formatRWF(tickedTotal)}</span>
                  </div>
                  {cashBalance != null && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">{t('restock.cashBalance')}</span>
                      <span className={`font-bold ${cashBalance + extra >= tickedTotal ? 'text-emerald-700' : 'text-red-600'}`}>
                        {formatRWF(cashBalance + extra)}
                      </span>
                    </div>
                  )}
                  {cashBalance != null && cashBalance + extra < tickedTotal && (
                    <p className="mt-1 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 font-medium">
                      ⚠️ {t('restock.stillShort')}: {formatRWF(tickedTotal - cashBalance - extra)}
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  <button className="btn-secondary flex-1" onClick={() => setShowComplete(false)}>{t('common.cancel')}</button>
                  <button id="restock-confirm"
                    className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                    disabled={completing} onClick={completePurchase}>
                    {completing ? t('common.saving') : t('restock.confirm')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
