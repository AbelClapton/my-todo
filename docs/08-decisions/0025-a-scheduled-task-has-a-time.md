# ADR 0025 — A Scheduled Task Has a Time, and It Is a Point

- **Status:** Accepted
- **Date:** 2026-09-28
- **Deciders:** [founder]

## Context

Two sentences in two docs ask the app to place a scheduled task **at a time
within its day**:

- `05-modules/calendar.md`, the Day view — the timeline is *"a vertical time
  axis"* and *"events and scheduled tasks"* are *"positioned by time"*.
- `06-flows/disruption.md`, automatic reflow, step 2 — it shifts *"scheduled
  tasks that have a `scheduled_day` of today and **a time after the
  overrun**"*.

`02-architecture/object-model.md`'s Task carries three temporal fields —
`due`, `defer`, `scheduled_day` — and **all three are `DateString`**: a day,
not a moment. Nothing on the Task says *when* within a day it sits. The gap is
recorded there as an open question rather than resolved, because the fix has a
choice in it and either route changes a log payload.

Two things turned that question from academic into blocking:

1. **The Day view is becoming a chart.** A list can hide a missing time — the
   gutter cell is left empty and nobody notices. An axis cannot: a block needs
   a y-coordinate. The Day view's timeline is the only surface in the app that
   must place a task within its Day, and it is the next thing being built.
2. **`disruption.md` compares a time that does not exist.** *"A time after the
   overrun"* cannot be evaluated against a day. As written the step either does
   nothing or shifts **every** task of the day — and the second is worse than
   the first, because it looks like it worked.

The mirror image of this decision is an absence rather than a field: a task
with a `scheduled_day` and **no** time is a legal and common state — it belongs
to the day without being placed in it — and the Day view needs a rule for it.

## Decision

**Add `scheduled_time?: TimeString` to the Task, where `TimeString` is
`'HH:mm'` local wall-clock.**

- **Local, not an instant**, for the reason `due`, `defer` and `scheduled_day`
  are days: `02-architecture/day-as-unit.md` is explicit that a Day is *"a
  local-timezone date"* and *"not a 24-hour window in UTC."* A time of day has
  the same character. An offset or an instant would move a task's hour when the
  user travels — the defect the three `DateString` fields were corrected for.
- **It is a point, not a span.** There is no `scheduled_minutes`, and none by
  default. A task placed at 14:30 has a position and no stated extent; the
  calendar draws it at the **floor height** (one line of text) as a stub, and
  the Week draws it as a point.
- **`scheduled_time` is meaningful only with `scheduled_day`.** A time without a
  day is unrepresentable in the entity.
- **`scheduled_day` without `scheduled_time` is legal and means "belongs to the
  day, not placed in it."** Such a task appears in the Day view's **band**,
  beside the day's other untimed content, and never on the axis.
- `task.scheduled_to_day` becomes `{ task_id, day, time? }`. Setting a time on
  an already-scheduled task is a second entry with a longer payload, not a new
  type — append-only, like everything else.
- `disruption.md`'s reflow compares `scheduled_time` where it exists; tasks with
  a day and no time shift with the day.

**Not extended to Events.** An Event already carries `start`/`end` as instants.
This is the field a Task needed to be placeable, not a second way to describe
an Event.

**Creation offers the hour; nothing requires it.** The field is set where a
task is created — the inline capture field, Tier 1 parsing, and the task
detail (`05-modules/tasks.md`) — alongside `due` and `defer`, which
`task.created` already carries. Every existing write path supplies a day and
no time by default, which is why the legal-state rule above is the current
default rather than an edge case. The gesture that is **not** built is
dragging a task onto the day's axis; that is the Day view's own work.

Docs updated in the same change: `02-architecture/object-model.md` (the field
set, and the open question replaced by the rule), `02-architecture/event-log.md`
(`task.scheduled_to_day`), `05-modules/tasks.md` (the temporal fields become
three days and a time), `05-modules/calendar.md` (the Day view's axis and band;
the Week's *"proportional blocks"* corrected — a task is a point), and
`08-decisions/README.md`.

## Consequences

**Positive.**

- The calendar can place a scheduled task, and the reflow step can be evaluated
  rather than guessed.
- **One field, two consumers.** The alternative route stores the same
  information somewhere the Task still has to reach.
- Most scheduled tasks will have no time, and they now have a stated home rather
  than a blank gutter cell — the common case is designed, not tolerated.
- `'HH:mm'` is what the axis needs, so there is no conversion between the stored
  value and the drawn label.

**Negative.**

- A second field on the write path wherever `scheduled_day` is set, across five
  writers, all of which answer "no". The field's only honest source is a gesture
  that does not exist yet.
- A `DateString` day and a wall-clock `'HH:mm'` are two fields that must agree,
  and together they carry no timezone. That is correct here and would be wrong
  if a task ever had to fire at an absolute instant.
- `scheduled_time` sits beside `defer`, which is **visibility**, not scheduling
  (`06-flows/disruption.md` draws the distinction). A reader who conflates them
  sets the wrong field, and nothing in the field names prevents it.

**Neutral.**

- No new log type; one existing type gains an optional key, so `schema_version`
  does not increment.
- The open question in `object-model.md` closes.

## Alternatives considered

**Make a scheduled task an Event.** `object-model.md` defines an Event as
*"anything with a time"*, so scheduling could create a linked Event instead of a
field. Rejected: the Task already carries `scheduled_day`, so this stores one
intention in two objects and requires them to be kept in step through
completion, deletion and mirroring. ADR 0006 folded reminders into Tasks and
Events to avoid a third representation of one intention; scheduling-as-an-Event
buys that representation back.

**Add a duration — `scheduled_minutes`.** Rejected: neither consumer needs an
extent. The calendar needs a position; the reflow needs an ordering. A duration
forces the app to invent a value the user never gave, and an optional field
whose only default is "unknown" is the same as not having it.

**Store an instant — `ISO-8601 UTC`.** Rejected: it moves a task's hour when the
user travels, and it disagrees with the three `DateString` fields beside it.
`completed_at` is an instant because a completion happens at a moment in real
time; a scheduled hour is a wall-clock intention.

**Put the time on the log entry only, not in the field set.** Rejected: the
entry is where the value is written, but `object-model.md`'s field sets *are*
the projection's output. Omitting it there leaves the calendar reading raw
entries instead of the entity — exactly the coupling ADR 0001's projection
model exists to remove.

**Drop the promise — no time for tasks.** Rejected: it deletes `disruption.md`'s
reflow step 2 and removes scheduled tasks from the Week's axis, where the doc
already draws them. The cheapest option in code and the most expensive in
behaviour.
