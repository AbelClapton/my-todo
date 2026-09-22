# Protocols

## Purpose

This doc defines the Protocols module: the surface where
time-boxed experiments are proposed, adopted, tracked, and
reviewed. It exists because protocols are the app's defining
feature — the "system for running small experiments on your own
life" from the identity sentence
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

### Surfaces

**List.** Active / Proposed / Past.

**Detail.** The protocol's full state: hypothesis, goal, metric,
habits, compliance, baseline, review date, and report (if
completed).

**Proposal sheet.** Opened when a protocol is proposed. Shows the
hypothesis, habits, metric, durations, and explanation. Actions:
"Adopt" and "Edit." Editing opens a form where the user can
change anything before adoption.

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

### Active

When baseline ends:

- `protocol.activated` is logged.
- Habits now score compliance.
- The protocol card shows progress and compliance.
- The metric continues daily.

### Review

At the review date:

1. `protocol.completed` is logged (or the user extends, which
   creates a new protocol version).
2. Tier 2 generates the report.
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
- Generates a report if the active period was ≥ 7 days.
- Frames the report neutrally: "You stopped after N days.
  Here's what the data showed."

### The protocol report

Generated by Tier 2 (`04-ai/tier-2-contextual.md`) via the
"Generate report" action, or automatically at the review date.
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