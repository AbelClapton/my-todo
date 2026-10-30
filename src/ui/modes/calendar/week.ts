import type { CalendarEvent } from '@/domain/atoms/calendar-event';
import type { Task } from '@/domain/atoms/task';
import { addDays, isoWeekNumber } from '@/domain/day';
import type { DateString } from '@/domain/ids';
import type { LogEntry } from '@/domain/events';

import { computeDayViewState, selectDayView, type DayViewState } from '@/projections/day-view';

/**
 * The Week's model (`05-modules/calendar.md` §The Week view layout).
 *
 * Seven `day_view`s over **one fold**, not seven folds: the Week is the same
 * projection asked for seven dates, which is why it cannot disagree with the Day
 * it zooms from.
 *
 * The grid's window is a constant — *"the axis window is fixed from week to week"*,
 * because *"a window derived from each week's own earliest and latest events would
 * make two weeks incomparable at a glance, which is the view's entire purpose."*
 * The crop the lab draws is 08:00–18:00; the doc says that is legibility rather
 * than a proposal, so the numbers live here rather than in the component.
 */

/** The crop's first hour, and its length — the doc's 10-hour window. */
export const WEEK_WINDOW_START_HOUR = 8;
export const WEEK_WINDOW_HOURS = 10;

const DAYS_IN_WEEK = 7;

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const MONTH_NAMES = [
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

function parts(day: DateString): { weekday: string; number: number; month: string } {
  const date = new Date(`${day}T00:00:00Z`);
  return {
    weekday: WEEKDAY_NAMES[date.getUTCDay()] ?? 'Sun',
    number: date.getUTCDate(),
    month: MONTH_NAMES[date.getUTCMonth()] ?? 'Jan',
  };
}

/** The Monday that starts the week holding `day`. */
export function weekStartOf(day: DateString): DateString {
  const weekday = new Date(`${day}T00:00:00Z`).getUTCDay();
  // Sunday belongs to the week that began six days earlier.
  return addDays(day, weekday === 0 ? -6 : 1 - weekday);
}

export type WeekDay = {
  readonly date: DateString;
  /** `Mon` — the column header's first line. */
  readonly weekday: string;
  /** `21` — the column header's second line. */
  readonly dateNumber: string;
  readonly isToday: boolean;
  /** Timed events, drawn as proportional blocks. */
  readonly events: readonly CalendarEvent[];
  /** `all_day`, or spanning two or more Days: the band, which the Week can show whole. */
  readonly allDay: readonly CalendarEvent[];
  /** Placed tasks, drawn as points. */
  readonly points: readonly Task[];
  readonly tasksDue: number;
  readonly habitsDue: number;
};

export type WeekView = {
  readonly start: DateString;
  /** `Week 39 · 21–27 Sep` */
  readonly label: string;
  readonly days: readonly WeekDay[];
};

export type WeekParams = {
  /** Any Day in the week; the Monday is derived. */
  readonly date: DateString;
  readonly today: DateString;
  readonly tz_offset_minutes?: number;
};

export function computeWeekView(entries: readonly LogEntry[], params: WeekParams): WeekView {
  return selectWeekView(computeDayViewState(entries), params);
}

export function selectWeekView(state: DayViewState, params: WeekParams): WeekView {
  const offset = params.tz_offset_minutes ?? 0;
  const start = weekStartOf(params.date);

  const days = Array.from({ length: DAYS_IN_WEEK }, (_unused, index): WeekDay => {
    const date = addDays(start, index);
    const view = selectDayView(state, { date, tz_offset_minutes: offset });
    const { weekday, number } = parts(date);

    return {
      date,
      weekday,
      dateNumber: String(number),
      isToday: date === params.today,
      events: view.events.filter((event) => !event.all_day && !spansMoreThanOneDay(event, offset)),
      allDay: view.events.filter((event) => event.all_day || spansMoreThanOneDay(event, offset)),
      points: view.tasks_scheduled.filter(
        (task) => task.scheduled_time !== undefined && task.state === 'open',
      ),
      tasksDue: view.tasks_scheduled.filter((task) => task.state === 'open').length,
      habitsDue: view.habits_due.length,
    };
  });

  const end = addDays(start, DAYS_IN_WEEK - 1);
  const first = parts(start);
  const last = parts(end);
  const span =
    first.month === last.month
      ? `${first.number}–${last.number} ${last.month}`
      : `${first.number} ${first.month}–${last.number} ${last.month}`;

  return { start, label: `Week ${isoWeekNumber(start)} · ${span}`, days };
}

/** An event that covers two local Days, which only a week can show whole. */
function spansMoreThanOneDay(event: CalendarEvent, tzOffsetMinutes: number): boolean {
  if (event.end === undefined) {
    return false;
  }
  const shift = tzOffsetMinutes * 60_000;
  const startDay = new Date(Date.parse(event.start) + shift).toISOString().slice(0, 10);
  const endDay = new Date(Date.parse(event.end) + shift).toISOString().slice(0, 10);
  return startDay !== endDay;
}

/**
 * Whether two items in one column are drawn touching.
 *
 * The Week *"marks a conflict — a doubled edge on the block — and lets the Day
 * explain it"*, so all this answers is which blocks get the mark.
 */
export function hasConflict(
  marks: readonly { readonly startMinutes: number; readonly endMinutes: number }[],
  index: number,
): boolean {
  const self = marks[index];
  if (self === undefined) {
    return false;
  }
  return marks.some(
    (other, otherIndex) =>
      otherIndex !== index &&
      other.startMinutes < self.endMinutes &&
      self.startMinutes < other.endMinutes,
  );
}
