# ADR 0012 — Log Entry Shape and Type List Changes

- **Status:** Accepted
- **Date:** 2026-09-22
- **Deciders:** [founder]

## Context

Three separate gaps in the event log, each of which requires changing
the log's contract rather than editing a doc.

**1. The `sync: false` flag has no home.** ADR 0008
(`08-decisions/0008-local-first-sensitive-defaults.md`) establishes
that notes, metric logs, and person data stay on-device by default.
The mechanism it names is a flag on log entries, and that is what the
implementing docs describe:

- `07-infrastructure/sync-engine.md` — "These categories have a
  `sync: false` flag on their log entries" and "Entries with
  `sync: false` are never pushed to the server"
- `07-infrastructure/auth.md` — "The server never sees plaintext
  sensitive data (`sync: false` entries)"

But `02-architecture/event-log.md` says "Every log entry has the shape
defined below. No exceptions," and the shape has no such field. The
architecture's most load-bearing invariant currently has an
undocumented exception.

**2. `daily_note.created` is a domain of one.**
`02-architecture/event-log.md` fixes the log domains at eleven (task,
calendar, habit, note, area, goal, protocol, person, day, ai, system)
and states that `attention` is not among them. `daily_note.created`
nevertheless lives in a `daily_note` namespace that appears in the
type list but not in the domain list. This is the reason ADR 0001
counts "12 domains" while the current doc fixes eleven.

**3. Two promised actions have no event type.**

- `05-modules/habits.md` — "The user can re-activate an archived
  habit at any time." There is no `habit.unarchived`.
- `05-modules/people.md` — "The user can re-activate at any time."
  There is no `person.unarchived`.

## Decision

**Add `sync?: boolean` to `LogEntry`.** Default `true`.

- It is a **routing field, not a payload field**. The sync engine
  evaluates it; no projection ever reads it.
- Set `false` for entries in the categories ADR 0008 marks local-only:
  note bodies, metric logs, person data.
- The client never pushes a `sync: false` entry, and the server never
  receives its payload.
- Enabling cloud backup applies to **new** entries only. Existing
  local-only entries are not backfilled, and the UI must say so at the
  point of opt-in rather than implying history will follow.

**Rename `daily_note.created` → `day.note_created`.**

- The `day` domain owns Day-related entries. One namespace per one
  type is not worth a domain.
- **Replay obligation:** entries already written as
  `daily_note.created` remain valid. Projections must continue to
  accept both type strings; new writes use `day.note_created`. This is
  a type-string change, not a payload change, so `schema_version` does
  **not** increment.
- With this rename, the eleven-domain list in `event-log.md` is
  correct as written. ADR 0001's "12 domains" was approximate; ADR
  0001 is immutable and stays as the historical record.

**Add two event types:**

- `habit.unarchived` — `{ habit_id }`
- `person.unarchived` — `{ person_id }`

**Do not add `area.deleted`.** `05-modules/areas-and-goals.md` offers
"rename, archive, and delete" actions for Areas, but no area-deletion
semantics exist anywhere in the doc set, and `02-architecture/data-lifecycle.md`
already establishes archival as the removal mechanism (reversible;
nothing is silently removed). The cheap and correct fix is to remove
the word "delete" from `areas-and-goals.md`: Areas archive.

**Also recorded:** `task.created.source` is **not** extended. An
earlier proposal added `'capture'` to the enum `['user', 'ai.tier1']`
so the `inbox` projection could find captured items. That conflates
provenance with lifecycle state — a captured task typed by the user
*is* `source: 'user'`. The `inbox` projection is instead defined as
"created but not scheduled, archived, or completed," which is
derivable from the existing fields and needs no schema change.

Docs updated in the same change: `02-architecture/event-log.md`
(shape, type list, domain list), `02-architecture/object-model.md`
(the "what is not an entity" note), `02-architecture/day-as-unit.md`,
`02-architecture/projections.md` (inbox definition),
`07-infrastructure/sync-engine.md`, `07-infrastructure/auth.md`,
`05-modules/habits.md`, `05-modules/people.md`,
`05-modules/areas-and-goals.md`, and ADR 0008's implementation notes.

## Consequences

**Positive.**

- The LogEntry shape regains its "no exceptions" property, which is
  the property the whole architecture leans on.
- The domain count has exactly one answer.
- Two promised actions become implementable.
- No domain is created for a single event type.
- The sensitive-data story has a mechanism that matches its
  documentation.

**Negative.**

- `LogEntry` gains a field that only the sync layer reads, slightly
  weakening the "projections read payloads" simplicity.
- The rename leaves two type strings in the union until old logs age
  out, and every projection that touches Day notes must handle both.
  This is a permanent obligation, not a migration that ends.
- A `sync: false` entry exists only on the device that wrote it. If
  that device is lost before cloud backup is enabled, the data is
  gone. The ADR makes this explicit rather than silent, but it is a
  real data-loss path.
- Two new types increment the count that docs describe as "roughly
  80," and `schema_version` stays at 1 while the type list changes,
  which reviewers must remember.

**Neutral.**

- No payload shape changes for any existing type.
- `08-decisions/0008-local-first-sensitive-defaults.md` needs no
  amendment; it described the flag as a mechanism and this ADR is
  where the mechanism becomes legal.

## Alternatives considered

- **Derive local-only status from `type` via a mapping table, leaving
  `LogEntry` closed.** Arguably cleaner — the shape stays exactly as
  documented, and the category list lives in one place in the sync
  engine. Rejected because ADR 0008 already specifies a per-entry flag
  and because a mapping table cannot express a future case where two
  entries of the same type have different routing. **This is the
  decision to revisit first if the field ever goes unused.**
- **Keep `daily_note.created` and add `daily_note` as a twelfth
  domain.** Rejected: a domain-of-one namespace for a type the `day`
  domain already owns, and it would need an ADR for every future
  Day-related type.
- **Add `area.deleted`.** Rejected: no deletion semantics exist for
  Areas, and Areas are filters — a deleted Area would orphan every
  Task, Habit, Goal, and Protocol that points at it via required
  edges.
- **Backfill local-only entries when cloud backup is enabled.**
  Rejected for v1: it makes the opt-in irreversible in practice, and
  the user cannot un-share what the server has already received.
