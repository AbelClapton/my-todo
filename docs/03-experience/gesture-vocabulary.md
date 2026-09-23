# Gesture Vocabulary

## Purpose

This doc defines the closed set of gestures the app recognizes and
what each one does on each surface. It exists because gesture
consistency is the difference between an app that feels designed and
one that feels assembled. If swipe-right completes a task on one
screen and archives it on another, the user cannot build muscle
memory, and the app feels unpredictable.

## Invariants

- There are exactly eight gestures. No screen may define a ninth.
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

### The eight gestures

**1. Swipe right — complete / confirm.**

On a task row: completes the task.
On a habit row: checks the habit (full version).
On a nudge: marks it actioned.
On an inbox capture: routes to "today."

Right swipe always means "yes / done / accept."

**2. Swipe left — defer / dismiss.**

On a task row: opens a defer sheet (tomorrow, next week, someday,
pick a date).
On a habit row: skips the habit for today.
On a nudge: dismisses it.
On an inbox capture: routes to "someday."

Left swipe always means "not now / no / later."

**3. Swipe up — attach.**

On any atom row: opens the attachment picker (Person, Area, Goal, or
an existing task). The same picker on every surface
(`06-flows/capture.md`).
On an inbox capture: attaches it before it is filed.

Swipe up always means "this belongs with something."

**4. Swipe down — remove from this list.**

On a task row: marks it someday.
On a habit row: archives it.
On an inbox capture: takes it out of the inbox.

Swipe down always means "take it out of this list," and it is
never destructive. The entity type decides what "out" means; the
meaning of the gesture does not change.

The note list is the one surface where the gesture is disabled
rather than repurposed, because a Note has no removal state: no
`archived`, no `someday`, nothing beyond `deleted`. There is no
"out" for it to mean (ADR 0016).

**Deletion is not a gesture.** Deleting an entity lives in the
long-press (Tier 2) menu and in the entity's overflow menu. A
destructive action must not share a direction with pull-down
capture, and must not sit on the same gesture as a reversal of
commitment (ADR 0011, `08-decisions/`).

**5. Long-press — contextual AI.**

On any atom (Task, Event, Note, Habit): opens the Tier 2 contextual
menu for that item. The menu's contents are item-type-specific.
Examples:

- Task: Research this · Break this down · Reschedule · Link person · Add note
- Habit: Why am I slipping? · Adjust cadence · View history
- Note: Summarize · Extract tasks · Find related
- Event: Prep me · Find related notes · Reschedule

Long-press always means "do something with this specific thing."

**6. Pull down — capture.**

On the lists this gesture is granted to: reveals the capture field at
the top. Releasing while pulled past threshold focuses the input.
Which lists those are is the §Gesture-to-surface matrix below — it is
authoritative, and **the Calendar is not on the list** (both of its
rows carry other gestures). Pull-down is the gesture form of capture,
not the only way into it; the command palette, the share sheet and the
in-field microphone are the other three (`06-flows/capture.md`).

**7. Swipe from left edge — back.**

Standard platform behavior. Never overridden.
Swipe from left edge pops the current screen.

**8. Pinch — zoom (calendar and graph only).**

On the calendar: zooms between day, week, month, year.
On the protocol report: zooms between summary and detail.

Pinch is limited to surfaces with a natural zoom hierarchy. It is
not a general gesture.

### Gesture-to-surface matrix

| Surface | Swipe → | Swipe ← | Swipe ↑ | Swipe ↓ | Long-press | Pull ↓ | Edge ← | Pinch |
|---|---|---|---|---|---|---|---|
| Task list | complete | defer | attach | someday | AI menu | capture | back | — |
| Task detail | — | — | — | — | — | — | back | — |
| Habit list | check | skip | attach | archive | AI menu | capture | back | — |
| Note list | — | — | attach | — | AI menu | capture | back | — |
| Note editor | — | — | — | — | — | — | back | — |
| Calendar (day) | — | — | — | — | AI menu (event) | — | back | zoom |
| Calendar (month) | — | — | — | — | AI menu (day) | — | back | zoom |
| Date picker | — | dismiss | — | — | — | — | — | — |
| People list | — | — | attach | archive | AI menu | capture | back | — |
| Protocol report | — | — | — | — | — | — | back | zoom |
| Inbox | today | someday | attach | remove | AI menu | capture | back | — |
| Nudge | action | dismiss | — | — | — | — | — | — |

**The Habit list row does not match this matrix.** Two disagreements,
both unresolved:

- **Swipe ← skip.** `05-modules/habits.md` gives skip a home in the
  checkbox's long-press mini-menu, with no swipe path. This table
  offers a second home and names neither the confirmation nor the
  threshold that would make a swipe safe for an intentionally-logged
  event. It is listed twice in that doc and once here.
- **Long-press.** This table gives the whole surface one long-press:
  the AI menu. `habits.md` gives the *checkbox* a long-press that
  opens a menu of "Minimum" and "Skip" — a different menu, on the
  same gesture, inside the same row. The matrix is specified
  per-surface and never says which element the long-press lands on,
  so it cannot distinguish the two. Either the checkbox is carved
  out here, or the habit row has two long-press menus competing for
  one gesture.
| Search results | — | — | attach | — | AI menu | capture | back | — |

A dash means the gesture is disabled on that surface.

Three rows are worth reading twice:

- **Date picker.** Neither horizontal swipe pages the month. Every calendar on
  earth uses a horizontal swipe for that, and here it would mean “defer /
  dismiss” — so the arrows and the keyboard page it instead, and this row records
  the refusal rather than leaving it undecided.
- **Note list.** Neither horizontal swipe does anything. Swipe left
  is not a delete, and swipe down has nothing to remove, because a
  Note has no removal state (ADR 0016). Notes leave Recent by aging
  out, and deletion lives in the long-press menu and the note's
  overflow menu. Disabling both swipes is what makes the row honest.
- **People list.** Archive is swipe down — "remove from this list,"
  which is what ADR 0011's decision says for a Person, and it is
  reversible (`person.unarchived`). Swipe left is disabled there
  rather than reused for archive: two directions cannot both mean
  "out of this list," and there is no "not now" state for a person
  to move to (ADR 0016).

### Disabled gesture feedback

When a gesture is attempted on a surface where it is disabled:

- The row does not move (no partial swipe).
- A subtle haptic fires (the "warning" haptic; see
  `03-experience/haptic-vocabulary.md`).
- No toast, no message. Silence plus haptic.

The user learns the vocabulary by feel, not by error messages.

**Swipe down against pull down.** These two share a direction and
are told apart by where the gesture starts:

- **Swipe down** acts on the row it starts on.
- **Pull down** acts on the list, and only when the list is already
  scrolled to the top.

So a drag that starts on a row never triggers capture, and a drag
that starts on the list background never removes a row. This
distinction is why the disabled treatment matters most at the top
tof a list: there, a row swipe that fails to reach threshold must
not be allowed to fall through to capture.

### Swipe thresholds and feel

- Swipe to trigger: 40% of row width, or 120px, whichever is less.
- Beyond the trigger point, the action "locks in" and releasing
  commits it.
- Before the trigger point, releasing snaps back with a spring.
- Actions are color-coded on reveal: complete is `accent-subtle`, the
  same background the accent uses everywhere else, because the check
  itself is `accent-default`; defer, remove, and attach are `surface-3`.
  No swipe is ever `danger-subtle`, because no swipe is destructive
  (ADR 0011).
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
| Swipe up (attach) | `A` |
| Swipe down (remove) | `X` |
| Long-press (AI menu) | `Cmd+Enter` on a focused item |
| Pull down (capture) | `C` |
| Back | `Esc` |
| Zoom | `Cmd +` / `Cmd -` |

Removal is `X`, never `Delete` or `Backspace`. The key follows the
verb: removal is not deletion (ADR 0011).

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
    Row reveals a checkmark in `accent-default` on the `accent-subtle` background.
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

**Removing a task from the morning plan.**

    User swipes a carried-over task down.
    Row reveals "Someday" on the surface-3 background.
    User releases.
    task.marked_someday is logged.
    Row leaves the list.
    A five-second undo toast appears (Invariant 1).

The removal is reversible but not a toggle: the row is gone from the
list, so the toast is the way back (ADR 0010).

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