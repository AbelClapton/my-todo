import type { DateString, Instant } from './ids';

/**
 * Day arithmetic.
 *
 * A Day is a local-timezone `YYYY-MM-DD` and **not** a 24-hour window in UTC
 * (`02-architecture/day-as-unit.md`), so every function here works on the
 * *calendar* date and parses it at UTC midnight deliberately: the arithmetic is
 * "how many calendar days apart", and anchoring both ends at UTC midnight is
 * what makes it exact. Nothing here converts an instant into a Day — that needs
 * a timezone offset, which is why the offset is a parameter rather than a
 * guess.
 */

const MS_PER_DAY = 86_400_000;

/** Parses a Day at UTC midnight. The anchor is internal and never leaves here. */
function dayToUtcMs(day: DateString): number {
  return Date.parse(`${day}T00:00:00Z`);
}

/** `to - from`, in whole calendar days. Negative when `to` is earlier. */
export function daysBetween(from: DateString, to: DateString): number {
  return Math.round((dayToUtcMs(to) - dayToUtcMs(from)) / MS_PER_DAY);
}

export function addDays(day: DateString, delta: number): DateString {
  const shifted = new Date(dayToUtcMs(day) + delta * MS_PER_DAY);
  // The slice of an ISO string is exactly a Day; TS cannot know that.
  return shifted.toISOString().slice(0, 10) as DateString;
}

export function isBefore(a: DateString, b: DateString): boolean {
  return a < b;
}

export function isSameDay(a: DateString, b: DateString): boolean {
  return a === b;
}

/**
 * The Day an instant falls on, in a local timezone given as an offset in
 * minutes east of UTC (the shape `day.opened` records).
 */
export function localDayOf(instant: Instant, tzOffsetMinutes: number): DateString {
  const local = new Date(Date.parse(instant) + tzOffsetMinutes * 60_000);
  return local.toISOString().slice(0, 10) as DateString;
}
