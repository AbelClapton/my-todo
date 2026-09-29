import type { DateString, Instant, TaskId, TimeString } from '../ids';
import type { TaskPriority } from '../events/task';

/**
 * The Task atom (`02-architecture/object-model.md`): anything with a completion
 * state.
 *
 * Every field is `readonly`. A fold produces a new Task rather than mutating
 * one — the log is the only path to state change
 * (`10-engineering/code-conventions.md`).
 */

/** Five states. Only `open` and `someday` are scopes; the rest are lifecycle. */
export type TaskState = 'open' | 'completed' | 'someday' | 'archived' | 'deleted';

export type Task = {
  readonly id: TaskId;
  readonly title: string;
  /** Required: every task belongs to exactly one Area. */
  readonly area_id: string;
  readonly due?: DateString;
  readonly defer?: DateString;
  readonly priority: TaskPriority;
  readonly parent_task_id?: TaskId;
  /** Appears on this day's calendar. */
  readonly scheduled_day?: DateString;
  /**
   * Appears **at** this hour on that day's axis. A point, never a span, and
   * meaningful only with `scheduled_day` (ADR 0025).
   */
  readonly scheduled_time?: TimeString;
  /**
   * How long the work takes — a span in minutes, where `scheduled_time` is a
   * position. It dates nothing, so it appears in no scope (ADR 0031).
   */
  readonly estimated_minutes?: number;
  readonly people: readonly string[];
  readonly state: TaskState;
  readonly completed_at?: Instant;
  readonly completion_note?: string;
};
