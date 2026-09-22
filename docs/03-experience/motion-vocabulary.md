# Motion Vocabulary

## Purpose

This doc defines the closed set of durations and easings the app
uses, and which transitions are appropriate where. It exists because
motion is the most visible sign of an "assembled" app — inconsistent
timings, gratuitous springs, and bouncy modals all read as cheap.

The app's motion philosophy: **fast, calm, and informative. Motion
explains what happened; it does not decorate.**

## Invariants

- There are exactly six durations and two easing curves. No screen
  may define a seventh duration or a third easing.
- Motion is at or under 400ms in every case. Beyond that, users
  perceive delay.
- Motion never blocks input. A user can interrupt any animation by
  interacting.
- Respect `prefers-reduced-motion`. When set, transitions become
  instant; the only exception is the undo toast, which still needs
  its five-second window (but with no animation).
- No springs, no bounces, no overshoot. The one scale animation
  (long-press) is the only transform effect.
- Every animation has a purpose: to explain a state change, to
  orient, or to confirm.

## Specification

### Durations

| Token | Value | Used for |
|---|---|---|
| `duration-instant` | 100ms | Color changes, opacity on hover, focus rings |
| `duration-fast` | 150ms | Small transitions: chip state, icon swap, mode indicator |
| `duration-default` | 200ms | Most transitions: list row reveal, sheet open, popover |
| `duration-slow` | 250ms | Larger transitions: screen push, modal, calendar zoom |
| `duration-deliberate` | 400ms | Emphasis: completion confirmation, protocol report reveal |
| `duration-longpress` | 400ms | Press-and-hold delay before a contextual menu |

`duration-deliberate` is used sparingly. If more than one animation
per screen uses it, the screen is over-emphasizing.

### Easings

Two curves, used consistently.

| Token | Curve | Used for |
|---|---|---|
| `ease-standard` | cubic-bezier(0.2, 0, 0, 1) | Everything entering, moving, or transforming |
| `ease-exit` | cubic-bezier(0.4, 0, 1, 1) | Everything leaving or dismissing |

The standard curve is a smooth ease-out. It starts fast and settles
gently. This is the default for all motion in the app.

The exit curve is a smooth ease-in. It accelerates out. Used only
when something is being dismissed.

### The transition catalog

Every transition in the app is one of these. No custom transitions.

**List row reveal (swipe).** `duration-default`, `ease-standard`.
The row slides horizontally, revealing the action background. On
commit, holds for 200ms, then animates away vertically with
`duration-default` and `ease-exit`.

**Completion confirmation.** `duration-deliberate`,
`ease-standard`. The completed item scales slightly (1.0 → 1.02 →
0.98 → 0) and fades. This is the only scale-in/scale-out in the
app, and it is reserved for completion.

**Mode switch (nav).** `duration-default`, `ease-standard`. The
mode indicator slides to the new position; the content cross-fades.
No slide-in-from-side; the content is centered on the same axis.

**Screen push (navigation).** `duration-slow`, `ease-standard`
(enter), `duration-slow`, `ease-exit` (exit). The new screen slides
in from the right; the old screen slides out to the left at 30%
of the distance. This is the standard iOS-style push.

**Sheet (bottom).** `duration-default`, `ease-standard`. Slides up
from the bottom. Dismiss with `duration-default`, `ease-exit`.

**Popover (anchored).** `duration-fast`, `ease-standard`. Scales
from 0.96 to 1.0 and fades in. Dismiss with `duration-instant`,
`ease-exit`.

**Modal.** `duration-slow`, `ease-standard`. Backdrop fades in
(`duration-default`), modal scales from 0.96 to 1.0 with
`duration-slow`. Exit with `duration-fast`, `ease-exit`.

**Toast (undo).** `duration-fast`, `ease-standard`. Slides up from
the bottom edge. Disappears after 5 seconds with `duration-default`,
`ease-exit`. If dismissed early, exit immediately.

**Calendar zoom.** `duration-slow`, `ease-standard`. Day, week,
month, and year views cross-scale smoothly. Events hold their
visual position during the zoom where possible.

**Shared-element transition (list → detail).** `duration-slow`,
`ease-standard`. The list row expands into the detail view. The
title text is the shared element: its position and size animate
between the two states.

**Sheet → screen (capture).** `duration-default`, `ease-standard`.
When a capture becomes a scheduled item, the capture field morphs
into the item's detail view.

### Motion philosophy in practice

- **Enter from where you came from.** A screen pushed from a list
  enters from the right (list direction). A sheet enters from the
  bottom. A popover enters from its anchor.
- **Leave the way you came.** Exits reverse the entry, but faster
  and with `ease-exit`.
- **Content first, chrome second.** When a screen appears, content
  fades in slightly before its header. A 40ms offset is enough to
  read as intentional.
- **Stagger sparingly.** Lists of up to 5 items can stagger their
  entry by 30ms each. Beyond 5, stagger becomes sluggish — enter
  them together.
- **Nothing bounces.** No spring physics, no overshoot. The eye
  reads overshoot as unserious.

### Reduced motion

When `prefers-reduced-motion: reduce`:

- All durations become `duration-instant`.
- All transitions become opacity-only or no-op.
- Screen pushes become cross-fades.
- The completion animation becomes a simple fade.
- The undo toast still appears and still lasts 5 seconds, but has
  no entry animation.

## Examples

**Task completion.**

    Swipe release → row slides right (already revealed).
    Row holds 200ms.
    Completion animation: scale 1.0 → 1.02 → 0.98 → 0, fade to 0.
    Duration: 400ms, ease-standard.
    Row removes from list. Remaining rows shift up in 200ms.

**Opening a task detail.**

    User taps a task row.
    Row's title text (shared element) animates from list position
    to detail position over 250ms, ease-standard.
    Detail content fades in with a 40ms offset.
    List fades to 30% opacity behind it.

**Opening the contextual menu (long-press).**

    Press at t=0. At t=400ms, the item scales to 0.97 over 100ms.
    Menu appears as a sheet, entering over 200ms with ease-standard.
    Pressed item returns to 1.0 as the sheet appears.

**Mode switch.**

    User taps a new mode in the rail/dock.
    Mode indicator slides from old position to new over 200ms.
    Content cross-fades in over 200ms.
    No horizontal slide. The content is centered on the same axis.

## What this doc must NOT do

- This doc does not define gestures. It defines how transitions
  *look* once triggered. Gestures live in
  `03-experience/gesture-vocabulary.md`.
- This doc does not define haptics. Motion and haptics are paired
  in practice but defined separately. Haptics live in
  `03-experience/haptic-vocabulary.md`.
- This doc does not define layout. It defines how layout changes
  animate. Layout lives in `03-experience/design-tokens.md` and
  in module docs.
- This doc does not define animation libraries. Implementation is
  a code concern; the vocabulary is the contract.
- This doc does not define per-screen timing overrides. There are
  none.