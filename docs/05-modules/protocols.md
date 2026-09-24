# Protocols

## Purpose

This doc defines the Protocols module: the surface where
time-boxed experiments are proposed, adopted, tracked, and
reviewed. It exists because protocols are the app's defining
feature — they are what the identity sentence, "A system for
running small experiments on your own life," describes
(`01-foundation/identity.md`).

Protocols are the module the app is built around, even though they
are used less frequently than tasks or habits. They are what make
the AI's presence coherent and what make the app different.

## Invariants

- A protocol belongs to exactly one Goal
  (`02-architecture/object-model.md`).
- A protocol has a hypothesis, 2–4 habits, a metric, a baseline
  period, and a duration.
- The hypothesis, metric, and habit list are immutable during
  `baseline` and `active` (Rule 3,
  `04-ai/constitution.md`).
- Protocols never modify themselves. Suggestions for changes are
  separate proposals for a *next* protocol.
- A protocol is an experiment, not a commitment. Abandoning is a
  valid result.
- Reports are Notes attached to the protocol
  (`04-ai/research-and-protocols.md`).

## Specification

### Statuses

    proposed → baseline → active → completed
       │           │          │
       └───────────┴──────────┴──→ abandoned

- **proposed.** Editable. Not yet a commitment.
- **baseline.** Metric logged; habits visible but not scored.
- **active.** Habits and metric both active and scored.
- **completed.** Duration reached. Report generated.
- **abandoned.** Stopped early. Report may be generated.

Abandonment can happen from any non-terminal status (`proposed`,
`baseline`, or `active`). The examples below show it from `active`,
which is the most common case.

### Scopes

- **Active.** Protocols in `baseline` or `active` status.
- **Proposed.** Protocols in `proposed` status, awaiting adoption.
- **Past.** Completed and abandoned protocols.

`abandoned` is reachable from `proposed` (the status diagram says so),
so Past contains protocols that never ran alongside those that
finished. The scope holds **experiments that ended**, whether or not
they produced data — which is worth stating because a Past list is
read as a history, and a never-adopted proposal is not one.

**The Proposed empty state names one of its two sources.** Its detail
line says protocols "arrive from a Goal, **or from what the app
notices in your log**", and its action is "Open a Goal" — so the
second source has no door. Either the action offers both, or the
detail line drops the second source.

### Empty states

The form is `03-experience/states.md`; the action repairs the cause
(`05-modules/tasks.md`).

| Scope, empty | Headline | Detail line | Action |
|---|---|---|---|
| **Active** | Nothing running. | A protocol is a window of days with a metric and a few habits. | Propose one |
| **Proposed** | Nothing proposed. | Protocols arrive from a Goal, or from what the app notices in your log. | Open a Goal |
| **Past** | Nothing finished. | Protocols land here once their window closes. | Propose one |

**The Propose action is a Tier 3 request, not a form.** A protocol is
proposed with a hypothesis, a metric, and a baseline period
(`05-modules/protocols.md`, Adoption), which the user does not write by
hand. The empty state's action therefore opens the Goal it is proposed
from rather than a creation form. This is also why onboarding does not
onboard into protocols: they are discovered once there are two weeks of
data to propose from (`06-flows/onboarding.md`).

### The protocol card

In the Protocols view (accessible from the command palette, from
a Goal detail, or from Settings), each protocol shows as a card:

    Sleep protocol                           [active]
    Improve sleep · day 18 of 42
    Metric: Sleep quality · 3.9 avg (baseline 2.8)
    2 habits · 78% compliance

- **Title.** Shortened hypothesis.
- **Status chip.** `proposed`, `baseline`, `active`, `completed`,
  `abandoned`.
- **Goal.** Linked Goal name.
- **Day.** "day N of M" (baseline + active).
- **Metric.** Current mean vs. baseline mean.
- **Habits.** Count and aggregate compliance.

Card height is `row-hero` (96px).

**The card does not fit, and the reason is not the text.** The four lines are 24 + 18 × 3 =
**78px**, which leaves 18px to spare in a 96px token. The chrome is what spends the rest:
2 × 12px of padding + 3 × 2px of gaps + 2 × 1px of border = **32px**, so the card draws at
**110px** — **14px over**. `03-experience/design-tokens.md` records that `row-hero`'s only
real user is this card, so unlike `row-rich` the token was sized for its one consumer and is
still short. Either the padding shrinks for this card, or the fourth line moves onto the third.

**M is undefined.** The card shows `day N of M`, and with the documented defaults
(baseline 14, duration 28) that reads **"day 18 of 42"** — so M is
`baseline_days + duration_days`. No doc defines the field, and
`04-ai/research-and-protocols.md` renders the same two numbers separately
(`14 baseline + 28 active`) without ever summing them, so nothing in the doc set produces the
number the card displays. The doc also gives M **two renderings** — `day N of M` here and
`baseline: day N of M` under Baseline — with no stated difference between them.

M is also the **review date** (§Review fires on it, §Detail displays it, and neither doc
computes it). All three should be one definition:
`adoption_date + baseline_days + duration_days`.

### Surfaces

**List.** Active / Proposed / Past.

**Detail.** The protocol's full state: hypothesis, goal, metric,
habits, compliance, baseline, review date, and report (if
completed).

**Proposal sheet.** Opened when a protocol is proposed. Shows the
hypothesis, habits, metric, durations, and explanation. Actions:
"Adopt" and "Edit." Editing opens a form where the user can
change anything before adoption.

**This is a screen, not a sheet** — the same rule that decided the
Event detail and then New event, and the third surface to reach it. A
sheet whose own action opens a form collides with `03-experience/
app-shell.md`'s one-sheet limit, so "Edit" dismisses the proposal it
was meant to edit. It is also the sharpest case of the three: §Immutability
closes the editing window when `baseline` begins, so this surface's own
lifetime **is** the entire editable window, and a sheet is the one
container that cannot hold a form. `03-experience/surfaces.md` files
this as an Overlay and should file it as a Screen.

**The rule itself should be written down.** The same collision corrected
`surfaces.md`'s Event detail row and its New event row, one at a time,
with the reasoning rediscovered each time: **a surface whose own action
opens another overlay must be a screen.** It belongs in `app-shell.md`'s
stacking section, where the one-sheet limit already lives.

**Report.** A Note attached to the protocol. Read-only display
with a link to the note editor.

### Adoption

When the user taps "Adopt":

1. `protocol.adopted` is logged.
2. Status becomes `baseline`.
3. The habits are created (`habit.created` for each, with
   `protocol_id` set).
4. The metric is created and surfaced in the daily obligations
   card (`03-experience/attention-budget.md`).
5. Habits are visible in the Habits mode but not scored.

### Baseline

The baseline period is the control condition. During baseline:

- The metric surfaces daily in the daily obligations card.
- Habits are visible in Today but not scored.
- No protocol report is generated.
- The protocol card shows "baseline: day N of M."

Default baseline: 14 days. Configurable at proposal time.
**"Not scored" is a state no surface can draw.** `05-modules/habits.md`
owns every surface that shows a score — the row's compliance count and
the detail's 28-day chart — and it **never mentions baseline**. So a
protocol habit renders `6/6` on the row and five coloured states in the
chart, all of which count the control period, while this doc says the
number does not count. The user's checkmarks are recorded and unread.

Neither doc is wrong; the pair has a hole in it. Three ways to close it,
and the third is the only one that adds no state:

1. **The row shows no count** and the chart hatches unscored days. This
   adds a sixth chart state to a strip whose cells are **8.6–9.9px**
   wide and whose skip-vs-missed pair measures **1.19:1** — a hatch at
   that size is texture, not meaning.
2. **The protocol card explains it** and the habit surfaces keep their
   numbers. Cheap, but the explanation is one surface away from the
   number, so a user in the Habits mode sees `6/6` with nothing saying
   it does not count.
3. **The row's metadata line names the phase.** It already reads
   `Cadence · area` and already carries "a small protocol indicator",
   so the indicator names `baseline` and every count, chart state and
   legend stays exactly as specified.
### Active

When baseline ends:

- `protocol.activated` is logged.
- Habits now score compliance.
- The protocol card shows progress and compliance.
- The metric continues daily.

### Review

At the review date — defined in §The protocol card as
`adoption_date + baseline_days + duration_days`, and the same value the
card counts up to:

1. `protocol.completed` is logged (or the user extends, which
   creates a new protocol version).
2. The report is generated — a **scheduled generation**, not a Tier 2
action the user invoked. See §The protocol report.
3. The report appears as a Note attached to the protocol.
4. The protocol card shows the delta and the report link.
5. The user sees three suggested next steps:
   - Continue
   - Test one variable
   - Stop

None of these is a decision the app makes. The user picks.

### Immutability

During `baseline` and `active`:

- The hypothesis cannot be edited.
- The metric cannot be edited.
- Habits cannot be added, removed, or have their cadence or
  minimum changed.

Attempting any of these:

- The action is disabled in the UI, not blocked with a dialog.
- A tooltip explains: "This is fixed while the protocol is
  active. Complete or abandon it to change."
- If the user wants to change something, they complete or
  abandon and start a new protocol.

Unrelated habits (not part of this protocol) are unaffected.

### Enforcement at the projection layer

Immutability is enforced by the UI (actions are disabled) and by the
projection layer (`02-architecture/projections.md`). If a forbidden
entry (`protocol.edited`, `habit.cadence_changed`,
`habit.minimum_changed`, `habit.linked_protocol`,
`habit.unlinked_protocol`) is appended for an entity whose parent
protocol is in `baseline` or `active`, the projection ignores it and
writes a warning to the client diagnostics buffer.

This means a sync from another device or a bug cannot corrupt an
active experiment. The entries remain in the log (the log is
append-only), but they do not affect the projected state.

### Abandonment

From the protocol detail, "Abandon" action:

- Confirms once (this is one of the few allowed confirmations;
  abandonment is rare and consequential).
- Logs `protocol.abandoned`.
- Generates a report if **≥ 7 days were logged**, counting
  `baseline` and `active` alike.
- Frames the report neutrally: "You stopped after N days.
  Here's what the data showed."

**This threshold used to count only the active period, and that
threw the data away.** `baseline` is not a warm-up: §Baseline has
the metric surfacing daily in the obligations card, so those are
readings. A protocol abandoned on day 13 of a 14-day baseline has
thirteen metric entries and zero active days, and an
`active ≥ 7 days` rule produces **no report at all** from a fortnight
of collected data. Counting logged days fixes it.

**This is the only statement of the threshold.**
`04-ai/research-and-protocols.md` §Abandonment says a report is
generated "if there is enough data" — a number and a feeling for
one rule. That doc now points here.

A baseline-only report contains no comparison, so it says so
rather than being withheld. Reports are Notes (§Invariants), and a
note can carry the sentence a report template cannot.

### The protocol report

**Generated as a scheduled generation**, at three triggers: the review
date arriving, abandonment with ≥ 7 days logged, or the user asking for it
early via Tier 2's "Generate report" action
(`04-ai/tier-2-contextual.md` §Scheduled generation).

The two automatic triggers run on **the next app open at or after the
trigger**, not on a timer, and they obey quiet hours, focus mode and
in-event suppression exactly as the daily obligations card does. The
report does not interrupt and is not a nudge.

**This is not Tier 2 in the contextual sense.** Tier 2 is defined as
always user-initiated, and a date is not a user. The class exists in
tier-2-contextual.md precisely so that a scheduled model call has a home,
and this doc is its only instance. If the quota blocks it, the report
**waits** and the protocol card says so.

Stored as a Note attached to the protocol.

Reports are Notes. They follow the normal note edit rules
(`05-modules/notes.md`). The user may edit a report; the edit is a
`note.edited` entry. The event log preserves every edit as a
separate entry, but the user's view shows the current body. There
is no separate "original preserved" UI.

The report is displayable in the protocol detail and in the Notes
mode. It is not a module; it is a note that happens to be generated
by the AI.

### Protocol proposal from a Goal

From the Goal detail (`05-modules/areas-and-goals.md`), "Propose
a protocol" opens a Tier 3 flow:

1. Tier 3 asks 1–2 clarifying questions about constraints.
2. Tier 3 may run research internally
   (`04-ai/research-and-protocols.md`).
3. Tier 3 produces a `protocol.proposed` entry.
4. The proposal sheet opens.

### Extending a protocol

At review, "Continue" extends the protocol:

- Logs `protocol.completed` (the first window).
- Logs `protocol.proposed` and `protocol.adopted` for the new
  window.
- The new window is a *new protocol version*, sharing the Goal
  but with its own report.

This keeps the immutability rule intact: the original protocol is
never modified.

## Examples

**An active protocol card.**

    Sleep protocol                                [active]
    Improve sleep · day 18 of 42
    Metric: Sleep quality · 3.9 avg (baseline 2.8)
    2 habits · 78% compliance

**Tapping to open detail.**

    Hypothesis
      "Consistent wake time and no screens after 10pm will
       improve sleep quality."

    Goal: Improve sleep
    Metric: Sleep quality (1–5)
    Baseline: 14 days · mean 2.8
    Active: 28 days · mean 3.9 (so far, day 4)
    Habits: Same wake time (24/24), No screens after 10pm (18/24)
    Review: Oct 20

    [Abandon]  [View report (after review)]

**A proposed protocol.**

    User: "Help me focus better."

    Tier 3 proposes:
      Hypothesis: "A 25-minute focus block before email will
                   improve daily focus."
      Habits: 2
      Metric: Focus (1–5)
      Baseline: 14 days
      Duration: 28 days

    Proposal sheet opens with [Adopt] and [Edit].

**Attempting to edit mid-flight.**

    User opens "Same wake time" habit detail, taps "Change
    cadence."
    Button is disabled with a tooltip:
      "This habit is part of an active protocol. Cadence can't
       change until the protocol completes on Oct 20."

**Abandoning.**

    User taps "Abandon" on the Reading protocol.
    Confirm dialog: "Abandon 'Reading'? You're on day 10 of 42.
    A report will be generated from the data so far."
    [Abandon] [Keep going]
    User taps "Abandon."
    Logs protocol.abandoned.
    Report generated.
    Card moves to Past, shows "abandoned."

## What this doc must NOT do

- This doc does not define the Protocol entity. It defines the
  module. The entity is in `02-architecture/object-model.md`.
- This doc does not define the AI's research and report behavior.
  Those live in `04-ai/research-and-protocols.md`.
- This doc does not define the constitution. It references Rule
  3. The constitution is `04-ai/constitution.md`.
- This doc does not define the daily obligations card. It
  references it.
- This doc does not define tokens, gestures, or motion. It
  references them.
- This doc does not define Goals. Goals live in
  `05-modules/areas-and-goals.md`.