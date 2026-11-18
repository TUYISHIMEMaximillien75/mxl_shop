import { NavLink } from 'react-router-dom';
import { Calculator, LayoutDashboard, Package, PlusCircle, Settings, ShoppingBag, ShoppingCart, Store, X } from 'lucide-react';
import { useI18n } from '../i18n';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const { t } = useI18n();

  const NAV = [
    { to: '/', label: t('nav.sales'), icon: ShoppingCart, end: true },
    { to: '/restock', label: t('nav.restock'), icon: ShoppingBag, end: false },
    { to: '/dashboard', label: t('nav.dashboard'), icon: LayoutDashboard, end: false },
    { to: '/inventory', label: t('nav.inventory'), icon: Package, end: false },
    { to: '/add', label: t('nav.add'), icon: PlusCircle, end: false },
    { to: '/calculations', label: t('nav.calc'), icon: Calculator, end: false },
    { to: '/settings', label: t('nav.settings'), icon: Settings, end: false },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-slate-900/40 lg:hidden ${open ? 'block' : 'hidden'}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-brand-900 text-brand-50 transition-transform lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Main navigation"
      >
        <div className="flex h-16 items-center justify-between px-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500 text-white">
              <Store className="h-5 w-5" />
            </div>
            <div>
              <p className="text-base leading-tight font-bold text-white">MXL shops</p>
              <p className="text-xs text-brand-200/80">{t('app.tagline')}</p>
            </div>
          </div>
          <button className="rounded-lg p-1.5 text-brand-200 hover:bg-white/10 lg:hidden" onClick={onClose} aria-label={t('app.closeMenu')}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="mt-4 flex-1 space-y-1 px-3">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
              id={`nav-${to === '/' ? 'dashboard' : to.slice(1)}`}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors ${
                  isActive ? 'bg-white text-brand-800 shadow-sm' : 'text-brand-100 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="m-3 rounded-xl bg-white/5 p-4 text-xs text-brand-200/90">
          <p className="font-semibold text-white">{t('app.version')}</p>
          <p className="mt-1">{t('app.versionNote')}</p>
        </div>
      </aside>
    </>
  );
}
