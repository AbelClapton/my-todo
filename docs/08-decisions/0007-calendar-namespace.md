# ADR 0007 — Calendar Namespace for Event Log Entries

- **Status:** Accepted
- **Date:** 2026-09-22
- **Deciders:** [founder]

## Context

The object model (`02-architecture/object-model.md`) has an atom
called **Event** (capital E). The event log
(`02-architecture/event-log.md`) namespaces log entry types by
domain, dot-separated. The domain for Event-related entries was
originally `event.*`.

This collides:

- `event.created` (a log entry) creates an **Event** (an atom).
- `event.mirrored` (a log entry) records a mirrored **Event**.
- `event.deleted` (a log entry) tombstones an **Event**.
- `event.linked_person` (a log entry) links a **Person** to an
  **Event**.

In prose, the collision is manageable: "the Event atom" versus
"the `event.created` log entry." In code, it is not. TypeScript
is case-sensitive, but the two concepts appear in the same
identifiers (`EventCreatedPayload`, `createEventEntry`), and the
distinction blurs. In AI prompts, the collision causes genuine
confusion — an AI writing code might type `Event` where it means
the log entry type, or vice versa.

The glossary (`01-foundation/glossary.md`) attempted to
disambiguate by capitalizing the atom and lowercasing the log
entries, but this fails the moment the two appear in the same
sentence. It also fails in code, where case-sensitive identifiers
are common.

Additionally, the domain `event.*` implicitly claims the concept
"event" for the whole event log, which is confusing: the log
itself is called "the event log," and every entry in it is an
"event." The namespace `event.*` should not be one domain among
many; it should be the log itself.

## Decision

Rename the `event.*` log namespace to `calendar.*`. So:

- `event.created` → `calendar.created`
- `event.updated` → `calendar.updated`
- `event.deleted` → `calendar.deleted`
- `event.mirrored` → `calendar.mirrored`
- `event.linked_person` → `calendar.linked_person`
- `event.unlinked_person` → `calendar.unlinked_person`

The **Event** atom keeps its name. The distinction is now:

- **Event** is a thing (a time-bounded occurrence).
- `calendar.*` is a log namespace (the family of entries that
  create and mutate Events).

The name `calendar` was chosen because:

- It matches the mode name (the "Calendar" mode displays Events).
- It matches the user's mental model ("my calendar" = the events).
- It avoids the word "event" entirely, eliminating the collision.

## Consequences

**Positive.**

- No collision. The namespace and the atom are clearly distinct.
- Code is unambiguous: `LogEntry<CalendarCreated>` is not confused
  with `Event`.
- The domain list is cleaner: the calendar domain handles
  time-based occurrences; the Event atom is the shape.
- Prose in docs becomes clearer: "`calendar.created` creates an
  Event" reads naturally, whereas "`event.created` creates an
  Event" was always awkward.
- AI prompts are less likely to confuse the two concepts.

**Negative.**

- Every doc that referenced `event.*` must be updated. This is a
  one-time cost, but it touched roughly ten files.
- Developers coming from other event-sourced systems may expect
  `event.*` to be the "generic event" namespace. This app does not
  have a generic event; it has typed entities.

**Neutral.**

- The rename is a naming change only. No semantics change, no
  schema change, no behavior change.
- No production data exists yet, so no migration is required. If
  this rename happened later, it would require a schema version
  bump.

## Alternatives considered

**Rename the atom to `Occurrence`.**

- Would avoid the collision by renaming the atom.
- Rejected: loses the familiar word "Event" for the user-facing
  concept. Users say "events," not "occurrences." The atom name
  should match the user's vocabulary.

**Rename the log entries' grammar to `create.event`,
`update.event`, etc.**

- Would require every event type in the log to change grammar.
  `task.created` would become `created.task`, and so on.
- Rejected: too disruptive. It changes the naming convention for
  every entry, not just the Event domain.

**Use `occurrence.*` for the log namespace, keep `Event` as the
atom.**

- Would avoid the collision.
- Rejected: "occurrence" is not a word users use. The mode is
  called "Calendar," so the domain should be `calendar`.

**Do nothing.**

- The collision is workable in prose.
- Rejected: the collision produces continuous small confusions in
  docs, code, and AI prompts. It is the kind of friction that
  compounds.

## Migration

No production data exists yet. The rename is applied retroactively
to all docs. Every occurrence of `event.` in the context of log
entry types is replaced with `calendar.`.

Files updated:

- `02-architecture/event-log.md`
- `02-architecture/object-model.md`
- `02-architecture/projections.md`
- `02-architecture/data-lifecycle.md`
- `05-modules/calendar.md`
- `05-modules/people.md`
- `06-flows/disruption.md`
- `07-infrastructure/integrations.md`
- `07-infrastructure/sync-engine.md`
- `01-foundation/glossary.md` (as an amendment note)

Files that reference the atom `Event` (capital E) are unchanged.
The atom keeps its name.

A future rename of the atom itself would require a new ADR.

## Related

- `02-architecture/event-log.md` — the log entry types.
- `02-architecture/object-model.md` — the Event atom.
- `01-foundation/glossary.md` — terminology.
- `05-modules/calendar.md` — the mode that displays Events.