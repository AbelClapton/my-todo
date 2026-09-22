# ADR 0002 — Day as Atomic Unit

- **Status:** Accepted
- **Date:** 2026-09-22
- **Deciders:** [founder]

## Context

The app has four modes (Calendar, Tasks, Habits, Notes) and four
layers (Protocols, People, Areas/Goals, Review). It needs a single
organizing concept that makes them feel like one product rather
than five utilities in a trench coat.

Every module has a temporal dimension: events happen on days, tasks
are scheduled on days, habits are checked on days, protocols log
metrics on days, notes are written on days.

## Decision

Adopt the **Day** as the atomic product unit. Everything that
happens attaches to exactly one Day — an event, a completion, a
habit check, a metric log, a scheduling, the Daily Note. The Day is
the join key across every module. Things that span Days (a
Protocol) or that are definitional rather than temporal (an Area, a
Goal, a Person) do not attach to one; they are what Days are about.
The calendar is the primary view of Days.

See `02-architecture/day-as-unit.md`.

## Consequences

**Positive.**

- The app has a coherent organizing principle: it is a system for
  understanding and improving your days.
- The calendar is elevated from "one of four modes" to "the hub."
- The AI's context anchor is obvious: the Daily Note plus the
  Day's events, tasks, and metrics.
- Cross-module insights are natural: "on days you exercised, you
  completed more tasks."
- The weekly review is a fold over seven Days.

**Negative.**

- The Day boundary must be configurable (default 4am) to serve
  night owls, which adds a small amount of complexity.
- Timezone handling requires care; the Day is a local-timezone
  date, not a UTC window.
- Some users will want a "week" or "month" unit as primary; these
  are views over Days, not separate units.

**Neutral.**

- Non-temporal entities (Areas, Goals, People) do not attach to
  Days. This is by design.

## Alternatives considered

- **The task as the atomic unit.** Would make the app a task
  manager. Fails the identity test
  (`01-foundation/identity.md`).
- **The event as the atomic unit.** Would make the app a calendar.
  Loses the tracker dimension.
- **The week as the atomic unit.** Would make the app a planner.
  Too coarse for daily tracking.
- **No atomic unit.** Five modules in a trench coat. The exact
  failure mode this ADR exists to prevent.