# Resurfacing

## Purpose

This flow defines how the app brings things back that the user
forgot: neglected tasks, quiet relationships, forgotten captures,
and low-energy moments. It exists because the log accumulates faster
than the user can act on it, and because "out of sight" is the same
as "gone" for a daily tracker.

Resurfacing is not nagging. It is a single card, once in a while,
that the user can dismiss permanently.

## Invariants

- Resurfacing fires as a nudge, subject to the attention budget
  (`03-experience/attention-budget.md`).
- **A lapse suppresses every resurfacing surface.** No resurfacing fires
  on a day the lapse-recovery card appeared, or on any later day until
  the user has resolved it. The forgotten surface below lists exactly
  the backlog that flow exists not to dump, and every threshold in this
  doc is at or under the lapse threshold, so its material is guaranteed
  to be present on the return day
  (`06-flows/lapsed-recovery.md`).
- Two dismissals of a surface = 30-day suppression. Three =
  permanent (until re-enabled).
- Resurfacing never repeats the same task, person, or capture twice
  in a row.
- Resurfacing is opt-out. People default to "worth maintaining";
  captures default to surfacing. Each can be disabled
  individually or as a surface.
- Resurfacing never shames. The copy is neutral
  (`01-foundation/identity.md`).
- **Thresholds are named, not shared.** `resurfacing.note_age` (14 days)
  and `lapse.threshold` (14 by default) happen to be equal today; they
  are not the same constant, and neither doc may assume the other's
  value. Same for `resurfacing.task_age` (21) against
  `lapse.archive_horizon` (21).

## Specification

### The four surfaces

**1. The forgotten surface.**

Captures never acted on:

- Inbox notes with no follow-up.
- Tasks created but never scheduled, deferred, or completed, older
  than `resurfacing.task_age` (21 days).
- Notes with an "[unparsed]" title prefix older than
  `resurfacing.note_age` (14 days).

Fires weekly, at most once. Shows the top 5 by age.

    "5 things you captured but never acted on."
    [Review]  [Dismiss for 30 days]

Review opens a list with the sort-ritual gestures, **applied per row
 type**: an inbox note routes to today or someday, and a task row uses
the task row's own meanings — complete is disabled here, because the
review is for deciding what to do with the thing, not for finishing it
(`03-experience/gesture-vocabulary.md`).

Anything the inbox's sort ritual is already eligible to handle is
excluded (§What does not resurface): the ritual owns a large, old inbox,
and this surface owns the small one.

**2. Low-energy matching.**

On days when the calendar is light (< 2 hours of events) and the
user is not in focus:

    "Low-key day. Here are 4 things under 10 minutes."
    [Show me]  [Not now]

The suggestions are open tasks with short estimated durations
(heuristic: title length, past completions of similar tasks), or
tasks explicitly marked as quick.

**3. People resurfacing.**

People marked "worth maintaining" (default: on) whose last
interaction is > `resurfacing.people_quiet` (30 days).

Fires weekly, at most once.

    "You haven't talked to Sarah in 6 weeks."
    [Add a task]  [Snooze 30 days]  [Not important]

**The population rule is missing.** The captures surface above states
"**Shows the top 5 by age**" and this one states no cap and no ordering,
while defaulting *everyone* into the qualifying set. So the nudge's body
is undefined: it either names an unbounded list or silently picks one, and
the example above — singular, one person, three actions — is the second
of those without saying so.

**The example is right and the rule should be made to match it.** One
subject per firing, chosen as the person longest without an **action**
(not longest since contact), with the existing 60-day suppression below
as the queue's pacing. Two consequences worth stating:

- The interval per person is set by the size of the quiet set, not by the
  flow: with 50 qualifying people the same person recurs every 50 weeks.
  A weekly surface that reaches 1 of 50 people a week is delivering on
  its frequency and not on its purpose.
- **Quiet is also a scope** in `05-modules/people.md` ("People with no
  activity in > 30 days (opt-in view)"), which shows all of them at once.
  A scope that lists everyone and a nudge that names one are two answers
  to "who have I lost touch with", and this doc does not say whether they
  are the same list.

"Add a task" opens capture prefilled: "Reach out to Sarah."
"Snooze" suppresses for 30 days. "Not important" marks the person
as "not worth maintaining" and suppresses permanently.

When the user creates a task from a people resurfacing (via "Add a
task"), resurfacing for that person is suppressed for 60 days or
until the task is completed, whichever comes first. This avoids
nagging about someone the user has already acted on.

**4. Streak repair.**

If the user has broken a habit streak (a scheduled day was missed,
not skipped), a repair token is available once per month.

    "Meditate streak broken by yesterday's miss. Repair?"
    [Repair]  [Let it stand]

Repairing:

- Logs a `habit.checked` for the missed day with
  `version: 'repair'`.
- Does not count toward full compliance stats; it is shown
  distinctly in the chart.
- Uses the monthly token.
- Fires as the `streak_repair` surface, spending budget like any
  other resurfacing surface, and merging with the others when they
  are due in the same hour
  (`03-experience/attention-budget.md`, ADR 0013).

The framing is "life happens," not "you failed."

### What does not resurface

- Completed tasks (they are in the completed log, findable but
  not surfaced).
- Archived habits, people, areas.
- Protocols (they have their own review surface).
- Slipped tasks (those are the what-slipped digest's job,
  `06-flows/disruption.md`).
- Overdue tasks (they appear in the Today scope with an
  "overdue" chip).
- **Inbox items the sort ritual can already handle** — anything that
  would put the inbox over its 10-capture threshold, because a user with
  12 old captures should be offered the ritual and not a card describing
  the ritual's contents (`06-flows/capture.md`). Every entry in this list
  is a surface that already owns the thing.

**A lapse is the sixth case in the same spirit** and is stated as an
invariant above rather than here, because it is a window rather than a
kind of item.

### Frequency

Each surface fires at most:

- Forgotten: weekly.
- Low-energy: on qualifying days, at most twice a week.
- People: weekly.
- Streak repair (`streak_repair`): when a break occurs, if a token
  is available.

Across all surfaces, resurfacing consumes the attention budget like
any other nudge (`03-experience/attention-budget.md`). It competes
with the weekly review, the prep card, and the rest.

### Delivery

Resurfacing surfaces as an in-app card or push notification
(depending on the user's channel settings). It uses the same nudge
chrome as contextual nudges.

### Snooze and suppression

- **Snooze** delays a surface by 30 days without penalty.
- **Dismiss** counts as a dismissal for the
  two-dismissals-equals-30-days rule.
- **"Not important"** (people only) is permanent.
- Settings shows all suppressed surfaces with re-enable toggles.

### The tone

Neutral, factual, brief. Examples:

- "5 things you captured but never acted on."
- "You haven't talked to Sarah in 6 weeks."
- "Meditate streak broken by yesterday's miss."

Not:

- "Don't forget about these!"
- "You should reach out to Sarah!"
- "You broke your streak. Get back on track!"

The app is a lab notebook. Resurfacing is a lab assistant saying
"this is here" — not a coach.

## Examples

**The forgotten surface.**

    Sunday morning:
    "5 things you captured but never acted on."
    [Review]  [Dismiss for 30 days]

    User taps Review.
    List opens:
      - "The thing with the stuff"        Sep 1
      - "Try that restaurant Mark mentioned"  Sep 3
      - "Standing desk research"          Sep 8
      - "Kitchen color ideas"             Sep 10
      - "Read the article on sleep"       Sep 12

    Swipes:
      - Remove "The thing with the stuff."
      - Someday "Try that restaurant..."
      - Today "Standing desk research."
      - Keep "Kitchen color ideas" (no action).
      - Remove "Read the article on sleep."

**Low-energy matching.**

    Wednesday, 2pm. Calendar has no events until 4pm.
    No focus session running.
    Queue fires:
      "Low-key day. Here are 4 things under 10 minutes."
      [Show me]  [Not now]

    User taps Show me.
      - "Reply to Mark's email" (3 min)
      - "Schedule dentist appointment" (5 min)
      - "Pay the electric bill" (4 min)
      - "Order more coffee" (2 min)

    User taps the first two. Both start focus sessions.

**People resurfacing.**

    Monday morning:
    "You haven't talked to Sarah in 6 weeks."
    [Add a task]  [Snooze 30 days]  [Not important]

    User taps Add a task.
    Capture opens with "Reach out to Sarah."
    User adds: "Coffee next week."
    Task created with a Person link.
    Resurfacing suppressed for 60 days (task exists).

**Streak repair.**

    User missed "Meditate" yesterday.
    Streak broken.
    Today:
    "Meditate streak broken by yesterday's miss. Repair?"
    [Repair]  [Let it stand]

    User taps Repair.
    habit.checked logged for yesterday with version: 'repair'.
    Chart shows the repair as a distinct color.
    Monthly token consumed.
    No further repair prompts this month.

## What this doc must NOT do

- This doc does not define the attention budget. It references
  it.
- This doc does not define the sort ritual. That is
  `06-flows/capture.md`. Resurfacing reuses its gestures.
- This doc does not define habit compliance or streaks. Those
  are `05-modules/habits.md` and
  `02-architecture/projections.md`.
- This doc does not define the low-energy heuristic. That is an
  implementation detail.
- This doc does not define tokens, gestures, or motion. It
  references them.
- This doc does not define the weekly review. That is
  `05-modules/review.md`.