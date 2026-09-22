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
- The completion animation is at or under 400ms
  (`03-experience/motion-vocabulary.md`).
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

On commit:

1. Completion haptic fires.
2. The row's checkbox fills over 150ms.
3. The row scales 1.0 → 1.02 → 0.98 → 0 (400ms total,
   `duration-deliberate`).
4. The row fades to 0.
5. Remaining rows shift up (200ms).

This is the only scale-in/scale-out in the app
(`03-experience/motion-vocabulary.md`).

If `prefers-reduced-motion` is set:

- The row fades over 100ms. No scale. No shift animation.

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

Optional, one line, inline:

After completion, a small inline field appears below where the row
was:

    "Why did this take longer than expected?"
    [                                        ]  [Skip]

The user can:

- Type a line and press Enter → logged as `task.completed`'s
  `note` field.
- Tap "Skip" → the field dismisses.
- Tap elsewhere → the field dismisses without saving.

The field dismisses automatically after 10 seconds if untouched.

The completion note is used to detect estimate-vs-actual patterns
(`09-roadmap/milestones.md`). It is not required.

### The completed log

Completed tasks do not vanish. They move to a completed log:

- Accessible via Tasks → All → filter "Completed."
- Filterable by day, week, month.
- Read-only. Completed tasks can be uncompleted from the log
  (which restores them).

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
- Has no confetti, no animation beyond the fade-in.
- Does not fire a second time if the user unchecks and rechecks.
- Is one of exactly three surfaces **exempt** from the attention
  budget: it fires at most once per day, dismissal is permanent for
  its trigger, and it never competes for the hourly slot. Exempt
  surfaces have no `SurfaceId` and no per-surface settings toggle
  (`03-experience/attention-budget.md`, ADR 0013).

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