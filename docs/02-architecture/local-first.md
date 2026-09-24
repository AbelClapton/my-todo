# Local-First

## Purpose

This doc defines how the app stores, syncs, and reconciles state
across devices, offline use, and the server. It exists because the
app handles sensitive categories (health, relationships, personal
notes) and because the event log architecture makes a specific kind
of sync possible: log entry replication, not state reconciliation.

The model is: **the client holds the full log. The server is a sync
peer, not an authority. Conflicts are resolved by order, not by
merge.**

## Invariants

- Every client holds a full copy of the log (or a projection of it
  sufficient to reconstruct any projection).
- The client is the source of truth for the events it produces.
- The server is a relay, not an authority. It stores the log and
  broadcasts entries.
- Conflicts are resolved by total order
  (`02-architecture/event-log.md`), never by "server wins" or
  "client wins."
- No projection is ever synced. Only log entries are synced.
- Every read works offline. Sync is opportunistic.
- Sync never blocks the UI.

## Specification

### The topology

    [Device A] ──┐
    [Device B] ──┼──► [Server] ──► [Device C]
    [Device D] ──┘

Each device holds the full log. The server holds the union of all
logs. Entries flow device → server → other devices.

### Log entry replication

Sync operates on log entries:

1. **Push.** Device sends entries with `seq > last_pushed_seq` to
   the server.
2. **Merge.** Server merges entries by total order and persists.
3. **Pull.** Device requests entries with
   `server_seq > last_pulled_server_seq` from the server.
4. **Apply.** Device appends received entries to its local log and
   recomputes affected projections.

### Total order

See `02-architecture/event-log.md`. Ordering is by
`(timestamp, device_id, seq)`. Two devices that receive the same set
of entries in different arrival orders converge on the same order
and thus the same state.

### Conflicts

Because the log is append-only, "conflict" does not mean "two
divergent states." It means "two entries exist where one might have
been expected."

Examples:

- Device A and Device B both edit the same task title while
  offline. Both entries exist. The projection resolves by applying
  them in total order; the later one wins. This is `last-write-wins`
  per field, within the total order.
- Device A completes a task while Device B deletes it. Both entries
  exist. The projection applies them in order; the later one wins.
  If deletion is later, the task is tombstoned.

This is acceptable because the log preserves both events. The user
sees the resolved state; the "conflict" is recoverable from history.

### Offline behavior

- Every read is served from the local log and local projections.
- Every write appends to the local log immediately.
- Writes are queued for sync and pushed when connectivity returns.
- The now line, task list, calendar, and all projections work fully
  offline, except for:
  - Research (requires web search).
  - Calendar mirror freshness (stale until re-sync).
  - Health data freshness (stale until re-sync).

Staleness is labeled per Invariant 4
(`01-foundation/principles.md`).

### Sensitive data

Categories that stay on-device by default:

- Notes (all bodies).
- Metric logs (health-adjacent).
- Person data (relationships).

Categories that sync to the server:

- Log entries (the log itself).
- Event atoms (calendar-sourced, already on a third-party server).
- Task metadata.
- Habit compliance.
- Protocols, areas, goals, days.

Nudge telemetry is client-side only and never syncs.

The line is not absolute. Users may opt into cloud backup for the
sensitive categories, enabling multi-device use for notes, metric
logs, and person data. See ADR 0008 for the full decision.

The server holds only what is necessary for multi-device use. Note
bodies, metric logs, and person data never leave the device unless
the user explicitly enables cloud backup.

### Server responsibilities

- Store the merged log.
- Broadcast entries to all other devices of the same user.
- Provide a forwarding address for email capture.
- Provide cloud AI for research and reports (Tier 3 only).
- Handle auth.
- Track per-user quota state for the metered cloud features —
  research calls and Tier 3 complex queries
  (`07-infrastructure/cost-model.md`, ADR 0014).
- Receive forwarded mail and **relay** it to the device. The server
  writes no log entries and runs no AI on it, and undelivered messages
  wait in a bounded transient capture buffer (ADR 0017).
- Nothing else. No projection storage, no business logic. The transient
  capture buffer is the one exception to "nothing else," and it holds
  nothing but undelivered relay payloads.

### Client responsibilities

- Hold the full log.
- Compute all projections.
- Handle all reads and writes.
- Handle Tier 1 and Tier 2 AI locally where possible.
- Sync when online.
- Handle offline gracefully.

### Sync frequency

- Push: on local write, debounced to 2 seconds.
- Pull: on app foreground, on network regain, and every 60 seconds
  while foregrounded.
- Background sync: platform-dependent, best effort.

### Initial sync (new device)

1. Device authenticates.
2. Server streams the full log in `server_seq` order.
3. Device writes to local log.
4. Device computes all projections.
5. Device is ready.

The initial sync may be large. Streaming and checkpointing are
implementation details; the invariant is that the device does not
require the server after sync is complete.

### Schema migrations

The log schema may evolve. Clients must handle all
`schema_version`s. When a client on an old version receives an entry
it cannot parse:

- It stores the entry as-is (opaque).
- It does not project the entry.
- It logs a warning.
- It prompts the user to update — **an overlay, not a banner**, and it is
  one of the four messages outside `10-engineering/error-handling.md`'s
  failure taxonomy: the app cannot recover this one, because the recovery
  is a new build. The prompt states which version is needed and never
  blocks the app, since every entry the client *can* read keeps working.

New clients must never write an entry that old clients cannot
ignore gracefully.

## Examples

**Two devices, offline edit conflict.**

    Device A (offline): task.renamed { task_id: T1, title: "Buy desk" }
    Device B (offline): task.renamed { task_id: T1, title: "Buy standing desk" }

    Both sync. Server merges. Total order:
      A's entry (timestamp earlier)
      B's entry (timestamp later)

    Projection: T1.title = "Buy standing desk". Both entries exist
    in the log. Undoing B's entry reveals A's.

**Calendar mirror staleness.**

    Device has not synced in 3 hours. Calendar mirror is stale.
    Day view shows events with "as of 3 hours ago" annotation.

    User comes online. Sync runs. Calendar mirror refreshes.
    Annotation disappears.

**A user adds a note about their therapist while offline.**

    note.created { note_id: N1, body: "...", attached_to: { type: 'person', id: P1 } }

    By default, this entry stays on-device. It syncs only if the
    user has enabled cloud sync for sensitive data. The server never
    sees the note body.

## What this doc must NOT do

- This doc does not define the log entry shape. It defines how log
  entries replicate. The shape lives in
  `02-architecture/event-log.md`.
- This doc does not define projections. It defines how projections
  are kept consistent. Computation lives in
  `02-architecture/projections.md`.
- This doc does not define auth. It defines what auth is needed
  for. Auth lives in `07-infrastructure/auth.md`.
- This doc does not define AI behavior. It notes that Tier 3 may
  require cloud, but not how. AI tiers live in `04-ai/`.
- This doc does not define server implementation. It defines the
  server's responsibilities, not its stack.