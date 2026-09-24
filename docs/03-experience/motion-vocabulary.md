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
  perceive delay. **A transition spends up to 400ms; a sequence has a
  400ms budget and divides it** (§Sequence budgets). Reading the
  ceiling as a limit on parts alone lets a moment that lasts 750ms
  pass a rule that says 400.
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
| `duration-longpress` | 400ms | Press-and-hold delay before a contextual menu; hover delay before a tooltip |

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

**Every transition in the app is one of these. No custom transitions.**
The list is closed at sixteen, and three of them were added because flows
had been using them for months without a name: the list reflow, and the two
in-place fades.

**List row reveal (swipe).** `duration-default`, `ease-standard`.
The row slides horizontally, revealing the action background. On
commit, holds for 200ms, then animates away vertically with
`duration-default` and `ease-exit`.

**Completion confirmation.** `duration-deliberate` is the **budget** for
this sequence, `ease-standard` its curve. The completed item scales slightly
(1.0 → 1.02 → 0.98 → 0) and fades; this is the only scale-in/scale-out in the
app and it is reserved for completion. It does not last 400ms on its own —
see §Sequence budgets, where it is the middle of the budget and spends 160ms
of it.

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
visual position during the zoom where possible, and "possible" is
specific rather than a hedge: **day → week** holds horizontal
position, because a week column *is* a day; **week → month** holds
vertical position, because a month cell keeps the week's time axis
(`05-modules/calendar.md`, "The Month view layout"); and
**month → year** holds neither, because a year cell is too small to
position anything in (`05-modules/calendar.md`, "The Year's fit": a
cell is 44 × 9px against the Month's 50 × 115px, so every mark the
Month positions by time collapses to a single pixel). Two of the
three steps hold — which makes this a constraint with a stated
exception, not a preference.

**Shared-element transition (list → detail).** `duration-slow`,
`ease-standard`. The list row expands into the detail view. The
title text is the shared element: its position and size animate
between the two states.

**Sheet → screen (capture).** `duration-default`, `ease-standard`.
When a capture becomes a scheduled item, the capture field morphs
into the item's detail view.

**List reflow.** `duration-default`, `ease-standard`. When a row leaves a
list, the rows below it close the gap. It begins *before* the departing row
has finished its exit, so the removal and the closing read as one event
rather than two. `06-flows/completion.md` has been specifying this since it
was written, in a step with a duration and no name; this is its home.

**In-place fade (in).** `duration-fast`, `ease-standard`. Opacity only — no
transform and no backdrop. For a card that appears where it already belongs.
Distinct from the popover's fade, which rides a 0.96 → 1.0 scale, and from
the modal's, which rides a backdrop.

**In-place fade (out).** `duration-fast`, `ease-exit`. The same in reverse —
a card dismissed where it stands, rather than leaving the screen.

**State change (hover, focus, press).** `duration-instant`,
`ease-standard`. Colour and opacity only, never transform. A row
that lifts, scales, or slides under the pointer is a bug in an
interface whose philosophy is calm.

**Waiting.** No motion. No spinner, no shimmer, no pulse — a wait
under 400ms shows nothing at all, and a longer one shows a static
placeholder plus a count when the app has one
(`03-experience/states.md`). This is an entry in the catalog precisely
because it is a transition the app has and never animates.

### Sequence budgets

A transition has a duration. A **sequence** — several transitions the user
perceives as one moment — has a budget, and the transitions inside it divide
it rather than each spending up to the ceiling.

That distinction was missing, and its absence hid a real number for as long
as this doc has had a table. "Motion is at or under 400ms in every case" is a
rule about a transition. Read as a rule about a moment it is false; read as a
rule about transitions it constrains nothing, because an app whose every
screen took eleven seconds to settle would satisfy it — and this one is
quoted as the reason the app feels calm. The completion sequence was
150 + 400 + 200 = **750ms**, 1.88× the ceiling this doc and
`06-flows/completion.md` both quote.

The app has one sequence long enough to need a budget:

| Sequence | Total | Divisions |
|---|---|---|
| Completion (`06-flows/completion.md`) | 400ms | fill 60 · scale and fade 160 · reflow 180 |

**The rules for a budget.**

- Time taken from one division is given to another, so the total never
  moves.
- The reflow starts before the exiting element has finished, because two
  beats read as slower than one.
- A division drawn *inside* another's transform is visible for less than the
  enclosing transform lasts, so it has to fit inside the first beat or it was
  never drawn. The checkbox fill is the case: it is a control inside a row
  that is scaling to nothing.
- A division is **not a new token**. The three numbers above are the budget's
  arithmetic: the sequence is `duration-deliberate` and its three divisions
  are fractions of it. No screen may define a seventh duration, and a
  division may not be quoted as one.

A second sequence joins this table when a flow's moment is composed of more
than one transition. Everything else is a transition, and the 400ms ceiling
applies to it alone.

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
- **Waiting does not perform.** Motion explains what happened; a wait
  has not happened yet. Animating it would teach the user to distrust
the app's silence, which is the normal case in a local-first app.

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
    Checkbox fills (60ms) — visible, inside the row.
    Completion animation: scale 1.0 → 1.02 → 0.98 → 0, fade to 0 (160ms).
    Row removes from list; remaining rows shift up (180ms), starting
    before the row is gone.
    Total: 400ms, ease-standard — one budget, not three durations.

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