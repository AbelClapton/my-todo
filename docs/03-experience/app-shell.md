# App Shell

## Purpose

This doc defines the chrome that wraps every screen: the mode
navigation, the header's slots, the five layers and their
order, and the rules for stacking overlays. It exists because the shell
was implied across half a dozen docs — a "mode switcher" here, a
"rail/dock" there, a gear icon somewhere else — and specified in none,
so nothing could be designed or built without inventing it.

It is called the app shell to keep it distinct from *shell apps*
(`07-infrastructure/stack.md`), which are the Capacitor wrappers.

## Invariants

- **The shell is identical in all four modes.** A mode may fill the
  header's slots; it may not add chrome, a second bar, or a floating
  control.
- Every floating surface belongs to exactly one of the five layers
  below. A sixth layer requires a change to this doc.

**The count was wrong, and it was wrong in the section that guards it.**
This doc said "the four floating layers" in its Purpose, "the four
layers below" and "a fifth layer requires a change to this doc" in these
invariants, and "### The four layers" over the heading — while the table
beneath listed **five**, and the worked example in §Examples says "Undo
toast appears over it (**layer 5**)". So the numbering was in use, the
guard clause had already been passed, and the phrase "four floating
layers" was true on no reading: the table has five rows and only three
of them float, because Content and Sticky chrome are the shell itself.

Found by asking where one surface (Settings) sits, which is the useful
part of the story — the defect is in the doc the whole UI is built on,
and nothing in the surface asked about it directly.
- Sticky chrome is at most two rows tall (header, then the now line or a
  banner). The shell never reduces the content area by more than that.
- The shell animates only through the transitions in
  `03-experience/motion-vocabulary.md`. It introduces no motion of its
  own.
- Nothing in the shell is a nudge. **A status banner** informs; it does not
  ask. A **repair banner** carries the one action that ends the failure it
  names — which is not the shell asking for attention, it is the failure
  offering its own fix, and it is why a repair banner is outside the
  attention budget by definition rather than by exemption
  (`03-experience/attention-budget.md`, ADR 0023).
  (`03-experience/attention-budget.md`).

## Specification

### The mode navigation

Four modes: Calendar, Tasks, Habits, Notes. Settings is not one of them;
it is reached from the header's gear or the command palette
(`05-modules/settings.md`).

| Platform | Form | Notes |
|---|---|---|
| Desktop, tablet | **Rail**, fixed at the leading edge | Always visible. Labels are not shown; icons carry a tooltip. |
| Mobile | **Dock**, fixed at the bottom edge | Above the safe-area inset. |

One indicator marks the active mode in `accent-default`. It takes a different
form in each navigation, because the same mark does not transfer: on the **rail**
it is a 3px bar on the leading edge, and in the **dock** it is a 2px underline
below the icon. Drawn literally as a leading-edge bar, the dock's indicator
detaches from its icon and floats at the far edge of the bar.

Switching slides the indicator and cross-fades the content — both
`duration-default`, `ease-standard`, no horizontal slide
(`03-experience/motion-vocabulary.md`). The page you were on in the old
mode is remembered and restored when you return.

**The switcher is long-pressable on mobile** for Tier 3
(`04-ai/tier-3-assistant.md`). It is not an atom, so this does not
collide with long-press = contextual menu.

### The header

One row, mode-specific content in three slots:

| Slot | Holds |
|---|---|
| Leading | Mode title; on a pushed screen, the back affordance |
| Center | The mode's own control: a scope segmented control (Tasks, Habits, Notes) or date arrows plus "Today" (Calendar) |
| Trailing | Mode actions: filter, search, `+`, and the settings gear |

The gear is present in every mode, in the trailing slot, in the same
position. `+` appears only where a mode creates something.

### The five layers

Ordered from back to front. Order is the contract; the elevation token is
how it is signalled.

| Layer | Contents | Elevation |
|---|---|---|
| 1. Content | Screens, lists, the timeline | `elevation-0` |
| 2. Sticky chrome | Header, mode navigation, now line | `elevation-0`, `border-subtle` |
| 3. Banners | The four below — two status, two repair | `elevation-2` |
| 4. Transient | Sheets, popovers, the palette, the date picker | `elevation-2` (popover) or `elevation-3` (sheet, modal) |
| 5. Toasts | The undo toast, confirmations | `elevation-4` |

**Layer 3 holds two kinds of banner, and the distinction is what its invariant
is about.** This table is the complete list — a banner added anywhere else is a
change to this doc, not a local decision, because the layer owns the ordering
rule and cannot order a tenant it has not heard of.

| Banner | Kind | Carries | Owner |
|---|---|---|---|
| Stale calendar | Repair | `[Retry]` | `05-modules/calendar.md` |
| Offline | Status | nothing | `10-engineering/error-handling.md` |
| Local-only warning | Status | `[OK]` | `06-flows/onboarding.md` |
| Server error (5xx) | Repair | `[Retry]` | `07-infrastructure/sync-engine.md` |

A **status banner reports a fact** and carries no control that changes state. A
**repair banner names one failing thing and carries exactly one action, which
retries it.** Both are one line, neither is dismissable by swiping, and both
are one-shot: a repair banner disappears when the thing it names recovers, not
when the user taps.

Full-screen states — onboarding, the morning plan, shutdown, lapse
recovery, any error boundary — replace the shell entirely rather than
floating over it. That is why they are not a layer.

### Stacking rules

- **At most one sheet at a time.** Opening a second sheet dismisses the
  first and remembers it: dismissing the second returns to the first.
  This is what makes "swipe left → defer sheet → pick a date" work
  without a stack of three.
- **Popovers do not stack.** Opening one closes any other.
- **Banners never stack.** If two want to show, the higher-priority one
  wins and the other waits; the order is stale-calendar, offline,
  local-only, server-error, and it applies across both kinds, because the
  layer holds one banner at a time however many want it.
- **A blocked banner preserves its turn.** The local-only warning is one of
  the two surfaces exempt from the attention budget
  (`03-experience/attention-budget.md`), so it fires on the second open and
  cannot be lost by waiting. It is ranked **last** of the four, which means
  the user who has never reached the server — the one whose notes really do
  live only on that device — is the user most likely to see it late. That is
  deliberate for the calendar and reason to re-read the order for this one:
  the local-only warning is about the device the user is holding, and
  "offline" is usually what is true at the same moment.
- **Toasts are above everything** and are never covered by a sheet,
  because a covered undo is a broken undo (Invariant 1).
- **The palette is modal.** It takes a backdrop (`bg-overlay`), and
  pressing `Esc` or tapping the backdrop closes it.

### The command palette

One overlay, anchored to the top of the viewport (`space-5` inset), a
single input row, and one result list. Rows are `row-compact` (44px) —
the dense-list token, because a palette is a dense list.

- The first result is preselected; Enter runs it; `Esc` closes.
- Empty input shows commands only. Typed input shows commands first, then
  matches, then the "Capture: <text>" fallback
  (`06-flows/capture.md`).
- No results is an empty state (`03-experience/states.md`).

Its behaviour — what is searchable, how matches rank — is
`06-flows/retrieval.md`. This doc only fixes the surface.

### Onboarding chrome

The seven onboarding screens are full-screen pages, not cards in a stack.

- A progress indicator of seven segments sits at the top, filled by
  `accent-default`.
- "Skip" sits top-trailing on screens 1–6, and jumps to screen 7
  (`06-flows/onboarding.md`). Screen 7 has no chrome at all: no
  progress, no skip, because there is nowhere left to go.
- Screen 1 carries a secondary "Just let me in" action; the other
  screens carry their own single primary action.

### Updates

**The app never tells the user an update is available** (ADR 0020). A new
version is picked up silently on the next cold launch; the service worker
serves the cached shell in the meantime (`07-infrastructure/stack.md`).

The reasoning: nothing in this app is server-dependent in a way that
makes an old client wrong — the log is local and the sync protocol is
versioned — so an update prompt would be interruption with no payoff,
which Invariant 3 exists to prevent. If a future change breaks that
assumption (a protocol the old client cannot read), it needs a real
surface and **a new ADR**, not a banner bolted on here.

## Examples

**Switching mode.**

    User is in Tasks, scrolled halfway down the Today list.
    Taps Habits in the dock.
    The dock indicator slides 200ms, ease-standard.
    Content cross-fades 200ms. No horizontal slide.
    Returning to Tasks restores the scroll position.

**Defer sheet, then a date.**

    Swipe left on a task row → defer sheet (layer 4).
    Taps "Pick a date…" → the sheet is replaced by the date picker.
    Picks Thursday → both dismiss, the row reanimates to its new position.
    Esc at the picker → the defer sheet returns, still open.

Note what this example is: **a sheet opening a second sheet, and
returning.** It is the one-sheet rule working as designed, so "a sheet
whose action opens an overlay" is not a defect in itself.

**A surface that spans layers.**

    Settings is reached two ways (`05-modules/settings.md` §Behavior):
    a full-screen sheet from the palette, a pushed panel from the gear.

    Its contents include a Screen — `03-experience/surfaces.md` files the
    Area list as "Screen (in Settings)" — and an unbounded list that
    appears under AI audit mode.

    A Screen belongs to layer 1. A sheet belongs to layer 4. On the gear
    path the same surface is layer 4 while containing a layer-1 thing,
    and this doc gives no rule for that. The rule it needs:

    **A container takes the layer of its contents, not of its chrome.**
    A surface that hosts a Screen is a screen, whichever door opened it.

**A banner under a toast.**

    User completes a task while the calendar mirror is stale.
    Stale-calendar banner appears (layer 3).
    Undo toast appears over it (layer 5), five seconds.
    The toast is never obscured; if it expires, the action stands.

## What this doc must NOT do

- This doc does not define modes or their contents. It defines the frame
  around them.
- This doc does not define visual style. Colours, spacing, radii, and
  elevation are `03-experience/design-tokens.md`.
- This doc does not define motion beyond naming which existing transition
  applies. Those live in `03-experience/motion-vocabulary.md`.
- This doc does not define behaviour inside a screen, or copy. Those
  belong to the mode and flow docs.
- This doc does not define mobile shell integration (safe areas, status
  bar, keyboard) beyond reserving the inset. That is Phase 8 work.
