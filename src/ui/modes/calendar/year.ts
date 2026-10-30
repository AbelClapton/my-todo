import { addDays } from '@/domain/day';
import type { DateString } from '@/domain/ids';
import type { LogEntry } from '@/domain/events';

import { computeDayViewState, selectDayView, type DayViewState } from '@/projections/day-view';

/**
 * The Year's model (`05-modules/calendar.md` §The Year view layout).
 *
 * **Twelve rows, one per month, and the time axis is gone.** The doc is explicit
 * about why: seven days across a phone is 44px a column, so aligning days to
 * weekdays leaves each cell 9px tall and the Month's encoding — a mark positioned
 * by clock time — ceases to exist rather than degrading. So the Year keeps the day
 * and drops the weekday, and **the day's own height carries amount instead of
 * time**.
 *
 * Two consequences that are decisions rather than arithmetic:
 *
 * - **One load scale for the whole year.** A month is comparable with a month, so
 *   October's ridge and March's are read against each other; normalising per month
 *   would make a quiet February look like a busy June.
 * - **A quiet day still marks its place.** The screen draws a baseline for every
 *   day, because a strip with gaps in it reads as missing days rather than as
 *   empty ones.
 *
 * Load is the number of **events** on the Day. Tasks scheduled to a Day have no
 * extent to measure (`05-modules/calendar.md` §The band), so counting them would
 * make the instrument's unit something it cannot draw.
 */

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

export type YearDay = {
  readonly date: DateString;
  /** How many events the Day holds — the amount the column's height carries. */
  readonly load: number;
  /** The column's height as a percentage of its row, on the year's one scale. */
  readonly heightPercent: number;
  readonly isToday: boolean;
};

export type YearMonth = {
  readonly index: number;
  /** `Jan` — the row's label. */
  readonly label: string;
  readonly days: readonly YearDay[];
  /** The trailing figure: the month's total load. */
  readonly total: number;
  readonly isCurrent: boolean;
};

export type YearView = {
  readonly year: number;
  readonly months: readonly YearMonth[];
  /** The busiest Day of the year, which is what the scale is normalised against. */
  readonly maxLoad: number;
};

export type YearParams = {
  /** Any Day in the year. */
  readonly date: DateString;
  readonly today: DateString;
  readonly tz_offset_minutes?: number;
};

export function computeYearView(entries: readonly LogEntry[], params: YearParams): YearView {
  return selectYearView(computeDayViewState(entries), params);
}

export function selectYearView(state: DayViewState, params: YearParams): YearView {
  const offset = params.tz_offset_minutes ?? 0;
  const year = Number(params.date.slice(0, 4));

  const daysOfMonth = (index: number): readonly { date: DateString; load: number }[] => {
    const start = new Date(Date.UTC(year, index, 1)).toISOString().slice(0, 10) as DateString;
    const end = new Date(Date.UTC(year, index + 1, 1)).toISOString().slice(0, 10) as DateString;
    const days: { date: DateString; load: number }[] = [];
    for (let date = start; date < end; date = addDays(date, 1)) {
      days.push({
        date,
        load: selectDayView(state, { date, tz_offset_minutes: offset }).events.length,
      });
    }
    return days;
  };

  const byMonth = Array.from({ length: 12 }, (_unused, index) => daysOfMonth(index));
  const maxLoad = byMonth.flat().reduce((max, day) => Math.max(max, day.load), 0);

  const todayYear = Number(params.today.slice(0, 4));
  const todayMonth = Number(params.today.slice(5, 7));

  const months: YearMonth[] = byMonth.map((days, index) => ({
    index,
    label: (MONTH_NAMES[index] ?? 'January').slice(0, 3),
    days: days.map((day) => ({
      date: day.date,
      load: day.load,
      heightPercent: maxLoad === 0 ? 0 : (day.load / maxLoad) * 100,
      isToday: day.date === params.today,
    })),
    total: days.reduce((sum, day) => sum + day.load, 0),
    isCurrent: year === todayYear && index + 1 === todayMonth,
  }));

  return { year, months, maxLoad };
}
