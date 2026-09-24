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

The card surfaces on an app open when **both** hold:

- The gap between the **last two** `day.opened` entries is ≥ 14 days
  (configurable: 7, 14, 21, 30 in settings).
- **No resolution entry has been logged since the later of those two
  entries** — none of `system.fresh_start`, `system.catch_up`,
  `system.lapse_skipped`.

**The trigger is deliberately not "≥ 14 days since the last
`day.opened`."** Rollover writes today's `day.opened` on the same open
that evaluates this flow, and rollover is not budget-governed — so a
trigger phrased against *the last* entry is true for the instant before
its own evaluation and false immediately after. A user who returns at
06:40 would consume the lapse and never see the card. Reading the gap
between the last **two** entries is a durable fact: it is still true on
the next open, and on every open until the flow is resolved.

**Resolution is recorded, not inferred.** The three ways to be done with
the card are `system.fresh_start`, `system.catch_up` and
`system.lapse_skipped` — one per door plus the skip — so "once per
lapse" is something the log says rather than something the gap
arithmetic happens to produce. The **showing** is not logged: firings
are recorded in the client diagnostics buffer, never the event log
(`03-experience/attention-budget.md`, ADR 0021).

**The card takes the day's first position, ahead of the morning
plan.** The morning plan still runs — it is the flow's own next step
(§Start fresh, step 6) and it is called from three other places. This
flow does not suppress it. If a reader implements "replaces" as
suppression, the plan is lost on the one day the user most needs it.

### The screen

A single card:

    **Welcome back.**
    It's been 23 days.

    How would you like to pick up?

    [ Start fresh ]
    Pick a new baseline. We'll set aside tasks scheduled more than
    three weeks ago that you never finished. Recent ones stay.

    [ Catch up ]
    Review what's still open. Keep what matters.

The two options are shown side by side (or stacked on narrow
screens), equal visual weight. No default. The user chooses.

The card is one of exactly three surfaces **exempt** from the
attention budget: it fires once per lapse, dismissal is permanent
for that lapse, and it never competes for the hourly slot. Exempt
surfaces have no `SurfaceId` and no per-surface settings toggle
(`03-experience/attention-budget.md`, ADR 0013).

**Exemption is from the hourly slot, not from the clock.** Like the
other two exempt surfaces, this one obeys quiet hours, focus mode, and
in-event suppression. Because its trigger is a one-shot state, a
blocked firing **preserves** the state rather than consuming it: the
card waits for the next eligible open instead of being lost. This is
the consequence of the durable gap in §The trigger and the reason that
change matters — 9 of the day's 24 hours are quiet, before meetings and
focus sessions are counted.

### Start fresh

Tapping "Start fresh":

1. Logs `system.fresh_start` with the lapse duration.
2. Archives all open tasks older than the archive horizon (21 days)
   that were scheduled but not completed. The horizon is deliberately
   larger than the lapse threshold: a lapse is 14 days by default,
   the archive reaches further back.

   **Two things this rule does not touch, and the door's copy now says
   so.** Tasks that were never scheduled are not archived at any age —
   they were never committed to, so there is nothing to set aside — and
   a task scheduled in the 14–21 day band survives, because the horizon
   deliberately keeps the most recent backlog. The gap between the
   threshold and the horizon is 7 days, and it is the reason the button
   describes the horizon instead of saying "what didn't get done."

   The never-scheduled pile is not lost: `06-flows/resurfacing.md`
   surfaces it 21 days after creation.
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
user can manually re-activate individual tasks and protocols later.

### Catch up

Tapping "Catch up":

1. Logs `system.catch_up`.
2. Opens a list of everything that accumulated:
   - Open tasks scheduled during the lapse.
   - Events during the lapse (read-only).
   - Protocols that were active.
   - Inbox captures.
3. The list supports the sort-ritual gestures, **per row type**: swipe
   right to today, left to someday, up to attach, down to remove —
   never delete. (This list holds tasks, events, protocols and captures,
   and the ritual's mapping is the **inbox** row's; swipe up and down
   are disabled on the rows where that mapping has no meaning. See
   `03-experience/gesture-vocabulary.md`.)
4. The user processes at their own pace. There is **no progress
   counter** — nothing shows how many remain as you work. A collapsed
   group states its own size, because hiding it would make the Archive
   all button a surprise.
5. When the user exits the list, they land on today's calendar.

The catch-up list is bounded. Anything older than 60 days collapses
into a single row: "47 more [Review] [Archive all]." The user can
choose to review or archive in one tap.

**"Archive all" is a batch, so it carries the same undo the other one
does.** The action is atomic and undoable for five seconds, exactly as
§Start fresh's archive is (Invariant 1): one toast, compensation
entries for each archived task, and the same expiry rule. It is the
largest single mutation in the app and it was the only one in this flow
without a stated way back. The row states its count **before** the tap,
which is why a collapsed group is allowed to show a number when nothing
else on this screen does.

### Skipping

A "Skip" link in the bottom corner. Tapping:

- Dismisses the flow.
- Logs `system.lapse_skipped`.
- Runs the morning plan normally.

The user can trigger the flow again via the command palette:
"Recover from lapse."

### Post-recovery state

After either path:

- The morning plan runs.
- The daily obligations card surfaces normally.
- **Resurfacing is suppressed for the rest of the return day, and
  resumes the next day.** No resurfacing surface fires on a day the
  lapse card appeared: the forgotten surface
  (`06-flows/resurfacing.md`) lists precisely the backlog this flow
  exists not to dump, and its thresholds (14 days for an "[unparsed]"
  note, 21 for a never-scheduled task) are at or below this flow's own,
  so its material is guaranteed to exist on the return day.
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
      ... (23 more from the last 60 days)
      + 47 older than 60 days [Review] [Archive all]

    User swipes:
      - File Q4 taxes → today.
      - Call contractor → someday.
      - Buy standing desk → someday.
      - Review pricing page → someday.
      - ...

    User taps "47 more → Archive all."
    All 47 archived in one action, undoable for five seconds.

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