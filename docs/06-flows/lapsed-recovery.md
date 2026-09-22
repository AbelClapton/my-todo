# Lapsed Recovery

## Purpose

This flow defines what happens when the user comes back after not
using the app for two weeks or more. It exists because most users
will lapse, and the way the app handles the return determines
whether they come back permanently or uninstall.

The rule is: **two doors, no guilt.** The user either starts fresh
or catches up. The app never dumps the backlog on someone who is
already struggling.

## Invariants

- The flow surfaces on the first app open after a lapse
  (default threshold: 14 days).
- Two options, equal weight: "Start fresh" and "Catch up."
- No red badges, no overdue counts, no shame copy
  (`01-foundation/identity.md`).
- The flow is skippable. The user can dismiss it and use the app
  normally.
- The flow does not auto-delete anything. It archives; deletion is
  user-initiated.

## Specification

### The trigger

On the first app open after a lapse:

- Lapse is defined as ≥ 14 days since the last `day.opened`.
- The threshold is configurable (7, 14, 21, 30 days) in settings.

The flow replaces the morning plan on that day.

### The screen

A single card:

    **Welcome back.**
    It's been 23 days.

    How would you like to pick up?

    [ Start fresh ]
    Pick a new baseline. We'll set aside what didn't get done.

    [ Catch up ]
    Review what's still open. Keep what matters.

The two options are shown side by side (or stacked on narrow
screens), equal visual weight. No default. The user chooses.

### Start fresh

Tapping "Start fresh":

1. Logs `system.fresh_start` with the lapse duration.
2. Archives all open tasks older than the archive horizon (21 days)
   that were scheduled but not completed. The horizon is deliberately
   larger than the lapse threshold: a lapse is 14 days by default,
   the archive reaches further back.
3. Abandons all protocols that were `active` or `baseline` (via
   `protocol.abandoned`). Their reports, if any, remain.
4. Does not touch habits (habits survive lapses; they are the
   user's).
5. Does not touch notes (they are the user's memory).
6. Runs the morning plan for today, as if starting new.

The user sees a short confirmation:

    "Archived 14 tasks and 1 protocol. Your habits and notes
    are untouched."

A five-second undo toast appears after the confirmation, covering
the entire archive as one atomic action (Invariant 1). Undo
appends compensation entries for each archived task and each
abandoned protocol. If the toast expires, the archive stands; the
user can manually re-activate individual items later.

### Catch up

Tapping "Catch up":

1. Logs `system.catch_up`.
2. Opens a list of everything that accumulated:
   - Open tasks scheduled during the lapse.
   - Events during the lapse (read-only).
   - Protocols that were active.
   - Inbox items.
3. The list supports the sort-ritual gestures (swipe right to
   keep, left to defer, up to attach, down to delete).
4. The user processes at their own pace. There is no counter,
   no pressure.
5. When the user exits the list, they land on today's calendar.

The catch-up list is bounded. Items older than 60 days are
collapsed into a single row: "47 older items [Review] [Archive
all]." The user can choose to review or archive in one tap.

### Skipping

A "Skip" link in the bottom corner. Tapping:

- Dismisses the flow.
- Does not log anything.
- Runs the morning plan normally.

The user can trigger the flow again via the command palette:
"Recover from lapse."

### Post-recovery state

After either path:

- The morning plan runs.
- The daily obligations card surfaces normally.
- Resurfacing may fire once at a reduced priority to welcome the
  user back.
- The weekly review generates on the next Sunday, covering the
  week since the return (not the lapse).

### What the app does not do

- Does not show "you have 47 overdue tasks."
- Does not email or push "we miss you" messages with guilt copy.
- Does not reset habits or compliance (the user's data
  survives).
- Does not delete anything without consent.
- Does not congratulate the user for returning (the return is
  its own reward).

### The re-lapse

If the user lapses again within 30 days of returning, the flow
surfaces again but with slightly different copy:

    "Welcome back again. It's been 17 days."
    Same two doors. No comment on the previous return.

The app does not track "returns" as a metric. That would be a
growth feature disguised as a product feature
(`01-foundation/identity.md`).

## Examples

**A fresh start.**

    User opens the app after 23 days away.

    **Welcome back.**
    It's been 23 days.

    [ Start fresh ]   [ Catch up ]

    User taps Start fresh.

    "Archived 14 tasks and 1 protocol. Your habits and notes
    are untouched."

    [Continue]

    Continue → morning plan for today.

**A catch up.**

    User taps Catch up.

    A list:
      Task: File Q4 taxes               Sep 1
      Task: Call contractor             Sep 2
      Task: Buy standing desk           Sep 5
      Task: Review pricing page         Sep 8
      ... (23 more)
      + 47 older items [Review] [Archive all]

    User swipes:
      - File Q4 taxes → keep for today.
      - Call contractor → delete.
      - Buy standing desk → someday.
      - Review pricing page → defer.
      - ...

    User taps "47 older items → Archive all."
    All archived in one action.

    User exits the list.
    Lands on today's calendar.

**A skip.**

    User taps Skip.
    Flow dismisses.
    Morning plan runs normally.

**A recovery triggered manually.**

    User hits Cmd+K, types "recover."
    Result: "Recover from lapse."
    User taps it. Flow opens (even though no lapse occurred).
    The flow is available on demand, for users who want to
    re-baseline.

**A second lapse.**

    User returned, used the app for 12 days, then lapsed for 17
    days.
    On return:
    "Welcome back again. It's been 17 days."
    Same two options. No comment on the pattern.

## What this doc must NOT do

- This doc does not define the morning plan. That is
  `06-flows/morning-plan.md`. Recovery calls it.
- This doc does not define the sort ritual. That is
  `06-flows/capture.md`. Recovery reuses its gestures.
- This doc does not define archival. That is
  `02-architecture/data-lifecycle.md`.
- This doc does not define protocols' abandonment. It archives
  them. Protocols are `05-modules/protocols.md`.
- This doc does not define tokens, gestures, or motion. It
  references them.
- This doc does not define growth or re-engagement features.
  There are none.