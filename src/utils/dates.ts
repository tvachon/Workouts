// Date helpers working in the device's LOCAL timezone. The database stores
// performed_on as a plain 'YYYY-MM-DD' date, so we deliberately avoid UTC
// conversions that could shift a workout to the wrong day.

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** Local date as 'YYYY-MM-DD'. */
export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Today's local date as 'YYYY-MM-DD'. */
export function todayISO(): string {
  return toISODate(new Date());
}

/** Parse a 'YYYY-MM-DD' string into a local Date (no timezone shift). */
export function fromISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map((p) => parseInt(p, 10));
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

/** Weekday index (0=Sun..6=Sat) for a 'YYYY-MM-DD' string. */
export function weekdayOf(iso: string): number {
  return fromISODate(iso).getDay();
}

/** Today's weekday index (0=Sun..6=Sat). */
export function todayWeekday(): number {
  return new Date().getDay();
}

/** Human-friendly date, e.g. 'Mon, Jun 22'. */
export function formatDisplayDate(iso: string): string {
  const d = fromISODate(iso);
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

/** Short chart-axis label, e.g. '6/22'. */
export function formatShortDate(iso: string): string {
  const d = fromISODate(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
