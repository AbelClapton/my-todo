# ADR 0006 — Reminders Fold Into Tasks and Events

- **Status:** Accepted
- **Date:** 2026-09-22
- **Deciders:** [founder]

## Context

The original brief listed "reminders" as a first-class concept
alongside tasks, habits, and calendar. The question is whether
Reminders deserves to be its own module, its own atom, or its own
mode in the navigation.

A **reminder** is: something the user wants to be notified about at
a specific time. It is not a distinct kind of work. It is a
*time-based notification* attached to some other thing.

Two existing entities already have time-based notifications:

- **Tasks** have `due` (a deadline) and `defer` (when they become
  visible).
- **Events** have `start` (when they occur) and a prep card that
  fires before them (`06-flows/doing-the-day.md`).

A third entity for "reminders" would either:

- (a) Duplicate what `due` and `defer` already do, or
- (b) Be a fundamentally different thing (a reminder with no task
  or event attached), which raises the question of what it *is*.

## Decision

**Fold Reminders into Tasks and Events.** There is no Reminders
module. There is no `reminder` atom. There is no `reminders` mode
in the navigation.

Reminders are expressed as:

- **`due` on a Task.** A deadline. It is not a now-line source; a
  due date that passes shows as an "overdue" chip in the Today
  scope and in the task detail (`06-flows/disruption.md`).
- **`defer` on a Task.** A "remind me when this becomes visible"
  behavior. The task is hidden until the defer date, then appears
  in the Today scope.
- **`start` on an Event.** The event's time. The prep card fires
  10 minutes before, if attendees or notes are present.

Notification delivery is handled by the attention budget
(`03-experience/attention-budget.md`), not by a separate reminders
system. A task that is not completed on the day it was *scheduled*
becomes part of the what-slipped digest
(`06-flows/disruption.md`); a `due` date that passes is a different
category and is surfaced as "overdue" instead.

## Consequences

**Positive.**

- One fewer mode in the navigation. The nav stays at four modes
  (Calendar, Tasks, Habits, Notes) instead of five.
- The object model stays at four atoms (Task, Event, Note, Habit).
  No fifth atom, no new edge types.
- Reminders live where their source lives: a task reminder on the
  task, an event reminder on the event. No cross-referencing.
- The attention budget handles delivery uniformly. Reminders are
  subject to the same hourly cap, quiet hours, focus mode, and
  in-event suppression as everything else.
- No reminder-to-task conversion flow, because they are the same
  thing.
- The protocol layer is untouched. A protocol habit with a
  reminder is just a habit with a cadence — the same mechanism.

**Negative.**

- Some users will look for a Reminders tab and not find one. The
  app must teach them that reminders are `due` and `defer`. This
  is done via the task detail (which shows both fields explicitly)
  and via capture parsing ("remind me to..." → a task with `due`).
- Standalone reminders (a notification with no task or event) are
  not possible. If a user wants one, they create a task. This is a
  deliberate simplification, not a limitation.

**Neutral.**

- The word "reminder" is used in UI copy ("Remind me to..."), and
  Tier 1 parses it (`04-ai/tier-1-parsing.md`). But "reminder" is
  not a module name, not an entity name, and not a mode.

## Alternatives considered

**Reminders as a fifth atom.**

- A new `Reminder` entity with its own `reminder.created`,
  `reminder.fired`, `reminder.dismissed` events.
- Rejected: adds an entity, an edge type, a mode, and a projection
  for something that is a property of existing entities. Fails the
  feature test (`01-foundation/identity.md`): does it help the
  user learn something about themselves? Not really.

**Reminders as a view of tasks and events.**

- Functionally equivalent to this decision, but framed as a UI
  surface ("Here are all your reminders").
- Rejected: implies a Reminders screen exists, which it does not.
  The `due` and `defer` fields are shown where their parent
  entity is shown.

**Reminders as a separate notification system.**

- A parallel notification layer, distinct from the attention
  budget.
- Rejected: two notification systems is a maintenance nightmare
  and violates Invariant 3 (attention budget). Everything goes
  through one queue.

**Reminders as a lightweight tag on tasks and events.**

- A `reminder: true` boolean that filters a "Reminders" view.
- Rejected: semantically identical to a `due` date, but with an
  extra field to maintain. Adds complexity without adding value.

## Related

- `02-architecture/object-model.md` — the four atoms.
- `05-modules/tasks.md` — the `due` and `defer` fields.
- `05-modules/calendar.md` — event times and the prep card.
- `03-experience/attention-budget.md` — notification delivery.
- `04-ai/tier-1-parsing.md` — parsing "remind me to..."
- `01-foundation/identity.md` — the feature test.