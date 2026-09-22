# Event Log

## Purpose

This doc defines the append-only log of every state change in the app.
It is the source of truth. Every list, streak, report, and view is a
projection computed from this log. Nothing is stored as "current
state"; everything is derived.

It exists because the app has many modules, an AI layer, a sync story,
and a time machine, and none of those can be coherent without a single
immutable record of what happened. This is the doc the rest of the
architecture hangs on.

## Invariants

- The log is append-only. Log entries are never mutated and never
  deleted.
- Every state change — user, AI, integration, or system — is a log
  entry. If it is not in the log, it did not happen.
- Every log entry has the shape defined below. No exceptions.
- Current state is never the source of truth. If a projection and the
  log disagree, the projection is wrong and must be recomputed.
- The log entry's `type` determines its payload schema. Adding a new
  type requires an ADR (`08-decisions/`).
- Undo is implemented as a compensation entry, never as a deletion.
- The log entry's `id` is a ULID (sortable, globally unique). It is
  never reused.
- The full log is available on the client. The server is a sync peer,
  not an authority.

## Specification

### Log entry shape

    interface LogEntry {
      id: string;                 // ULID
      type: string;               // namespaced, e.g. "task.created"
      timestamp: string;          // ISO-8601, UTC
      actor: Actor;               // who caused this
      payload: object;            // type-specific, see below
      compensation_for?: string;  // ULID of the entry this reverses
      schema_version: number;     // starts at 1
      device_id: string;          // which device produced this
      seq: number;                // per-device monotonic counter
      sync?: boolean;             // routing; default true; false is
                                  // local-only (ADR 0012)
    }

    interface Actor {
      type: 'user' | 'ai' | 'system' | 'integration';
      id?: string;                // device_id for user, tier for ai,
                                  // integration name for integration
    }

`sync` is a **routing field, not a payload field**. The sync engine
evaluates it; no projection ever reads it. It defaults to `true` and
is set to `false` for the categories ADR 0008 keeps local-only: note
bodies, metric logs, and person data
(`08-decisions/0008-local-first-sensitive-defaults.md`). A client
never pushes a `sync: false` entry and the server never receives its
payload, so such an entry exists only on the device that wrote it
(`07-infrastructure/sync-engine.md`).

### Naming convention

Types are namespaced by domain, lowercase, dot-separated:
`<domain>.<verb_past_tense>`. Examples: `task.created`, `habit.checked`,
`protocol.adopted`, `ai.applied`.

Domains are fixed: `task`, `calendar`, `habit`, `note`, `area`,
`goal`, `protocol`, `person`, `day`, `ai`, `system`.

`attention` is not a domain. Nudge telemetry is client-side only
(`03-experience/attention-budget.md`, `07-infrastructure/sync-engine.md`).

**Note on the `calendar` domain.** Earlier drafts named this domain
`event`, which collided with the "Event" atom in the object model
(`02-architecture/object-model.md`). Per ADR 0007, the domain is now
`calendar`. All types previously written as `event.*` are now
`calendar.*`. This is a naming change only; the entities and semantics
are unchanged.

**Note on sync telemetry.** Sync operations (push, pull, failures)
are client-side diagnostics, not domain events. They are tracked in
a local diagnostics buffer (see
`07-infrastructure/sync-engine.md`), not in the event log. They do
not appear in the type list below and are not synced.

### The full type list

**Task**
- `task.created` — { task_id, title, area_id, due?, defer?, priority?, source }
- `task.renamed` — { task_id, title }
- `task.rescheduled` — { task_id, due?, defer? }
- `task.scheduled_to_day` — { task_id, day }
- `task.unscheduled_from_day` — { task_id, day }
- `task.reassigned_area` — { task_id, area_id }
- `task.linked_person` — { task_id, person_id }
- `task.unlinked_person` — { task_id, person_id }
- `task.set_parent` — { task_id, parent_task_id }
- `task.cleared_parent` — { task_id }
- `task.priority_changed` — { task_id, priority: 'now' | 'next' | 'later' }
- `task.completed` — { task_id, completed_at, note? }
- `task.uncompleted` — { task_id }
- `task.marked_someday` — { task_id }
- `task.unmarked_someday` — { task_id }
- `task.archived` — { task_id }
- `task.unarchived` — { task_id }
- `task.deleted` — { task_id }  // tombstone; see Data Lifecycle

**Calendar (the Event atom)**
- `calendar.created` — { event_id, title, start, end?, day }
- `calendar.updated` — { event_id, title?, start?, end? }
- `calendar.linked_person` — { event_id, person_id }
- `calendar.unlinked_person` — { event_id, person_id }
- `calendar.deleted` — { event_id }
- `calendar.mirrored` — { event_id, source: 'google_calendar' | 'apple_calendar' | ..., retrieved_at, raw }

**Habit**
- `habit.created` — { habit_id, name, cadence, minimum_viable?, area_id, protocol_id? }
- `habit.renamed` — { habit_id, name }
- `habit.cadence_changed` — { habit_id, cadence }
- `habit.minimum_changed` — { habit_id, minimum_viable }
- `habit.linked_protocol` — { habit_id, protocol_id }
- `habit.unlinked_protocol` — { habit_id, protocol_id }
- `habit.checked` — { habit_id, day, version: 'full' | 'minimum' | 'repair' }
- `habit.unchecked` — { habit_id, day }
- `habit.skipped` — { habit_id, day, reason? }
- `habit.archived` — { habit_id }
- `habit.unarchived` — { habit_id }

**Note**
- `note.created` — { note_id, body, title?, attached_to: { type, id } }
- `note.edited` — { note_id, body, title? }
- `note.reattached` — { note_id, from: { type, id }, to: { type, id } }
- `note.deleted` — { note_id }

**Area**
- `area.created` — { area_id, name }
- `area.renamed` — { area_id, name }
- `area.archived` — { area_id }

**Goal**
- `goal.created` — { goal_id, name, area_id }
- `goal.renamed` — { goal_id, name }
- `goal.achieved` — { goal_id }
- `goal.abandoned` — { goal_id, reason? }
- `goal.reopened` — { goal_id }

**Protocol**
- `protocol.proposed` — { protocol_id, goal_id, hypothesis, habits: HabitSpec[], metric: MetricSpec, baseline_days, duration_days, source: 'ai' | 'user', explanation }
- `protocol.edited` — { protocol_id, changes }  // only while status='proposed'
- `protocol.adopted` — { protocol_id }  // proposed → baseline
- `protocol.activated` — { protocol_id }  // baseline → active
- `protocol.metric_logged` — { protocol_id, day, value }
- `protocol.reviewed` — { protocol_id, report_note_id, decision: 'continue' | 'modify' | 'stop' }
- `protocol.completed` — { protocol_id }
- `protocol.abandoned` — { protocol_id, reason? }

**Person**
- `person.created` — { person_id, name, source: 'manual' | 'contacts' }
- `person.renamed` — { person_id, name }
- `person.archived` — { person_id }
- `person.unarchived` — { person_id }

**Day**
- `day.opened` — { day, tz_offset_minutes }
- `day.planned` — { day, top_three: TaskId[] }
- `day.plan_skipped` — { day, kind: 'morning' | 'shutdown' }
- `day.closed` — { day }
- `day.note_created` — { note_id, day }

**Note on `day.note_created`.** This type was written as
`daily_note.created` before ADR 0012. The old string remains valid:
projections must keep accepting both, and new writes use
`day.note_created`. The change is a type string, not a payload
shape, so `schema_version` does **not** increment. The obligation is
permanent rather than a migration that ends — old entries do not age
out of validity.

**AI**
- `ai.proposed` — { proposal_id, tier: 1 | 2 | 3, context, proposal, explanation }
- `ai.applied` — { proposal_id, applied_as: string[] }  // ULIDs of resulting entries
- `ai.rejected` — { proposal_id, reason? }
- `ai.research_started` — { task_id, query, tier: 2 }
- `ai.research_completed` — { task_id, note_id, retrieved_at, sources }
- `ai.failed` — { call_id, tier: 1 | 2 | 3, kind: 'network' | 'schema' | 'timeout' | 'refused', duration_ms }

**System**
- `system.settings_changed` — { key: SettingsKey, value }
- `system.fresh_start` — { lapsed_days, archived_tasks, archived_protocols }
- `system.catch_up` — { lapsed_days }
- `system.clock_corrected` — { skew_seconds }
- `system.auth_expired` — { reason }

### The `SettingsKey` union

`system.settings_changed` payloads use a typed key so that the
settings surface and the log stay in sync:

    type SurfaceId =
      | 'prep_card'
      | 'contextual'
      | 'forgotten'
      | 'people'
      | 'weekly_review'
      | 'protocol_review'
      | 'price_drop'
      | 'what_slipped'
      | 'inbox_ritual'
      | 'streak_milestone'
      | 'streak_repair'
      | 'low_energy';

    type NotificationChannel = 'push' | 'in_app_banner' | 'badge';

    type SettingsKey =
      | 'quiet_hours.start'
      | 'quiet_hours.end'
      | 'nudge.frequency'
      | `nudge.surface.${SurfaceId}.enabled`
      | `notification.channel.${NotificationChannel}.enabled`
      | 'sync.enabled'
      | 'sync.sensitive_backup'
      | 'day.boundary_hour'
      | 'day.week_starts_on'
      | 'review.weekly_day'
      | 'review.weekly_time'
      | 'review.monthly_enabled'
      | 'review.annual_enabled'
      | 'theme'
      | 'default_mode'
      | 'haptics.enabled'
      | 'developer_mode'
      | 'crash_reports.enabled'
      | 'auto_linking.enabled'
      | 'lapse.threshold_days'
      | 'locale.override'
      | 'ai.on_device_only'
      | 'ai.audit_mode'
      | 'integration.calendar.enabled'
      | 'integration.contacts.enabled'
      | 'integration.health.enabled'
      | 'integration.weather.enabled'
      | 'integration.weather.home_location';

The `SurfaceId` union is the attention budget catalog
(`03-experience/attention-budget.md`). Adding a surface requires
updating both this doc and that one.

The `NotificationChannel` union is the three global notification
channels (`05-modules/settings.md`). Channels are app-wide, not
per-surface.

Adding a settings key is a doc change and requires updating this
union.

### Representative payload schemas

    // task.created
    {
      task_id: "01HX...",
      title: "Call contractor",
      area_id: "01HX...",
      due?: "2026-09-25T17:00:00Z",
      defer?: "2026-09-23T00:00:00Z",
      priority?: "next",
      source: "user" | "ai.tier1"
    }

    // habit.checked
    {
      habit_id: "01HX...",
      day: "2026-09-22",
      version: "full" | "minimum" | "repair"
    }

    // day.opened
    {
      day: "2026-09-22",
      tz_offset_minutes: -300  // America/New_York in September
    }

    // day.planned
    {
      day: "2026-09-22",
      top_three: ["01HX...", "01HX...", "01HX..."]
    }

    // day.plan_skipped
    {
      day: "2026-09-22",
      kind: "morning" | "shutdown"
    }

    // protocol.proposed
    {
      protocol_id: "01HX...",
      goal_id: "01HX...",
      hypothesis: "Consistent wake time and no screens after 10pm
                   will improve sleep quality",
      habits: [
        { name: "Same wake time", cadence: "daily",
          minimum_viable: "within 30 min of target" },
        { name: "No screens after 10pm", cadence: "daily",
          minimum_viable: "phone in other room" }
      ],
      metric: { name: "Sleep quality", scale: [1, 5] },
      baseline_days: 14,
      duration_days: 28,
      source: "ai",
      explanation: "Based on 3 sources: consistent wake time is the
                    strongest single predictor of sleep quality in
                    the literature."
    }

    // ai.applied
    {
      proposal_id: "01HX...",
      applied_as: ["01HX...", "01HX...", "01HX...", "01HX..."]
      // One entry per mutation. All share the same proposal_id
      // so undo can reverse them atomically.
    }

    // ai.failed
    {
      call_id: "01HX...",
      tier: 1 | 2 | 3,
      kind: "network" | "schema" | "timeout" | "refused",
      duration_ms: 4200
    }

    // system.fresh_start
    {
      lapsed_days: 23,
      archived_tasks: 14,
      archived_protocols: 1
    }

    // system.catch_up
    {
      lapsed_days: 23
    }

### Compensation

A compensation is a new log entry with `compensation_for` set to the
ULID of the entry it reverses. The projection layer treats a
compensated entry as "not present."

- To undo `task.completed`, append `task.uncompleted` with
  `compensation_for: <completed_id>`.
- To undo an AI action that produced four entries, append four
  compensation entries, each pointing to its corresponding original,
  all in one batch.
- Compensations are not deleted. The log grows monotonically.
- A compensation of a compensation is not allowed. To redo, append
  a fresh entry of the original type.

### Ordering

Every entry has a total order determined by:

1. `timestamp` (ISO-8601, UTC)
2. `device_id` (tiebreaker)
3. `seq` (per-device monotonic counter, tiebreaker)

This is a hybrid logical clock. Two devices with skewed clocks still
produce a consistent global order, because `device_id` and `seq`
break ties deterministically.

Projections fold the log in this order. Two devices projecting the
same log produce the same state.

### Schema versioning

- `schema_version` starts at 1 and increments when a payload schema
  changes in a breaking way.
- The projection layer handles all versions. Old entries are never
  rewritten.
- Adding an optional field is not a breaking change; version stays.
- Removing or renaming a field is breaking; version increments.

### Sync

Sync operates on the log, not on projections. See
`02-architecture/local-first.md` for the full protocol. In brief:

- A device pushes its new entries (by `seq`) to the server.
- The server merges by total order and broadcasts to other devices.
- Clients apply received entries to their local log and recompute
  affected projections.
- Conflicts are resolved by order, not by authority. Because the log
  is append-only, "conflict" means "two entries exist where one might
  have been enough" — the projection handles this (last write wins
  per field, within the total order).

## Examples

**Creating and completing a task.**

    1. task.created  { task_id: T1, title: "Buy desk", area_id: A1 }
    2. task.scheduled_to_day  { task_id: T1, day: "2026-09-22" }
    3. task.completed  { task_id: T1, completed_at: "...", note: "picked the standing one" }

Projection for T1: title="Buy desk", area=A1, scheduled=2026-09-22,
completed=true.

**Planning a day (morning plan).**

    1. day.opened  { day: "2026-09-22", tz_offset_minutes: -300 }
    2. day.planned  { day: "2026-09-22",
                      top_three: [T1, T2, T3] }

The day is now open, with a top three.

**Closing a day (shutdown).**

    Yesterday: the shutdown flow ran.
    1. day.planned  { day: "2026-09-23",
                      top_three: [T4, T5, T6] }
    2. day.closed  { day: "2026-09-22" }

The shutdown sets tomorrow's top three (via `day.planned`) and closes
today (via `day.closed`).

**Undoing the completion.**

    4. task.uncompleted  { task_id: T1, compensation_for: <id of #3> }

Projection for T1: completed=false. Entry #3 still exists in the log.

**An AI reschedule.**

    User: "move everything Thursday to Friday"
    AI proposes: 4 mutation proposals
    User taps Apply.
    Entries appended:
      5. ai.proposed  { proposal_id: P1, tier: 3, ... }
      6. task.rescheduled  { task_id: T2, ... }  // actor: ai
      7. task.rescheduled  { task_id: T3, ... }  // actor: ai
      8. task.rescheduled  { task_id: T4, ... }  // actor: ai
      9. task.rescheduled  { task_id: T5, ... }  // actor: ai
     10. ai.applied  { proposal_id: P1, applied_as: [6,7,8,9] }

Undo of this action appends 4 compensations in one batch.

**A habit check and its projection.**

    Habit H1, cadence daily, started 2026-09-01.
    Entries:
      habit.created  { habit_id: H1, ... }
      habit.checked  { habit_id: H1, day: "2026-09-01", version: "full" }
      habit.checked  { habit_id: H1, day: "2026-09-02", version: "minimum" }
      habit.skipped  { habit_id: H1, day: "2026-09-03" }
      habit.checked  { habit_id: H1, day: "2026-09-04", version: "full" }

Projection: compliance over 4 days = 3/4 (75%). Streak = 1 (broken
by the skip, then resumed). The skip is not a failure; it is data.

**A habit check with repair.**

    Habit H1 missed 2026-09-20. Repair applied on 2026-09-22:
      habit.checked  { habit_id: H1, day: "2026-09-20",
                       version: "repair" }

Projection: the 20th shows as "repair" in the compliance chart, which
is visually distinct from "full." Repair counts toward keeping a
streak alive but is not full compliance
(`05-modules/habits.md`, `06-flows/resurfacing.md`).

**A failed AI call.**

    ai.failed  { call_id: C1, tier: 3, kind: "network",
                 duration_ms: 5000 }
    (No compensation. The call simply did not succeed.)

## What this doc must NOT do

- This doc does not define the atoms (Task, Event, Note, Habit) as
  concepts. It defines the *events* that create and mutate them. The
  atoms live in `02-architecture/object-model.md`.
- This doc does not define how projections are computed. It defines
  the log they fold over. The projection logic lives in
  `02-architecture/projections.md`.
- This doc does not define sync protocol details. It defines the log
  entry shape and ordering. Sync lives in
  `02-architecture/local-first.md`.
- This doc does not define AI behavior. It defines the `ai.*` event
  types. AI tiers and constitution live in `04-ai/`.
- This doc does not enumerate every field for every payload. It
  gives the pattern and representative schemas. The full set is
  implemented in `src/domain/events/`.
- This doc does not add new event types speculatively. Adding a type
  requires a real feature that needs it, and an ADR.
- This doc does not include sync telemetry. Sync failures and
  operations are client-side diagnostics, not domain events.