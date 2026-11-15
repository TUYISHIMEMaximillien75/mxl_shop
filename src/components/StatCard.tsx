import type { LucideIcon } from 'lucide-react';

type Tone = 'green' | 'blue' | 'amber' | 'violet' | 'slate' | 'teal';

const TONES: Record<Tone, string> = {
  green: 'bg-brand-50 text-brand-600',
  blue: 'bg-sky-50 text-sky-600',
  amber: 'bg-amber-50 text-amber-600',
  violet: 'bg-violet-50 text-violet-600',
  slate: 'bg-slate-100 text-slate-600',
  teal: 'bg-teal-50 text-teal-600',
};

interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  tone?: Tone;
  highlight?: boolean;
}

export function StatCard({ label, value, hint, icon: Icon, tone = 'green', highlight }: StatCardProps) {
  if (highlight) {
    return (
      <div className="rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 p-5 text-white shadow-sm">
        <div className="flex items-start justify-between">
          <p className="text-sm font-medium text-brand-100">{label}</p>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
            <Icon className="h-5 w-5" />
          </div>
        </div>
        <p className="mt-3 text-2xl font-bold tracking-tight break-words sm:text-[1.65rem]">{value}</p>
        {hint && <p className="mt-1 text-xs text-brand-100/90">{hint}</p>}
      </div>
    );
  }

  return (
    <div className="card p-5 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${TONES[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-3 text-2xl font-bold tracking-tight break-words text-slate-900 sm:text-[1.65rem]">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}
