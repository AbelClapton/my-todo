# Components

## Purpose

This doc names the app's UI primitives — the rows, cards, controls,
overlays, chips, and ambient elements that its screens are assembled
from. It exists because `07-infrastructure/stack.md` names shadcn/ui as
the component baseline and `10-engineering/code-conventions.md` says
"shadcn + custom primitives", but nothing named the custom ones. Without
that list, a design decision made in a design tool has to be either
honoured in code or fought there.

**This doc names components and their sizes. It does not style them.**
Visual language lives in `03-experience/design-tokens.md`.

## Invariants

- Every reusable element is listed here once, with the doc that
  specifies its content and the token that sizes it.
- **No component invents a size.** Each uses a control height, a row
  height, or a spacing token (`03-experience/design-tokens.md`).
- A component is either a stock shadcn/ui primitive or a custom one
  listed here. Nothing else is used.
- Where this doc and a module doc disagree, the module doc wins.

## Specification

### Rows

Four row heights exist and every list uses one of them
(`03-experience/design-tokens.md`). No custom row heights.

| Component | Height token | Defined in | Notes |
|---|---|---|---|
| Task row | `row-rich` (72) with metadata, `row-default` (56) without | `05-modules/tasks.md` | Carries checkbox, title, identity metadata line, priority dot, and at most two time chips |
| Habit row | `row-default` (56) | `05-modules/habits.md` | Checkbox, name, cadence · area, compliance count, minimum underline |
| Note row | `row-rich` (72) | `05-modules/notes.md` | Title or first line, two-line preview, attachment chip, "Edited 2d ago" |
| Person row | `row-default` (56) | `05-modules/people.md` | Name, last activity, links summary |
| Timeline item | `row-default` (56) | `05-modules/calendar.md` | Positioned by time on the axis |
| Protocol card | `row-hero` (96) | `05-modules/protocols.md` | Title, status chip, goal, day N of M, metric, habits |
| Dense list row | `row-compact` (44) | `03-experience/design-tokens.md` | Settings and filter lists |

### Cards

| Component | Defined in | Notes |
|---|---|---|
| Prep card | `05-modules/people.md`, `06-flows/doing-the-day.md` | Attendees, last note, last completed task, open tasks |
| Protocol card | `05-modules/protocols.md` | See Rows — sized by `row-hero` |
| Day-note preview | `05-modules/calendar.md` | First two lines, tap to open |
| Review card | `05-modules/review.md` | The review as it appears in the Day view |
| Resurfacing card | `06-flows/resurfacing.md` | Four variants: forgotten, low-energy, people, `streak_repair` |
| Lapse-recovery card | `06-flows/lapsed-recovery.md` | Exempt surface; two options of equal weight |
| Daily obligations card | `03-experience/attention-budget.md` | Habit checkboxes plus the metric row |
| "All three done" card | `06-flows/completion.md` | `type-title-3`, `space-7` padding, `radius-lg`; exempt surface |
| Nudge banner | `06-flows/doing-the-day.md` | The container for contextual and gap nudges |
| System banner | `10-engineering/error-handling.md`, `05-modules/calendar.md` | Offline, stale calendar, local-only warning |

### Controls

| Component | Height token | Defined in |
|---|---|---|
| Checkbox (task, habit) | `control-xs` | `05-modules/tasks.md`, `05-modules/habits.md` |

A checkbox fills with `accent-default` and a white tick when checked. There is no
separate "checked" colour: the accent is the app's way of saying "this is on",
and a second one would compete with the priority dot that sits in the same row.
| Segmented control (scopes) | `control-sm` | `05-modules/tasks.md`, `05-modules/notes.md` |
| Metric input row `[1][2][3][4][5]` | `control-md` | `05-modules/protocols.md` |
| Window selector (7 / 30 / 90 / custom) | `control-sm` | `05-modules/habits.md` |
| Filter button | `control-sm` | `05-modules/tasks.md` |
| Header arrows, "Today" | `control-sm` | `05-modules/calendar.md` |
| `+` button | `control-md` | Calendar, Habits, People |
| Capture field | `control-lg` | `06-flows/capture.md` — the primary CTA on every screen |
| Mic button | `control-md` | `06-flows/capture.md` |
| Inline completion-note field | `control-md` | `06-flows/completion.md` |

### Overlays

| Component | Container | Defined in |
|---|---|---|
| Defer sheet | Bottom sheet, four rows | `05-modules/tasks.md` |
| Filter sheet | Sheet | `05-modules/tasks.md` |
| New event sheet | Sheet | `05-modules/calendar.md` |
| Protocol proposal sheet | Sheet | `05-modules/protocols.md` |
| Goal creation | Sheet | `05-modules/areas-and-goals.md` |
| Tier 2 contextual menu | Sheet on mobile, popover on tablet/desktop | `03-experience/gesture-vocabulary.md` |
| Tier 3 assistant sheet | Sheet | `04-ai/tier-3-assistant.md` |
| Attachment picker | Sheet | `06-flows/capture.md` |
| Person picker | Sheet | `05-modules/people.md` |
| "Move to…" target picker | Sheet | `05-modules/notes.md` |
| Date picker | Overlay, month grid | `05-modules/calendar.md` |
| Command palette | Overlay | `06-flows/retrieval.md` |
| Undo toast | Fixed, slides up from the bottom edge over 200ms, countdown ring | `01-foundation/principles.md`, `06-flows/completion.md` |
| Error boundary | Full-screen | `10-engineering/error-handling.md` |

### Chips

| Component | Defined in | Notes |
|---|---|---|
| Parsed chip / confirmation chip | `04-ai/tier-1-parsing.md` | Receipt and confirmation are different chips with different behaviour |
| Status chip | `05-modules/protocols.md` | `proposed`, `baseline`, `active`, `completed`, `abandoned` |
| Attachment chip | `05-modules/notes.md` | "→ Buy standing desk", "→ Sarah", "→ Today" |
| Due chip | `05-modules/tasks.md` | "due Thu" — a time fact, so a chip and not metadata |
| Duration chip | `05-modules/tasks.md` | "40m" |
| Cadence chip | `05-modules/tasks.md` | "weekly" |
| Deferred chip | `05-modules/tasks.md` | "deferred 2d" |
| Overdue chip | `06-flows/disruption.md` | "overdue 3d" — `text-secondary`, never red |

A row carries **at most two chips**, because three of them starve the title at
390px. `05-modules/tasks.md` owns the cap and the priority order that decides
which two survive. Chips may carry a leading glyph at `icon-xs`, which is how a
time chip stays readable at a glance — the glyph and the word each carry the
meaning, so neither has to be learned alone.

### Ambient and data display

| Component | Defined in | Notes |
|---|---|---|
| Now line | `06-flows/doing-the-day.md` | One line, persistent, never a nudge |
| Freshness annotation | `02-architecture/data-lifecycle.md` | "as of 2 hours ago"; `type-footnote`, `stale-bg`/`stale-text` |
| Sync indicator | `07-infrastructure/sync-engine.md` | Includes the pending counter |
| Compliance chart | `05-modules/habits.md` | 28-day strip: full, minimum, skip, missed, repair |
| Protocol report body | `04-ai/research-and-protocols.md` | Tables with evidence labels |
| Usage and quota rows | `05-modules/settings.md` | Informational, not actions |

### Containers

The seven containers, defined once. Choosing one is a component
decision, not a per-screen preference.

| Container | Form | Used for |
|---|---|---|
| **Sheet** | Slides up from the bottom edge; dismissed by drag or backdrop | A short set of options or a small form — the default overlay on every platform |
| **Popover** | Anchored to the element that opened it; `elevation-2` | A menu on tablet and desktop, where the anchor is stable |
| **Modal** | Centred, with a backdrop; `elevation-3` | Reserved for the four confirmed actions (`01-foundation/principles.md`) |
| **Banner** | A full-width line in the shell's banner layer | System status: offline, stale calendar, local-only warning |
| **Card** | Content in a stream that is not a screen | Nudges, summaries, previews |
| **Chip** | A small label attached to a row or field | State belonging to one item |
| **Toast** | Slides up from the bottom edge, `elevation-4` | An undo window, or a confirmation with no other home |

Exactly one container renders differently by platform: the Tier 2
contextual menu is a sheet on mobile and a popover on tablet and desktop
(`03-experience/gesture-vocabulary.md`). Everything else picks one
container and keeps it. Ordering and stacking rules are
`03-experience/app-shell.md`.

**Confirmation.** A toast with a fixed two-second hold and no action,
used when something succeeded and there is nothing to undo — "Captured to
Inbox". It is *not* the undo toast, which holds for five seconds and
carries the reversal. When the user arrives from outside the app, as with
the share sheet, the same confirmation renders full-bleed because there
is no underlying screen for it to sit over.

**Tooltip.** Popover styling and `type-footnote`, appearing after the
hover delay and fading in at `duration-instant`. Permitted in two places
only: the unlabelled mode icons in the desktop rail, and the reason a
domain action is disabled (`10-engineering/error-handling.md`). A tooltip
is never the only way to learn something.

### Stock and custom

`07-infrastructure/stack.md` names shadcn/ui as the baseline. The
division is: **shadcn supplies behaviour, this doc supplies identity.**

    From shadcn    Button, Input, Dialog, Popover, Sheet, Tooltip,
                   Tabs (as the segmented control), Checkbox, Select,
                   DropdownMenu, Toast (as both toasts)
    Custom         every row, every card, every chip, the now line, the
                   timeline, the compliance chart, the capture field,
                   the metric input row, the mode rail/dock, the palette

A custom component consumes a shadcn primitive where one fits. It does not
reimplement focus handling, escape-key behaviour, or scroll locking.

### States

Each component is checked against the states its surface requires.
`03-experience/states.md` defines the states and their forms;
`03-experience/surfaces.md` names which surface needs which.

| State | Applies to | Specified in |
|---|---|---|
| Default | All | The owning doc |
| Pressed, hover, focus | Rows, controls, chips, every interactive element | `03-experience/design-tokens.md` |
| Disabled | Gesture on a surface that does not support it | `03-experience/gesture-vocabulary.md` |
| Selected | Scopes, filters, pickers | The owning module |
| Empty | Every list and stream | `03-experience/states.md` |
| Waiting | Sync, AI work in flight | `03-experience/states.md` |
| Stale | Anything with freshness metadata | `02-architecture/data-lifecycle.md` |
| Error | Anything that can fail | `10-engineering/error-handling.md` |
| Offline | Every surface, since local-first | `10-engineering/error-handling.md` |
| First-run | Every surface with data behind it | `06-flows/onboarding.md` |

## Examples

**The task row, in the four states a designer must draw.** This is why the
row is the first component to get right: it appears in more screens than
anything else, and it is the only one whose height changes with content.

    row-rich (72)      [ ] Draft Q4 plan
                           Work · due Tue · 1 note · @Sarah

    row-default (56)   [ ] Call contractor

    deferred           [ ] File Q4 taxes        [deferred 2d]
                           Home · due Fri

    completing         row scales 1.0 → 1.02 → 0.98 → 0 over 400ms,
                       then the undo toast appears

Every one of those is specified: the heights in `design-tokens.md`, the
content in `05-modules/tasks.md`, the animation in
`03-experience/motion-vocabulary.md`, and the toast in
`01-foundation/principles.md`.

## What the gap pass settled

The seven gaps this doc opened on 2026-09-22 are specified, each where it
belongs:

| Gap | Settled in |
|---|---|
| Container vocabulary — sheet, popover, modal, banner, card, chip, toast | This doc, Containers |
| Focus and hover treatment | `03-experience/design-tokens.md`, Interaction states |
| Empty states | `03-experience/states.md` |
| Waiting and placeholders | `03-experience/states.md` — the answer is that waiting never animates (ADR 0019) |
| Confirmation presentation | This doc, Containers |
| Tooltips | This doc, Containers |
| Which shadcn primitives are stock | This doc, Stock and custom |

Nothing here stays open. A component that needs a state, a container, or a
size that does not exist is a change to `03-experience/design-tokens.md`
or to this doc — never a local exception.

## What this doc must NOT do

- This doc does not define visual style, colour, type, spacing values, or
  motion. Those are `03-experience/design-tokens.md` and the three
  vocabularies.
- This doc does not define behavior or copy. Each component names the doc
  that does.
- This doc does not add a token. If a component needs a size that does
  not exist, that is a change to `03-experience/design-tokens.md`.
- This doc does not define the states themselves. `03-experience/states.md`
  defines them, and `03-experience/app-shell.md` defines where containers
  stack.
