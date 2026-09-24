# Disruption

## Purpose

This flow defines what happens when the day goes off-script: a
meeting runs over, a task takes longer than expected, a plan
unravels. It exists because disruption is normal and most apps
punish it — either with red overdue badges or by requiring the user
to manually rebuild the day.

The rule is: **the app absorbs the disruption so the user doesn't
have to.**

## Invariants

- Disruption handling is reversible (Invariant 1).
- Nothing auto-schedules without consent
  (Invariant 2, `01-foundation/principles.md`).
- Slippage is framed neutrally. No shame copy, no red badges
  (`01-foundation/identity.md`).
- The what-slipped digest fires at most once per day
  (`03-experience/attention-budget.md`).

## Specification

### The defer sheet, and its three doors

Moving something off today is the **defer sheet**. Its options, their order
and what each one writes are specified in `05-modules/tasks.md` §Defer
sheet; this flow does not restate them, and an earlier version of this doc
drew the sheet with a different fourth option — "Keep today", which sets
`defer` to the day the task was already deferred to and therefore writes
nothing — while omitting "Next week". Two sheets in one app, and the doc
whose own closing section says the sheet belongs to `tasks.md` was the one
that disagreed with it.

What this flow owns is **where the sheet opens from**, which the module doc
does not say:

- From a task row, by swiping left.
- From the task detail, by "Reschedule".
- From the calendar, by dragging a task to another day.

**Deferring is not rescheduling.** The sheet sets `defer`, which `tasks.md`
defines as *"when the task becomes visible"*. Changing **when it is worked
on** is `scheduled_day`, and it is a different act on a different field —
the distinction §Deadline vs. slippage below works through. An earlier
draft called the sheet *"the primary rescheduling mechanism"*, which is
what put the wrong fourth option in it.

### Automatic reflow

When an event runs over its scheduled end, the app notices (via the
calendar sync) and offers:

    "Design review ran 22 min over. Shift the rest of the day?"

    [Shift]  [Keep as is]

The offer is a `contextual` nudge, not a surface of its own: no
`SurfaceId`, no separate toggle, and it spends budget as
`contextual` when it fires
(`03-experience/attention-budget.md`, ADR 0013).

Tapping "Shift":

1. Shifts all subsequent events today by the overrun amount (with
   the user's confirmation for each event, batched).
2. Shifts scheduled tasks that have a `scheduled_day` of today and
   a time after the overrun. **A scheduled task's time is a field the
   object model does not have** — `05-modules/calendar.md` positions
   scheduled tasks *"as proportional blocks, positioned by clock
   time"*, and `Task` carries `scheduled_day` and nothing to place
   within it. Recorded as an open question in
   `02-architecture/object-model.md` rather than resolved here.
3. Logs `calendar.updated` / `task.scheduled_to_day` for each
   shift.
4. Undo toast covers all shifts atomically.

If the user chose "Keep as is," the app remembers the choice for that day
and does not ask again. **That is a durable fact and it is logged:**
`system.nudges_silenced { day, surface_ids: ['contextual'] }`. It is not a
field on the Day and not a client-side buffer, because a refusal the user
gave has to survive a restart — the same argument that produced
`system.lapse_skipped` in `06-flows/lapsed-recovery.md`.

### Overdue framing

Tasks with `due` in the past are shown as "overdue" in the task
detail (in `text-secondary`, not red), and they appear at the top
of the Today scope with a subtle chip: "overdue 2d."

Overdue tasks do not accumulate. There is no "you have 47 overdue
tasks" screen. They are shown, and they are acted on, or they are
not.

### The what-slipped digest

Once per day, at most, at the end of the day (fired by the shutdown
flow, or as a standalone nudge if shutdown is skipped):

    "Today: 6 done, 3 slipped. Reschedule the slipped?"
    [Reschedule all to tomorrow]  [Review individually]  [Leave them]

- **Reschedule all to tomorrow.** Moves every slipped task's
  `scheduled_day` to tomorrow in one atomic action —
  `task.scheduled_to_day`, one entry per task, reversed as one. **Not
  `defer`:** a slipped task was *scheduled* for today, and *"Disruption
  affects the scheduled day"* is this doc's own rule one section down.
  Earlier drafts said the action "defers every slipped task", which
  named the wrong field on the wrong entity in the doc that had just
  finished distinguishing them.
- **Review individually.** Opens a list where each task gets a
  swipe-right (tomorrow) or swipe-left (someday).
- **Leave them.** Dismisses the digest; the tasks remain in their
  current state, and the dismissal is logged as
  `system.nudges_silenced { day, surface_ids: ['what_slipped'] }` so
  "does not fire again that day" is a fact the log holds rather than a
  value the client remembers.

Slipped tasks are tasks with `scheduled_day: today` that were not
completed. They are not tasks with `due: today` (which are a
different category, surfaced as "overdue").

This is a nudge, subject to the attention budget (surface ID:
`what_slipped`). If dismissed, it does not fire again that day.

When it fires inside shutdown completion it is content, not a
surface, and spends nothing — shutdown already holds that hour's
slot. The `what_slipped` budget is spent only by the standalone
firing, on a day shutdown was skipped
(`06-flows/shutdown.md`, ADR 0013).

If the user has not opened the app for the configured lapse threshold
(`lapse.threshold_days`, default 14 days — see
`06-flows/lapsed-recovery.md`), the disruption flow transitions to
the lapsed-recovery flow rather than firing a what-slipped digest.
The what-slipped flow assumes the user is engaged. Lapsed recovery
assumes they're not.

### Deadline vs. slippage

A task can be both scheduled today and due next Friday. Slipping
the scheduled day does not affect the due date. Slipping the due
date is a separate action ("Extend deadline").

The two are surfaced separately:

- Scheduled day: "when you planned to do it."
- Due date: "when it must be done by."

Disruption affects the scheduled day. The due date is only changed
explicitly.

## Examples

**A meeting runs over.**

    Design review scheduled 11:00–12:00.
    Runs until 12:22.
    App notices on sync.
    Nudge (if within hourly cap):
      "Design review ran 22 min over. Shift the rest of the day?"
      [Shift]  [Keep as is]

    User taps Shift.
    Subsequent events today shift by 22 min.
    Scheduled tasks after 12:00 shift by 22 min.
    Undo toast: "Shifted 4 tasks. Undo?"

**The shove.**

    User swipes task "Call contractor" left.
    The defer sheet opens (`05-modules/tasks.md` §Defer sheet):
      Tomorrow · Next week · Someday · Pick a date…
    User taps Tomorrow.
    `task.rescheduled` logged with `defer: tomorrow`.
    Row stays (it was scheduled today, defer is tomorrow), metadata
    updates: "deferred tomorrow."
    Undo toast: "Deferred tomorrow. Undo?"

**End-of-day digest.**

    At 9pm (or at shutdown), the digest appears:
      "Today: 6 done, 3 slipped. Reschedule the slipped?"
      [Reschedule all to tomorrow]  [Review individually]  [Leave]

    User taps Reschedule all.
    3 tasks deferred to tomorrow.
    Undo toast.

**An overdue task.**

    Task "File Q4 taxes", due last Friday, not completed.
    Today scope shows it at the top:
      [ ] File Q4 taxes          Home · overdue 3d
    The "overdue 3d" chip is in `text-secondary`, not red.
    Tapping the task opens the detail, where the due date can be
    edited.

## What this doc must NOT do

- This doc does not define the defer sheet. That is in
  `05-modules/tasks.md` — including its options, which this doc cites
  and does not redraw.
- This doc does not define the shutdown flow. Shutdown is
  `06-flows/shutdown.md`.
- This doc does not define the attention budget. It references
  it.
- This doc does not define lapsed recovery. Lapsed recovery is
  `06-flows/lapsed-recovery.md`.
- This doc does not define tokens, gestures, or motion. It
  references them.
- This doc does not define the calendar's editing behavior. It
  lives in `05-modules/calendar.md`.