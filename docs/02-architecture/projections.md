# Projections

## Purpose

This doc defines how current state is computed from the event log.
Every list, streak, count, report, and view is a projection. Nothing
is stored as "current state"; everything is derived.

It exists because event sourcing (the log) is only usable if the
derivation of state is well-defined, cached correctly, and never
mistaken for the source of truth.

## Invariants

- Projections are derived. They are never the source of truth.
- If a projection disagrees with the log, the projection is wrong.
- Projections are pure functions of the log. Given the same log in
  the same order, every device computes the same state.
- Projections are cached for performance but the cache is
  invalidated by new log entries, not by writes to projection
  storage.
- A projection never writes to the log. Only user actions and AI
  proposals (with consent) append entries.

## Specification

### The pattern

    projection(log: LogEntry[], params): State

Every projection is a fold over the log, filtered and ordered by the
rules in `02-architecture/event-log.md`, then reshaped into a view.

Implementation: a projection is a function that takes the full log
(or a relevant subset) and returns derived state. It is incremental
where possible: given a previous state and a new entry, produce the
new state.

### Named projections

The app defines these projections. Each has a stable name and is
referenced by that name in modules and flows.

**`task_list`** — open tasks, filtered by scope (`today`, `next`,
`someday`, `all`, `by_area`, `by_person`). Params: `{ scope, filter }`.

**`task_detail`** — a single task with all attributes and linked
notes.

**`day_view`** — the Day projection (`02-architecture/object-model.md`).
Params: `{ date }`.

**`now_line`** — the single line for the persistent indicator: the
current event, or the next scheduled task, or the top-priority open
task. Params: `{ now }`.

**`habit_compliance`** — per habit, over a window: counts of full,
minimum, repair, skipped, missed. Params: `{ habit_id, window }`.

**`habit_streak`** — current streak and longest streak for a habit.
Streaks are a display variant; compliance is the canonical measure.

**`protocol_report`** — baseline vs. active window comparison for a
protocol, with per-habit compliance. Params: `{ protocol_id }`.

**`weekly_review`** — seven-day aggregation: completed tasks,
slipped tasks, habit compliance, notable notes, next week's events.
Params: `{ week_start }`.

**`inbox`** — captures not yet classified: unparsed notes and
unclassified tasks. A task is included when it has been created
but not subsequently scheduled, archived, or completed. There is no
`source: 'capture'` marker to filter on — a captured task typed by
the user is `source: 'user'` — so the projection reads lifecycle
state, not provenance (ADR 0012).

**`search_results`** — semantic search over notes, tasks, and events.
Params: `{ query, filters }`. See `04-ai/retrieval-layer.md`.

**`attention_queue`** — the ranked queue of surfaces that want the
user's notice. Params: `{ now, budget_state }`. See
`03-experience/attention-budget.md`.

### Incremental computation

For each projection, the implementation defines:

- `init(log): State` — full computation from an empty log or a
  snapshot.
- `apply(state, entry): State` — incremental update when one entry
  is appended.

`apply` must produce the same result as `init` would on the full
log. This is a testable invariant and must be tested.

### Invalidation

New log entries invalidate projections. The mapping is
domain-based:

| Entry domain | Invalidates |
|---|---|
| `task.*` | `task_list`, `task_detail`, `day_view`, `now_line`, `inbox`, `search_results`, `weekly_review` |
| `calendar.*` | `day_view`, `now_line`, `weekly_review`, `search_results` |
| `habit.*` | `habit_compliance`, `habit_streak`, `day_view`, `weekly_review` |
| `note.*` | `task_detail`, `search_results`, plus the projection for the attachment target |
| `protocol.*` | `protocol_report`, `day_view`, `weekly_review` |
| `area.*` / `goal.*` | `task_list` (by_area), `weekly_review` |
| `person.*` | `search_results`, `task_list` (by_person) |
| `day.*` | `day_view`, `now_line`, `weekly_review` |
| `ai.*` | (no projection — AI entries affect state via their resulting entries) |
| (nudge telemetry — client-side, not log entries) | `attention_queue` (see note below) |
| `system.*` | (no projection; settings projection is separate) |

**Note on `attention.*`.** Nudge-related entries (`nudge.shown`,
`nudge.dismissed`, `nudge.actioned`) are client-side diagnostics,
not domain events. They are tracked in a local diagnostics buffer,
not synced. The `attention_queue` projection is computed from the
buffer plus its own in-memory state; it is not derived from the log.
See `07-infrastructure/sync-engine.md` and
`03-experience/attention-budget.md`.

Invalidation is coarse; the projection layer may refine it. The
invariant is: **no stale projection may be shown.** If in doubt,
recompute.

### Caching

- Projections are cached in memory (TanStack Query or equivalent)
  and optionally persisted (SQLite) for offline cold starts.
- The cache key includes the projection name and its params.
- The cache is invalidated by new entries per the table above.
- On app load, projections are computed from the log on disk. No
  network round-trip is required.
- On sync (incoming entries), affected projections are invalidated
  and recomputed incrementally.

### Snapshots

For performance, the implementation may store periodic snapshots of
projections. Snapshots are an optimization only; they must be
discardable. The log is always the truth.

- Snapshot cadence: every N entries (implementation-defined,
  typically 1000).
- A snapshot stores the projection state plus the log `seq` it was
  computed from.
- On recovery, load the latest snapshot and replay entries from
  its `seq` forward.

### Protocol immutability in projections

The protocol module (`05-modules/protocols.md`) specifies that a
protocol's hypothesis, metric, and habit list are immutable during
`baseline` and `active` status. This is enforced by the UI, but the
projection layer must also enforce it, because a sync from another
device or a bug could append the forbidden entries.

The rule:

- If `protocol.edited` is appended for a protocol in `baseline` or
  `active`, the projection **ignores** it.
- If `habit.cadence_changed`, `habit.minimum_changed`,
  `habit.linked_protocol`, or `habit.unlinked_protocol` is appended
  for a habit whose parent protocol is in `baseline` or `active`,
  the projection **ignores** it.
- A warning is written to the client diagnostics buffer.
- The entries remain in the log (the log is append-only). They
  simply do not affect the projected state.

This makes immutability a property of the system, not a UI
convention.

## Examples

**Task list projection.**

    task_list({ scope: 'today' }, log):
      open_tasks = log
        .filter(e => e.type.startsWith('task.'))
        .fold(apply_task_state, {})
        .filter(t => t.state === 'open')
      today = today_in_local_tz()
      scheduled = open_tasks.filter(t => t.scheduled_day === today)
      deferred_hidden = open_tasks.filter(t =>
        t.defer && t.defer > now())
      return scheduled.filter(t =>
        !deferred_hidden.includes(t))

Given a log with three task events, this returns the tasks scheduled
for today that are not deferred.

**Habit compliance projection.**

    habit_compliance({ habit_id: H1, window: [start, end] }, log):
      entries = log.filter(e =>
        e.type.startsWith('habit.') &&
        e.payload.habit_id === H1 &&
        in_window(e.payload.day, window))
      full = entries.filter(e =>
        e.type === 'habit.checked' && e.payload.version === 'full').length
      minimum = entries.filter(e =>
        e.type === 'habit.checked' && e.payload.version === 'minimum').length
      repair = entries.filter(e =>
        e.type === 'habit.checked' && e.payload.version === 'repair').length
      skipped = entries.filter(e => e.type === 'habit.skipped').length
      scheduled = scheduled_days_for(H1, window)
      missed = scheduled - (full + minimum + repair + skipped)
      return { full, minimum, repair, skipped, missed, scheduled }

**Protocol report projection.**

    protocol_report({ protocol_id: PR1 }, log):
      protocol = find_protocol(PR1, log)
      baseline_window = [protocol.started_at,
                         protocol.baseline_ends_at]
      active_window = [protocol.baseline_ends_at,
                       protocol.review_at]
      baseline_metrics = metric_logs(PR1, baseline_window)
      active_metrics = metric_logs(PR1, active_window)
      per_habit = protocol.habit_specs.map(h =>
        habit_compliance({ habit_id: h.id, window: active_window }, log))
      return {
        baseline_mean: mean(baseline_metrics),
        active_mean: mean(active_metrics),
        delta: mean(active_metrics) - mean(baseline_metrics),
        per_habit
      }

The report's numeric summary is a projection. The AI-generated
narrative is a Note attached to the protocol, produced by Tier 3.
It is logged as a standard `note.created` entry with
`attached_to: { type: 'protocol', id: PR1 }`, and a
`protocol.reviewed` entry records the review decision.

## What this doc must NOT do

- This doc does not define the log. It defines how state is derived
  from it. The log lives in `02-architecture/event-log.md`.
- This doc does not define the atoms and layers. It defines how
  their current state is computed. The model lives in
  `02-architecture/object-model.md`.
- This doc does not define UI rendering. It defines the data that
  screens render.
- This doc does not define AI behavior. It defines the projections
  the AI's retrieval layer can query.
- This doc does not define storage. Snapshots and caches are
  implementation details; the log is the truth.