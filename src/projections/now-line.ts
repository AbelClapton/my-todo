import type { CalendarEvent } from '@/domain/atoms/calendar-event';
import type { Task } from '@/domain/atoms/task';
import type { DateString, Instant } from '@/domain/ids';
import type { LogEntry } from '@/domain/events';

import { computeDayViewState, selectDayView, type DayViewState } from './day-view';

/**
 * `now_line` — the app's persistent instrument: *"A single line, always present,
 * in every mode's header"* (`06-flows/doing-the-day.md` §The now line).
 *
 * Six sources, in the documented order. **Source 1 — an active focus session —
 * is not implemented**, because focus sessions are not in the log yet
 * (`EVENT_TYPES` has no `focus.*`); when they arrive the session is the first
 * thing this asks about, which is why the order is written down here rather than
 * inferred from the code.
 *
 * The line is not a nudge and consumes no attention budget. It is the only
 * surface that answers "what is happening" without being asked.
 */

export type NowLineParams = {
  /** The instant to read the line at. Travels in the params: projections are pure. */
  readonly now: Instant;
  readonly date: DateString;
  readonly tz_offset_minutes?: number;
};

export type NowLine =
  | {
      readonly kind: 'event';
      readonly label: string;
      readonly event: CalendarEvent;
      /** True while the event is happening, false when it is 2 hours away or less. */
      readonly inProgress: boolean;
    }
  | { readonly kind: 'task'; readonly label: string; readonly task: Task }
  | { readonly kind: 'empty'; readonly label: string };

/** Source 3's window: *"The next event today, if one is within 2 hours."* */
const NEXT_EVENT_WINDOW_MINUTES = 120;

/** `05-modules/tasks.md`'s ranking: `now` outranks `next` outranks `later`. */
const PRIORITY_ORDER: Readonly<Record<Task['priority'], number>> = {
  now: 0,
  next: 1,
  later: 2,
};

const MS_PER_MINUTE = 60_000;

export const NOTHING_SCHEDULED = 'Nothing scheduled — [Capture]';

function minutesBetween(from: Instant, to: Instant): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / MS_PER_MINUTE);
}

/** The clock label the line uses, in the local zone the Day was projected with. */
function clockAt(instant: Instant, tzOffsetMinutes: number): string {
  const shifted = new Date(Date.parse(instant) + tzOffsetMinutes * MS_PER_MINUTE);
  const hours = shifted.getUTCHours();
  const minutes = shifted.getUTCMinutes();
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/** Startup order on `day_view`'s state, so the fold is not run twice. */
export function selectNowLine(state: DayViewState, params: NowLineParams): NowLine {
  const offset = params.tz_offset_minutes ?? 0;
  const nowMs = Date.parse(params.now);
  const day = selectDayView(state, { date: params.date, tz_offset_minutes: offset });
  const events = day.events.filter((event) => !event.all_day);

  // 2 · the current event.
  const inProgress = events.find((event) => {
    const start = Date.parse(event.start);
    const end = event.end === undefined ? start : Date.parse(event.end);
    return start <= nowMs && nowMs < end;
  });
  if (inProgress !== undefined) {
    return {
      kind: 'event',
      label: `${inProgress.title} (in progress)`,
      event: inProgress,
      inProgress: true,
    };
  }

  // 3 · the next event today, within two hours.
  const upcoming = events
    .filter((event) => Date.parse(event.start) > nowMs)
    .sort((a, b) => (a.start < b.start ? -1 : 1))
    .find((event) => minutesBetween(params.now, event.start) <= NEXT_EVENT_WINDOW_MINUTES);
  if (upcoming !== undefined) {
    const minutes = Math.max(1, minutesBetween(params.now, upcoming.start));
    return {
      kind: 'event',
      label: `${upcoming.title} in ${minutes} min`,
      event: upcoming,
      inProgress: false,
    };
  }

  // 4 · the next scheduled task today.
  const nowClock = clockAt(params.now, offset);
  const nextTask = day.tasks_scheduled
    .filter(
      (task) =>
        task.state === 'open' &&
        task.scheduled_time !== undefined &&
        task.scheduled_time >= nowClock,
    )
    .sort((a, b) => ((a.scheduled_time ?? '') < (b.scheduled_time ?? '') ? -1 : 1))[0];
  if (nextTask !== undefined) {
    return {
      kind: 'task',
      label: `${nextTask.title} at ${nextTask.scheduled_time ?? ''}`,
      task: nextTask,
    };
  }

  // 5 · the top-priority open task.
  const best = [...day.tasks_scheduled]
    .filter((task) => task.state === 'open')
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])[0];
  if (best !== undefined) {
    return { kind: 'task', label: best.title, task: best };
  }

  // 6 · nothing.
  return { kind: 'empty', label: NOTHING_SCHEDULED };
}

export function computeNowLine(entries: readonly LogEntry[], params: NowLineParams): NowLine {
  return selectNowLine(computeDayViewState(entries), params);
}
