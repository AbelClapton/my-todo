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

### The shove

When the user drags a scheduled task past today (or taps "Defer"
and picks a date), the app asks:

    Move to tomorrow?
    [Tomorrow]  [Pick a date…]  [Someday]  [Keep today]

Two taps, no full date picker unless "Pick a date…" is chosen. The
default is "Tomorrow."

The shove is the primary rescheduling mechanism. It is available:

- From a task row via swipe left.
- From the task detail via "Reschedule."
- From the calendar by dragging a task to another day.

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
   a time slot after the overrun.
3. Logs `calendar.updated` / `task.scheduled_to_day` for each
   shift.
4. Undo toast covers all shifts atomically.

If the user chose "Keep as is," the app remembers the choice for
that day and does not ask again.

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

- **Reschedule all to tomorrow.** Defers every slipped task to
  tomorrow in one atomic action.
- **Review individually.** Opens a list where each task gets a
  swipe-right (tomorrow) or swipe-left (someday).
- **Leave them.** Dismisses the digest; the tasks remain in their
  current state.

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
    Sheet appears:
      [Tomorrow]  [Pick a date…]  [Someday]  [Keep today]
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
  `05-modules/tasks.md`.
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