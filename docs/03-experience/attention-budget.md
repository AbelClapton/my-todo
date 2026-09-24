# Attention Budget

## Purpose

This doc defines the ranked queue that every notification-worthy
surface registers with, the cap on nudges (one per hour, three per
day), and the rules for what does and does not count. It exists
because the app has, by design, many surfaces that want the user's
notice — the now line, prep cards, contextual nudges, the forgotten
surface, people resurfacing, the weekly review, protocol reviews,
price alerts, and more. Without a budget, the app becomes noise.

This is Invariant 3 (`01-foundation/principles.md`), specified.

## Invariants

- Every nudge registers with the queue. Nothing fires outside it.
- Maximum one nudge per hour.
- Maximum three nudges per day, excluding the now line and the two
  daily obligations.
- The now line does not consume budget. It is persistent, not a
  nudge.
- The two daily obligations (habit checkboxes, protocol metric
  logging) do not consume budget. They surface once per day, in a
  combined card.
- Nothing fires during focus mode or during a calendar event.
- Nothing fires outside quiet hours (default 10pm–7am).
- Two dismissals of the same surface = 30-day suppression. Three =
  permanent until re-enabled.
- Surfaces with overlapping TTLs may be **merged at fire time**.
  A merged nudge counts as **one** nudge, not two.
- The user can disable any surface permanently in settings.
- Exactly three surfaces are exempt from the budget, and no others
  (`08-decisions/0013-attention-budget-scope.md`).

## Specification

### What counts as a nudge

A **nudge** is any surface that:

1. Interrupts the user (banner, toast, badge, notification).
2. Wants a decision or action.
3. Is not user-initiated.

Surfaces that are *not* nudges:

- **The now line.** Persistent, always visible, does not interrupt.
- **Daily obligations card.** Habit checkboxes and protocol metric
  logging. Surfaces once per day in a single card. Does not repeat.
- **User-initiated surfaces.** Tapping search, opening the calendar,
  long-pressing a task — the user asked for these.
- **Passive state.** A running timer, a sync indicator, a
  recording indicator. These are status, not nudges.
- **Exempt surfaces.** Three surfaces interrupt without consuming
  budget. They are named below and are not in the catalog.

### The queue

All nudges are entries in a single queue. The queue has:

- A priority score (see below).
- A surface type.
- A time-to-live (how long it's relevant).
- A history (times shown, times dismissed).

The queue runs on a scheduler that:

1. Checks the current budget (nudges shown in the last hour, last
   day).
2. Checks the current context (focus mode, in-event, quiet hours).
3. Checks for mergeable candidates (see below).
4. Picks the highest-priority eligible nudge.
5. Fires it.
6. Records the firing in the client diagnostics buffer (not the
   event log; see `07-infrastructure/sync-engine.md`).

If no eligible nudge exists, nothing fires. Silence is the default.

### Merging

Two or more surfaces with overlapping TTLs may be merged at fire
time into a single nudge. This is a **queue behavior**, not a
surface.

Example: on Sunday evening, the weekly review and a protocol review
may both be due. The queue merges them into one nudge: "Weekly
review + protocol review ready." The user taps once and sees both.

Merging rules:

- A merged nudge counts as **one** nudge against the hourly and
  daily caps.
- Merging is preferred when two surfaces would fire within the same
  hour and both are relevant to the current mode.
- Merging is not used to bypass the daily cap. If the user has
  already hit the daily maximum, neither fires.
- Merging is only applied to surfaces marked as mergeable in the
  catalog (a per-surface flag). The default is mergeable.

### Priority

Priority score is a weighted combination of:

- **Urgency** (0–10). Time-sensitive surfaces score high. A prep
  card for a meeting in 10 minutes scores 10. The weekly review
  scores 3.
- **Relevance** (0–10). Tied to current mode and focus. A habit
  resurfacing when the user is in the Habits mode scores higher
  than when they're in Notes.
- **Novelty** (0–10). Not recently shown. A surface shown
  yesterday scores lower than one never shown.
- **User history** (multiplier). Surfaces the user has actioned
  score higher; surfaces dismissed score lower.

The exact weights are implementation-defined and tunable. The
contract is: urgency and relevance dominate; novelty breaks ties;
history modulates.

### The catalog of nudge surfaces

Every surface that can produce a nudge is listed here. The catalog,
the `SurfaceId` union in `02-architecture/event-log.md`, and the
per-surface toggles in `05-modules/settings.md` are one set: adding a
surface means updating all three in the same change (ADR 0013).

| Surface ID | Used for | Typical urgency | Typical relevance | TTL | Mergeable |
|---|---|---|---|---|---|
| `prep_card` | 10 min before an event with people or a note | 10 | 8 | Until event start | no |
| `contextual` | a gap, a cancellation, a free slot | 6 | 7 | 30 min | no |
| `forgotten` | captures never acted on | 3 | 4 | 7 days | yes |
| `people` | a relationship gone quiet | 2 | 4 | 14 days | yes |
| `weekly_review` | the week's aggregation | 4 | 6 | 7 days | yes |
| `protocol_review` | a protocol's window comparison | 5 | 7 | 7 days | yes |
| `price_drop` | prices moved on a research note | 6 | 5 | 24 hours | no |
| `what_slipped` | tasks that slipped and were not rescheduled | 4 | 5 | Until next day | yes |
| `inbox_ritual` | the inbox passed 10 captures | 5 | 6 | 24 hours | no |
| `streak_milestone` | a streak reached a 30-day multiple | 3 | 5 | 48 hours | yes |
| `streak_repair` | a streak broke, with a repair token available | 3 | 5 | 48 hours | yes |
| `low_energy` | a light day and short tasks | 2 | 3 | 4 hours | no |

The `Used for` column exists to keep adjacent IDs apart.
`streak_milestone` and `streak_repair` sound related and are not:
one celebrates a streak that reached a 30-day multiple
(`05-modules/habits.md`), the other offers to restore a streak that
just broke, spending the monthly repair token
(`06-flows/resurfacing.md`, ADR 0013).

### Contextual variants

Three nudges in the flow docs look like surfaces of their own and are
not. They are `contextual` firing with a different trigger:

- the gap nudge ("No events for the next 45 min") —
  `06-flows/doing-the-day.md`
- the cancelled-event nudge ("Your 11am was cancelled") —
  `06-flows/doing-the-day.md`
- the calendar-shift nudge ("Design review ran 22 min over") —
  `06-flows/disruption.md`

Same surface, same urgency band, same TTL class. They count as
`contextual` when they fire, they have no ID of their own, and they
get no separate toggle. A synonym surface would make this table
describe a scheduler that does not exist (ADR 0013).

### Exempt surfaces

Exactly three surfaces interrupt the user without consuming budget:

- the onboarding local-only banner (`06-flows/onboarding.md`)
- the "all three done" card (`06-flows/completion.md`)
- the lapse-recovery card (`06-flows/lapsed-recovery.md`)

A candidate is exempt only if it satisfies all three tests:

1. It fires at most once per day, or once per lifetime.
2. It is non-repeatable — dismissal is permanent for its trigger.
3. It does not compete with a scheduled surface for the hourly
   budget.

Exempt surfaces:

- Are not in the catalog and have no `SurfaceId`.
- Have no per-surface settings toggle.
- Still obey quiet hours, focus mode, and in-event suppression.

Exemption is not an escape hatch. A candidate that fails any one
test is a surface, and belongs in the catalog.

**Prep cards and the hourly cap.** Prep cards are subject to the
hourly cap like every other surface. A user with back-to-back
meetings will see the prep card for the first meeting of the hour;
subsequent prep cards for meetings within the same hour are
suppressed. This is intentional: a dense meeting day is exactly when
the app should be quietest. The user can always tap an event to see
its prep card manually.

This resolves the earlier tension with
`06-flows/doing-the-day.md`, which described prep cards as firing
per event. They fire per event *if the hourly cap allows*. The cap
wins.

### Quiet hours

Default: 22:00–07:00 local.

- No nudge fires during quiet hours, regardless of priority.
- The now line still updates (it's not a nudge).
- Daily obligations still surface if the app is opened, but no
  notification fires.
- Quiet hours are user-configurable.

### Focus mode

When the user starts focus mode on a task:

- No nudge fires for the duration.
- The now line still updates.
- Queue continues to accumulate; on focus exit, the queue resumes
  at the normal cadence (not a burst).

### In-event suppression

While the user is in a calendar event (based on event start/end):

- No nudge fires.
- The now line shows the event.
- Queue resumes when the event ends.

### Dismissal decay

- First dismissal: surface scores lower for 7 days.
- Second dismissal: suppressed for 30 days.
- Third dismissal (after the 30 days): suppressed permanently
  until re-enabled in settings.
- Settings has a list of suppressed surfaces with a re-enable
  toggle.

### The daily obligations card

Once per day, at a time based on the user's typical first open
(learned), a single card surfaces with:

- Today's habit checkboxes (full/minimum toggles).
- Today's protocol metric log (if a protocol is active).

**This is the card's only trigger.** Flows that describe the card as
surfacing "after" one of their rituals are describing **order**, not
timing — the trigger above decides *whether*, and
`06-flows/morning-plan.md` owns the sequence when more than one
surface wants the same first open.

This card:

- Does not consume nudge budget.
- Does not repeat if dismissed.
- **Obeys the same three context rules as everything else** — no
  surface, no notification during quiet hours, focus mode, or an
  in-event. It surfaces on the next eligible open instead.
- Is the only thing the app requires the user to interact with
  daily.

If the user has no habits due and no active protocol, the card
does not surface.

**The card is the second of three homes for the same habits.**
`05-modules/habits.md` gives the Habits mode's Today scope the same
checkboxes, and `05-modules/calendar.md` gives the Calendar Day view's
part 4 the same rows. This card's affordance list is **full/minimum
toggles** — two of the three the habit row offers, since Skip lives in
the row's long-press menu. So the same habit can be skipped through one
door and not another, and no doc says which of the three owns the
interaction. "The only thing the app requires" is also drawn
permanently in the Day view, which makes it not the only thing at all.

### User control

Settings exposes:

- **Quiet hours.** Start and end time.
- **Nudge frequency.** Standard (1/hour, 3/day) or reduced
  (1/2 hours, 1/day) or minimal (1/day).
- **Per-surface toggles.** Enable/disable each surface from the
  catalog. Exempt surfaces are not in the catalog and have no
  toggle.
- **Suppressed list.** Surfaces auto-suppressed by repeated
  dismissals, with re-enable toggles.
- **Notification channels.** Push, in-app banner, and badge, each
  globally enable/disableable (`05-modules/settings.md`).
  Per-surface channel selection is out of scope for v1.

## Examples

**A busy afternoon.**

    Context: 2pm, user just closed a meeting.
    Candidate nudges:
      - Prep card for a 3pm meeting (urgency 10, relevance 8)
      - Contextual nudge about a task gap (urgency 6, relevance 7)
      - Weekly review ready (urgency 4, relevance 6)

    Queue picks prep card. Fires.
    Next hour: the prep card's TTL has expired (the meeting
    happened). Contextual nudge is next at 3pm.

**Sunday evening, merged.**

    Context: 8pm Sunday.
    Candidate nudges:
      - weekly_review (urgency 4, relevance 6, mergeable)
      - protocol_review (urgency 5, relevance 7, mergeable)
      - inbox_ritual (urgency 5, relevance 6, not mergeable)

    Queue merges weekly_review and protocol_review (both mergeable,
    both due within the hour):
      "Weekly review + protocol review ready."
    Fires once. Counts as one nudge.
    inbox_ritual is not mergeable, so it is deferred.
    It fires the next day.

**A repeated dismissal.**

    User dismisses "People resurfacing."
    First dismissal: downranked for 7 days.
    Second dismissal: suppressed for 30 days.
    On day 31, it may appear.
    Third dismissal: permanently suppressed until re-enabled in
    Settings → Notifications → Suppressed surfaces.

**A quiet hours suppression.**

    It is 11pm. A protocol review becomes due.
    Quiet hours are active.
    No notification fires. The nudge queues for 7am.
    At 7am, if the queue is otherwise clear, it fires.

**Attempting to bypass the cap with merging.**

    User has already received 3 nudges today (cap reached).
    Queue has two candidates that could merge.
    Merging does not raise the cap.
    Neither fires. They queue for tomorrow.

**The daily obligations card.**

    Time: 8:15am (user's typical first open).
    Card: "Today: 2 habits, 1 metric."
    - [ ] Meditate
    - [x] Walk
    - Sleep quality: [1][2][3][4][5]
    Does not consume nudge budget.
    If dismissed, does not fire again today.
    If the user has no habits due and no active protocol, the card
    does not surface.

**Focus mode suppression.**

    User starts focus on "Draft Q4 plan."
    Timer starts at 25:00.
    Queue has three candidates ready to fire.
    None fires.
    Timer ends. Focus mode exits.
    Queue resumes; the highest-priority candidate fires in the
    next hourly window, not immediately.

## What this doc must NOT do

- This doc does not define the *content* of any nudge. It defines
  the queue, priorities, and caps. Content lives in
  `06-flows/`.
- This doc does not define motion or haptics for nudges. Those
  reference the vocabulary docs.
- This doc does not define the now line. The now line is not a
  nudge. It lives in `02-architecture/projections.md` (as
  `now_line`) and `06-flows/doing-the-day.md`.
- This doc does not define push notification infrastructure. It
  defines the queue. Delivery is an implementation concern in
  `07-infrastructure/`.
- This doc does not define a general notification system. There is
  no other notification system. Everything goes through this queue.
- This doc does not define the `contextual` surface variants. The
  gap nudge, the cancelled-event nudge, and the quick-task nudge
  are all variants of the single `contextual` surface. They share
  one slot in the queue: only one contextual nudge fires per hour,
  regardless of which variant is selected. The variants are
  described in `06-flows/doing-the-day.md`.
- This doc does not add surfaces speculatively. Adding a surface
  requires updating the catalog, the `SurfaceId` union, and the
  Settings per-surface toggles.