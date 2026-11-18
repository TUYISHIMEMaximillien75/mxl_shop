import { useEffect, useState } from 'react';
import { Coins, Database, Globe, Info, PackagePlus, Trash2 } from 'lucide-react';
import { useProducts } from '../context/ProductsContext';
import { useToast } from '../context/ToastContext';
import { PageHeader } from '../components/PageHeader';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { LOW_STOCK_RATIO, LOW_STOCK_UNITS } from '../lib/stock';
import { useI18n, type Locale } from '../i18n';

const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  rw: 'Ikinyarwanda',
};

export function Settings() {
  const { products, hasSamples, loadSamples, clearSamples } = useProducts();
  const toast = useToast();
  const { t, th, locale, setLocale } = useI18n();
  const [confirmClear, setConfirmClear] = useState(false);
  const [loadingSamples, setLoadingSamples] = useState(false);
  const [openingCash, setOpeningCash] = useState('');
  const [cashSaving, setCashSaving] = useState(false);

  useEffect(() => {
    fetch('/api/opening-cash').then(r => r.json()).then(d => setOpeningCash(String(d.openingCash || '')));
  }, []);

  const saveOpeningCash = async () => {
    setCashSaving(true);
    try {
      await fetch('/api/opening-cash', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ openingCash: Number(openingCash) }),
      });
      toast(t('settings.cashSaved'));
    } catch (e) { toast((e as Error).message, 'error'); }
    finally { setCashSaving(false); }
  };

  const sampleCount = products.filter((p) => p.isSample).length;
  const ownCount = products.length - sampleCount;

  const handleClear = async () => {
    try {
      const n = await clearSamples();
      toast(t('toast.samplesCleared', { count: n }));
      setConfirmClear(false);
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  };

  const handleLoad = async () => {
    setLoadingSamples(true);
    try {
      await loadSamples();
      toast(t('toast.samplesLoaded'));
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setLoadingSamples(false);
    }
  };

  return (
    <>
      <PageHeader title={t('settings.title')} description={t('settings.subtitle')} />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Language */}
        <section className="card p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
              <Globe className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">{t('app.language')}</h2>
              <p className="text-sm text-slate-500">{t('settings.languageText')}</p>
            </div>
          </div>
          <div className="mt-5 flex gap-2">
            {(['en', 'rw'] as Locale[]).map((l) => (
              <button
                key={l}
                id={`lang-${l}`}
                onClick={() => setLocale(l)}
                className={`flex-1 rounded-xl border py-3 text-sm font-semibold transition-colors ${
                  locale === l
                    ? 'border-brand-600 bg-brand-600 text-white shadow-sm'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {LOCALE_LABELS[l]}
              </button>
            ))}
          </div>
        </section>

        {/* Opening cash */}
        <section className="card p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Coins className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">{t('settings.openingCash')}</h2>
              <p className="text-sm text-slate-500">{t('settings.openingCashHint')}</p>
            </div>
          </div>
          <div className="mt-5 flex gap-2">
            <input id="opening-cash-input" type="number" className="input flex-1"
              value={openingCash} onChange={(e) => setOpeningCash(e.target.value)}
              placeholder="0" />
            <button id="opening-cash-save" className="btn-primary" onClick={saveOpeningCash} disabled={cashSaving}>
              {cashSaving ? '...' : t('settings.saveCash')}
            </button>
          </div>
        </section>

        {/* Sample data */}
        <section className="card p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">{t('settings.sampleTitle')}</h2>
              <p className="text-sm text-slate-500">{t('settings.sampleSubtitle')}</p>
            </div>
          </div>

          <dl className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-slate-50 p-3">
              <dt className="text-xs font-medium text-slate-500">{t('settings.sampleCount')}</dt>
              <dd className="text-xl font-bold text-slate-900">{sampleCount}</dd>
            </div>
            <div className="rounded-xl bg-brand-50/60 p-3">
              <dt className="text-xs font-medium text-slate-500">{t('settings.ownCount')}</dt>
              <dd className="text-xl font-bold text-slate-900">{ownCount}</dd>
            </div>
          </dl>

          <p
            className="mt-4 text-sm text-slate-600"
            dangerouslySetInnerHTML={{ __html: th('settings.sampleText') }}
          />

          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <button className="btn-danger" onClick={() => setConfirmClear(true)} disabled={!hasSamples} id="clear-samples">
              <Trash2 className="h-4 w-4" /> {t('settings.clear')}
            </button>
            <button className="btn-secondary" onClick={handleLoad} disabled={loadingSamples || hasSamples} id="load-samples">
              <PackagePlus className="h-4 w-4" /> {loadingSamples ? t('settings.adding') : t('settings.load')}
            </button>
          </div>
        </section>

        {/* How numbers work */}
        <section className="card p-5 sm:p-6 lg:col-span-2">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
              <Info className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">{t('settings.calcTitle')}</h2>
              <p className="text-sm text-slate-500">{t('settings.calcSubtitle')}</p>
            </div>
          </div>
          <ul className="mt-5 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
            {(
              [
                th('settings.calcOut'),
                th('settings.calcLow', { units: LOW_STOCK_UNITS, percent: LOW_STOCK_RATIO * 100 }),
                th('settings.calcProfitUnit'),
                th('settings.calcInvestment'),
                th('settings.calcStockValue'),
                th('settings.calcRevenue'),
                th('settings.calcProfit'),
              ] as string[]
            ).map((html, i) => (
              <li key={i} dangerouslySetInnerHTML={{ __html: html }} />
            ))}
          </ul>
        </section>
      </div>

      <ConfirmDialog
        open={confirmClear}
        title={t('settings.confirmTitle')}
        message={t('settings.confirmText', { samples: sampleCount, own: ownCount })}
        confirmLabel={t('settings.confirmButton')}
        onConfirm={handleClear}
        onClose={() => setConfirmClear(false)}
      />
    </>
  );
}
