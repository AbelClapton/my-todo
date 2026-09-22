# Design lab

A throwaway evaluation artifact. **Not the app, not the implementation
pattern, not the component library.** Delete the folder when the palette
call is made.

## What this is

- `tokens.css` — the design tokens from `docs/03-experience/design-tokens.md`,
  name for name, as CSS custom properties. The doc says tokens are "defined
  once and consumed everywhere", and that the source of truth will be
  `src/ui/tokens.ts` + `tailwind.config.ts`. Neither exists yet, so this is the
  single definition until it does. **The doc wins any disagreement.**
- `palette-lab.html` — the lab. Every primitive at real size, three real
  screens at real row heights, and a contrast table computed from the live
  values. Open it directly in a browser; there is no build step and no network.

Three independent axes, all over the same token set (never two token sets —
that is an invariant):

- **Light palette** — **cool** (Zinc) or **warm** (Stone, the paper direction).
- **Dark palette** — cool or warm, chosen separately. Light and dark are not a
  matched pair: the palette is one identity that specifies both of its values,
  so warm-light with cool-dark is a legitimate pairing and not a contradiction.
- **Accent** — blue, indigo, teal, or violet. This is a third axis and not a
  property of the neutral ramp. It is identical across both palettes so the
  neutral comparison stays honest.

Semantic colours are identical everywhere, so the contrast table measures one
axis at a time.

## How to read it

Toggle **Light**, **Dark**, **Accent**, **Mode**, and **Annotated** in the top
bar, then look at these five, in this order:

1. **Tasks, Today** — twenty rows at real height. A ground can look lovely on a
   card and tiring after twenty rows. This is the screen that decides it.
2. **Protocol report** — the only long-form surface. Warm paper gets its best
   case here, where the ground is visible for more than a glance.
3. **Contrast** — the table at the bottom recomputes on every toggle. Rows 1–10
   are text pairings carrying WCAG thresholds; rows 11–14 are whether the
   surface steps are actually distinguishable from the ground, which is what a
   warm ground most often breaks.
4. **Warm dark** — the combination nobody checks. Checked here, and it is the
   weakest of the four: see *Where the evidence points* below.
5. **Accent** — the accent beside danger, success, and warning, which is a hue
   question that no ratio answers.

## Findings

Measured in the browser, 2026-09-22. These are gaps in the doc set, not
problems with the lab.

**1. `design-tokens.md` promises dark values and lists none.** It says
"dark mode overrides the same tokens with different values", and then every
table has a Light column only. Dark mode is currently **unbuildable from the
spec** — the lab had to derive 25 tokens × 2 palettes to render one dark
screen. The derivations in `tokens.css` are provisional until the doc carries
real values. This matters more than it sounds: `testing.md` requires visual
checks "every screen, 4 widths, dark mode" on every PR, against values nobody
has written down.

**2. The dark accent failed its own contrast rule the first time it was
derived.** Taking blue-500 (`#3B82F6`) for dark mode — the conventional step —
gives **white on accent = 3.68:1**, failing AA for a button label. The cause is
that `accent-default` serves two jobs: a filled background under white text,
and an indicator on the ground. Lightening it for the second breaks the first.
The resolution used here: **the accent does not lighten in dark mode.**
`#2563EB` gives 5.17:1 under white and 3.64:1 on the dark ground (the UI
threshold is 3.0). This needs writing into `design-tokens.md`, because it is a
decision and not a value.

**3. Warm paper fixes the stale annotation; cool does not pass.** Measured
`stale-text on stale-bg`: **cool light 4.40:1** — under AA for 13px text — and
**warm light 4.95:1**, which passes. The doc claims every text pairing meets AA
and that axe enforces it in CI, so as it stands either cool needs a darker
`stale-text` or the warm switch closes it incidentally.

**4. `warning-subtle` is not a visible surface on the ground, in any palette.**
`bg-base` vs `warning-subtle`: 1.04 (cool light), 1.02 (warm light), 1.33 (cool
dark), 1.14 (warm dark). The amber chip's ground is indistinguishable from the
page in light mode; it reads as a chip only because of its text colour and its
position. **This is pre-existing and not caused by warm** — but it is the one
place the paper direction collides, because amber is the warmest hue we have
and paper is the warmest ground. Confirmed visually, not just numerically.

**5. `text-muted` also fails the doc's blanket claim** — 2.56:1 cool light,
2.74:1 warm light. Placeholders and disabled text are conventionally exempt, so
the *claim* is what is wrong rather than the value, but `10-engineering/testing.md`
says axe runs in CI and it will flag this.

**6. `type-mono` is 14px, and the metadata line wants 13px.** The mono
coordinate-label borrow needs either a usage change to `type-mono` or a new
role. The lab uses `.r-meta-mono` as a proposal, marked in the CSS.

**7. The compliance strip's five states have no specified colours.**
`05-modules/habits.md` names them — full, minimum, skip, missed, repair — and no
doc gives them values. The lab's are an approximation and are labelled as one.

**8. The dock's active-mode indicator has no specified form.**
`03-experience/app-shell.md` says "one indicator marks the active mode in
`accent-default`" and then describes the rail's version — a bar on the leading
edge. A leading-edge bar does not transfer to a horizontal dock; drawn
literally it detaches and floats at the far left of the bar. The lab uses a
centred underline under the active icon, which is the obvious reading and is
still a guess.

**9. Each accent has a different limiting case, and none is free.** Measured
across both modes and both palettes, every accent passes both of its roles —
white on the filled control, and the control as an indicator on the ground.
But the margin is not the same, and the binding constraint moves:

| Accent | White on accent (needs 4.5) | Accent on dark ground (needs 3.0) |
|---|---|---|
| Blue | 5.17 | 3.85 |
| Indigo | 6.29 | **3.16** — tightest |
| Teal | 5.47 | 3.64 |
| Violet | 5.70 | 3.49 |

Indigo is the most comfortable under white text and the least visible as an
indicator on a dark ground. Blue is the most balanced. This is a real
trade-off, not a preference.

**10. A different accent is not a different hex, it is a different ramp.**
White on teal-600 (`#0D9488`) is **3.35:1** and fails AA, so teal's ramp had to
shift one step darker (`#0F766E`) to be usable at all. Choosing an accent is
choosing a ramp, and the ramp's first step is not the same for every hue.

**Red, green, and amber are unavailable.** Danger, success, and warning already
own them, which is why every accent option is cool. Warm hues are not a taste
question here, they are a collision.

**Checked and holding:** `row-rich` (72px) does carry the title, the metadata
line, and a chip without crowding, and twenty rows at `row-default` / `row-rich`
read cleanly at desktop width.

## Where the evidence points

**Warm light beats cool light, narrowly and on evidence.** Secondary text is
identical across the two (7.71:1 vs 7.73:1), so the ramp substitution cost
nothing, and warm *fixes* a real failure: `stale-text` on `stale-bg` is
**4.40:1** in cool light — under AA — and **4.95:1** in warm.

**Cool dark beats warm dark, measurably.** Warm dark has consistently *less*
separation between its surface steps, which is what surface hierarchy is built
from:

| Step against `bg-base` | Cool dark | Warm dark |
|---|---|---|
| `surface-2` | 1.34 | 1.18 |
| `surface-3` | 1.91 | 1.45 |
| `border-default` | 1.91 | 1.45 |
| `warning-subtle` | 1.33 | 1.14 |

A warm ground is a *decision*, and in light mode it pays for itself. A warm
ground at the dark end has no such compensation — it reads as brown-black
rather than ink, and every step above it is harder to tell apart. So the
pairing currently loaded by default is **warm light + cool dark**, which is also
the pairing the eye preferred before the numbers were run.

## What this deliberately does not do

- **No icon set.** The rail and header use text glyphs. `design-tokens.md` says
  icons are assets, not tokens, so there is nothing to load.
- **No motion** beyond hover, pressed, focus, and the toast countdown ring.
- **No framework, no build, no state.** Hover, press, focus, and the toggles are
  the only interactivity.
- **Not responsive-complete.** Frames are 390, 768, and 1200 — enough to judge
  density, not a breakpoint audit.
- **Not the app.** `09-roadmap/build-order.md` still holds: projections before
  modes. This is a lab, and the task row designed here still has to be honoured
  in code.
