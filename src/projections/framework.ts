import type { EventDomain, LogEntry } from '@/domain/events';
import { domainOf, ordered } from '@/domain/events';

/**
 * The projection framework (`02-architecture/projections.md`).
 *
 * A projection is a fold over the log: `empty` is the state before any entry,
 * `apply` is the incremental step, and `compute` is "fold everything, then
 * shape it for the caller". `apply` must agree with a fresh fold — that is a
 * tested invariant, not a hope.
 *
 * Every projection is pure. No `Date.now()`, no I/O, no storage
 * (`10-engineering/code-conventions.md`), which is why "today" travels in the
 * params rather than being read from a clock.
 */

export type ProjectionName =
  | 'task_list'
  | 'task_detail'
  | 'day_view'
  | 'now_line'
  | 'habit_compliance'
  | 'habit_streak'
  | 'protocol_report'
  | 'weekly_review'
  | 'inbox'
  | 'search_results'
  | 'attention_queue'
  // Named only by the invalidation table below, not by `projections.md`'s
  // §Named projections. Two lists of "what projections exist" disagree by
  // three entries; recorded here rather than resolved, because picking
  // their params would be a guess.
  | 'area_list'
  | 'goal_list'
  | 'goal_detail';

export type Fold<State> = {
  readonly empty: State;
  readonly apply: (state: State, entry: LogEntry) => State;
};

export type Projection<State, Params, View> = {
  readonly name: ProjectionName;
  readonly fold: Fold<State>;
  readonly compute: (entries: readonly LogEntry[], params: Params) => View;
};

/**
 * Fold a log in the app's total order, treating a compensated entry as *not
 * present* (`02-architecture/event-log.md` §Compensation).
 *
 * This is why the rule lives here and not in each projection: the compensation
 * entry carries no knowledge of what it reverses, and a projection that had to
 * skip its own originals would have to know the whole log anyway.
 */
export function foldLog<State>(fold: Fold<State>, entries: readonly LogEntry[]): State {
  const sorted = ordered(entries);
  const compensated = new Set<string>();
  for (const entry of sorted) {
    if (entry.compensation_for !== undefined) {
      compensated.add(entry.compensation_for);
    }
  }
  return sorted.reduce<State>(
    (state, entry) => (compensated.has(entry.id) ? state : fold.apply(state, entry)),
    fold.empty,
  );
}

/**
 * The invalidation table. Coarse on purpose; the invariant is that **no stale
 * projection may be shown** — if in doubt, recompute.
 *
 * `note.*` also invalidates "the projection for the attachment target", which
 * cannot be written as a static row: it is the target's own projection.
 */
export const INVALIDATION: Readonly<Record<EventDomain, readonly ProjectionName[]>> = {
  task: [
    'task_list',
    'task_detail',
    'day_view',
    'now_line',
    'inbox',
    'search_results',
    'weekly_review',
  ],
  calendar: ['day_view', 'now_line', 'weekly_review', 'search_results'],
  habit: ['habit_compliance', 'habit_streak', 'day_view', 'weekly_review'],
  note: ['task_detail', 'search_results'],
  protocol: ['protocol_report', 'day_view', 'weekly_review'],
  area: ['task_list', 'weekly_review', 'area_list'],
  goal: ['goal_list', 'goal_detail', 'weekly_review'],
  person: ['task_list', 'search_results'],
  day: ['day_view', 'now_line', 'weekly_review'],
  // AI entries affect state only through the entries they produce, and settings
  // are their own projection. Neither invalidates a domain projection.
  ai: [],
  system: [],
};

export function invalidatedBy(entry: LogEntry): readonly ProjectionName[] {
  return INVALIDATION[domainOf(entry.type)];
}
