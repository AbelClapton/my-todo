# Design Tokens

## Purpose

This doc defines the single source of visual truth: every spacing
value, type size, color, radius, elevation, icon size, control
height, row height, and touch target the app uses. No screen,
component, or AI-generated surface may reference a value outside
this file.

It exists because the "AI-generated UI feels off" problem is almost
never a single wrong screen. It is that screen A and screen B were
generated in different sessions with different implicit rules. Tokens
are the rules. They are enforced by a linter, not by hope.

## Invariants

- Every visual value in the app references a token. There are no
  arbitrary values in code, in CSS, or in AI-generated output.
- Tokens are semantic, not literal. The token is `space-4`, not
  `p-16px`. The token is `text-secondary`, not `#6B7280`.
- The token set is closed. Adding a token requires an ADR. Removing
  one requires migrating every reference.
- Tailwind is configured to expose only tokens. Arbitrary values
  (`p-[17px]`, `text-[15.5px]`) fail the linter.
- Tokens are defined once and consumed everywhere. The client, the
  shell apps, and email templates (if any) all read from the same
  source.
- Dark mode and light mode are the same token set with different
  values, not two token sets. **Both are specified below** — a mode whose
  values are left to the implementer is not a mode, it is a guess.
- **Two contrast floors, and they are measured, not assumed.**
  Meaningful text meets 4.5:1. Placeholder and disabled text meet 3:1 and
  are the only text allowed below 4.5. A `*-subtle` background meets
  **1.15:1** against the surface it sits on, or it is not a tint — it is
  the same colour.
- **The chosen palette is warm light with cool dark.** Light is paper
  (warm neutral); dark is ink (cool neutral). They are not a matched pair,
  and they do not need to be: one palette identity specifies both of its
  values.

## Specification

### Spacing

An 8-point grid with 4 and 2 as half-steps for tight layouts.
Every gap, padding, and margin uses a spacing token. Use `gap` for
spacing between children; avoid margins.

| Token | px | Used for |
|---|---|---|
| `space-0` | 0 | resets |
| `space-1` | 2 | hairline gaps, icon-to-label in dense chips |
| `space-2` | 4 | icon-to-label in buttons, tight vertical |
| `space-3` | 8 | default inline gap, list row internal |
| `space-4` | 12 | form field internal, chip padding |
| `space-5` | 16 | default padding, screen edge inset |
| `space-6` | 20 | card padding (compact) |
| `space-7` | 24 | card padding (default), section gap |
| `space-8` | 32 | section gap (large), screen top inset |
| `space-9` | 48 | major section separation |
| `space-10` | 64 | hero spacing, empty state |

**Screen edge inset** is always `space-5` (16px) horizontally.
**Section gap** is always `space-7` (24px) vertically.
**Card padding** is `space-7` (24px) by default, `space-6` (20px)
for dense cards.

### Type scale

Every text element uses one of these roles. No exceptions.

| Token | Size / Line | Weight | Tracking | Used for |
|---|---|---|---|---|
| `type-display` | 32 / 40 | 600 | -0.02em | Empty state headline, protocol report title |
| `type-title-1` | 24 / 32 | 600 | -0.01em | Screen title (mode header) |
| `type-title-2` | 20 / 28 | 600 | 0 | Section header, sheet title |
| `type-title-3` | 17 / 24 | 600 | 0 | Card title, list group header |
| `type-body` | 16 / 24 | 400 | 0 | Default body, list row title |
| `type-body-emphasis` | 16 / 24 | 500 | 0 | Selected row, active label |
| `type-callout` | 15 / 20 | 400 | 0 | List row secondary text |
| `type-subhead` | 14 / 20 | 500 | 0.01em | Field label, chip label |
| `type-footnote` | 13 / 18 | 400 | 0.01em | Metadata, timestamps, "as of" |
| `type-caption` | 12 / 16 | 400 | 0.02em | Badge text, tightest metadata |
| `type-mono` | 14 / 20 | 400 | 0 | IDs, code, monospaced values |

**Font family.** System stack: `-apple-system, BlinkMacSystemFont,
"Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`.
Mono: `ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace`.

**Numbers.** Use tabular figures for any column of numbers (dates,
times, durations, counts). `font-variant-numeric: tabular-nums`.

**Paragraph width.** Long-form text (notes, reports) caps at 68
characters. Beyond that, line length hurts readability.

### Color

Semantic names only. Every token below is specified for **both** modes.
Light is the paper palette; dark is the ink palette.

Light and dark are not a matched pair and are not expected to be. They were
chosen independently, from measurement: warm light fixes the stale
annotation's contrast, and cool dark separates its surface steps better than
warm dark does.

**Backgrounds**

| Token | Light | Dark | Used for |
|---|---|---|---|
| `bg-base` | #FFFDF9 | #09090B | App background |
| `bg-raised` | #FAF7F1 | #18181B | Raised surface (cards) |
| `bg-sunken` | #F4F1EA | #27272A | Sunken surface (input wells) |
| `bg-overlay` | rgba(0,0,0,0.4) | rgba(0,0,0,0.6) | Modal backdrop |

**Surfaces**

| Token | Light | Dark | Used for |
|---|---|---|---|
| `surface-1` | #FFFDF9 | #18181B | Default surface |
| `surface-2` | #F4F1EA | #27272A | Secondary surface (nested) |
| `surface-3` | #E8E3D9 | #3F3F46 | Tertiary surface (tracks, wells) |

**Borders**

| Token | Light | Dark | Used for |
|---|---|---|---|
| `border-subtle` | #F4F1EA | #27272A | Dividers between related items |
| `border-default` | #E8E3D9 | #3F3F46 | Card borders, input borders |
| `border-strong` | #D8D1C4 | #52525B | Emphasis borders, focus rings (outer) |
| `border-focus` | #1F1B16 | #FAFAFA | Focus ring (inner) |

**Text**

| Token | Light | Dark | Used for |
|---|---|---|---|
| `text-primary` | #1F1B16 | #FAFAFA | Default text |
| `text-secondary` | #57514A | #A1A1AA | Secondary text, list metadata |
| `text-muted` | #948C81 | #71717A | Placeholders, disabled labels |
| `text-inverse` | #FDFBF7 | #18181B | Text on a surface of the opposite mode |
| `text-disabled` | #D8D1C4 | #52525B | Disabled text |
| `on-fill` | #FFFFFF | #FFFFFF | Text on any saturated fill — accent, danger, success |

**`on-fill` replaces the old `accent-on`, and fixes a bug.** A destructive
button used `text-inverse` for its label, which is #FDFBF7 in light but
#18181B in dark — so a red button's text turned near-black in dark mode.
`text-inverse` means "text on a surface of the opposite mode"; it was never
the same token as "text on a coloured fill". One token now covers accent,
danger, and success fills, because white measures 5.47 / 6.47 / 4.99 against
them respectively and it is the same white in both modes.

**Accent — teal** (the app has one accent; everything else is neutral)

| Token | Light | Dark | Used for |
|---|---|---|---|
| `accent-default` | #0F766E | #0F766E | Primary action, active mode, priority dot |
| `accent-hover` | #115E59 | #14B8A6 | Hover state |
| `accent-active` | #134E4A | #115E59 | Pressed state |
| `accent-subtle` | #99F6E4 | #042F2E | Accent-tinted background |
| `accent-text` | #115E59 | #99F6E4 | Accent-colored text on subtle |

**The accent does not lighten in dark mode**, and its ramp starts one step
deeper than the hue's conventional value. Both come from measurement: white on
teal-600 is 3.35:1 and fails, so the ramp begins at teal-700; and blue-500 under
white text is 3.68:1, which is what a "lighten the accent for dark mode" edit
gets you. The accent serves three jobs — a filled control under white text, an
indicator on the ground, and the priority dot — and it cannot be optimised for
one without breaking the others. `#0F766E` is 5.47:1 under white and 3.64:1 on
the dark ground.

**Semantic states — the teal-tuned family** (each has a subtle background and
a text color)

| Token | Light | Dark | Used for |
|---|---|---|---|
| `danger-default` | #B91C1C | #DC2626 | Destructive action |
| `danger-subtle` | #FECACA | #450A0A | Error surface |
| `danger-text` | #7F1D1D | #FCA5A5 | Error text |
| `success-default` | #4D7C0F | #4D7C0F | Completion, compliance, confirmation |
| `success-subtle` | #D9F99D | #1A2E05 | Success surface |
| `success-text` | #365314 | #BEF264 | Success text |
| `warning-default` | #B45309 | #FBBF24 | Warning action |
| `warning-subtle` | #FDE68A | #451A03 | Warning surface |
| `warning-text` | #78350F | #FCD34D | Warning text |

**Red, green, and amber keep their meanings. Their character is tuned, and one
hue actually moved — deliberately.**

`success` is **olive-green (hue 86°) rather than green (hue 142°)**, because the
task row puts the accent and success in the same place: the priority dot is
`accent-default` and a completed row carries a filled checkbox. Teal is 175°, so
green sat 33° away and the two small marks read as one family. Olive is 89° away.

**The cost, stated plainly:** "done" is olive now, not green. That is a real loss
of convention, taken because keeping both teal and a conventional green means one
of them is wrong in every row.

The subtle backgrounds are one step deeper than the usual values (`#FDE68A`
rather than `#FFFBEB` for warning, `#FECACA` rather than `#FEF2F2` for danger).
On paper that is not decoration — it is required. The ground is already light and
already tinted, so a tint has to go a step deeper to clear the 1.15:1 floor and
be visible at all. Against the old value the warning chip measured 1.02:1, which
is to say it had no background.

**Stale data annotation** (Invariant 4)

| Token | Light | Dark | Used for |
|---|---|---|---|
| `stale-bg` | #F4F1EA | #27272A | Background for "as of" labels |
| `stale-text` | #6E675E | #A1A1AA | Text for "as of" labels |

Stale labels are never red. Stale data is not an error; it is
labeled data.

**Contrast.** Meaningful text meets WCAG AA (4.5:1 — the app has no large text).
**Placeholder and disabled text meet 3:1, and are the only text allowed below
4.5:1.** The previous wording claimed every pairing met AA, which was untrue of
`text-muted` in either light palette: the claim was wrong, not the value. Both
floors, plus the 1.15:1 floor for subtle grounds, are enforced by axe in CI.

### Interaction states

Four states apply to every interactive element. They introduce no new
colour values — each names an existing token, so a dark-mode override
carries the state with it.

| State | Treatment | Token |
|---|---|---|
| Hover | Background shifts one step | `surface-2`; `accent-hover` on an accent control |
| Pressed | Background shifts two steps | `surface-3`; `accent-active` on an accent control |
| Focus | Two-part ring, no offset | `border-strong` (2px, outer) and `border-focus` (1px, inner) |
| Disabled | Background unchanged, text muted | `text-disabled`; `text-muted` for a placeholder |

**Focus is visible on the element, never only on its label.** It appears
on `:focus-visible`, so a mouse click draws no ring, and it appears in
`duration-instant` (`03-experience/motion-vocabulary.md`). Keyboard
navigation is required on every interactive surface
(`10-engineering/quality-standards.md`), and the ring is how a keyboard
user knows where they are.

Three borrowed treatments, so no component invents a value:

- **Waiting placeholder.** A `surface-2` block, `radius-md`, **static**,
  shown only past the 400ms delay in `03-experience/states.md`. It does
  not shimmer, pulse, or animate in (ADR 0019).
- **Tooltip.** Popover styling: `surface-1`, `border-default`,
  `elevation-2`, `text-primary`, `type-footnote`.
- **Backdrop.** `bg-overlay`, for sheets, the palette, and modals.

### Radius

| Token | px | Used for |
|---|---|---|
| `radius-none` | 0 | Tables, full-bleed |
| `radius-xs` | 2 | Tags, chips (dense) |
| `radius-sm` | 4 | Inputs (dense), badges |
| `radius-md` | 8 | Default: buttons, inputs, cards |
| `radius-lg` | 12 | Cards (large), sheets |
| `radius-xl` | 16 | Modals, large surfaces |
| `radius-full` | 9999 | Pills, avatars, FABs |

Default radius for interactive elements is `radius-md` (8px).

### Elevation

Only five levels (`elevation-0` through `elevation-4`). No custom
shadows.

| Token | Shadow | Used for |
|---|---|---|
| `elevation-0` | none | Flat surfaces, borders do the work |
| `elevation-1` | 0 1px 2px rgba(0,0,0,0.05) | Raised cards |
| `elevation-2` | 0 4px 12px rgba(0,0,0,0.08) | Popovers, dropdowns, menus |
| `elevation-3` | 0 8px 24px rgba(0,0,0,0.12) | Modals, sheets |
| `elevation-4` | 0 12px 32px rgba(0,0,0,0.16) | Toasts, undo bar |

The app defaults to `elevation-0` with borders. Elevation is used
only to signal layering, not decoration.

### Icon sizes

| Token | px | Used for |
|---|---|---|
| `icon-xs` | 12 | Inline with caption text |
| `icon-sm` | 16 | Inline with body text, chips |
| `icon-md` | 20 | List rows, buttons, tab bar |
| `icon-lg` | 24 | Mode switcher, prominent actions |
| `icon-xl` | 32 | Empty state, feature callouts |

Default icon size in a list row is `icon-md` (20px). In a button,
`icon-sm` (16px) for text buttons and `icon-md` (20px) for icon-only
buttons.

### Touch targets

| Token | px | Used for |
|---|---|---|
| `touch-min` | 44 | Minimum interactive area (all platforms) |
| `touch-comfortable` | 48 | Default for primary actions |

Every interactive element meets `touch-min` (44×44) even if its
visual size is smaller. Padding or a transparent hit area fills the
difference.

### Control heights

| Token | px | Used for |
|---|---|---|
| `control-xs` | 24 | Dense chips, tight tag rows |
| `control-sm` | 32 | Compact buttons, inline inputs |
| `control-md` | 40 | Default: buttons, inputs |
| `control-lg` | 48 | Primary CTA, capture field |

### Row heights

| Token | px | Used for |
|---|---|---|
| `row-compact` | 44 | Dense lists (settings, filters) |
| `row-default` | 56 | Default list row (task, event) |
| `row-rich` | 72 | List row with subtitle (task with due, person with context) |
| `row-hero` | 96 | Featured card (protocol card) |

Every list uses one of these four. No custom row heights.

### Duration and easing

Defined fully in `03-experience/motion-vocabulary.md`. Tokens:

| Token | Value |
|---|---|
| `duration-instant` | 100ms |
| `duration-fast` | 150ms |
| `duration-default` | 200ms |
| `duration-slow` | 250ms |
| `duration-deliberate` | 400ms |
| `duration-longpress` | 400ms |
| `ease-standard` | cubic-bezier(0.2, 0, 0, 1) |
| `ease-exit` | cubic-bezier(0.4, 0, 1, 1) |

### Token file

The source of truth is `src/ui/tokens.ts`, which exports the above
as a typed object, and `tailwind.config.ts`, which maps them into
Tailwind's theme. The Tailwind config disables arbitrary values.

    // tailwind.config.ts (shape)
    export default {
      theme: {
        extend: {
          spacing: { /* space-1 ... space-10 */ },
          fontSize: { /* type-* */ },
          colors: { /* bg-*, surface-*, border-*, text-*, accent-*,
                       danger-*, success-*, warning-*, stale-* */ },
          borderRadius: { /* radius-* */ },
          boxShadow: { /* elevation-* */ },
          transitionDuration: { /* duration-* */ },
          transitionTimingFunction: { /* ease-* */ },
        },
      },
      corePlugins: {
        // disable anything that allows raw values
      },
    }

**Arbitrary values are prohibited.** A linter
(`eslint-plugin-tailwindcss` with `no-arbitrary-value`) fails the
build if it sees `p-[17px]`, `text-[15.5px]`, `bg-[#f3f3f3]`, etc.

## Examples

**Correct.**

    <button class="h-control-md px-space-5 gap-space-3 rounded-md
                   bg-accent-default text-text-inverse type-subhead">
      Save
    </button>

Every value is a token. No raw pixels. No hex codes.

**Wrong.**

    <button class="h-[41px] px-[18px] gap-[6px] rounded-[7px]
                   bg-[#2f6feb] text-[15px]">
      Save
    </button>

Every value is arbitrary. Even if the visual result looks close,
this button will not match the next one the AI generates, because
there is no shared rule.

**The stale annotation.**

    <span class="type-caption bg-stale-bg text-stale-text
                 px-space-2 py-space-1 rounded-sm">
      as of 2026-03-14
    </span>

Uses tokens. Never uses red. Labels without alarm.

## What this doc must NOT do

- This doc does not define components. It defines the values
  components reference. Components live in the codebase and their
  behavior in `05-modules/` and `06-flows/`.
- This doc does not define layouts. It defines the atoms layouts
  are built from. Layout patterns are per-screen.
- This doc does not define motion behavior. It lists duration and
  easing tokens. Behavior lives in
  `03-experience/motion-vocabulary.md`.
- This doc does not define brand voice or copy. It defines visual
  values. Copy lives in `05-modules/` and `06-flows/`.
- This doc does not include illustrations, logos, or custom icons.
  Those are assets, not tokens.
- This doc does not define platform-specific overrides (iOS vs.
  Android safe areas, for example). Those are implementation
  details, not tokens.