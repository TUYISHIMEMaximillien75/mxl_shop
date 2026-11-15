import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Minus,
  Package,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
  X,
} from 'lucide-react';
import type { CartItem, Product } from '../types';
import { useProducts } from '../context/ProductsContext';
import { useToast } from '../context/ToastContext';
import { formatNumber, formatRWF } from '../lib/format';
import { getStockStatus } from '../lib/stock';
import { PageHeader } from '../components/PageHeader';
import { useI18n } from '../i18n';

/* ─── detect mobile viewport ────────────────────────────── */
function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth < 640);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    const handler = (e: MediaQueryListEvent) => setMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return mobile;
}

/* ─── Compact Qty Modal (mobile-only) ───────────────────── */
function QtyModal({
  product,
  existingQty,
  onConfirm,
  onClose,
}: {
  product: Product;
  existingQty: number;
  onConfirm: (qty: number) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const max = product.currentQuantity;

  // Start empty; if editing an existing cart item pre-fill it
  const [raw, setRaw] = useState(existingQty > 0 ? String(existingQty) : '');
  const inputRef = useRef<HTMLInputElement>(null);

  const qty = parseInt(raw, 10);
  const valid = !isNaN(qty) && qty > 0 && qty <= max;
  const subtotal = valid ? product.sellingPrice * qty : null;

  useEffect(() => {
    // On open: select existing text or just focus empty field
    setTimeout(() => {
      if (existingQty > 0) inputRef.current?.select();
      else inputRef.current?.focus();
    }, 60);
  }, [existingQty]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && valid) { e.preventDefault(); onConfirm(qty); }
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [valid, qty, onConfirm, onClose]);

  const decrement = () => {
    const cur = parseInt(raw, 10);
    setRaw(String(Math.max(1, isNaN(cur) ? 1 : cur - 1)));
  };
  const increment = () => {
    const cur = parseInt(raw, 10);
    setRaw(String(Math.min(max, isNaN(cur) ? 1 : cur + 1)));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Compact card — max-w-xs keeps it small on all phones */}
      <div className="relative mx-4 w-full max-w-xs rounded-2xl bg-white p-5 shadow-2xl">

        {/* Close */}
        <button
          className="absolute top-3 right-3 rounded-full p-1.5 text-slate-400 hover:bg-slate-100"
          onClick={onClose}
          aria-label={t('common.close')}
        >
          <X className="h-4 w-4" />
        </button>

        {/* Product info — compact */}
        <div className="mb-4 pr-6">
          <p className="font-bold text-slate-900 leading-snug">{product.name}</p>
          <p className="text-sm text-brand-600 font-semibold">{formatRWF(product.sellingPrice)}</p>
          <p className="text-xs text-slate-400">{t('sales.inStock', { qty: formatNumber(max) })}</p>
        </div>

        {/* Qty row: − [input] + */}
        <div className="flex items-center gap-2">
          <button
            onClick={decrement}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 active:scale-95 transition-all"
            aria-label="Decrease"
          >
            <Minus className="h-4 w-4" />
          </button>

          <input
            ref={inputRef}
            id="qty-input"
            type="number"
            inputMode="numeric"
            min={1}
            max={max}
            value={raw}
            placeholder="0"
            onChange={(e) => {
              const v = e.target.value;
              if (v === '') { setRaw(''); return; }
              const n = parseInt(v, 10);
              if (!isNaN(n)) setRaw(String(Math.min(n, max)));
            }}
            className="min-w-0 flex-1 rounded-xl border-2 border-slate-200 bg-slate-50 py-2 text-center text-2xl font-bold text-slate-900 placeholder-slate-300 focus:border-brand-500 focus:bg-white focus:outline-none"
            aria-label={t('sales.qty')}
          />

          <button
            onClick={increment}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white hover:bg-brand-700 active:scale-95 transition-all disabled:opacity-30"
            disabled={valid && qty >= max}
            aria-label="Increase"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {/* Subtotal preview */}
        <p className="mt-2 text-center text-xs text-slate-400 h-4">
          {subtotal !== null
            ? `${formatRWF(product.sellingPrice)} × ${qty} = ${formatRWF(subtotal)}`
            : ''}
        </p>

        {qty > max && (
          <p className="mt-1 text-center text-xs font-medium text-amber-600">
            {t('sales.stockWarning', { max: formatNumber(max) })}
          </p>
        )}

        {/* Confirm */}
        <button
          id="qty-confirm"
          className="btn-primary mt-4 w-full justify-center py-2.5"
          disabled={!valid}
          onClick={() => onConfirm(qty)}
        >
          <Check className="h-4 w-4" /> {t('sales.addToCart')}
        </button>
      </div>
    </div>
  );
}

/* ─── Main Sales / POS Page ─────────────────────────────── */
export function Sales() {
  const { products, loading, recordSale } = useProducts();
  const toast = useToast();
  const { t } = useI18n();
  const isMobile = useIsMobile();

  const [query, setQuery] = useState('');
  const [activeCat, setActiveCat] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [note, setNote] = useState('');
  const [recording, setRecording] = useState(false);
  const [success, setSuccess] = useState<{ total: number; count: number } | null>(null);
  const [modalProduct, setModalProduct] = useState<Product | null>(null);

  const searchRef = useRef<HTMLInputElement>(null);

  /* "/" focuses search when modal is closed */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/' && !modalProduct && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [modalProduct]);

  const categories = useMemo(
    () => Array.from(new Set(products.map((p) => p.category))).sort(),
    [products],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter(
      (p) =>
        (!q || p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)) &&
        (!activeCat || p.category === activeCat),
    );
  }, [products, query, activeCat]);

  const total = useMemo(
    () => cart.reduce((s, item) => s + item.product.sellingPrice * item.qty, 0),
    [cart],
  );
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  /* ── Cart helpers ── */
  const setCartQty = useCallback((productId: number, qty: number) => {
    setCart((prev) => {
      const idx = prev.findIndex((i) => i.product.id === productId);
      if (idx < 0) return prev;
      if (qty <= 0) return prev.filter((_, i) => i !== idx);
      const next = [...prev];
      next[idx] = { ...next[idx], qty: Math.min(qty, next[idx].product.currentQuantity) };
      return next;
    });
  }, []);

  const removeFromCart = useCallback(
    (productId: number) => setCart((prev) => prev.filter((i) => i.product.id !== productId)),
    [],
  );

  const clearCart = () => { setCart([]); setNote(''); };

  /* Mobile: open modal; Desktop: add directly (qty=1 or increment) */
  const handleProductClick = useCallback(
    (p: Product) => {
      if (p.currentQuantity === 0) return;
      if (isMobile) {
        setModalProduct(p);
      } else {
        // Desktop: increment if already in sale, otherwise add with qty 1
        setCart((prev) => {
          const idx = prev.findIndex((i) => i.product.id === p.id);
          if (idx >= 0) {
            const item = prev[idx];
            if (item.qty >= p.currentQuantity) return prev;
            const next = [...prev];
            next[idx] = { ...item, qty: item.qty + 1 };
            return next;
          }
          return [...prev, { product: p, qty: 1 }];
        });
      }
    },
    [isMobile],
  );

  /* Modal confirm → update or add item */
  const handleModalConfirm = useCallback(
    (qty: number) => {
      if (!modalProduct) return;
      setCart((prev) => {
        const idx = prev.findIndex((i) => i.product.id === modalProduct.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], qty };
          return next;
        }
        return [...prev, { product: modalProduct, qty }];
      });
      setModalProduct(null);
    },
    [modalProduct],
  );

  /* Record sale */
  const handleRecord = async () => {
    if (cart.length === 0 || recording) return;
    setRecording(true);
    try {
      await recordSale({
        items: cart.map((i) => ({
          productId: i.product.id,
          qty: i.qty,
          unitPrice: i.product.sellingPrice,
        })),
        note: note.trim() || undefined,
      });
      setSuccess({ total, count: cartCount });
      toast(t('toast.saleRecorded', { total: formatRWF(total) }));
      clearCart();
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setRecording(false);
    }
  };

  /* Success screen */
  if (success) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-20 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-100 text-brand-600 ring-8 ring-brand-50">
          <CheckCircle2 className="h-10 w-10" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{t('sales.successTitle')}</h2>
          <p className="mt-1 text-slate-500">
            {t('sales.successText', { total: formatRWF(success.total), count: success.count })}
          </p>
        </div>
        <button id="new-sale-btn" className="btn-primary px-8 py-3 text-base" onClick={() => setSuccess(null)}>
          <ShoppingCart className="h-5 w-5" /> {t('sales.newSale')}
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="card flex items-center justify-center gap-3 py-16 text-sm text-slate-500">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
        {t('common.loading')}
      </div>
    );
  }

  return (
    <>
      <PageHeader title={t('sales.title')} description={t('sales.subtitle')} />

      {/* Modal — only opened when isMobile */}
      {modalProduct && isMobile && (
        <QtyModal
          product={modalProduct}
          existingQty={cart.find((i) => i.product.id === modalProduct.id)?.qty ?? 0}
          onConfirm={handleModalConfirm}
          onClose={() => setModalProduct(null)}
        />
      )}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">

        {/* ── LEFT: Product picker ───────────────── */}
        <div className="flex flex-col gap-3 lg:flex-1">

          {/* Search */}
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              ref={searchRef}
              id="sales-search"
              type="search"
              className="input pl-10 pr-10"
              placeholder={t('sales.searchPlaceholder')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <span className="pointer-events-none absolute inset-y-0 right-3 hidden items-center text-xs text-slate-300 font-mono sm:flex">/</span>
          </div>

          {/* Category tabs */}
          {categories.length > 1 && (
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {[{ label: t('sales.allCategories'), value: '' }, ...categories.map((c) => ({ label: c, value: c }))].map(
                ({ label, value }) => (
                  <button
                    key={value}
                    onClick={() => setActiveCat(value)}
                    className={`shrink-0 rounded-xl px-3.5 py-1.5 text-sm font-medium transition-colors ${
                      activeCat === value
                        ? 'bg-brand-600 text-white shadow-sm'
                        : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {label}
                  </button>
                ),
              )}
            </div>
          )}

          {/* Product blocks */}
          {products.length === 0 ? (
            <div className="card flex flex-col items-center py-14 text-center">
              <Package className="h-10 w-10 text-slate-300" />
              <p className="mt-3 font-semibold text-slate-700">{t('sales.noProducts')}</p>
              <p className="text-sm text-slate-400">{t('sales.noProductsHint')}</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="card flex flex-col items-center py-14 text-center">
              <Search className="h-10 w-10 text-slate-300" />
              <p className="mt-3 font-semibold text-slate-700">{t('sales.noMatch')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4">
              {filtered.map((p) => {
                const status = getStockStatus(p);
                const isOut = status === 'out';
                const cartItem = cart.find((i) => i.product.id === p.id);
                const inCart = cartItem !== undefined;

                return (
                  <button
                    key={p.id}
                    id={`product-block-${p.id}`}
                    disabled={isOut}
                    onClick={() => handleProductClick(p)}
                    aria-label={p.name}
                    className={`group relative flex flex-col rounded-2xl border p-3.5 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                      isOut
                        ? 'cursor-not-allowed border-slate-100 bg-slate-50 opacity-50'
                        : inCart
                        ? 'border-brand-400 bg-brand-50 shadow-md ring-2 ring-brand-400'
                        : 'border-slate-200 bg-white hover:border-brand-300 hover:bg-brand-50/50 hover:shadow-sm active:scale-95'
                    }`}
                  >
                    {inCart && (
                      <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white shadow">
                        {cartItem.qty}
                      </span>
                    )}
                    <p className="text-sm font-semibold leading-snug text-slate-900 line-clamp-2">{p.name}</p>
                    <p className="mt-0.5 text-xs text-slate-400">{p.category}</p>
                    <p className="mt-2.5 text-base font-bold text-brand-700">{formatRWF(p.sellingPrice)}</p>
                    {isOut ? (
                      <span className="mt-1 text-xs font-medium text-red-500">{t('sales.outOfStock')}</span>
                    ) : (
                      <span className={`mt-1 text-xs font-medium ${status === 'low' ? 'text-amber-600' : 'text-slate-400'}`}>
                        {t('sales.inStock', { qty: formatNumber(p.currentQuantity) })}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── RIGHT: Sale summary ────────────────── */}
        <div className="card flex flex-col lg:sticky lg:top-20 lg:w-80 xl:w-96">

          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-brand-600" />
              <span className="font-semibold text-slate-900">{t('sales.title')}</span>
              {cartCount > 0 && (
                <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-bold text-brand-700">{cartCount}</span>
              )}
            </div>
            {cart.length > 0 && (
              <button className="flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-red-500" onClick={clearCart} id="clear-cart">
                <Trash2 className="h-3.5 w-3.5" /> {t('sales.clearCart')}
              </button>
            )}
          </div>

          {cart.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-10 text-center">
              <ShoppingCart className="h-9 w-9 text-slate-200" />
              <p className="text-sm font-medium text-slate-400">{t('sales.cartEmpty')}</p>
              <p className="text-xs text-slate-300">{t('sales.cartEmptyHint')}</p>
            </div>
          ) : (
            <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto lg:max-h-[50vh]">
              {cart.map((item) => {
                const subtotal = item.product.sellingPrice * item.qty;
                const atMax = item.qty >= item.product.currentQuantity;
                return (
                  <li key={item.product.id} className="flex items-center gap-2 px-4 py-2.5">
                    <div className="min-w-0 flex-1">
                      <button
                        className="truncate text-left text-sm font-medium text-slate-900 hover:text-brand-700 w-full"
                        onClick={() => isMobile && setModalProduct(item.product)}
                      >
                        {item.product.name}
                      </button>
                      <p className="text-xs text-slate-400">
                        {formatRWF(item.product.sellingPrice)} × {item.qty} ={' '}
                        <span className="font-semibold text-slate-700">{formatRWF(subtotal)}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <button
                        className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                        onClick={() => setCartQty(item.product.id, item.qty - 1)}
                        aria-label="Decrease"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <input
                        type="number"
                        className="w-10 rounded-lg border-0 bg-slate-50 py-0.5 text-center text-sm font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-brand-400"
                        value={item.qty}
                        min={1}
                        max={item.product.currentQuantity}
                        onChange={(e) => setCartQty(item.product.id, parseInt(e.target.value, 10))}
                      />
                      <button
                        className={`flex h-6 w-6 items-center justify-center rounded-lg transition-colors ${
                          atMax ? 'cursor-not-allowed bg-slate-50 text-slate-300' : 'bg-slate-100 text-slate-600 hover:bg-brand-100 hover:text-brand-700'
                        }`}
                        onClick={() => !atMax && setCartQty(item.product.id, item.qty + 1)}
                        disabled={atMax}
                        aria-label="Increase"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    <button
                      className="ml-1 rounded-lg p-1 text-slate-300 hover:bg-red-50 hover:text-red-500 transition-colors"
                      onClick={() => removeFromCart(item.product.id)}
                      aria-label={t('sales.remove')}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {cart.length > 0 && (
            <div className="border-t border-slate-100 px-4 pt-3">
              <label className="label text-xs" htmlFor="sale-note">{t('sales.note')}</label>
              <input
                id="sale-note"
                type="text"
                className="input text-sm"
                placeholder={t('sales.notePlaceholder')}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          )}

          <div className="border-t border-slate-200 p-4">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-medium text-slate-500">{t('sales.total')}</span>
              <span className="text-2xl font-bold text-slate-900">{formatRWF(total)}</span>
            </div>
            <button
              id="record-sale-btn"
              className="btn-primary mt-3 w-full justify-center py-3 text-base"
              disabled={cart.length === 0 || recording}
              onClick={handleRecord}
            >
              {recording ? (
                <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />{t('sales.recording')}</>
              ) : (
                <><CheckCircle2 className="h-5 w-5" />{t('sales.recordSale')}</>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
