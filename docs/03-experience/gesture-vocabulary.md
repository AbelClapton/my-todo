# Gesture Vocabulary

## Purpose

This doc defines the closed set of gestures the app recognizes and
what each one does on each surface. It exists because gesture
consistency is the difference between an app that feels designed and
one that feels assembled. If swipe-right completes a task on one
screen and archives it on another, the user cannot build muscle
memory, and the app feels unpredictable.

## Invariants

- There are exactly six gestures. No screen may define a seventh.
- Each gesture means the same thing everywhere it is available. If
  a gesture is not available on a surface, it is disabled (with
  visual feedback) — not repurposed.
- Every gesture has a non-gesture fallback (a button, a menu item,
  or a keyboard shortcut). Gestures are accelerators, not the only
  path.
- Every destructive or state-changing gesture is undoable
  (Invariant 1).
- Gestures respect platform conventions where they exist. iOS
  swipe-from-left-edge is "back" and is never overridden.

## Specification

### The six gestures

**1. Swipe right — complete / confirm.**

On a task row: completes the task.
On a habit row: checks the habit (full version).
On a nudge: marks it actioned.
On an inbox item: routes to "today."

Right swipe always means "yes / done / accept."

**2. Swipe left — defer / dismiss.**

On a task row: opens a defer sheet (tomorrow, next week, someday,
pick a date).
On a habit row: skips the habit for today.
On a nudge: dismisses it.
On an inbox item: routes to "someday."

Left swipe always means "not now / no / later."

**3. Long-press — contextual AI.**

On any atom (Task, Event, Note, Habit): opens the Tier 2 contextual
menu for that item. The menu's contents are item-type-specific.
Examples:

- Task: Research this · Break this down · Reschedule · Link person · Add note
- Habit: Why am I slipping? · Adjust cadence · View history
- Note: Summarize · Extract tasks · Find related
- Event: Prep me · Find related notes · Reschedule

Long-press always means "do something with this specific thing."

**4. Pull down — capture.**

On any scrollable list: reveals the capture field at the top.
Releasing while pulled past threshold focuses the input.
Capturing always starts with pull-down.

**5. Swipe from left edge — back.**

Standard platform behavior. Never overridden.
Swipe from left edge pops the current screen.

**6. Pinch — zoom (calendar and graph only).**

On the calendar: zooms between day, week, month, year.
On the protocol report: zooms between summary and detail.

Pinch is limited to surfaces with a natural zoom hierarchy. It is
not a general gesture.

### Gesture-to-surface matrix

| Surface | Swipe → | Swipe ← | Long-press | Pull ↓ | Edge ← | Pinch |
|---|---|---|---|---|---|---|
| Task list | complete | defer | AI menu | capture | back | — |
| Task detail | — | — | — | — | back | — |
| Habit list | check | skip | AI menu | capture | back | — |
| Note list | — | delete (undoable) | AI menu | capture | back | — |
| Note editor | — | — | — | — | back | — |
| Calendar (day) | — | — | AI menu (event) | — | back | zoom |
| Calendar (month) | — | — | AI menu (day) | — | back | zoom |
| People list | — | archive | AI menu | capture | back | — |
| Protocol report | — | — | — | — | back | zoom |
| Inbox | today | someday | AI menu | capture | back | — |
| Nudge | action | dismiss | — | — | — | — |
| Search results | — | — | AI menu | capture | back | — |

A dash means the gesture is disabled on that surface.

### Disabled gesture feedback

When a gesture is attempted on a surface where it is disabled:

- The row does not move (no partial swipe).
- A subtle haptic fires (the "warning" haptic; see
  `03-experience/haptic-vocabulary.md`).
- No toast, no message. Silence plus haptic.

The user learns the vocabulary by feel, not by error messages.

### Swipe thresholds and feel

- Swipe to trigger: 40% of row width, or 120px, whichever is less.
- Beyond the trigger point, the action "locks in" and releasing
  commits it.
- Before the trigger point, releasing snaps back with a spring.
- Actions are color-coded on reveal: complete is `success-subtle`,
  defer is `surface-3`, delete is `danger-subtle`.
- The row holds its reveal for 200ms after commit, then animates
  away. This gives the eye time to register what happened.

### Long-press feel

- Press-and-hold: 400ms delay before the contextual menu appears.
- Light haptic at the moment the menu appears.
- The item scales to 0.97 while held, then returns to 1.0 when the
  menu opens. This is the only scale animation in the app.
- The menu appears as a sheet (mobile) or a popover anchored to the
  item (tablet, desktop).

### Keyboard equivalents

Every gesture has a keyboard equivalent:

| Gesture | Keyboard |
|---|---|
| Swipe right (complete) | `E` or `Space` |
| Swipe left (defer) | `D` |
| Long-press (AI menu) | `Cmd+Enter` on a focused item |
| Pull down (capture) | `C` |
| Back | `Esc` |
| Zoom | `Cmd +` / `Cmd -` |

Keyboard equivalents are documented in the command palette and in
the help sheet (accessible via `?`).

### Platform notes

- **iOS.** Swipe-from-left-edge is reserved for back. Never
  override. Swipe-to-reveal actions use the system-standard
  interaction where possible.
- **Android.** Back gesture is the system edge-swipe. Do not
  intercept. Swipe actions follow Material conventions for reveal
  width and color.
- **Web.** No edge-swipe. Use browser back. Gestures are pointer-
  based where supported, but keyboard equivalents are the primary
  path.
- **Desktop.** No touch gestures. Keyboard and mouse only.

## Examples

**Completing a task with a gesture.**

    User swipes a task row to the right past 40%.
    Row reveals a green checkmark on the success-subtle background.
    User releases.
    Completion animation plays (see motion-vocabulary).
    "Completed" haptic fires.
    A five-second undo toast appears (Invariant 1).

**Deferring a task.**

    User swipes a task row to the left past 40%.
    A defer sheet opens with four options:
      Tomorrow · Next week · Someday · Pick a date…
    User taps "Tomorrow."
    Sheet dismisses. Row reanimates to its new position.

**Long-pressing a task.**

    User presses and holds a task row.
    At 400ms, the row scales to 0.97.
    Light haptic fires.
    Contextual menu appears:
      Research this
      Break this down
      Reschedule
      Link person
      Add note
    User taps "Research this."
    Menu dismisses. Tier 2 runs.

**Attempting a disabled gesture.**

    User swipes left on a calendar event (defer is disabled there).
    The row does not move.
    A subtle warning haptic fires.
    Nothing else happens.

## What this doc must NOT do

- This doc does not define what each AI action does. It defines
  that long-press opens a menu. Actions live in
  `04-ai/tier-2-contextual.md`.
- This doc does not define motion timing. It references durations
  from `03-experience/motion-vocabulary.md`.
- This doc does not define haptic feel. It references haptic names
  from `03-experience/haptic-vocabulary.md`.
- This doc does not define accessibility alternatives beyond the
  keyboard. Screen reader interactions are covered in
  `05-modules/` per module.
- This doc does not define what each screen looks like. It defines
  what gestures do on each surface.