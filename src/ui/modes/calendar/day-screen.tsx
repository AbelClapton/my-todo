import { Link } from '@tanstack/react-router';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useRef } from 'react';

import type { CalendarEvent } from '@/domain/atoms/calendar-event';
import type { Task } from '@/domain/atoms/task';
import { isoWeekNumber } from '@/domain/day';

import { FOCUS_RING } from '@/ui/components/focus-ring';
import { haptic } from '@/ui/haptics';
import { iconSize } from '@/ui/tokens';

import { formatDay } from '@/ui/format';

import { useDay } from './use-day';
import { useDayOpen } from './use-day-open';
import { useDayWrites } from './use-day-writes';
import {
  HOUR_HEIGHT_PX,
  MINUTES_PER_DAY,
  hourLabels,
  layoutAxis,
  midnightTopPx,
  minutesSinceBoundary,
  type AxisItem,
} from './timeline';

/**
 * The Calendar's Day view (`05-modules/calendar.md` §The Day view layout).
 *
 * The order is the doc's, and it is a fixed order rather than a fixed height:
 * header, now line, timeline (band then axis), habits due, day notes, top three,
 * completed. **A section with nothing to show does not render** — it takes its
 * heading and its gap with it.
 *
 * **What is not here, and why.** The metric log needs a protocol in baseline or
 * active (Phase 4), the date picker is the month overlay (a later Calendar pass),
 * and the Event detail is its own screen. Each is named rather than stubbed,
 * because a control that does nothing is worse than a section that has not
 * arrived.
 */

const MARK_SIZE = iconSize['icon-xs'];

export function DayScreen() {
  const day = useDay();
  const writes = useDayWrites();
  const { view } = day;

  useDayOpen(view, { isToday: day.isToday, tzOffsetMinutes: day.tzOffsetMinutes });

  const band: readonly { readonly id: string; readonly title: string; readonly hint: string }[] = [
    ...view.events
      .filter((event) => event.all_day)
      .map((event) => ({ id: event.id, title: event.title, hint: 'All day' })),
    ...view.tasks_scheduled
      .filter((task) => task.scheduled_time === undefined && task.state === 'open')
      .map((task) => ({ id: task.id, title: task.title, hint: 'No time' })),
  ];

  const axisItems: readonly AxisItem[] = [
    ...view.events
      .filter((event) => !event.all_day)
      .map((event): AxisItem => ({
        id: event.id,
        kind: 'event',
        title: event.title,
        startMinutes: minutesSinceBoundary(
          event.start,
          view.date,
          view.boundary_hour,
          day.tzOffsetMinutes,
        ),
        durationMinutes: durationOf(event),
      })),
    ...view.tasks_scheduled
      .filter((task) => task.scheduled_time !== undefined && task.state === 'open')
      .map((task): AxisItem => ({
        id: task.id,
        kind: 'task',
        title: task.title,
        startMinutes: minutesSinceBoundary(
          `${view.date}T${task.scheduled_time ?? '00:00'}:00.000Z`,
          view.date,
          view.boundary_hour,
          day.tzOffsetMinutes,
        ),
        // A task placed at an hour has a position and no stated extent (ADR 0025),
        // so it draws at the floor.
        durationMinutes: 0,
      })),
  ];

  const clusters = layoutAxis(axisItems);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-space-7 px-space-5 py-space-8">
      <header className="flex flex-col gap-space-3">
        <h1 className="text-type-title-1 text-text-primary">Calendar</h1>
        <div className="flex items-center justify-between gap-space-3">
          <button
            type="button"
            aria-label="Previous day"
            onClick={day.goToPreviousDay}
            className={`flex min-h-touch-min min-w-touch-min items-center justify-center rounded-md text-text-secondary ${FOCUS_RING}`}
          >
            <ChevronLeft size={MARK_SIZE} aria-hidden />
          </button>
          <p className="text-type-subhead text-text-primary">
            {formatDay(day.date)}
            <span className="text-type-footnote text-text-secondary">
              {' '}
              · week {isoWeekNumber(day.date)}
            </span>
          </p>
          <button
            type="button"
            aria-label="Next day"
            onClick={day.goToNextDay}
            className={`flex min-h-touch-min min-w-touch-min items-center justify-center rounded-md text-text-secondary ${FOCUS_RING}`}
          >
            <ChevronRight size={MARK_SIZE} aria-hidden />
          </button>
        </div>
        {day.isToday ? null : (
          <button
            type="button"
            onClick={day.goToToday}
            className={`self-center rounded-md px-space-4 py-space-2 text-type-footnote text-accent-text ${FOCUS_RING}`}
          >
            Today
          </button>
        )}
        {/* The `+` is present in every Calendar view, because the Calendar creates
            something (`03-experience/app-shell.md` §The header). */}
        <Link
          to="/event/new"
          aria-label="New event"
          className={`flex min-h-touch-min items-center justify-center self-end rounded-md border border-border-default px-space-4 text-type-subhead text-text-primary ${FOCUS_RING}`}
        >
          +
        </Link>
      </header>

      {/* The now line: chrome, and it does not scroll (`06-flows/doing-the-day.md`). */}
      <p className="flex items-baseline gap-space-2 text-type-body text-text-secondary">
        <span className="text-type-footnote text-text-secondary">NOW:</span>
        <span className="text-text-primary">{day.nowLine.label}</span>
      </p>

      {band.length === 0 ? null : (
        <section aria-label="All day" className="flex flex-col gap-space-1">
          {band.map((item) => (
            <div key={item.id} className="flex min-h-control-md items-center gap-space-3">
              <span className="min-w-0 flex-1 text-type-body text-text-primary">{item.title}</span>
              <span className="text-type-footnote text-text-secondary">{item.hint}</span>
            </div>
          ))}
        </section>
      )}

      {clusters.length === 0 ? (
        // One muted line in place, and no action: the action belongs to the now
        // line (`05-modules/calendar.md` §Empty, waiting, error).
        <p className="text-type-body text-text-secondary">Nothing scheduled.</p>
      ) : (
        <Timeline
          boundaryHour={view.boundary_hour}
          clusters={clusters}
          nowMinutes={
            day.isToday
              ? minutesSinceBoundary(
                  new Date().toISOString(),
                  view.date,
                  view.boundary_hour,
                  day.tzOffsetMinutes,
                )
              : undefined
          }
        />
      )}

      {view.habits_due.length === 0 ? null : (
        <section aria-label="Habits due" className="flex flex-col">
          <h2 className="pb-space-2 text-type-title-3 text-text-primary">Habits due</h2>
          {view.habits_due.map((habit) => {
            const isDone = habit.outcome === 'done_full' || habit.outcome === 'done_minimum';
            return (
              <div key={habit.id} className="flex min-h-row-default items-center gap-space-3">
                <button
                  type="button"
                  aria-pressed={isDone}
                  aria-label={isDone ? `Uncheck ${habit.name}` : `Check ${habit.name}`}
                  disabled={!writes.canWrite}
                  onClick={() => {
                    if (!writes.canWrite) {
                      return;
                    }
                    if (isDone) {
                      void writes.uncheckHabit(habit.id, day.date);
                      return;
                    }
                    haptic('completion');
                    void writes.checkHabit(habit.id, day.date);
                  }}
                  className="flex min-h-touch-min min-w-touch-min shrink-0 items-center justify-center"
                >
                  <span
                    aria-hidden
                    className={
                      isDone
                        ? 'flex h-control-xs w-control-xs items-center justify-center rounded-sm border border-accent-default bg-accent-default text-on-fill'
                        : 'flex h-control-xs w-control-xs items-center justify-center rounded-sm border border-border-strong bg-surface-1'
                    }
                  >
                    {isDone ? <Check size={MARK_SIZE} /> : null}
                  </span>
                </button>
                <span className="min-w-0 flex-1 text-type-body text-text-primary">
                  {habit.name}
                </span>
                {habit.minimum_viable === undefined ? null : (
                  <span className="text-type-footnote text-text-secondary">
                    {habit.minimum_viable}
                  </span>
                )}
              </div>
            );
          })}
        </section>
      )}

      {day.notes.length === 0 ? null : (
        <section aria-label="Day notes" className="flex flex-col gap-space-3">
          <h2 className="text-type-title-3 text-text-primary">Notes</h2>
          {day.notes.map((note) => (
            <article
              key={note.id}
              className="flex flex-col gap-space-1 rounded-lg border border-border-subtle bg-surface-1 p-space-4"
            >
              {note.title === undefined ? null : (
                <h3 className="text-type-subhead text-text-primary">{note.title}</h3>
              )}
              <p className="line-clamp-2 text-type-body text-text-secondary">{note.body}</p>
            </article>
          ))}
        </section>
      )}

      {view.top_three.length === 0 ? null : (
        <section aria-label="Top three" className="flex flex-col">
          <h2 className="pb-space-2 text-type-title-3 text-text-primary">Top three</h2>
          {view.top_three.map((task) => (
            <DayTaskRow
              key={task.id}
              task={task}
              isDone={task.state === 'completed'}
              canWrite={writes.canWrite}
              onComplete={() => {
                haptic('completion');
                void writes.completeTask(task.id);
              }}
            />
          ))}
        </section>
      )}

      {view.tasks_completed.length === 0 ? null : (
        <section aria-label="Completed" className="flex flex-col">
          <h2 className="pb-space-2 text-type-title-3 text-text-primary">Completed</h2>
          {view.tasks_completed.map((task) => (
            <DayTaskRow key={task.id} task={task} isDone canWrite={false} onComplete={() => {}} />
          ))}
        </section>
      )}
    </main>
  );
}

/** An event's drawn duration, and the floor covers the rest. */
function durationOf(event: CalendarEvent): number {
  if (event.end === undefined) {
    return 0;
  }
  return (Date.parse(event.end) - Date.parse(event.start)) / 60_000;
}

function Timeline({
  boundaryHour,
  clusters,
  nowMinutes,
}: {
  readonly boundaryHour: number;
  readonly clusters: ReturnType<typeof layoutAxis>;
  readonly nowMinutes: number | undefined;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const dayHeightPx = (MINUTES_PER_DAY / 60) * HOUR_HEIGHT_PX;

  // The axis opens at now, because the Day is 1344px and the crop is 560
  // (`05-modules/calendar.md` §The axis).
  useEffect(() => {
    const element = scroller.current;
    if (element === null || nowMinutes === undefined) {
      return;
    }
    element.scrollTop = Math.max(0, (nowMinutes / 60) * HOUR_HEIGHT_PX - 120);
  }, [nowMinutes]);

  return (
    <div
      ref={scroller}
      role="group"
      aria-label="Timeline"
      className="relative h-timeline-crop overflow-y-auto rounded-md border border-border-subtle"
    >
      <div className="relative" style={{ height: dayHeightPx }}>
        {hourLabels(boundaryHour).map((hour) => (
          <div key={hour.label} className="absolute inset-x-space-0" style={{ top: hour.topPx }}>
            <span className="absolute left-space-0 -translate-y-space-3 pl-space-2 text-type-footnote text-text-secondary">
              {hour.label}
            </span>
            <div className="ml-space-10 border-t border-border-subtle" />
          </div>
        ))}

        <div
          aria-hidden
          className="absolute inset-x-space-0 border-t border-border-strong"
          style={{ top: midnightTopPx(boundaryHour) }}
        />

        {nowMinutes === undefined ? null : (
          <div
            aria-hidden
            className="absolute inset-x-space-0 border-t-2 border-accent-default"
            style={{ top: (nowMinutes / 60) * HOUR_HEIGHT_PX }}
          />
        )}

        {clusters.map((cluster, index) => (
          <div
            key={cluster.marks[0]?.id ?? index}
            className="absolute inset-y-space-0 left-space-10 right-space-0"
          >
            {cluster.marks.map((mark) => (
              <div
                key={mark.id}
                className={[
                  'absolute overflow-hidden rounded-sm border px-space-2',
                  mark.kind === 'event'
                    ? 'border-border-default bg-surface-2 text-text-primary'
                    : 'border-accent-default bg-accent-subtle text-accent-text',
                ].join(' ')}
                style={{
                  top: mark.topPx,
                  height: mark.heightPx,
                  // A 1px seam is what makes a split countable rather than merely
                  // seen (`05-modules/calendar.md` §Concurrent items).
                  left: `calc(${(mark.lane * 100) / mark.lanes}% + ${mark.lane === 0 ? '0px' : '1px'})`,
                  width: `calc(${100 / mark.lanes}% - 1px)`,
                }}
              >
                <span className="line-clamp-1 text-type-footnote">{mark.title}</span>
              </div>
            ))}
            {cluster.overflow === 0 ? null : (
              <span
                className="absolute right-space-1 rounded-full bg-surface-3 px-space-2 text-type-footnote text-text-secondary"
                style={{ top: cluster.marks[0]?.topPx ?? 0 }}
              >
                +{cluster.overflow}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function DayTaskRow({
  task,
  isDone,
  canWrite,
  onComplete,
}: {
  readonly task: Task;
  readonly isDone: boolean;
  readonly canWrite: boolean;
  readonly onComplete: () => void;
}) {
  return (
    <div className="flex min-h-row-default items-center gap-space-3">
      <button
        type="button"
        aria-pressed={isDone}
        aria-label={isDone ? `${task.title} is done` : `Complete ${task.title}`}
        disabled={!canWrite}
        onClick={onComplete}
        className="flex min-h-touch-min min-w-touch-min shrink-0 items-center justify-center"
      >
        <span
          aria-hidden
          className={
            isDone
              ? 'flex h-control-xs w-control-xs items-center justify-center rounded-sm border border-accent-default bg-accent-default text-on-fill'
              : 'flex h-control-xs w-control-xs items-center justify-center rounded-sm border border-border-strong bg-surface-1'
          }
        >
          {isDone ? <Check size={MARK_SIZE} /> : null}
        </span>
      </button>
      <span
        className={
          isDone
            ? 'min-w-0 flex-1 text-type-body text-text-secondary line-through'
            : 'min-w-0 flex-1 text-type-body text-text-primary'
        }
      >
        {task.title}
      </span>
    </div>
  );
}
