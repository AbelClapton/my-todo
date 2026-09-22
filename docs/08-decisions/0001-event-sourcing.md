# ADR 0001 — Event Sourcing

- **Status:** Accepted
- **Date:** 2026-09-22
- **Deciders:** [founder]

## Context

The app has multiple modules, an AI layer, a sync story, and a time
machine. It needs a single source of truth for state, and it needs
to support:

- Undo of every action (Invariant 1).
- Time machine (read any past date).
- Insights and correlations across history.
- Sync across devices without merge conflicts.
- Audit trail for AI actions (Rules 1, 4).

A conventional "current state in tables, mutate in place" model
would require solving each of these separately.

## Decision

Adopt an **append-only event log** as the source of truth. Current
state is a projection computed from the log. Every state change is
a log entry. Undo is a compensation entry. Sync replicates log
entries.

See `02-architecture/event-log.md`.

## Consequences

**Positive.**

- Undo, time machine, insights, and sync all become the same
  mechanism: fold the log.
- AI audit trail is structural, not bolted on.
- No merge logic for sync. Conflicts resolve by order.
- Product analytics are free from the same log.
- GDPR deletion is a tombstone, keeping the log consistent.

**Negative.**

- Log entries accumulate; storage grows monotonically.
- Snapshots are needed for performance after ~1000 entries.
- Schema evolution requires handling all versions in projections.
- Developers unfamiliar with event sourcing will need onboarding.
- "Current state" queries require projection computation, not a
  simple SELECT.

**Neutral.**

- The log is a SQLite table; no exotic storage required.
- The projection layer is thin; most projections are 20-line
  folds.

## Alternatives considered

- **Current-state tables with audit log.** Would require a
  separate undo system, a separate time machine, and a separate
  sync conflict resolver. Three systems where one suffices.
- **Event sourcing library (ts-event-core, Hamstore).** These
  target complex aggregates with dozens of event types. The app
  has ~80 entries across 12 domains, most with one-line payloads.
  A library would be overhead.
- **CRDT-based state.** Would work for sync but does not give
  undo, time machine, or insights. Wrong tool for the full set of
  requirements.