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
| 14 · accent | **Teal, kept** — and the collision fixed at its root: the checkbox fill is now the accent, so the dot and the check differ by *form* rather than by a near-identical hue. An earlier revision also moved `success` off green; that was **reverted** when vivid was chosen, so green keeps its convention and the row no longer contains green at all. |
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

### Final choices, 2026-09-22

| Axis | Chosen |
|---|---|
| Light palette | **Warm** (paper) |
| Dark palette | **Cool** (ink) |
| Accent | **Teal** |
| Semantics | **Vivid** |
| Type | **System** — so finding 16 stays open only if the type face is revisited |
| Metadata | **Footnote 13** |

The lab opens on this combination, and it is what is written into
`03-experience/design-tokens.md`.

**One consequence worth recording, because it inverts an earlier finding.** When
vivid was chosen, the vivid light values failed as marks on paper: `#22C55E`
measured **2.24:1** and `#F59E0B` **2.11:1**, both under the 3:1 floor. A light
ground caps how bright a hue can be, so **vivid light can only mean the 600
steps** — which is what the standard family used. The only real light-mode
difference is that the subtle grounds are now deep enough to be visible.

That reframes finding 4: "standard" never looked wrong because of its hues, it
looked wrong because **its subtle grounds had no background at all** (1.02:1).
Vivid and standard are the same thing in light mode once the subtles are fixed.
In dark mode they genuinely differ, because a near-black ground lets a bright hue
be bright.

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

## Tasks mode, in the lab

The first *mode* designed rather than a component or a palette. Everything in it
comes from two documents — the four scopes and the row anatomy from
`05-modules/tasks.md`, the swipe treatments from
`03-experience/gesture-vocabulary.md` — so the section is a reading of the spec
rather than a proposal.

| Block | What it settles |
|---|---|
| A · The four scopes | Today (deferred-past first, with a chip), Next (sorted by priority, one dot), Someday (flat, `row-default`, **no metadata line**), All (due ascending, the sort key visible). |
| B · Empty states, six of them | Two scopes can be empty for opposite reasons — nothing has a day, nothing is parked — so they must not share copy. Someday's carries no action. |
| C · The completed log | Newest first, reached through the filter, and the metadata line carries *when* rather than *when due*. |
| D · The filter sheet | Four groups, exactly as listed: Area, Person, due within, and the completed switch. A sheet, not a popover. |
| E · The detail view | The metadata block is a definition list rather than chips — these are facts about the task, not state belonging to it. |
| F · The four swipe reveals | Held past the 40% threshold. Complete is the only tinted one; defer, remove, and attach share `surface-3`. |

**Finding 21 · `tasks.md` specifies no empty-state copy for the four scopes.**
`states.md` requires an empty state to carry one action and forbids "No results
found", but the strings themselves exist nowhere. It mattered more than it
sounded: **Today-empty and Someday-empty mean opposite things**, and the second
one should not read as a prompt to fill it.

**Closed.** All six strings are in `05-modules/tasks.md`, with the rule that
organises them: **the action repairs the cause of the emptiness** — capture when
there is no data, clear the filter when nothing matches, widen the window when
nothing falls inside it. The Someday case turned out to be the interesting one.
Forcing an action there is exactly the prompt the scope must not give, so
**Someday's empty state carries no action**, and that is now the single recorded
exception to `states.md`'s invariant. The invariant is refined rather than broken:
an empty state carries one action *where there is something to repair*, and a
parking lot with nothing parked is not a repair.

**A real bug fell out of writing the copy.** `states.md`'s own Today example read
"Nothing here yet. / Capture something and it lands here." Capture lands a task in
Inbox; a task reaches Today by *getting a day*. The line promised something the
projection does not do, and it was in the doc that defines empty states. The
line is now "Tasks appear here once they have a day."

The mode also confirmed two things the earlier passes only predicted: the height
rule is load-bearing (Someday's suppression of the metadata line is a visible
difference, not a technicality), and the accent reads correctly as a priority dot
at 8px — its smallest use in the app.

## Icons, in the lab

**Lucide is adopted**, and the lab now inlines the real icon data (0.469.0, ISC
licence) rather than stand-ins, so it stays offline. Lucide's drawing rules are a
24px grid, a uniform 2px stroke, round caps and joins, and `currentColor` — which
is why a glyph inherits its colour and can never introduce one. The app would
install `lucide-react`; the shapes and the rules are the same either way.

Blocks: the size reference, the task row **six ways**, and the empty state with and
without a glyph, plus a block for icons on labelled values.

**Finding 22 · Two documented icon usages don't exist.** `design-tokens.md` lists
`icon-md 20` as the default in a **list row** and `icon-xl 32` for an **empty
state**. Neither surface has an icon. So this was never "should we add decoration"
— an icon was already specified and simply never drawn.

**Finding 23 · "Feature callouts" is an orphan.** It is named as an `icon-xl` use
and no surface by that name exists anywhere in the doc set.

**Both closed.** `icon-md`'s row lost "list rows" and gained the two uses that are
real — icon-only buttons and the tab bar. The row's glyph is inline at `icon-xs`,
which the row now records. `icon-xl` has no user at all: the empty state does not
take a glyph (below), and "feature callouts" named nothing, so it is recorded as
**Unused** rather than given a surface invented to justify it. The size stays in
the table because a four-step scale that skips a step is harder to reason about
than one honest unused row — and removing a token is a change to
`design-tokens.md`, which is a different decision than correcting a usage.

**Finding 24 · No inline icon size matches `type-footnote`.** The table gives
`icon-xs 12` for "inline with caption text" (12px) and `icon-sm 16` for "inline with
body text" (16px). Our metadata line is **13px** — between the two. `icon-xs` is
the closer fit and is what the lab uses, but the table has a gap where the app
lives.

**Closed, and the framing was the bug.** The table was being read as though the icon
scale should mirror the type scale, so a 13px line with no 13px icon looked like a
missing value. It is not missing: a glyph is sized by **optical fit against the line
it sits in**, and one icon size serves a range of adjacent type roles. `icon-xs`'s row
now reads "caption and footnote text" — a text change, so no new token and no ADR —
and `design-tokens.md` carries the rule that the two scales are not 1:1. Paired
exactly, the icon scale would need nine more tokens that nobody could tell apart.

### What the six row variants settled

| | Verdict |
|---|---|
| **A · no icon** | Still the baseline. Nothing is missing from it. |
| **B · leading, neutral** | **Rejected.** Pushes the checkbox inward and breaks that column's alignment down the list — the one thing a task list relies on for scanning — and a grey glyph beside grey text saying "Work" is the same information twice. |
| **C · leading, coloured** | **Rejected.** Needs a category colour system, and the demo hues collide immediately: amber *is* `warning`, green *is* `success`, violet sits near the accent. The Work row then carries a **blue category glyph and a teal priority dot** — two coloured marks in one row doing different jobs, the same collision that ruled teal out against green. |
| **D · inline with the category** | **Holds.** The checkbox column stays aligned, and the glyph sits with the word it describes. It reads as part of the metadata rather than as a mark on the row. |
| **E · inline with the time** | **Holds, and is the only variant that removes ink.** "est 40m" becomes a timer glyph and "40m"; "repeats weekly" becomes a repeat glyph and "weekly". |
| **F · inline with both** | **Holds.** Two glyphs in a 13px line, four elements before a word of value — the density check passes, though it is at the limit. |

So the rule is: **an icon belongs where a word belongs, not where the row begins.**
A leading glyph competes with the checkbox column; an inline glyph replaces or
accompanies a word in the line that already carries it.

### Labels: goal and metric

The case where an icon is not decoration at all. A protocol card repeats the same
two slots on every card of its kind, the labels are fixed words the user learns
once, and `target` and `activity` are unambiguous — so the glyph **marks a slot**
rather than duplicating a value. One is a legend; the other is a second copy of a
word that is already there.

Both labels inherit `text-muted`; neither introduces a hue, which is the whole
reason it works.

### The empty-state glyph

Rejected, for the same reason the row's leading glyph was rejected. The headline
already orients — "Nothing on today." says what the surface holds — so a neutral
glyph above it is decoration, and a glyph carrying a meaning of its own
duplicates the action below it. The clipboard variant proved the second half: it
reads as a second "Capture something", which is the one thing Someday's empty
state must not do.

`states.md` forbade an *illustration* — a picture — and said nothing about a
glyph, which is how `icon-xl` kept a use it never had. The rule is now explicit
in both directions: no illustration, no glyph.

### Settled

- **The row treatment.** D. The category glyph stays inline in the metadata line;
the time glyph moved into the chip.
- **The inline size.** Finding 24, closed above.
- **The empty-state glyph.** Rejected, above.
- **The inventory.** The thirteen data glyphs and two rules are in
  `03-experience/components.md` as **assets**, with `design-tokens.md` untouched
  except for the one usage line — no new token, so no ADR. Control affordances are
  named there rather than enumerated by shape.

### Still open

- **Two mode glyphs.** `app-shell.md` leaves the rail's items unlabelled, so each mode
  needs a glyph. Calendar reuses `calendar` and Habits reuses `repeat`; Tasks and
  Notes are still undecided. It is the only open item in the icon pass, and it is
  recorded in `components.md` rather than left to whoever builds the rail.

### The deferred tag — the redundancy is mine, not the design's

Panel F, as first drawn, said "deferred 2d" in the metadata line **and** on the
chip. That is a mistake in the markup rather than in the design: `tasks.md`
composes the metadata line from **Area, due date, note count, person links, and
parent task indicator**. Defer is not in that list. The chip *is* the defer channel.

Following the composition list removes the redundancy by construction. The real
question is narrower — where the glyph goes — and four options are in the lab, each
showing the same three rows: a task that is only deferred, one with a due date *and*
a defer, and one with only a duration.

| Option | Verdict |
|---|---|
| **V1 · Two channels** | **Recommended.** The line carries due, duration, and repeat; the chip carries defer. They cannot overlap, so the redundancy cannot come back. **No change to the spec — this is the spec followed exactly.** |
| **V2 · The glyph replaces the chip's word** | Rejected. Buys one word and spends clarity: "2d" alone could mean deferred 2 days or due in 2 days. The word was doing work. |
| **V3 · Defer in the line, chip dropped** | Rejected, but the closest runner-up. One channel for both time facts, differentiated by glyph — and it removes a component. It costs the chip, which is the only element in the row that is scannable *without reading*, and deferral is a signal about your behaviour, which is what the app exists to show. |
| **V4 · All time as chips** | **ADOPTED.** Chips are time and state; the metadata line is identity. The worry turned out backwards: with time out of the line, the line finally has exactly one job, and the chips read as a column down the trailing edge. It needs one rule it did not have — see below — which is a real cost rather than a paper one. |

V1 and V4 needed no spec change; V2 and V3 needed the deferred-chip bullet rewritten.

#### V4's cost, measured

`design-tokens.md` is absolute about height — *"Every list uses one of these four.
No custom row heights."* So the question was whether a row carrying several chips
still fits `row-rich`. It does, which is the problem. Measured at 390px:

| Chips | Title gets | Cluster gets |
|---|---|---|
| 1 | 195px | 97px |
| 2 | 144px | 148px |
| **3 + dot** | **60px** | **232px** |

Nothing overflows and nothing clips, because the height is **fixed** — so the
pressure surfaces as **title starvation** instead. At three chips the title is down
to a fifth of the row and wraps, while the secondary content takes 59% of it, and
the row still looks fine at a glance. That is worse than an overflow, which at
least announces itself.

So V4 requires **a cap of two chips**, in a fixed priority order — **deferred,
overdue, due, cadence, duration** — with everything beyond it living in the detail
view. Two chips leave the title 144px, which is what a title needs; three do not.
A fifth row height would also solve it and is worse: a new token, so an ADR, for a
case a cap removes entirely.

Both rules are now written into `05-modules/tasks.md`, and the chip vocabulary is
in `03-experience/components.md`.

## The V4 sweep, and what it caught

Writing V4 into the spec left the lab's exhibits stale in four places, which is the
failure class this repo exists to catch: a document confidently showing something no
longer true. The rule applied was **exhibits that present the design get swept;
comparisons stay**, because a comparison's job is to show rejected options — but it
has to say which ones are rejected.

| Surface | Action |
|---|---|
| The task row, in place | Swept to V4. |
| Tasks mode — Today, Next, All | Swept to V4. |
| The 20-row density sketch | Time rows swept. |
| The row-height demo's protocol card | Goal and metric lines now use the labelled form. |
| Icons A/B/C | **Kept as evidence**, annotated as predating the time-channel decision. |
| Icons E/F | **Kept as evidence**, annotated as superseded — the time glyph moved into the chip, so what survives from F is D. |

**A real violation the sweep caught:** the completed log had its rows at
`row-default` **while carrying a metadata label**. `design-tokens.md` is explicit that
the height follows whether metadata is present, so those rows were breaking the rule
they were meant to demonstrate. They are `row-rich` now, with the completion time as a
clock chip — which is also what V4 requires, since completion time is a time fact like
any other.

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
