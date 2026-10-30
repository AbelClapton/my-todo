import { useNavigate } from '@tanstack/react-router';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import type { DateString } from '@/domain/ids';

import { FOCUS_RING } from '@/ui/components/focus-ring';
import { useLog } from '@/ui/data/use-log';
import { iconSize } from '@/ui/tokens';

import { useCalendarZoom } from './use-calendar-zoom';
import { MONTH_COLUMNS, computeMonthView } from './month';

/**
 * The Month view (`05-modules/calendar.md` §The Month view layout).
 *
 * **Seven columns and, always, six rows.** The fixed row count is what makes a
 * mark mean the same thing in January as in June: marks are positioned as a
 * percentage of their cell, so a grid that grew a row would re-scale every other
 * month's data. The neighbouring months' days are muted rather than blanked,
 * because the fixed grid needs them.
 *
 * A cell holds **a date and a column of 2px marks, and nothing else** — the date is
 * the only text in the grid, and density is a *position* rather than a count, which
 * is the whole reason the marks carry their own time.
 */

const ICON_SIZE = iconSize['icon-md'];

const WEEKDAY_INITIALS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

export function MonthScreen({ date }: { readonly date?: DateString }) {
  const navigate = useNavigate();
  const { entries } = useLog();
  const offset = -new Date().getTimezoneOffset();
  const today = new Date().toISOString().slice(0, 10) as DateString;
  const anchor = date ?? today;

  useCalendarZoom('month', anchor);

  const month = computeMonthView(entries, { date: anchor, today, tz_offset_minutes: offset });

  const openDay = (day: DateString) => {
    void navigate({ to: '/', search: { view: 'day', date: day } });
  };

  /** The month before or after, anchored mid-month so no month is skipped. */
  const shiftMonth = (delta: number) => {
    const current = new Date(`${anchor}T00:00:00Z`);
    const shifted = new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth() + delta, 15));
    openDay(shifted.toISOString().slice(0, 10) as DateString);
  };

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-space-5 px-space-5 py-space-8">
      <header className="flex flex-col gap-space-3">
        <h1 className="text-type-title-1 text-text-primary">Calendar</h1>
        <div className="flex items-center justify-between gap-space-3">
          <button
            type="button"
            aria-label="Previous month"
            onClick={() => shiftMonth(-1)}
            className={`flex min-h-touch-min min-w-touch-min items-center justify-center rounded-md text-text-secondary ${FOCUS_RING}`}
          >
            <ChevronLeft size={ICON_SIZE} aria-hidden />
          </button>
          <p className="text-type-subhead text-text-primary">{month.label}</p>
          <button
            type="button"
            aria-label="Next month"
            onClick={() => shiftMonth(1)}
            className={`flex min-h-touch-min min-w-touch-min items-center justify-center rounded-md text-text-secondary ${FOCUS_RING}`}
          >
            <ChevronRight size={ICON_SIZE} aria-hidden />
          </button>
        </div>
      </header>

      <section aria-label="Month">
        <ul
          className="grid"
          style={{ gridTemplateColumns: `repeat(${MONTH_COLUMNS}, minmax(0, 1fr))` }}
        >
          {WEEKDAY_INITIALS.map((weekday) => (
            <li
              key={weekday}
              className="pb-space-1 text-center text-type-caption text-text-secondary"
            >
              {weekday}
            </li>
          ))}
        </ul>

        <ul
          className="grid border-l border-t border-border-subtle"
          style={{ gridTemplateColumns: `repeat(${MONTH_COLUMNS}, minmax(0, 1fr))` }}
        >
          {month.cells.map((cell) => (
            <li key={cell.date} className="relative border-b border-r border-border-subtle">
              <button
                type="button"
                onClick={() => openDay(cell.date)}
                aria-label={`Open ${cell.date}`}
                className="flex h-month-cell w-full flex-col items-start gap-space-1 p-space-1 text-left"
              >
                <span
                  className={[
                    'text-type-caption',
                    cell.isToday
                      ? 'text-accent-text'
                      : cell.inMonth
                        ? 'text-text-primary'
                        : 'text-text-secondary',
                  ].join(' ')}
                >
                  {cell.dateNumber}
                </span>
                <span className="relative w-full flex-1" aria-hidden>
                  {cell.marks.map((mark) => (
                    <span
                      key={mark.id}
                      className="absolute inset-x-space-1 h-space-1 rounded-full bg-accent-default"
                      style={{ top: `${mark.topPercent}%` }}
                    />
                  ))}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
