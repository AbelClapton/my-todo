import type { LogEntry } from '@/domain/events';
import type { PendingEntry } from '@/domain/log/append';
import { addDays } from '@/domain/day';
import type { DateString } from '@/domain/ids';
import type { DayView } from '@/projections/day-view';

/**
 * The two rituals â€” the shutdown (`06-flows/shutdown.md`) and the morning plan
 * (`06-flows/morning-plan.md`).
 *
 * Neither is a mode: each is a surface that fires once, and both commit as **one
 * atomic batch** (Invariant 1, ADR 0010). That batch is the reason this module is
 * pure and separate from the screens: the entries a ritual writes are a decision
 * the flow doc makes, and they are testable without a log or a click.
 *
 * **Neither ritual logs `day.opened`, `day.closed` except the shutdown's own
 * close, or `day.note_created`.** Rollover owns those
 * (`02-architecture/day-as-unit.md`), and by the time either surface is up the
 * Day is already open â€” which is the first thing both triggers test.
 */

/** The morning plan's automatic window. Quiet hours default to 10pmâ€“7am, so the
 * six stated hours (5â€“11) are four (`06-flows/morning-plan.md` Â§The trigger). */
export const MORNING_WINDOW = { from: 7, until: 11 } as const;

/** When the shutdown card greets instead of waiting to be asked. Not a hard
 * limit: the evening has no quiet-hours equivalent, and closing early is fine. */
export const SHUTDOWN_HOUR = 21;

/**
 * Whether the morning plan should surface unprompted.
 *
 * A `day.planned { source: 'shutdown' }` does **not** suppress it: that plan is
 * tomorrow's draft, and this ritual is where it gets confirmed or edited.
 */
export function morningPlanDue(view: DayView, hour: number, hasOnboarded: boolean): boolean {
  return (
    hasOnboarded &&
    view.opened &&
    view.planned_source !== 'morning' &&
    !view.skipped.includes('morning') &&
    hour >= MORNING_WINDOW.from &&
    hour < MORNING_WINDOW.until
  );
}

/** Whether the shutdown should surface. A closed Day, or a skip, ends it. */
export function shutdownDue(view: DayView, hour: number): boolean {
  return view.opened && !view.closed && !view.skipped.includes('shutdown') && hour >= SHUTDOWN_HOUR;
}

/**
 * The "what went well" line, prepended to the Daily Note as a blockquote
 * (`06-flows/shutdown.md` Â§The Daily Note update).
 *
 * Prepended and not appended: the note is the Day's narrative and the shutdown
 * is the summary of it, which is why the example shows the line above prose the
 * user wrote during the day. An empty answer leaves the body alone rather than
 * writing an empty quote.
 */
export function withWentWell(body: string, wentWell: string): string {
  const text = wentWell.trim();
  if (text === '') {
    return body;
  }
  const line = `> What went well: ${text}`;
  return body === '' ? `${line}\n` : `${line}\n\n${body}`;
}

export type ShutdownInput = {
  readonly today: DateString;
  /** The Day the shutdown plans for. Derived when absent. */
  readonly tomorrow?: DateString;
  /** Tasks kept in the unfinished list â€” scheduled onto tomorrow. */
  readonly kept: readonly string[];
  /** One to three, and the draft the morning plan will pre-select. */
  readonly top_three: readonly string[];
  readonly wentWell: string;
  readonly dailyNote?: { readonly note_id: string; readonly body: string };
};

/** Tomorrow is the calendar day after the one being closed, always. */
export function tomorrowOf(today: DateString): DateString {
  return addDays(today, 1);
}

/**
 * The shutdown's batch, in the order `06-flows/shutdown.md` Â§The commit gives:
 * plan, close, note, schedule. The order is not cosmetic â€” the plan and the note
 * are what the user sees on landing, and a refused scheduling write must not
 * leave the Day closed with its plan lost.
 */
export function shutdownBatch(input: ShutdownInput): PendingEntry[] {
  const tomorrow = input.tomorrow ?? tomorrowOf(input.today);
  const actor = { type: 'user' } as const;
  const entries: PendingEntry[] = [
    {
      type: 'day.planned',
      actor,
      payload: { day: tomorrow, top_three: [...input.top_three], source: 'shutdown' },
    },
    { type: 'day.closed', actor, payload: { day: input.today } },
  ];

  if (input.dailyNote !== undefined && input.wentWell.trim() !== '') {
    entries.push({
      type: 'note.edited',
      actor,
      payload: {
        note_id: input.dailyNote.note_id,
        body: withWentWell(input.dailyNote.body, input.wentWell),
      },
    });
  }

  for (const taskId of input.kept) {
    entries.push({
      type: 'task.scheduled_to_day',
      actor,
      payload: { task_id: taskId, day: tomorrow },
    });
  }

  return entries;
}

/** What a task's schedule was before the batch, so the undo can re-state it. */
export type ScheduledBefore = {
  readonly task_id: string;
  readonly day?: DateString;
  readonly time?: string;
};

/**
 * The undo for either ritual's batch, as compensations (`02-architecture/event-log.md`,
 * ADR 0033).
 *
 * It reads the entries the batch **actually appended**, in reverse, rather than a
 * parallel description of them: the log assigns ids at append time, and a
 * hand-built list of "the ids I meant to get back" is the kind of thing that
 * drifts the first time the batch grows a write.
 *
 * A task's schedule is undone by **re-stating** what it had, the way defer's undo
 * does (ADR 0032) â€” an absent day is `task.unscheduled_from_day`, and a previous
 * day is a fresh `task.scheduled_to_day` carrying it back. The note's inverse is
 * another edit, because an edit has no other vocabulary.
 */
export function undoBatch(
  appended: readonly LogEntry[],
  before: {
    readonly previousNoteBody?: string;
    readonly tasks: readonly ScheduledBefore[];
  },
): PendingEntry[] {
  const actor = { type: 'user' } as const;
  const byTask = new Map(before.tasks.map((task) => [task.task_id, task]));
  const entries: PendingEntry[] = [];

  for (const entry of [...appended].reverse()) {
    switch (entry.type) {
      case 'day.planned':
        entries.push({
          type: 'day.unplanned',
          actor,
          payload: { day: entry.payload.day },
          compensation_for: entry.id,
        });
        break;
      case 'day.closed':
        entries.push({
          type: 'day.reopened',
          actor,
          payload: { day: entry.payload.day },
          compensation_for: entry.id,
        });
        break;
      case 'note.edited':
        entries.push({
          type: 'note.edited',
          actor,
          payload: { note_id: entry.payload.note_id, body: before.previousNoteBody ?? '' },
          compensation_for: entry.id,
        });
        break;
      case 'task.scheduled_to_day': {
        const { task_id, day } = entry.payload;
        const previous = byTask.get(task_id);
        entries.push(
          previous?.day === undefined
            ? {
                type: 'task.unscheduled_from_day',
                actor,
                payload: { task_id, day },
                compensation_for: entry.id,
              }
            : {
                type: 'task.scheduled_to_day',
                actor,
                payload: {
                  task_id,
                  day: previous.day,
                  ...(previous.time === undefined ? {} : { time: previous.time }),
                },
                compensation_for: entry.id,
              },
        );
        break;
      }
      default:
        break;
    }
  }

  return entries;
}
export type MorningInput = {
  readonly today: DateString;
  readonly kept: readonly string[];
  readonly top_three: readonly string[];
};

/**
 * The morning plan's batch: keep, then commit (`06-flows/morning-plan.md` §The
 * commit) — never the other way round, so the plan never names a task that is
 * not on the Day it plans.
 */
export function morningBatch(input: MorningInput): PendingEntry[] {
  const actor = { type: 'user' } as const;
  const scheduled: PendingEntry[] = input.kept.map((taskId) => ({
    type: 'task.scheduled_to_day',
    actor,
    payload: { task_id: taskId, day: input.today },
  }));

  return [
    ...scheduled,
    {
      type: 'day.planned',
      actor,
      payload: { day: input.today, top_three: [...input.top_three], source: 'morning' },
    },
  ];
}
