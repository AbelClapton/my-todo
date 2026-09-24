# Completion

## Purpose

This flow defines what happens when a task is completed. It exists
because completion is the app's most frequent positive moment, and
it is the moment most likely to be ruined by a heavy-handed UI.

The rule is: **the reward is the motion.** A satisfying animation, a
consistent haptic, and an optional one-line note. No confetti, no
badges, no streak counters.

## Invariants

- Completion is undoable (Invariant 1).
- The completion **sequence** is at or under 400ms, from the gesture to
  the list having closed, including the space the inline note field
  needs. `03-experience/motion-vocabulary.md` §Sequence budgets states
  the total and the transitions inside it divide it — the ceiling is a
  budget for the sequence, not a limit each animation may spend
  independently.
- The completion haptic fires at commit
  (`03-experience/haptic-vocabulary.md`).
- Completion notes are optional and skippable.
- Completed tasks are not immediately vanished; they move to a
  completed log.
- Completing all three of today's top three fires the Success
  haptic once.

## Specification

### The commit

Completion is triggered by:

- Tapping the checkbox on a task row.
- Swiping right past 40%.
- Tapping "Done" in the task detail.

All three log `task.completed` with `completed_at`. None of them
require confirmation.

### The animation

The whole sequence is **400ms**, from the gesture to the list having closed.
`03-experience/motion-vocabulary.md` §Sequence budgets states that total;
the transitions below divide it:

1. Completion haptic fires, at the gesture.
2. The row's checkbox fills — **60ms**, and it is visible. The fill is a
   control inside a row that is scaling to nothing, so a fill longer than
   the first beat is a fill nobody sees.
3. The row scales 1.0 → 1.02 → 0.98 → 0 and fades — the middle **160ms**.
4. Remaining rows shift up — the last **180ms**, *beginning before the row
   has finished leaving*, so the row's disappearance and the closing of the
   gap are one event rather than two.
5. The inline note field appears, in the space the reflow made for it.

This is the only scale-in/scale-out in the app
(`03-experience/motion-vocabulary.md`).

**The sequence is a budget, not four animations that happen to be next to
each other.** Time added to one step is taken from the one after it. An
earlier version of this doc listed the three durations end to end —
150 + 400 + 200 — which is **750ms**, against an invariant stated in this
doc and in the motion doc as 400ms. Each number was inside its token;
nobody added them up, and the doc that owned the ceiling did not own the
total. `duration-deliberate` in particular is *"used sparingly"*, and
spending it on the scale is what put the sequence at 1.88× its own limit.

If `prefers-reduced-motion` is set:

- The row fades over 100ms. No scale; no reflow animation, so the list
  closes in one step.

### The undo toast

A five-second undo toast appears:

    "Completed. Undo?"

The toast:

- Slides up from the bottom edge (200ms).
- Has a countdown ring.
- Is dismissable by tapping the toast.
- If the user does nothing, the action stands.

Undo appends `task.uncompleted` with `compensation_for` pointing to
the completion entry. The row returns to its original position.

### The completion note

Optional, one line, inline. The field appears **in the space the reflow made**
for it — that is what the last 180ms of the sequence is for, and it is why the
field cannot be inserted after the list has already closed:

    "Why did this take longer than expected?"
    [                                        ]  [Skip]

The user can:

- Type a line and press Enter → logged as `task.completed`'s
  `note` field.
- Tap "Skip" → the field dismisses.
- Tap elsewhere → the field dismisses without saving.

The field dismisses automatically after 10 seconds if untouched. The undo
toast lasts five, so the two are on screen together for five of those ten
seconds; the toast sits in the shell's toast layer and the field is in the
list, so neither covers the other and no ordering is needed.

The completion note is used to detect estimate-vs-actual patterns
(`09-roadmap/milestones.md`). It is not required.

### The completed log

Completed tasks do not vanish. They move to a completed log:

- Accessible via Tasks → All → filter "Completed."
- Filterable by day, week, month.
- **Writes off, reads on.** The list is a record, so nothing in it edits a
  task in place; but a completed task can be uncompleted from here, which
  restores it. "Read-only" was the earlier wording and it was wrong the same
  way it was wrong for the time machine (`06-flows/retrieval.md`): disabling
  the writes disables the reads too, and this list has exactly two actions —
  open and uncomplete.

The log is the "what I did" view
(`01-foundation/identity.md`). It is deeply motivating and it is
rarely seen by the user unless they go looking.

### The all-three-done moment

If the completed task was the third of today's top three:

- The Completion haptic fires (as usual).
- After a 150ms pause, the Success haptic fires.
- A subtle card fades in:
  "All three done. Nice."
  [Dismiss]

The card:

- Uses `type-title-3`, `space-7` padding, `radius-lg`.
- Fades in over `duration-fast` and out over `duration-fast` — the two
  catalog entries `03-experience/motion-vocabulary.md` now holds for an
  in-place fade. No scale, no slide, no confetti.
- Does not fire a second time if the user unchecks and rechecks.
- **Is not a nudge, so it needs no exemption.**
  `03-experience/attention-budget.md` defines a nudge as a surface that
  interrupts, wants a decision *and* **is not user-initiated**. This card is
  the direct consequence of the completion the user just made, so it fails
  the third test — the same test that already excludes the undo toast and
  the completion note field, both of which fire beside it. It therefore
  consumes no budget **and obeys no quiet hours**, because those rules exist
  to protect the user from the app and a card they caused with their own tap
  is not the app interrupting them.
- The 150ms pause before the Success haptic is 150ms **after the commit**,
  which puts it inside the sequence above rather than after it.

Earlier drafts filed the card as one of *"exactly three surfaces exempt"*,
and that was wrong twice over. It made the card one of three things needing
an entry in an exemption table, and the fourth requirement of an exemption —
*"a blocked firing preserves the trigger rather than consuming it"* — cannot
be met by a trigger that expires at midnight. Quiet hours are **540** of a
day's **1440** minutes, plus focus mode and any event; a third completion at
22:30 would have queued to 07:00 and congratulated the user about a list
that no longer existed. The exempt list is now two, and this card is outside
the budget because it is outside the definition.

### Habit completion

Habit checks use a lighter completion:

- Completion haptic (softer).
- Checkbox fills over 150ms.
- No scale-in, no row removal.
- No undo toast. The checkbox is the reversing affordance and the
  row stays visible for the session, so this is the direct-toggle
  mechanism in `08-decisions/0010-undo-exemptions.md`. Tapping again
  logs `habit.unchecked`.
- If checked at minimum: the checkbox gets a subtle underline.

Habit completion does not trigger the "all three done" card.

### Event completion

Events do not have a completion state. They pass. The app does not
ask about them. If a note was attached, the note remains.

### Protocol metric completion

Logging a protocol metric (1–5) is a quick input:

    Sleep quality: [1] [2] [3] [4] [5]

Tapping a value:

- Completion haptic.
- The value fills in.
- Five-second undo toast. The daily obligations card is
  dismiss-once, so there is no toggle-back path — the toast is the
  only reversal (`08-decisions/0010-undo-exemptions.md`).
- The value is logged immediately.

If the user taps the wrong value, they undo it, or they retap the
correct value. The log records both entries; the projection uses the
latest.

## Examples

**Completing a task.**

    User taps the checkbox on "Draft Q4 plan."
    Checkbox fills (150ms).
    Row scales and fades (400ms).
    Completion haptic.
    Undo toast: "Completed. Undo?"
    Inline field: "Why did this take longer than expected?"
    User types: "Design review ran long."
    Enter.
    Field dismisses.
    Undo toast still visible.

**Completing via swipe.**

    User swipes "Call contractor" right past 40%.
    Row reveals a checkmark in the accent.
    User releases.
    Commit. Same animation, same haptic, same toast.

**All three done.**

    User completes the third of today's top three.
    Completion haptic.
    (150ms pause)
    Success haptic.
    Card fades in: "All three done. Nice."
    User taps Dismiss.
    Card fades out over 150ms.

**Undo.**

    User realizes they completed the wrong task.
    Taps the undo toast.
    Row returns to original position.
    Completion haptic does not fire again.
    A subtle "undo" haptic (Mode switch) fires.

**Completing a habit at minimum.**

    User long-presses the checkbox for "Read."
    Mini-menu: [Full] [Minimum] [Skip]
    Taps Minimum.
    Checkbox fills with a subtle underline.
    Completion haptic (softer).
    No undo toast (direct toggle — ADR 0010).

**Logging a metric.**

    Daily obligations card shows:
      Sleep quality: [1] [2] [3] [4] [5]
    User taps 4.
    Value highlights.
    Completion haptic.
    Undo toast: "Logged 4. Undo?"
    Card dismisses after all obligations are done.

## What this doc must NOT do

- This doc does not define the task row. That is
  `05-modules/tasks.md`.
- This doc does not define the habit row. That is
  `05-modules/habits.md`.
- This doc does not define the animation timing. It references
  `03-experience/motion-vocabulary.md`.
- This doc does not define the haptics. It references
  `03-experience/haptic-vocabulary.md`.
- This doc does not define the daily obligations card. That is
  `03-experience/attention-budget.md`.
- This doc does not define the top three. That is
  `06-flows/morning-plan.md`.