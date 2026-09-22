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

Six independent axes, all over the same token set (never two token sets —
that is an invariant):

- **Light palette** — **cool** (Zinc) or **warm** (Stone, the paper direction).
- **Dark palette** — cool or warm, chosen separately. Light and dark are not a
  matched pair: the palette is one identity that specifies both of its values,
  so warm-light with cool-dark is a legitimate pairing and not a contradiction.
- **Accent** — blue, indigo, teal, or violet. Not a property of the neutral
  ramp, and identical across both palettes so the neutral comparison stays
  honest.
- **Semantics** — standard, muted, or vivid. Red, green, and amber keep their
  meanings in every case; only their *character* moves. Light mode only — see
  finding 13.
- **Type** — system, editorial display, or editorial display plus prose. See
  finding 16 for why this needs an ADR before it can ship.
- **Metadata** — the task row's second line as `type-callout` (what the spec
  says) or mono (the proposal both briefs point at). Switches every row in the
  lab at once.

Only the neutral comparison is one-axis-at-a-time; the accent and semantics
deliberately interact, which is the point of having them as separate axes.

## How to read it

Toggle **Light**, **Dark**, **Accent**, **Semantics**, **Type**, **Metadata**,
**Mode**, and **Annotated** in the top bar, then look at these six, in this
order:

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
6. **Task row** — variant 04, *the pair to watch*, and the accented row of
   figures that goes with it.

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

**11. The accent's nearest semantic neighbour is the pair to watch — and which
one it is depends on the accent.** Measured in hue degrees, the accent against
danger, success, and warning:

| Accent | Hue | Danger Δ | Success Δ | Warning Δ |
|---|---|---|---|---|
| Blue | 221° | 139 | 79 | 171 |
| Indigo | 243° | 117 | 101 | 149 |
| Teal | 175° | 175 | **33** | 143 |
| Violet | 262° | **98** | 120 | 130 |

**Indigo is the only accent with no neighbour closer than 100°**, and it is also
the most comfortable under white text (finding 9). Two independent measures
agree on it.

**Teal's nearest neighbour is `success`, 33° away** — not warning, which is what
everyone assumes. Teal and "done" are the same family.

**12. The "pastel" problem is chroma, not hue.** Teal sat badly with the other
colours even though its hue is 33° from success — because teal is deep and
low-chroma while the standard success green is vivid and lighter. Close in hue
and far apart in character reads as neither harmony nor contrast. This is why
`muted` semantics fix it: measured on warm light, the text/subtle pairs go from
7.60 / 6.81 / 6.84 to **9.16 / 8.70 / 8.75**, and the four colours finally read
as one family. **Muting fixes the character mismatch; it does not fix the family
resemblance** — teal and success still look related, which is a judgement call
the lab lets you make by eye.

**13. Semantics are a light-mode problem.** The dark ground is near-neutral and
low-chroma, so a vivid hue reads fine on it and the accent's character stops
competing. Harmonising chroma there buys nothing, which is why the axis is
mode-scoped rather than palette-scoped and dark always uses the standard set.

**14. The priority dot is the accent, and that settles the accent question.**
`05-modules/tasks.md`: "`priority: now` shows a small dot in `accent-default`",
and completion "reveals a green checkmark". So **`accent-default` and
`success-default` appear as two small marks in the same row, at the same size,
doing the same job** — and that makes the accent's hue distance from `success`
load-bearing. Teal is 33° from success and the two merge: verified visually, the
teal dot and the green checkmark read as one family. Blue (79°) and indigo
(101°) keep them distinct.

This also **refutes the defence offered for teal earlier** — that the accent and
the semantics never appear as the same kind of object. On this row they are the
same kind of object.

*A correction to this lab:* the first draft drew the dot in `warning-default`.
That was a spec violation, and it hid this finding for a whole pass.

**15. The metadata line's family is a real decision, not a default.** The spec
says `type-callout` (15px) at `text-secondary`; mono is a proposal from both
briefs. The toggle switches every row so the whole app can be judged both ways.
Switching does not move row heights, because it re-dresses the existing second
line rather than adding one — which is what makes it cheap enough to try.

**16. A display/prose font split needs a token that does not exist.**
`design-tokens.md` defines exactly two families (sans, mono) and applies sans to
all eleven type roles, so `--font-display` and `--font-prose` are **new tokens**,
and the token set is closed — adding one requires an ADR. The cost side matters
too: the system stack is zero bytes, no network, and no FOUT, so a chosen face
would be the **first genuine brand asset the app carries**, paid for out of the
`< 3s` cold-start budget and the service-worker cache. The lab's serif stacks use
locally available fonts, so they show the *shape* of the choice and not the
finished thing.

**17. The row heights hold.** `row-rich` (72) carries a title plus the composed
metadata line from the spec ("Work · due Tue · 1 note · @Sarah") on one line, at
390px. `row-default` (56) carries a title alone. The height rule is doing real
work rather than being a size convention.

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

## Resolutions, 2026-09-22

Every finding above was acted on, and the docs changed rather than the lab.

| Finding | Resolution |
|---|---|
| 1 · no dark values | **Written.** `design-tokens.md` now specifies both modes, with light as paper and dark as ink. |
| 2 · dark accent failed AA | Written as a rule, with the measurements: the accent does not lighten in dark mode. |
| 3 · `stale-text` below AA in cool light | Fixed by the palette choice — light is warm now, where it measures 4.95:1. |
| 4 · `warning-subtle` invisible | Every `*-subtle` ground deepened to clear a **1.15:1 floor**, now a stated rule. Warning went 1.02 → **1.23**. On paper a tint must be one step deeper than usual. |
| 5 · false contrast claim | Narrowed to two floors: meaningful text 4.5:1, placeholder and disabled 3:1. Light `text-muted` went 2.74 → **3.27**. |
| 6 · `type-mono` 14 vs metadata 13 | **Moot.** Metadata is `type-footnote` — 13px, sans. Mono is not used in the row at all. |
| 7 · compliance colours unspecified | Specified by token — and a contradiction fixed: missed days were **"light red"**, which `states.md` forbids ("no state is red except an error") and the product explicitly rejects ("skipping is not failing"). Missed is a neutral now. |
| 8 · dock indicator undefined | Specified: the rail uses a 3px leading bar, the dock a 2px centred underline. |
| 14 · accent | **Teal, kept** — and the collision fixed two ways. The checkbox fill is now the accent, so the dot and the check differ by *form* rather than by a near-identical hue; and `success` moved from green (142°) to olive (86°), which is 89° from teal instead of 33°. **Cost: "done" is olive, not green.** |
| 15 · metadata family | **`type-footnote`** — sans at 13px. Not `type-callout` (it competed with the title it belongs to), not mono. |
| 17 · row heights | Hold. |

Three more problems surfaced while fixing those:

- **18 · Semantic fills had no "on" token.** Danger buttons used `text-inverse` for their label, which is `#FDFBF7` in light but `#18181B` in dark — so a red button's text turned near-black in dark mode. Added `--on-fill`, which replaces `accent-on` and covers accent, danger, and success fills.
- **19 · The compliance strip's missed days were red**, contradicting the two rules quoted above. Fixed to a neutral.
- **20 · The lab was missing `box-sizing: border-box`**, which is why the bordered compliance cells rendered 2px larger than their neighbours. Boxes are uniform now.

Lab changes in the same pass: live `:hover` and `:active` on rows (they had only been shown as static swatches), icon sizes applied from the tokens (`icon-lg` in the rail and dock, `icon-md` in icon-only buttons), and the checkbox tick redrawn as a white SVG, because the border-trick version had ragged corners and the polygon version rendered as a block.

### And what is still open

- **16 · The type family.** Needs a decision and then an ADR, because `--font-display` and `--font-prose` are **new tokens** and the token set is closed.
- **Motion is still not demonstrated.** The lab shows hover, pressed, and focus; it does not show the transition catalog — the completion animation, the sheet, the toast, or the screen push. A pattern sheet has nothing to animate without a prototype, so those need either a small replay section or the real screens.

## The briefs in play

Two reference briefs have been run against the doc set. Neither is an app brief —
both are landing-page templates — and each contributed something real.

**1 · Print-Tech Paper (Stillpage).** Warm editorial × print DNA: a warm paper
ground, mono coordinate labels, a single accent word, halftone imagery, a
floating pill nav.

- *Adopted as an axis:* the paper ground, which is the warm palette.
- *Adopted as a proposal:* mono coordinate labels for metadata — two independent
  briefs point at mono for small labels (finding 6, and brief 2's nav).
- *Adopted as an axis:* the single-alert accent, which is the accent axis.
- *Rejected:* halftone imagery (an illustration system, which `states.md` rules
  out), and the floating pill nav (a floating control, which `app-shell.md`
  rules out). Both would need ADRs superceding those docs.

**2 · Product-Led Minimalism (Tasktrox).** Near-black on white, a large tight
display headline, restrained chrome, a mono-ish small-label nav, a contrasting
CTA pair, and — the interesting part — **real interface fragments as the hero
imagery**, joined by dashed connectors with tag pills.

- *Contributes:* **"framed interface demonstration"** means the imagery is the
  product's own screens. That satisfies `states.md`'s no-illustration rule and
  needs no generated assets at all, which makes it a much cheaper landing page
  than the halftone one.
- *Converges:* mono for navigation and small labels, matching brief 1.
- *Confirms:* restrained chrome, a clear sans hierarchy, and a primary plus
  secondary CTA pair — the lab already holds all three.
- *Conflicts:* the hero (same shell problem as brief 1), a **two-accent** system
  (violet primary with amber as a second highlight — amber is our `warning`), and
  arbitrary per-tag colours, which break "the app has one accent, everything else
  is neutral".

### The sequencing point

Brief 2 needs a product to screenshot. Brief 1 does not. For a pre-launch app
with no store listing and no shipped screens, **Product-Led Minimalism is
blocked on having something to demonstrate**, and the paper direction is not.
That is an argument about timing, not about taste.

## The task row, in the lab

Four variants, in the order they need deciding. The first three are settled by
the spec; only the metadata family is genuinely open.

| Variant | What it settles |
|---|---|
| 01 · The row in place | Title line, composed metadata line, priority dot, deferred chip, overdue chip. At `row-rich`. |
| 02 · Priority states | `now` shows the dot; `next` and `later` show nothing, because absence is the signal. So the dot must be legible at 8px, and it is the accent's third job after the filled control and the mode indicator. |
| 03 · No metadata, and completed | The height rule, and the success green on screen. |
| 04 · The pair to watch | The accent dot and the success checkmark in one row. Switch the accent and read them as a pair. |

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
