const rwf = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const num = new Intl.NumberFormat('en-US');

/** e.g. 12500 -> "12,500 RWF" */
export function formatRWF(value: number): string {
  return `${rwf.format(Math.round(value))} RWF`;
}

export function formatNumber(value: number): string {
  return num.format(value);
}

/** "2026-11-15" -> "15 Nov 2026" */
export function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Today's date as YYYY-MM-DD in local time. */
export function todayISO(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
