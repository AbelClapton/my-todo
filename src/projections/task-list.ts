import type { Task } from '@/domain/atoms/task';
import { addDays, daysBetween, localDayOf } from '@/domain/day';
import type { LogEntry } from '@/domain/events';
import type { TaskPriority } from '@/domain/events/task';
import type { DateString } from '@/domain/ids';

import { foldLog, type Fold, type Projection } from './framework';
import { applyTaskEntry } from './task-fold';

/**
 * `task_list` — open tasks, filtered by scope (`02-architecture/projections.md`).
 *
 * The four scopes **partition the open tasks** (ADR 0028): `today` is
 * scheduled-today, due-today-or-earlier, or deferred-to-today-or-earlier;
 * `someday` is the state; `next` is the complement of both. `all` is the union,
 * not a fourth partition.
 */

export type TaskScope = 'today' | 'next' | 'someday' | 'all';

/** The three scopes that partition, and the one that collects them. */
export type PartitionScope = Exclude<TaskScope, 'all'>;

export type TaskListParams = {
  readonly scope: TaskScope;
  /**
   * The Day the list is being read on. It travels in the params because a
   * projection that read a clock would stop being a pure function of the log.
   */
  readonly today: DateString;
  readonly area_id?: string;
  readonly person_id?: string;
  readonly due_within_days?: number;
  /**
   * The completion log is a **state of the All scope**, not a screen of its own
   * (`03-experience/surfaces.md`).
   */
  readonly completed?: boolean;
  /** The app's one window selector; the completed log defaults to 7 days. */
  readonly window_days?: number;
  /** Needed to group a completion by its **local** day. Defaults to UTC. */
  readonly tz_offset_minutes?: number;
};

export type TaskListRow = {
  readonly task: Task;
  /** ADR 0030's row carries a note glyph, so the list answers "has notes". */
  readonly note_count: number;
  /** Which partition holds it. `null` for a completed row in the All view. */
  readonly scope: PartitionScope | null;
  /** Shown at the top of Today carrying its reason as a chip. */
  readonly is_overdue: boolean;
  readonly is_deferred_past: boolean;
};

export type TaskListView = readonly TaskListRow[];

export type TaskListState = {
  readonly tasks: readonly Task[];
  /**
   * `note_id` → the **task** it is attached to. Only task attachments are
   * tracked here; another target's notes belong to that target's projection.
   */
  readonly note_targets: ReadonlyMap<string, string>;
};

const DEFAULT_COMPLETION_WINDOW_DAYS = 7;

const PRIORITY_ORDER: Readonly<Record<TaskPriority, number>> = { now: 0, next: 1, later: 2 };

export const emptyTaskList = (): TaskListState => ({ tasks: [], note_targets: new Map() });

export function applyTaskList(state: TaskListState, entry: LogEntry): TaskListState {
  const tasks = applyTaskEntry(state.tasks, entry);
  const noteTargets = applyNoteTarget(state.note_targets, entry);
  if (tasks === state.tasks && noteTargets === state.note_targets) {
    return state;
  }
  return { tasks, note_targets: noteTargets };
}

function applyNoteTarget(
  targets: ReadonlyMap<string, string>,
  entry: LogEntry,
): ReadonlyMap<string, string> {
  switch (entry.type) {
    case 'note.created': {
      const { note_id, attached_to } = entry.payload;
      if (attached_to.type !== 'task') {
        return targets;
      }
      return new Map(targets).set(note_id, attached_to.id);
    }
    case 'note.reattached': {
      const { note_id, to } = entry.payload;
      const next = new Map(targets);
      if (to.type === 'task') {
        next.set(note_id, to.id);
      } else {
        next.delete(note_id);
      }
      return next;
    }
    case 'note.deleted': {
      const { note_id } = entry.payload;
      if (!targets.has(note_id)) {
        return targets;
      }
      const next = new Map(targets);
      next.delete(note_id);
      return next;
    }
    default:
      return targets;
  }
}

export const taskListFold: Fold<TaskListState> = { empty: emptyTaskList(), apply: applyTaskList };

/** Fold the whole log into the derived state, then shape it. */
export function computeTaskListState(entries: readonly LogEntry[]): TaskListState {
  return foldLog(taskListFold, entries);
}

export function computeTaskList(
  entries: readonly LogEntry[],
  params: TaskListParams,
): TaskListView {
  return selectTaskRows(computeTaskListState(entries), params);
}

export function selectTaskRows(state: TaskListState, params: TaskListParams): TaskListView {
  const noteCounts = countNotesByTask(state.note_targets);
  return params.completed === true
    ? selectCompletedRows(state.tasks, params, noteCounts)
    : selectOpenRows(state.tasks, params, noteCounts);
}

function selectOpenRows(
  tasks: readonly Task[],
  params: TaskListParams,
  noteCounts: ReadonlyMap<string, number>,
): TaskListView {
  const rows: TaskListRow[] = [];

  for (const task of tasks) {
    const scope = scopeOfTask(task, params.today);
    if (scope === null) continue;
    if (params.scope !== 'all' && scope !== params.scope) continue;
    if (!isVisibleInScope(task, params.scope, params.today)) continue;
    if (!matchesFilters(task, params)) continue;

    rows.push({
      task,
      note_count: noteCounts.get(task.id) ?? 0,
      scope,
      is_overdue: isOverdue(task, params.today),
      is_deferred_past: isDeferredPast(task, params.today),
    });
  }

  return rows.sort(compareOpenRows);
}

function selectCompletedRows(
  tasks: readonly Task[],
  params: TaskListParams,
  noteCounts: ReadonlyMap<string, number>,
): TaskListView {
  const windowDays = params.window_days ?? DEFAULT_COMPLETION_WINDOW_DAYS;
  const offsetMinutes = params.tz_offset_minutes ?? 0;
  const rows: TaskListRow[] = [];

  for (const task of tasks) {
    if (task.state !== 'completed' || task.completed_at === undefined) continue;
    // The window is over the *local* Day the completion happened on, which is
    // what the log groups by, so the offset has to travel with the request.
    if (daysBetween(localDayOf(task.completed_at, offsetMinutes), params.today) > windowDays) {
      continue;
    }
    if (!matchesFilters(task, params)) continue;

    rows.push({
      task,
      note_count: noteCounts.get(task.id) ?? 0,
      scope: null,
      is_overdue: false,
      is_deferred_past: false,
    });
  }

  // Newest first: "what did I do" is a question about a day before it is a
  // question about a task.
  return rows.sort((a, b) => compareDescending(a.task.completed_at, b.task.completed_at));
}

/**
 * Which partition holds this task, or `null` when the task is not open.
 *
 * **A task scheduled for a past day falls to `next`**, because the rule for
 * `today` is literally "scheduled for **today**" and `next` is the complement.
 * That is a reading of ADR 0028's definition rather than a decision in it —
 * `due` and `defer` both carry "or earlier", and `scheduled_day` does not.
 */
export function scopeOfTask(task: Task, today: DateString): PartitionScope | null {
  if (task.state === 'someday') return 'someday';
  if (task.state !== 'open') return null;

  const scheduledToday = task.scheduled_day === today;
  const dueNow = task.due !== undefined && task.due <= today;
  const deferNow = task.defer !== undefined && task.defer <= today;

  return scheduledToday || dueNow || deferNow ? 'today' : 'next';
}

/**
 * `defer` is **visibility**, not scheduling: a deferred task is hidden from
 * Today and Next until its defer date. It is never hidden from All — and a
 * hidden task is not a task in no scope, which is why this is a filter over the
 * partition rather than a fifth branch of it.
 */
function isVisibleInScope(task: Task, scope: TaskScope, today: DateString): boolean {
  if (scope === 'all' || scope === 'someday') return true;
  return task.defer === undefined || task.defer <= today;
}

function isOverdue(task: Task, today: DateString): boolean {
  return task.due !== undefined && task.due < today;
}

function isDeferredPast(task: Task, today: DateString): boolean {
  return task.defer !== undefined && task.defer < today;
}

function matchesFilters(task: Task, params: TaskListParams): boolean {
  if (params.area_id !== undefined && task.area_id !== params.area_id) return false;
  if (params.person_id !== undefined && !task.people.includes(params.person_id)) return false;
  if (params.due_within_days !== undefined) {
    if (task.due === undefined) return false;
    if (task.due > addDays(params.today, params.due_within_days)) return false;
  }
  return true;
}

function countNotesByTask(targets: ReadonlyMap<string, string>): ReadonlyMap<string, number> {
  const counts = new Map<string, number>();
  for (const taskId of targets.values()) {
    counts.set(taskId, (counts.get(taskId) ?? 0) + 1);
  }
  return counts;
}

/** Overdue, then deferred-past, then the rest — each ranked group sorted by due
 * date, then priority, then title. `all` sorts by due date, so the two coincide
 * there. */
function compareOpenRows(a: TaskListRow, b: TaskListRow): number {
  const rank = (row: TaskListRow): number => (row.is_overdue ? 0 : row.is_deferred_past ? 1 : 2);

  const byRank = rank(a) - rank(b);
  if (byRank !== 0) return byRank;

  const byDue = compareAscending(a.task.due, b.task.due);
  if (byDue !== 0) return byDue;

  const byPriority = PRIORITY_ORDER[a.task.priority] - PRIORITY_ORDER[b.task.priority];
  if (byPriority !== 0) return byPriority;

  return a.task.title.localeCompare(b.task.title);
}

/** Undated last: a task with no deadline does not outrank one that has. */
function compareAscending(a: DateString | undefined, b: DateString | undefined): number {
  if (a === undefined) return b === undefined ? 0 : 1;
  if (b === undefined) return -1;
  return a < b ? -1 : a > b ? 1 : 0;
}

function compareDescending(a: string | undefined, b: string | undefined): number {
  if (a === undefined) return b === undefined ? 0 : 1;
  if (b === undefined) return -1;
  return a < b ? 1 : a > b ? -1 : 0;
}

export const taskListProjection: Projection<TaskListState, TaskListParams, TaskListView> = {
  name: 'task_list',
  fold: taskListFold,
  compute: computeTaskList,
};
