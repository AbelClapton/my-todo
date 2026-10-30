import { addDays } from '@/domain/day';
import type { DateString } from '@/domain/ids';
import type { LogEntry } from '@/domain/events';

import { computeDayViewState, selectDayView, type DayViewState } from '@/projections/day-view';

import { WEEK_WINDOW_HOURS, WEEK_WINDOW_START_HOUR, weekStartOf } from './week';

/**
 * The Month's model (`05-modules/calendar.md` §The Month view layout).
 *
 * **Always six rows — 42 cells — with the neighbouring months drawn muted.** The
 * fixed row count is load-bearing: *"a mark is positioned as a percentage of its
 * cell's height, so a grid that grew a row would silently re-scale every other
 * month's data"*. The muted days exist because the fixed grid needs them, not the
 * other way round.
 *
 * **A cell holds a date and a column of marks, and nothing else.** The date is the
 * only text in the grid, and each mark is 2px positioned by clock time on the same
 * window the Week uses, so pinching between the two views draws the same day in
 * the same place. "Density" is a position rather than a count, because a count
 * cannot tell apart three events between 09:00 and 11:30 from one at 08:30, one at
 * 13:00 and one at 17:30.
 */

export const MONTH_COLUMNS = 7;
export const MONTH_ROWS = 6;
export const MONTH_CELLS = MONTH_COLUMNS * MONTH_ROWS;

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

/** Where a mark sits in its cell, as a percentage of the cell's height. */
export function markTopPercent(start: string, day: DateString, tzOffsetMinutes: number): number {
  // Local midnight of the cell's Day, as an instant: the Day is a calendar date, so
  // the offset is what turns it into a moment on this device.
  const midnightMs = Date.parse(`${day}T00:00:00Z`) - tzOffsetMinutes * 60_000;
  const minutesIntoDay = (Date.parse(start) - midnightMs) / 60_000;
  // Clamped to the crop the Week draws, so the same event sits in the same place
  // in both views.
  const fromCrop = minutesIntoDay - WEEK_WINDOW_START_HOUR * 60;
  const withinCrop = Math.max(0, Math.min(WEEK_WINDOW_HOURS * 60, fromCrop));
  return (withinCrop / (WEEK_WINDOW_HOURS * 60)) * 100;
}

export type MonthCell = {
  readonly date: DateString;
  readonly dateNumber: string;
  /** False for the neighbouring months' days, which are drawn muted, not blank. */
  readonly inMonth: boolean;
  readonly isToday: boolean;
  readonly marks: readonly { readonly id: string; readonly topPercent: number }[];
};

export type MonthView = {
  readonly start: DateString;
  /** `October 2026` */
  readonly label: string;
  readonly cells: readonly MonthCell[];
};

export type MonthParams = {
  /** Any Day in the month. */
  readonly date: DateString;
  readonly today: DateString;
  readonly tz_offset_minutes?: number;
};

export function computeMonthView(entries: readonly LogEntry[], params: MonthParams): MonthView {
  return selectMonthView(computeDayViewState(entries), params);
}

export function selectMonthView(state: DayViewState, params: MonthParams): MonthView {
  const offset = params.tz_offset_minutes ?? 0;
  const anchor = new Date(`${params.date}T00:00:00Z`);
  const firstOfMonth = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), 1))
    .toISOString()
    .slice(0, 10) as DateString;
  // The grid starts on the Monday of the week that holds the 1st.
  const start = weekStartOf(firstOfMonth);
  const monthIndex = anchor.getUTCMonth();

  const cells = Array.from({ length: MONTH_CELLS }, (_unused, index): MonthCell => {
    const date = addDays(start, index);
    const cellDate = new Date(`${date}T00:00:00Z`);
    const view = selectDayView(state, { date, tz_offset_minutes: offset });

    return {
      date,
      dateNumber: String(cellDate.getUTCDate()),
      inMonth: cellDate.getUTCMonth() === monthIndex,
      isToday: date === params.today,
      marks: view.events
        .filter((event) => !event.all_day)
        .map((event) => ({
          id: event.id,
          topPercent: markTopPercent(event.start, date, offset),
        })),
    };
  });

  return {
    start,
    label: `${MONTH_NAMES[monthIndex] ?? 'January'} ${anchor.getUTCFullYear()}`,
    cells,
  };
}
