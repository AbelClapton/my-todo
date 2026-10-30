import type { CalendarEvent } from '@/domain/atoms/calendar-event';
import type { Habit, LoggedComplianceState } from '@/domain/atoms/habit';
import { complianceStateForCheck } from '@/domain/atoms/habit';
import type { Task } from '@/domain/atoms/task';
import { cadenceSchedules } from '@/domain/cadence';
import { DEFAULT_DAY_BOUNDARY_HOUR, localDayOf } from '@/domain/day';
import type { DayBoundaryHour } from '@/domain/events/day';
import type { DateString, Instant } from '@/domain/ids';
import type { LogEntry } from '@/domain/events';

import { foldLog, type Fold } from './framework';
import { applyTaskEntry } from './task-fold';

/**
 * `day_view` — the Day projection (`02-architecture/projections.md`,
 * `02-architecture/object-model.md` §The Day).
 *
 * The Day is *"the atomic product unit"* and it is **derived**: only
 * `day.opened`, `day.planned`, `day.plan_skipped`, `day.closed`,
 * `day.note_created` and the two undo entries ADR 0033 adds (`day.unplanned`,
 * `day.reopened`) are logged about it, and everything else is a fold over the
 * other domains. So this projection is the place the app's whole model meets —
 * which is why it reuses `applyTaskEntry` rather than folding tasks again: two
 * folds would be two answers to "what does completed mean".
 *
 * **`protocol_metrics_due` is absent, not empty.** The Day's field set names it,
 * and Protocols are Phase 4; a field that is permanently `[]` would quietly claim
 * the question is answered. It appears with `protocol_report`.
 */

export type DayViewParams = {
  /** The Day to project, as the local `YYYY-MM-DD` the user sees. */
  readonly date: DateString;
  /**
   * Needed twice: a completion is grouped by the **local** Day it landed on, and
   * a habit's creation day anchors its cadence. Defaults to UTC, like the
   * completion log in `task_list`.
   */
  readonly tz_offset_minutes?: number;
};

/** Which ritual wrote a plan, and which one was skipped (`day.plan_skipped.kind`). */
export type RitualKind = 'morning' | 'shutdown';

/** What the five `day.*` entries say about one Day. */
export type DayRecord = {
  /** `day.opened` landed, which is what makes rollover idempotent. */
  readonly opened?: boolean;
  readonly boundary_hour?: DayBoundaryHour;
  readonly daily_note_id?: string;
  readonly top_three?: readonly TaskId[];
  /**
   * The ritual that wrote the plan. **A shutdown plan is a draft, not a
   * confirmed plan** (`06-flows/morning-plan.md` §The trigger), which is why the
   * source travels with it rather than being inferable from the entries.
   */
  readonly planned_source?: RitualKind;
  /** Days can be skipped by both rituals; the kind keeps them from suppressing
   * each other (`06-flows/shutdown.md` §Skipping). */
  readonly skipped?: readonly RitualKind[];
  readonly closed?: boolean;
};

type TaskId = string;

/** A habit plus the one fact the atom does not carry: when it started. */
export type HabitPlan = {
  readonly habit: Habit;
  /** The creation entry's timestamp; its local Day anchors an `interval` cadence. */
  readonly created_at: Instant;
};

export type DayViewState = {
  readonly tasks: readonly Task[];
  readonly events: readonly CalendarEvent[];
  readonly habits: readonly HabitPlan[];
  readonly days: ReadonlyMap<DateString, DayRecord>;
};

export function emptyDayView(): DayViewState {
  return { tasks: [], events: [], habits: [], days: new Map() };
}

function patchDay(
  days: ReadonlyMap<DateString, DayRecord>,
  day: DateString,
  patch: (record: DayRecord) => DayRecord,
): ReadonlyMap<DateString, DayRecord> {
  const next = new Map(days);
  next.set(day, patch(days.get(day) ?? {}));
  return next;
}

function patchEvent(
  events: readonly CalendarEvent[],
  eventId: string,
  patch: (event: CalendarEvent) => CalendarEvent,
): readonly CalendarEvent[] {
  return events.map((event) => (event.id === eventId ? patch(event) : event));
}

function patchHabit(
  habits: readonly HabitPlan[],
  habitId: string,
  patch: (habit: Habit) => Habit,
): readonly HabitPlan[] {
  return habits.map((plan) =>
    plan.habit.id === habitId ? { ...plan, habit: patch(plan.habit) } : plan,
  );
}

/**
 * The Event fold. `calendar.mirrored` carries no title, no start and no Day, so it
 * cannot create an event — it only re-states facts about one a normalized entry
 * already created (`calendar.*` mirrors arrive in Phase 7).
 */
function applyCalendarEntry(
  events: readonly CalendarEvent[],
  entry: LogEntry,
): readonly CalendarEvent[] {
  switch (entry.type) {
    case 'calendar.created': {
      const { event_id, title, start, end, all_day, day } = entry.payload;
      const event: CalendarEvent = {
        id: event_id,
        title,
        start,
        all_day,
        day,
        source: 'in_app',
        people: [],
        deleted: false,
        ...(end === undefined ? {} : { end }),
      };
      return [...events, event];
    }
    case 'calendar.updated':
      return patchEvent(events, entry.payload.event_id, (event) => ({
        ...event,
        ...(entry.payload.title === undefined ? {} : { title: entry.payload.title }),
        ...(entry.payload.start === undefined ? {} : { start: entry.payload.start }),
        ...(entry.payload.end === undefined ? {} : { end: entry.payload.end }),
        ...(entry.payload.all_day === undefined ? {} : { all_day: entry.payload.all_day }),
      }));
    case 'calendar.linked_person':
      return patchEvent(events, entry.payload.event_id, (event) => ({
        ...event,
        people: event.people.includes(entry.payload.person_id)
          ? event.people
          : [...event.people, entry.payload.person_id],
      }));
    case 'calendar.unlinked_person':
      return patchEvent(events, entry.payload.event_id, (event) => ({
        ...event,
        people: event.people.filter((person) => person !== entry.payload.person_id),
      }));
    case 'calendar.deleted':
      return patchEvent(events, entry.payload.event_id, (event) => ({ ...event, deleted: true }));
    case 'calendar.mirrored':
      return patchEvent(events, entry.payload.event_id, (event) => ({
        ...event,
        source: entry.payload.source,
        ...(entry.payload.all_day === undefined ? {} : { all_day: entry.payload.all_day }),
      }));
    default:
      return events;
  }
}

/** The Habit fold. `missed` is never logged, so it is never folded. */
function applyHabitEntry(habits: readonly HabitPlan[], entry: LogEntry): readonly HabitPlan[] {
  switch (entry.type) {
    case 'habit.created': {
      const { habit_id, name, cadence, minimum_viable, area_id, protocol_id } = entry.payload;
      const habit: Habit = {
        id: habit_id,
        name,
        cadence,
        area_id,
        state: 'active',
        compliance: [],
        ...(minimum_viable === undefined ? {} : { minimum_viable }),
        ...(protocol_id === undefined ? {} : { protocol_id }),
      };
      return [...habits, { habit, created_at: entry.timestamp }];
    }
    case 'habit.renamed':
      return patchHabit(habits, entry.payload.habit_id, (habit) => ({
        ...habit,
        name: entry.payload.name,
      }));
    case 'habit.cadence_changed':
      return patchHabit(habits, entry.payload.habit_id, (habit) => ({
        ...habit,
        cadence: entry.payload.cadence,
      }));
    case 'habit.minimum_changed':
      return patchHabit(habits, entry.payload.habit_id, (habit) => ({
        ...habit,
        minimum_viable: entry.payload.minimum_viable,
      }));
    case 'habit.archived':
      return patchHabit(habits, entry.payload.habit_id, (habit) => ({
        ...habit,
        state: 'archived',
      }));
    case 'habit.unarchived':
      return patchHabit(habits, entry.payload.habit_id, (habit) => ({
        ...habit,
        state: 'active',
      }));
    case 'habit.checked':
      return patchHabit(habits, entry.payload.habit_id, (habit) => ({
        ...habit,
        compliance: [
          ...habit.compliance.filter((each) => each.day !== entry.payload.day),
          { day: entry.payload.day, state: complianceStateForCheck(entry.payload.version) },
        ],
      }));
    case 'habit.unchecked':
      return patchHabit(habits, entry.payload.habit_id, (habit) => ({
        ...habit,
        compliance: habit.compliance.filter((each) => each.day !== entry.payload.day),
      }));
    case 'habit.skipped':
      return patchHabit(habits, entry.payload.habit_id, (habit) => ({
        ...habit,
        compliance: [
          ...habit.compliance.filter((each) => each.day !== entry.payload.day),
          { day: entry.payload.day, state: 'skipped' },
        ],
      }));
    default:
      return habits;
  }
}

function applyDayEntry(
  days: ReadonlyMap<DateString, DayRecord>,
  entry: LogEntry,
): ReadonlyMap<DateString, DayRecord> {
  switch (entry.type) {
    case 'day.opened':
      return patchDay(days, entry.payload.day, (record) => ({
        ...record,
        opened: true,
        ...(entry.payload.boundary_hour === undefined
          ? {}
          : { boundary_hour: entry.payload.boundary_hour }),
      }));
    case 'day.planned':
      return patchDay(days, entry.payload.day, (record) => ({
        ...record,
        top_three: entry.payload.top_three,
        planned_source: entry.payload.source,
      }));
    case 'day.plan_skipped':
      return patchDay(days, entry.payload.day, (record) => ({
        ...record,
        skipped: [...(record.skipped ?? []), entry.payload.kind],
      }));
    case 'day.closed':
      return patchDay(days, entry.payload.day, (record) => ({ ...record, closed: true }));

    // Undo for `day.planned` and `day.closed` (ADR 0033). Each states the
    // inverse rather than relying on being filtered out as a compensation, for
    // the same reason `task.uncompleted` does.
    case 'day.unplanned': {
      const next = { ...(days.get(entry.payload.day) ?? {}) };
      delete next.top_three;
      delete next.planned_source;
      const patched = new Map(days);
      patched.set(entry.payload.day, next);
      return patched;
    }

    case 'day.reopened':
      return patchDay(days, entry.payload.day, (record) => ({ ...record, closed: false }));
    case 'day.note_created':
      return patchDay(days, entry.payload.day, (record) => ({
        ...record,
        daily_note_id: entry.payload.note_id,
      }));
    default:
      return days;
  }
}

export function applyDayView(state: DayViewState, entry: LogEntry): DayViewState {
  // One Task fold for the whole app (`task-fold.ts`); it returns the array it was
  // given when the entry is not a task entry, so identity says whether to rebuild.
  const tasks = applyTaskEntry(state.tasks, entry);
  const events = applyCalendarEntry(state.events, entry);
  const habits = applyHabitEntry(state.habits, entry);
  const days = applyDayEntry(state.days, entry);

  if (
    tasks === state.tasks &&
    events === state.events &&
    habits === state.habits &&
    days === state.days
  ) {
    return state;
  }
  return { tasks, events, habits, days };
}

export const dayViewFold: Fold<DayViewState> = { empty: emptyDayView(), apply: applyDayView };

export function computeDayViewState(entries: readonly LogEntry[]): DayViewState {
  return foldLog(dayViewFold, entries);
}

/** One habit line in the day's Habits-due section. */
export type DayHabit = {
  readonly id: string;
  readonly name: string;
  readonly minimum_viable?: string;
  /** Today's logged state, or `null` when the cadence scheduled it and nothing was logged. */
  readonly outcome: LoggedComplianceState | null;
};

export type DayView = {
  readonly date: DateString;
  /** True once `day.opened` is in the log — the rollover guard. */
  readonly opened: boolean;
  /** From `day.opened` (ADR 0027), falling back to the shipping default. */
  readonly boundary_hour: DayBoundaryHour;
  readonly closed: boolean;
  readonly events: readonly CalendarEvent[];
  /** Placed on this Day, whether or not they have an hour (ADR 0025). */
  readonly tasks_scheduled: readonly Task[];
  /** Finished on this Day, newest first — the record that closes the view. */
  readonly tasks_completed: readonly Task[];
  readonly habits_due: readonly DayHabit[];
  readonly top_three: readonly Task[];
  /** Which ritual set the plan, so a shutdown draft is not read as a commitment. */
  readonly planned_source?: RitualKind;
  readonly skipped: readonly RitualKind[];
  readonly daily_note_id?: string;
};

export function computeDayView(entries: readonly LogEntry[], params: DayViewParams): DayView {
  return selectDayView(computeDayViewState(entries), params);
}

export function selectDayView(state: DayViewState, params: DayViewParams): DayView {
  const { date } = params;
  const offset = params.tz_offset_minutes ?? 0;
  const record = state.days.get(date);

  const events = state.events
    .filter((event) => !event.deleted && event.day === date)
    .sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));

  const tasks_scheduled = state.tasks.filter(
    (task) => task.scheduled_day === date && task.state !== 'deleted',
  );

  const tasks_completed = state.tasks
    .filter(
      (task) =>
        task.state === 'completed' &&
        task.completed_at !== undefined &&
        // The completion belongs to the *local* Day it happened on, which is the
        // Day it belongs to in the log (`02-architecture/day-as-unit.md`).
        localDayOf(task.completed_at, offset) === date,
    )
    .sort((a, b) => compareInstantDescending(a.completed_at, b.completed_at));

  const habits_due = state.habits.flatMap(({ habit, created_at }): readonly DayHabit[] => {
    if (habit.state !== 'active') {
      return [];
    }
    if (!cadenceSchedules(habit.cadence, localDayOf(created_at, offset), date)) {
      return [];
    }
    const logged = habit.compliance.find((each) => each.day === date)?.state;
    // `missed` is derived, never logged (`atoms/habit.ts`), so it is not an
    // outcome a check produced — and a row that showed it would claim the user
    // had acted on a day they did not.
    const outcome: LoggedComplianceState | null =
      logged === undefined || logged === 'missed' ? null : logged;
    return [
      {
        id: habit.id,
        name: habit.name,
        outcome,
        ...(habit.minimum_viable === undefined ? {} : { minimum_viable: habit.minimum_viable }),
      },
    ];
  });

  const top_three = (record?.top_three ?? []).flatMap((taskId) => {
    const task = state.tasks.find(
      (candidate) => candidate.id === taskId && candidate.state !== 'deleted',
    );
    return task === undefined ? [] : [task];
  });

  return {
    date,
    opened: record?.opened === true,
    boundary_hour: record?.boundary_hour ?? DEFAULT_DAY_BOUNDARY_HOUR,
    closed: record?.closed === true,
    events,
    tasks_scheduled,
    tasks_completed,
    habits_due,
    top_three,
    skipped: record?.skipped ?? [],
    ...(record?.planned_source === undefined ? {} : { planned_source: record.planned_source }),
    ...(record?.daily_note_id === undefined ? {} : { daily_note_id: record.daily_note_id }),
  };
}

function compareInstantDescending(a: Instant | undefined, b: Instant | undefined): number {
  if (a === b) {
    return 0;
  }
  if (a === undefined) {
    return 1;
  }
  if (b === undefined) {
    return -1;
  }
  // ISO-8601 strings with the same offset sort lexicographically, and the log
  // writes UTC (`02-architecture/event-log.md` §Ordering).
  return a < b ? 1 : -1;
}
