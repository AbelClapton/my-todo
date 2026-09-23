# Data Lifecycle

## Purpose

This doc defines how data ages, drifts, conflicts, archives, and is
deleted. It exists because the app aggregates data from sources it
does not control (calendar, health, web research) and generates data
that becomes stale or invalid over time. Without explicit lifecycle
rules, the app accumulates wrong data and the user's trust erodes.

Invariant 4 (`01-foundation/principles.md`) states that stale data
is labeled. This doc defines what "stale" means per data type, and
what happens to data as it ages.

## Invariants

- Every piece of external data has `retrieved_at` and `source`.
- Stale data is labeled, never hidden and never presented as current.
- The AI is told when its context is stale.
- Deletion is a tombstone event, not a row deletion. History
  remains coherent.
- Metric definitions and protocol hypotheses are immutable during
  an active protocol.
- Archival is reversible. Nothing is silently removed from the
  user's reach.

## Specification

### Staleness thresholds

| Data type | Fresh | Stale |
|---|---|---|
| Calendar mirror | < 15 min | > 1 hour |
| Health data | < 24 hours | > 72 hours |
| Contacts | < 7 days | > 30 days |
| Research results | < 7 days | > 30 days |
| Prices (in research) | < 24 hours | > 7 days |
| Weather | < 6 hours | > 24 hours |

Freshness is displayed as a small "as of [date]" annotation, not a
red badge. Stale data is still shown; it is just labeled.

### Drift

Drift is when the meaning of data changes after it is recorded.

**Metric definition drift.** If a user redefines "sleep quality
1–5" mid-protocol, the baseline is corrupted. Rule: metric
definitions are immutable during an active protocol. Changing the
metric requires completing the current protocol and creating a new
one.

**Protocol hypothesis drift.** Same rule. The hypothesis is fixed
at adoption. It can be edited only while `status: 'proposed'`.

**Habit spec drift.** A habit's cadence or minimum can change, 
but if the habit is part of an active protocol, it cannot be edited. 
The user must complete or abandon the protocol first, then create a 
new protocol with the new cadence. Compliance before the change and
compliance after are reported separately.

**Area / goal renames.** Free to change. Renames are logged and
projections use the latest name. Historical views (time machine)
show the name as of that date.

### Conflicts

**Calendar sync.** The app mirrors Google / Apple / Outlook
calendar. When the user edits an event in the source calendar, the
mirror reflects it via `calendar.mirrored`. When the user edits an
event in the app, the app writes back to the source via the source's
API. Conflict resolution:

- In-app edits are authoritative for events the app created.
- Source edits are authoritative for events the source created.
- For shared events (created in source, edited in app), the app
  writes through to the source. The source's response is the truth.

**Person data.** Contacts sync is one-way (contacts → app). Edits
in the app do not write back to contacts. This avoids the two-way
sync problem entirely.

**Health data.** One-way (health → app). No write-back.

### Archival

Data ages into archival, not deletion.

**Tasks.** Completed tasks remain in the log. They are hidden from
`task_list` after 30 days by default. They remain findable via
search and the time machine.

**Notes.** Never archived automatically. They remain until
explicitly deleted.

**Events.** Calendar mirror events older than 90 days are dropped
from the local mirror (the source retains them). In-app events
remain.

**Habits.** Archived habits stop appearing in `day_view` and
`habit_compliance` default views. They remain in the log and are
findable in habit history.

**Protocols.** Completed and abandoned protocols remain in the log
and are findable. Their reports remain attached.

**People.** Archived people stop appearing in
`task_list({ by_person })` and resurfacing. Their linked tasks,
events, and notes remain.

Archival is a UI affordance, not a data deletion. A "show archived"
toggle reveals everything.

### Calendar mirror pruning

The local mirror of external calendar events is pruned to keep the
local store bounded.

- **What is pruned.** Mirrored events (`calendar.mirrored`) older
  than 90 days. In-app events are never pruned.
- **When.** On the first app open of each week.
- **Who.** The client, not the server.
- **Is it logged?** No. Pruning is a local cache operation, not a
  domain state change. The log entry for the mirrored event remains;
  the cached payload is released.
- **Is it reversible?** Yes. The next sync re-fetches older mirrored
  events if the user navigates to them via time machine.

Users are not notified of pruning.

### Deletion

Deletion is a tombstone event, not a row deletion. The log entry
remains; the projection treats the entity as deleted.

**Task deletion.** `task.deleted` tombstones the task. Its notes
are also tombstoned (cascade). Its links are removed from the graph.

**Note deletion.** `note.deleted` tombstones the note. Its parent
entity remains.

**Person deletion.** `person.archived` is used instead of deletion.
Deleting a person cascades to their links (tasks and events are
unlinked), but their notes remain attached to their original
entities. Person deletion is not supported; only archival.

**Account deletion (GDPR).** When the user deletes their account:

1. All local data is wiped.
2. Server-side log entries are tombstoned (their payloads are
   replaced with `{ deleted: true }`, keeping IDs for log
   consistency).
3. Forwarding address is revoked.
4. Calendar and health sync tokens are revoked.
5. Cloud AI history is deleted.
6. A deletion record is retained for 30 days, then purged.

This is one of the four actions that require a confirmation in the
app (see Invariant 1, `01-foundation/principles.md`). The others
are revoking calendar sync, abandoning an active protocol, and
signing out all devices.

**GDPR export.** User can export:

- Full log as JSON.
- Notes as Markdown.
- Calendar events as ICS.

Export is one-way. No import path is provided, by design.

### Time machine

Because the log is append-only, the app can reconstruct state at
any past date. Time machine reads the log up to a given `timestamp`
and computes projections as they would have been.

- **Two scopes.** Applied to a date, it reconstructs a whole mode, entered
  from the command palette (`06-flows/retrieval.md`). Applied to one atom,
  it reconstructs that atom — "show me **this** as of [date]" — entered
  from search and shown as a state of that atom's own detail.
- Not a module. A mode within existing views.
- Does not write. **Read-only is about writes, not taps**: detail views stay
  openable and only the actions that would write are disabled
  (`05-modules/calendar.md`).

## Examples

**A research note ages.**

    Research note N1 attached to Task T1, retrieved_at: 2026-03-14.
    Today: 2026-09-22.

    Note shows: "Prices as of 2026-03-14 (over 6 months ago)."
    Task detail shows a "Refresh research" action.

**A metric definition is edited mid-protocol.**

    Protocol PR1 is active with metric "sleep quality 1–5."
    User attempts to change to "sleep hours."

    App blocks: "Metric definitions cannot change during an active
    protocol. Complete PR1 or abandon it to start a new protocol
    with a new metric."

**A task is deleted.**

    task.deleted { task_id: T1 }

    Projection: T1 is gone from task_list. Its notes are tombstoned.
    Search does not return it. Time machine on a past date still
    shows it.

**Account deletion.**

    User confirms deletion. App wipes local data.
    Server tombstones the log.
    Deletion record retained for 30 days.
    After 30 days, purged.

## What this doc must NOT do

- This doc does not define the log entry shape. It defines what
  happens to entries as they age. The shape lives in
  `02-architecture/event-log.md`.
- This doc does not define projections. It defines how derived
  state handles aged data. Computation lives in
  `02-architecture/projections.md`.
- This doc does not define sync. It defines what syncs and how
  staleness is labeled. Sync lives in
  `02-architecture/local-first.md`.
- This doc does not define UI. It defines rules; UI presentation
  of those rules lives in `03-experience/` and `05-modules/`.
- This doc does not define security or encryption. It defines
  lifecycle. Security lives in `07-infrastructure/auth.md`.