import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Globe, Menu, Store } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { useI18n, type Locale } from '../i18n';

export function Layout() {
  const [open, setOpen] = useState(false);
  const { locale, setLocale, t } = useI18n();

  const toggle = () => setLocale(locale === 'en' ? 'rw' : 'en');
  const otherLabel: Record<Locale, string> = { en: 'RW', rw: 'EN' };

  return (
    <div className="min-h-screen">
      <Sidebar open={open} onClose={() => setOpen(false)} />

      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur">
          {/* Mobile: hamburger + logo */}
          <button className="icon-btn lg:hidden" onClick={() => setOpen(true)} aria-label={t('app.openMenu')} id="open-menu">
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2 lg:hidden">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600 text-white">
              <Store className="h-4 w-4" />
            </div>
            <span className="font-bold text-slate-900">MXL shops</span>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Language toggle — always visible */}
          <button
            id="lang-toggle"
            onClick={toggle}
            aria-label={t('app.language')}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            <Globe className="h-3.5 w-3.5 text-brand-600" />
            {otherLabel[locale]}
          </button>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
