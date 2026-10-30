import type { DateString } from '@/domain/ids';

/**
 * Date copy that is **stored**, not just drawn.
 *
 * Two formats live here because both are written into the log and must not drift
 * with a locale: the defer sheet's resolved date and the Daily Note's title. The
 * formats are the docs' own — `05-modules/notes.md` says the title *"defaults to
 * the date: "Tue, Sep 22""*, and the design lab draws the defer row as
 * `Sat 31 Oct`. Spelled out rather than localised, because a title written into an
 * append-only log cannot be rewritten when the device language changes.
 */

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

/** Parses a Day at UTC midnight, the anchor `domain/day.ts` uses. */
function utcDay(day: DateString): Date {
  return new Date(`${day}T00:00:00Z`);
}

/** `Wed 1 Oct` — the defer sheet's format. */
export function formatDay(day: DateString): string {
  const date = utcDay(day);
  return `${WEEKDAYS[date.getUTCDay()]} ${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]}`;
}

/** `Tue, Sep 22` — the Daily Note's title. */
export function dailyNoteTitle(day: DateString): string {
  const date = utcDay(day);
  return `${WEEKDAYS[date.getUTCDay()]}, ${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}`;
}

/** `15:15` from minutes past midnight, which is how the pickers hold a time. */
export function clockLabel(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}
