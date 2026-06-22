// Weekday convention matches JavaScript Date.getDay(): 0 = Sunday ... 6 = Saturday.
// This is also what the routine_days.weekday column stores in the database.
export interface Weekday {
  index: number;
  short: string;
  full: string;
}

export const WEEKDAYS: Weekday[] = [
  { index: 0, short: 'Sun', full: 'Sunday' },
  { index: 1, short: 'Mon', full: 'Monday' },
  { index: 2, short: 'Tue', full: 'Tuesday' },
  { index: 3, short: 'Wed', full: 'Wednesday' },
  { index: 4, short: 'Thu', full: 'Thursday' },
  { index: 5, short: 'Fri', full: 'Friday' },
  { index: 6, short: 'Sat', full: 'Saturday' },
];

export function weekdayLabel(index: number): string {
  return WEEKDAYS[index]?.full ?? 'Unknown';
}
