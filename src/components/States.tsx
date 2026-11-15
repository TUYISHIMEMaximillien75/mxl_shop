import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { useI18n } from '../i18n';

export function EmptyState({ icon: Icon, title, message, action }: { icon: LucideIcon; title: string; message: string; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center px-6 py-14 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
        <Icon className="h-7 w-7" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-slate-500">{message}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function LoadingState() {
  const { t } = useI18n();
  return (
    <div className="card flex items-center justify-center gap-3 py-16 text-sm text-slate-500">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
      {t('common.loading')}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { t } = useI18n();
  return (
    <div className="card border-red-200 bg-red-50 px-6 py-10 text-center">
      <p className="font-semibold text-red-800">{t('common.loadError')}</p>
      <p className="mt-1 text-sm text-red-700">{message}</p>
      <button className="btn-secondary mt-4" onClick={onRetry}>
        {t('common.tryAgain')}
      </button>
    </div>
  );
}
