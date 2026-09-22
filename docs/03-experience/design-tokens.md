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
  values, not two token sets.

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

Semantic names only. Values below are the light-mode defaults;
dark mode overrides the same tokens with different values.

**Backgrounds**

| Token | Light | Used for |
|---|---|---|
| `bg-base` | #FFFFFF | App background |
| `bg-raised` | #FAFAFA | Raised surface (cards) |
| `bg-sunken` | #F4F4F5 | Sunken surface (input wells) |
| `bg-overlay` | rgba(0,0,0,0.4) | Modal backdrop |

**Surfaces**

| Token | Light | Used for |
|---|---|---|
| `surface-1` | #FFFFFF | Default surface |
| `surface-2` | #F4F4F5 | Secondary surface (nested) |
| `surface-3` | #E4E4E7 | Tertiary surface (tracks, wells) |

**Borders**

| Token | Light | Used for |
|---|---|---|
| `border-subtle` | #F4F4F5 | Dividers between related items |
| `border-default` | #E4E4E7 | Card borders, input borders |
| `border-strong` | #D4D4D8 | Emphasis borders, focus rings (outer) |
| `border-focus` | #18181B | Focus ring (inner) |

**Text**

| Token | Light | Used for |
|---|---|---|
| `text-primary` | #18181B | Default text |
| `text-secondary` | #52525B | Secondary text, list metadata |
| `text-muted` | #A1A1AA | Placeholders, disabled labels |
| `text-inverse` | #FAFAFA | Text on dark surfaces |
| `text-disabled` | #D4D4D8 | Disabled text |

**Accent** (the app has one accent; everything else is neutral)

| Token | Light | Used for |
|---|---|---|
| `accent-default` | #2563EB | Primary action, active mode |
| `accent-hover` | #1D4ED8 | Hover state |
| `accent-active` | #1E40AF | Pressed state |
| `accent-subtle` | #EFF6FF | Accent-tinted background |
| `accent-text` | #1E3A8A | Accent-colored text on subtle |

**Semantic states** (each has a subtle background and a text color)

| Token | Light | Used for |
|---|---|---|
| `danger-default` | #DC2626 | Destructive action |
| `danger-subtle` | #FEF2F2 | Error surface |
| `danger-text` | #991B1B | Error text |
| `success-default` | #16A34A | Completion confirmation |
| `success-subtle` | #F0FDF4 | Success surface |
| `success-text` | #166534 | Success text |
| `warning-default` | #D97706 | Warning action |
| `warning-subtle` | #FFFBEB | Warning surface |
| `warning-text` | #92400E | Warning text |

**Stale data annotation** (Invariant 4)

| Token | Light | Used for |
|---|---|---|
| `stale-bg` | #F4F4F5 | Background for "as of" labels |
| `stale-text` | #71717A | Text for "as of" labels |

Stale labels are never red. Stale data is not an error; it is
labeled data.

**Contrast.** Every text/background pairing meets WCAG AA (4.5:1
for body, 3:1 for large text). This is enforced by axe in CI.

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
| `row-hero` | 96 | Featured row (today's top task) |

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