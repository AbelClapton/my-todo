import { useNavigate } from '@tanstack/react-router';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import type { DateString } from '@/domain/ids';

import { FOCUS_RING } from '@/ui/components/focus-ring';
import { useLog } from '@/ui/data/use-log';
import { iconSize } from '@/ui/tokens';

import { computeYearView } from './year';
import { useCalendarZoom } from './use-calendar-zoom';

/**
 * The Year view (`05-modules/calendar.md` §The Year view layout).
 *
 * **An instrument, not a page**: twelve month rows, each labelled on the leading
 * edge, with the trailing figure carrying the month's total. It is `type-caption`
 * throughout, because it is read as a whole or not at all.
 *
 * **The strip is not aligned to weekdays.** Seven days across a phone is 44px a
 * column, which leaves a weekday-aligned cell 9px tall — too short for the Month's
 * vertical encoding to survive, and *"where the day is drawn, the weekday cannot be
 * kept"*. So a row is the month's days in calendar order and the column's height
 * carries **amount**: a heavy week is a ridge, a quiet one a floor. A day with
 * nothing on it still draws its baseline, or the strip's gaps read as missing days.
 *
 * **There is no now rule at this scale.** With no time axis left there is nothing
 * for one to cross; today is marked in the strip with the accent instead.
 */

const ICON_SIZE = iconSize['icon-md'];

export function YearScreen({ date }: { readonly date?: DateString }) {
  const navigate = useNavigate();
  const { entries } = useLog();
  const offset = -new Date().getTimezoneOffset();
  const today = new Date().toISOString().slice(0, 10) as DateString;
  const anchor = date ?? today;

  useCalendarZoom('year', anchor);

  const year = computeYearView(entries, { date: anchor, today, tz_offset_minutes: offset });

  const openMonth = (monthIndex: number) => {
    // Anchored mid-month, so no month is skipped by a shorter one.
    const day = `${year.year}-${String(monthIndex + 1).padStart(2, '0')}-15`;
    void navigate({ to: '/', search: { view: 'month', date: day as DateString } });
  };

  const shiftYear = (delta: number) => {
    const day = `${year.year + delta}-06-15`;
    void navigate({ to: '/', search: { view: 'year', date: day as DateString } });
  };

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-space-5 px-space-5 py-space-8">
      <header className="flex flex-col gap-space-3">
        <h1 className="text-type-title-1 text-text-primary">Calendar</h1>
        <div className="flex items-center justify-between gap-space-3">
          <button
            type="button"
            aria-label="Previous year"
            onClick={() => shiftYear(-1)}
            className={`flex min-h-touch-min min-w-touch-min items-center justify-center rounded-md text-text-secondary ${FOCUS_RING}`}
          >
            <ChevronLeft size={ICON_SIZE} aria-hidden />
          </button>
          <p className="text-type-subhead text-text-primary">{year.year}</p>
          <button
            type="button"
            aria-label="Next year"
            onClick={() => shiftYear(1)}
            className={`flex min-h-touch-min min-w-touch-min items-center justify-center rounded-md text-text-secondary ${FOCUS_RING}`}
          >
            <ChevronRight size={ICON_SIZE} aria-hidden />
          </button>
        </div>
      </header>

      <section aria-label="Year" className="flex flex-col gap-space-1">
        {year.months.map((month) => (
          <div key={month.index} className="flex items-center gap-space-3">
            <button
              type="button"
              onClick={() => openMonth(month.index)}
              className={[
                'w-space-10 shrink-0 rounded-sm text-left text-type-caption',
                month.isCurrent ? 'text-accent-text' : 'text-text-secondary',
                FOCUS_RING,
              ].join(' ')}
            >
              {month.label}
            </button>

            <button
              type="button"
              onClick={() => openMonth(month.index)}
              aria-label={`Open ${month.label} ${year.year}, ${month.total} ${
                month.total === 1 ? 'event' : 'events'
              }`}
              className={`flex h-year-row min-w-touch-min flex-1 items-end gap-px ${FOCUS_RING}`}
            >
              {month.days.map((day) => (
                <span
                  key={day.date}
                  aria-hidden
                  className="flex h-full flex-1 items-end"
                  title={day.date}
                >
                  {/* The floor: every day marks its place, so a quiet one reads as
                      quiet rather than missing. */}
                  <span
                    className={[
                      'w-full rounded-sm',
                      day.isToday ? 'bg-accent-default' : 'bg-border-strong',
                    ].join(' ')}
                    style={
                      day.load === 0
                        ? { height: '1px' }
                        : { height: `${Math.max(day.heightPercent, 6)}%` }
                    }
                  />
                </span>
              ))}
            </button>

            <span
              className={[
                'w-space-8 shrink-0 text-right text-type-caption tabular-nums',
                month.isCurrent ? 'text-accent-text' : 'text-text-secondary',
              ].join(' ')}
            >
              {month.total}
            </span>
          </div>
        ))}
      </section>
    </main>
  );
}
