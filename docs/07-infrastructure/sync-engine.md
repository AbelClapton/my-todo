# Sync Engine

## Purpose

This doc defines the mechanics of syncing the log across devices.
It exists because sync is where local-first apps most often fail —
not because the concept is hard, but because the failure modes
(conflicts, stale reads, out-of-order arrival, partial syncs) are
under-specified.

The model is: **replicate log entries; resolve by order; never sync
projections.**

## Invariants

- Only log entries are synced. Projections are local.
  (`02-architecture/local-first.md`)
- Ordering is by `(timestamp, device_id, seq)`
  (`02-architecture/event-log.md`).
- Conflicts are resolved by order, not by authority.
- Sync never blocks the UI.
- Every sync operation is resumable. A dropped connection does not
  lose entries.
- The client is usable at any point before, during, or after sync.
- Sync telemetry (operations, failures) is client-side only. It is
  not written to the event log.

## Specification

### What a "device" is

A **device** is a single installed client. It generates a stable
`device_id` (a ULID) on first launch and persists it in secure
storage. The ID:

- Is included in every log entry the device produces.
- Is used for total-order tiebreaking (`02-architecture/event-log.md`).
- Is used by the server to track per-device progress.

Reinstalling the app generates a new `device_id`. The new device
syncs from `last_pulled_server_seq = 0` and receives the full log.
The old device's `seq` counter is irrelevant to the new one.

A browser profile is a device. Two tabs in the same profile share
the device ID and the local log (see "Multi-tab sync" below).

### The protocol

Sync is a three-step protocol per device:

1. **Push.** Send unsynced entries to the server.
2. **Merge.** Server merges by total order and persists.
3. **Pull.** Fetch entries from other devices since the last pull.

Steps run in that order, sequentially, per sync cycle.

### Push

The client tracks `last_pushed_seq` per device. On push:

    POST /sync/push
    {
      device_id: string,
      entries: LogEntry[],   // all entries with seq > last_pushed_seq
    }

The server validates entries (shape, schema version), appends them,
and responds:

    {
      accepted: string[],    // entry IDs
      rejected: Array<{ id: string, reason: string }>,
      server_seq: number,    // the server's high-water mark
    }

If an entry is rejected (malformed, wrong schema), the client logs
it locally and does not retry. Rejections are rare and indicate a
bug.

### Pull

The client tracks `last_pulled_server_seq`. On pull:

    GET /sync/pull?since=<last_pulled_server_seq>

The server returns:

    {
      entries: LogEntry[],   // all entries with server_seq > since
      server_seq: number,    // new high-water mark
      more: boolean,         // true if more entries are available
    }

If `more` is true, the client pulls again immediately. This
continues until `more` is false.

### Merge

The server's merge is trivial because the log is append-only:

1. Assign a `server_seq` to each incoming entry.
2. Persist.
3. Broadcast a notification to the user's other devices (via
   WebSocket or a push channel).

No conflict resolution happens at the server. Ordering is
deterministic from the entry's own fields.

### Total order

See `02-architecture/event-log.md`. Every entry has:

- `timestamp` (ISO-8601, UTC, from the producing device's clock).
- `device_id` (stable per device).
- `seq` (per-device monotonic counter).

Total order is `(timestamp, device_id, seq)` lexicographically.
Two devices receiving the same set of entries in different arrival
orders converge on the same order.

### Clock skew

Device clocks can be wrong. The ordering is robust to this:

- `timestamp` is used first, but ties are broken by `device_id`,
  then `seq`.
- If a device's clock is significantly skewed (> 1 hour off from
  the server), the client corrects using the server's time on the
  first sync of a session.
- The correction is logged as a `system.clock_corrected` entry.
- Corrected timestamps are used going forward, not retroactively.

### Conflict handling

Conflicts are logical, not physical. Examples:

**Two devices rename the same task offline.**

    Device A: task.renamed { task_id: T1, title: "Buy desk" }
    Device B: task.renamed { task_id: T1, title: "Buy standing desk" }

Both entries exist. The projection applies them in total order. The
later one wins. The earlier one is still in the log. Undo of the
later one reveals the earlier.

**Two devices complete the same task offline.**

    Device A: task.completed { task_id: T1, ... }
    Device B: task.completed { task_id: T1, ... }

Both entries exist. The projection applies them in order. The second
completion is a no-op (the task is already complete). The log shows
both, which is correct — both devices observed the completion.

**One device completes, another deletes.**

    Device A: task.completed { task_id: T1, ... }
    Device B: task.deleted   { task_id: T1 }

Both exist. The later one wins. If the deletion is later, the task
is tombstoned. If the completion is later, the task is completed
and the deletion is a no-op (already tombstoned).

The user sees the resolved state. Both events are recoverable from
history.

### Initial sync (new device)

    1. Authenticate.
    2. GET /sync/snapshot?since=0
       (streams the full log)
    3. Write entries to the local log.
    4. Compute projections.
    5. Set last_pulled_server_seq.
    6. Begin normal sync.

The initial sync may be large. The server streams it in chunks. If
the connection drops, the client resumes from the last received
`server_seq`.

### Multi-tab sync (web)

In a browser, multiple tabs share the same local log. Cross-tab
coordination uses `BroadcastChannel` (or `SharedWorker` where
available).

- A write in tab A broadcasts to tabs B and C.
- Tabs B and C apply the entry to their in-memory projections and
  re-render.
- The SQLite store is shared (via OPFS or a shared worker), so there
  is one log, not three.

If `BroadcastChannel` is unavailable, tabs poll the SQLite change
table every 500ms. This is slower but correct.

Two tabs cannot both push to the server simultaneously. A lock (via
`BroadcastChannel` or a Web Lock) ensures one tab pushes at a time.

### Sync backlog and chunking

If a device has been offline for a long period, the unsynced entry
count can be large. To keep sync reliable:

- Pushes are chunked at 1,000 entries per request.
- The server accepts up to 10,000 entries per sync session.
- Beyond 10,000, the remaining entries flow over multiple sessions,
  spaced by the standard retry interval (2s, 4s, 8s, up to 60s).
- The client shows no UI for backlog; it syncs silently.
- A user can check progress in Settings → Sync → "N entries pending."

The initial sync (a new device pulling the full log) uses the same
chunking. The server streams in chunks of 1,000; the client applies
each chunk and advances `last_pulled_server_seq`. A dropped
connection resumes from the last received `server_seq`.

### Ongoing sync frequency

- **Push:** on local write, debounced 2 seconds.
- **Pull:** on app foreground, on network regain, and every 60
  seconds while foregrounded.
- **Background sync:** platform-dependent (via Capacitor
  background fetch, best effort).

The client does not poll on a timer of its own. It reacts to local
writes, lifecycle events, and the foreground pull cadence above.

### Notifications

The server notifies other devices of new entries via:

- **WebSocket** (when the app is foregrounded on web/desktop).
- **Push notification** (when the app is backgrounded on mobile).
- **Pull-on-foreground** (fallback).

The client does not require notifications to sync. They reduce
latency.

### Error handling

- **Network error.** Retry with exponential backoff (2s, 4s, 8s, up
  to 60s). Continue trying in the background.
- **Auth error (401).** Prompt the user to re-authenticate. Sync
  pauses.
- **Server error (5xx).** Retry with backoff. Surface a subtle
  banner if it persists.
- **Malformed entry rejection.** Log and skip. Do not retry.
- **Partial pull.** Resume from the last received `server_seq`.

Sync failures are logged to a **client-side diagnostics buffer**,
not the event log. They are operational telemetry, not domain
events. They are never synced. The buffer is bounded (last 500
entries) and is available in Developer Mode (Settings → Advanced).

### The "conflict" UI

There is no conflict UI. The user never sees a "resolve conflicts"
screen. Conflicts resolve silently by order. The undo system
(Invariant 1, `01-foundation/principles.md`; compensations per
`02-architecture/event-log.md`) and the time machine
(`06-flows/retrieval.md`) are how the user recovers from an
unwanted resolution.

### Sensitive data

Per `02-architecture/local-first.md`, some categories of data
(notes, metric logs, person data) are local-only by default. Entries
in those categories carry a `sync: false` flag — a routing field on
`LogEntry`, evaluated by this engine and never read by a projection
(`02-architecture/event-log.md`, ADR 0012).

- Entries with `sync: false` are never pushed to the server.
- They are not visible to other devices.
- If the user enables cloud backup, new entries use `sync: true`.

**No backfill.** Enabling cloud backup applies to new entries only.
Entries written while their category was local-only are not pushed
retroactively, and the opt-in screen must say so at the point of
consent rather than implying that history will follow.

**The data-loss path.** A `sync: false` entry exists only on the
device that wrote it. If that device is lost before cloud backup is
enabled, the entry is gone. Neither the undo system nor the time
machine is a recovery path here, because both read the same local
log.

**How a local-only entry reaches the server.** Not by backfill, and
not by a migrate button — there is no migrate action in v1. It
happens when the entry is written again: an edit is a *new* entry
carrying the same content, and a new entry is written with
`sync: true`. Editing a note after opting in therefore uploads its
body, and the note becomes visible on the second device by being
edited.

That covers notes, because `note.edited` carries the whole body, and
person names, via `person.renamed`. It does **not** cover metric-log
history, which has no re-write path: a past day's log entry stays on
the device that wrote it. The asymmetry is deliberate. The
alternative — an explicit per-entry migrate action — cannot be undone
once the server has the payload, so it would need a confirmation
dialog, and Invariant 1 allows those for exactly four actions
(`01-foundation/principles.md`, ADR 0008).

See ADR 0008 for the privacy decision and ADR 0012 for the mechanism.

### Forwarded captures

Forwarding is the one path where the client is not the first writer. The
server receives the message and relays it; the device parses it with Tier
1 and writes the entry (`07-infrastructure/integrations.md`, ADR 0017).

The relay payload is not a log entry and never becomes one: it is not
merged, not projected, and not addressed by `seq`. Undelivered payloads
wait in a bounded transient buffer and are dropped after 72 hours — long
enough to survive a weekend offline, short enough to stay a relay buffer
rather than a server-side store of note bodies.

### Server responsibilities

- Store the merged log.
- Broadcast entries.
- Handle auth.
- Provide a forwarding address, and relay forwarded mail to the device
  rather than authoring entries (ADR 0017).
- Provide cloud AI.
- Nothing else.

The server does not:

- Compute projections.
- Resolve conflicts.
- Enforce business rules.
- Serve reads (except initial sync).

## Examples

**Two devices, offline edits, converge.**

    Device A (phone, offline): task.renamed { T1 → "Buy desk" }
    Device B (laptop, offline): task.renamed { T1 → "Buy standing desk" }

    Both come online.
    A pushes. Server assigns server_seq.
    B pulls, sees A's entry. B pushes. Server assigns server_seq.
    A pulls, sees B's entry.

    Both devices now have both entries.
    Both project T1.title = "Buy standing desk" (B's entry is later).
    Both agree.

**A dropped connection mid-pull.**

    Client pulls. Server streams 500 entries.
    Connection drops at entry 327.
    Client has received 327 entries, written to local log.
    Client reconnects. Pulls again from entry 328.
    No data lost.

**A new device.**

    User installs the app on a new phone.
    Authenticates.
    Sync streams the full log (say, 12,000 entries).
    Phone writes them to local SQLite.
    Projections compute.
    Phone is ready.

**A long backlog.**

    Device has been offline for 3 months.
    On reconnect, the client has ~5,000 unsynced entries.
    It pushes in chunks of 1,000, over 5 requests.
    Each request completes before the next begins.
    Settings shows "5,000 pending" → "4,000 pending" → etc.
    After ~10 seconds, all are pushed.

**A local-only note.**

    User writes a note about their therapist.
    Entry has sync: false.
    It is written to the local log.
    It is never pushed.
    Other devices do not see it.
    If the user enables cloud backup, new notes use sync: true.
    (The old note stays local-only until it is edited; editing it
    writes a new, synced entry, which is how it reaches device 2.)

**Multi-tab editing.**

    Tab A completes a task.
    Tab A appends to the shared log.
    Tab A broadcasts on BroadcastChannel.
    Tab B receives, applies to its in-memory projection, re-renders.
    Neither tab pushes simultaneously (Web Lock).

## What this doc must NOT do

- This doc does not define the log entry shape. That is
  `02-architecture/event-log.md`.
- This doc does not define projections. That is
  `02-architecture/projections.md`.
- This doc does not define the local-first philosophy. That is
  `02-architecture/local-first.md`.
- This doc does not define auth. That is
  `07-infrastructure/auth.md`.
- This doc does not define server infrastructure. It defines the
  protocol. The server's implementation is an ops concern.
- This doc does not define server-side scaling. That is a later
  ADR if needed.
- This doc does not add `sync.*` entries to the event log. Sync
  telemetry is client-side only.