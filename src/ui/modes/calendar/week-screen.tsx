import { useNavigate } from '@tanstack/react-router';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';

import { addDays } from '@/domain/day';
import type { DateString } from '@/domain/ids';

import { FOCUS_RING } from '@/ui/components/focus-ring';
import { useLog } from '@/ui/data/use-log';
import { iconSize } from '@/ui/tokens';

import { useCalendarZoom } from './use-calendar-zoom';
import { HOUR_HEIGHT_PX, hourLabels, minutesSinceBoundary } from './timeline';
import { WEEK_WINDOW_HOURS, WEEK_WINDOW_START_HOUR, computeWeekView, hasConflict } from './week';

/**
 * The Week view (`05-modules/calendar.md` §The Week view layout).
 *
 * Five parts, in the doc's order: column headers, the all-day band, the grid, the
 * focus line, the counts strip. Three rules are load-bearing and each is visible
 * in the code below:
 *
 * - **One gutter for seven columns.** All seven would label the same hours.
 * - **Titles are not drawn in the grid.** *"A column is 45px wide and a 30-minute
 *   event is 28px tall, so a proportional block has no room for a name at either
 *   scale."* Identity is one tap away, in the Day.
 * - **Conflicts are marked, not split.** A 45px column split in two leaves 22px and
 *   no name at all, so the Week doubles the block's edge and lets the Day explain it.
 *
 * The month and year are not here: `Cmd -` lands back on the Day, and the views
 * beyond the Week have not been built.
 */

const ICON_SIZE = iconSize['icon-md'];

export function WeekScreen({ date }: { readonly date?: DateString }) {
  const navigate = useNavigate();
  const { entries } = useLog();
  const offset = -new Date().getTimezoneOffset();
  const today = new Date().toISOString().slice(0, 10) as DateString;
  const anchor = date ?? today;
  const [selected, setSelected] = useState<DateString>(today);

  useCalendarZoom('week', anchor);

  const week = computeWeekView(entries, { date: anchor, today, tz_offset_minutes: offset });
  const labels = hourLabels(WEEK_WINDOW_START_HOUR);

  const openDay = (day: DateString) => {
    void navigate({ to: '/', search: { view: 'day', date: day } });
  };

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-space-7 px-space-5 py-space-8">
      <header className="flex flex-col gap-space-3">
        <h1 className="text-type-title-1 text-text-primary">Calendar</h1>
        <div className="flex items-center justify-between gap-space-3">
          <button
            type="button"
            aria-label="Previous week"
            onClick={() => openDay(addDays(week.start, -7))}
            className={`flex min-h-touch-min min-w-touch-min items-center justify-center rounded-md text-text-secondary ${FOCUS_RING}`}
          >
            <ChevronLeft size={ICON_SIZE} aria-hidden />
          </button>
          <p className="text-type-subhead text-text-primary">{week.label}</p>
          <button
            type="button"
            aria-label="Next week"
            onClick={() => openDay(addDays(week.start, 7))}
            className={`flex min-h-touch-min min-w-touch-min items-center justify-center rounded-md text-text-secondary ${FOCUS_RING}`}
          >
            <ChevronRight size={ICON_SIZE} aria-hidden />
          </button>
        </div>
      </header>

      <section aria-label="Week" className="flex flex-col">
        <div className="flex">
          <div className="w-space-10 shrink-0" aria-hidden />
          <ul className="grid flex-1 grid-cols-7">
            {week.days.map((day) => (
              <li key={day.date} className="flex flex-col items-center py-space-2">
                <span
                  className={
                    day.isToday
                      ? 'text-type-caption text-accent-text'
                      : 'text-type-caption text-text-secondary'
                  }
                >
                  {day.weekday}
                </span>
                <span
                  className={
                    day.isToday
                      ? 'text-type-subhead text-accent-text'
                      : 'text-type-subhead text-text-primary'
                  }
                >
                  {day.dateNumber}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {week.days.some((day) => day.allDay.length > 0) ? (
          <div className="flex border-t border-border-subtle py-space-1">
            <div className="w-space-10 shrink-0" aria-hidden />
            <ul className="grid flex-1 grid-cols-7">
              {week.days.map((day) => (
                <li key={day.date} className="flex flex-col gap-space-1 px-space-1">
                  {day.allDay.map((event) => (
                    <span
                      key={event.id}
                      className="truncate rounded-sm bg-surface-2 px-space-1 text-type-caption text-text-primary"
                    >
                      {event.title}
                    </span>
                  ))}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="relative flex h-timeline-crop overflow-y-auto border-t border-border-subtle">
          <div className="relative w-space-10 shrink-0" aria-hidden>
            {labels.map((hour) => (
              <span
                key={hour.label}
                className="absolute left-space-0 text-type-caption text-text-secondary"
                style={{ top: hour.topPx }}
              >
                {hour.label}
              </span>
            ))}
          </div>

          <div className="relative flex-1">
            {labels.map((hour) => (
              <div
                key={hour.label}
                aria-hidden
                className="absolute inset-x-space-0 border-t border-border-subtle"
                style={{ top: hour.topPx }}
              />
            ))}

            <ul className="grid h-full grid-cols-7">
              {week.days.map((day) => {
                const items = day.events.map((event) => {
                  const startMinutes = minutesSinceBoundary(
                    event.start,
                    // The crop is a window inside the Day, so the minutes are
                    // measured from the boundary and then offset to the crop.
                    day.date,
                    0,
                    offset,
                  );
                  const duration =
                    event.end === undefined
                      ? 0
                      : (Date.parse(event.end) - Date.parse(event.start)) / 60_000;
                  return { event, startMinutes, duration };
                });

                const marks = [
                  ...items.map((item) => ({
                    key: item.event.id,
                    title: item.event.title,
                    startMinutes: item.startMinutes,
                    endMinutes: item.startMinutes + Math.max(item.duration, 20),
                  })),
                  ...day.points.map((task) => ({
                    key: task.id,
                    title: task.title,
                    startMinutes: Number((task.scheduled_time ?? '00:00').slice(0, 2)) * 60,
                    endMinutes: Number((task.scheduled_time ?? '00:00').slice(0, 2)) * 60 + 20,
                  })),
                ].map((mark) => ({
                  ...mark,
                  startMinutes: mark.startMinutes - WEEK_WINDOW_START_HOUR * 60,
                }));

                return (
                  <li
                    key={day.date}
                    className={
                      selected === day.date
                        ? 'relative border-l border-accent-default bg-surface-1'
                        : 'relative border-l border-border-subtle'
                    }
                  >
                    <button
                      type="button"
                      aria-label={`Select ${day.weekday} ${day.dateNumber}`}
                      aria-pressed={selected === day.date}
                      onClick={() => setSelected(day.date)}
                      className="absolute inset-space-0"
                    />
                    {marks.map((mark, index) => {
                      const top = (mark.startMinutes / 60) * HOUR_HEIGHT_PX;
                      const height = Math.max(
                        19,
                        ((mark.endMinutes - mark.startMinutes) / 60) * HOUR_HEIGHT_PX,
                      );
                      return (
                        <span
                          key={mark.key}
                          aria-hidden
                          className={
                            hasConflict(marks, index)
                              ? 'absolute inset-x-space-1 rounded-sm border-l-2 border-accent-default bg-surface-2'
                              : 'absolute inset-x-space-1 rounded-sm bg-surface-2'
                          }
                          style={{ top, height }}
                        />
                      );
                    })}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <ul className="grid grid-cols-7 border-t border-border-subtle py-space-2">
          {week.days.map((day) => (
            <li
              key={day.date}
              className="flex flex-col items-center text-type-caption text-text-secondary"
            >
              <span>{day.tasksDue} tasks</span>
              <span>{day.habitsDue} habits</span>
            </li>
          ))}
        </ul>
      </section>

      <div className="flex items-center justify-between gap-space-4 rounded-md border border-border-subtle p-space-4">
        <p className="text-type-subhead text-text-primary">
          {week.days.find((day) => day.date === selected)?.weekday}{' '}
          {week.days.find((day) => day.date === selected)?.dateNumber}
          <span className="pl-space-2 text-type-footnote text-text-secondary">
            {week.days.find((day) => day.date === selected)?.tasksDue} tasks ·{' '}
            {week.days.find((day) => day.date === selected)?.habitsDue} habits
          </span>
        </p>
        <button
          type="button"
          onClick={() => openDay(selected)}
          className={`rounded-md px-space-4 py-space-2 text-type-footnote text-accent-text ${FOCUS_RING}`}
        >
          Open day
        </button>
      </div>
    </main>
  );
}

/** Exported for the tests that read the window back. */
export const WEEK_END_HOUR = WEEK_WINDOW_START_HOUR + WEEK_WINDOW_HOURS;
