# ADR 0029 — An Unlabelled Slot Exists

- **Status:** Accepted
- **Date:** 2026-09-28
- **Deciders:** [founder]

## Context

`03-experience/components.md`'s placement table already allowed a glyph to **mark a slot**: the
protocol card's Goal and Metric are marked with `icon-sm` glyphs, on the stated ground that *"the
label is a fixed word repeating on every card of its kind, so the glyph marks a slot rather than
duplicating a value."* But every slot that table carried was **labelled**, and icon-only buttons were
allowed *"only for the unlabelled mode icons"* — justified in the table itself by *"the rail carries
a tooltip"*, which a phone cannot deliver.

Then a reference design for a task app arrived showing the fields a task **does not have** drawn as
icon-only slots on the trailing edge, which open a picker and become a chip once filled.
`design/tasks-lab.html` ("The detail, filled") drew five readings of it and measured them. Four
fields were absent from the fixture task — scheduled, defer, people, notes — and the inventory
already gave each of them a glyph: `calendar`, `clock`, `user`, `paperclip`.

**The measurement is what made the decision unavoidable**, because the rule-clean answer is not the
best one:

| Form | Width of the same four fields | Headroom on the 340px column |
|---|---|---|
| Bare glyphs, unlabelled | **168px** | **172px** |
| Glyph + word in a chip | **335px** | **5px** |

Two further positions were measured and rejected: putting the rail on the **title line** leaves the
title **128px of the 307px it needs — 42%**, so the task's own name truncates; and drawing **no
rail** (one word, *Add…*, at the foot) costs almost nothing but makes the fields a task *could* hold
invisible, which is the one thing the reference gets right.

So the worded rail was the recommendation **because it required no decision** — not because it was
better. It fits with 5px to spare and only because *Schedule · Defer · Person · Note* are all short.

One objection raised while reviewing the reference is withdrawn here, because the decision must not
rest on it: `clock` was called ambiguous between *deferred to* and *completed at*. The inventory
gives it **one** meaning — *"a moment"* — with two instances, so an empty slot marked `clock` says
the same thing a completed row's `clock` says.

## Decision

**An unlabelled slot exists**, as a placement in its own right, under four conditions:

1. **It marks a field that is not set.** A field with a value keeps its row. The rail never draws a
   slot for something the task already has — that is the error of the `Not set` row in a smaller box.
2. **The glyph is the inventory's own for that field**, at `icon-sm` in `text-muted` — `calendar` for
   a scheduled day, `clock` for a deferral, `user` for a linked person, `paperclip` for notes. No
   fourteenth glyph is invented.
3. **At most four, always in the same order, and each opens that field's picker.** This is why it
   needs no tooltip, where the mode icons did: the target *is* the field, so the glyph does not have
   to be learned in the abstract — tapping it answers the question it raises.
4. **It is a slot, not a button.** Drawn with the slot's own surface (`surface-2`, `radius-md`), not
   as a control with a label.

`03-experience/components.md` gains the table row, and its `paperclip` inventory row widens from *the
note count* to **the note relation** — the count in a row's metadata line, the offer of one in a
slot. `05-modules/tasks.md` gains the rail in §Surfaces. `design/tasks-lab.html`'s recommended row is
drawn under this ADR, and the worded rail stays as the variant above it.

## Consequences

**Positive.**

- The four fields cost **168px instead of 335px**, so the rail has 172px of headroom instead of 5 and
  survives a long word where the worded form would wrap to a second row — which would cost exactly
  the height the whole inversion exists to save.
- The rule "a glyph either replaces a word or marks a slot" now has its exception written down **with
  conditions**, rather than being a hole a later screen could widen.
- The measurement and the decision agree, so the recommended row is the one that is actually smaller
  — instead of the rule-clean one being quietly worse.

**Negative.**

- **A glyph now has to be learned in two directions.** The mode icons are learned once and never
  move; these four sit on a screen a user opens fifty times a day, where a mis-tap opens a picker over
  the content. The conditions in 3 are the mitigation, and they are not a proof.
- **The rail's length varies** — it holds the fields *this* task lacks, so it is one slot or five.
  Fixed position is most of what makes an unlabelled row learnable, and a varying rail has less of it.
  Recorded rather than solved.
- `paperclip`'s stated job widens, so the inventory row is a little less crisp than it was.
- **The slot's height is still unresolved.** Drawn at 36px it resolves to no control token
  (`control-sm` is 32, `control-md` is 40), and `touch-min`'s 44 is a **hit area**, not a height — so
  the slot must be told whether it is `control-md`, with its hit area padded to the minimum, or
  `control-lg`. `05-modules/tasks.md` carries this.
- Icon-only is no longer a mode-icon special case, so the glyph vocabulary is now load-bearing in a
  second place and cannot be changed casually.

**Neutral.**

- No new component, no new glyph, no new log type, and no new field. The rail is drawn from the
  container vocabulary and the existing inventory.
- **The rail draws from two glyph regimes, and it should be said plainly.** Three of the four slots
  are the by-meaning inventory's own use of the glyph — `clock`'s row already names *"when something
  was deferred to"* as one of its two jobs, and `calendar`'s names *"a scheduled day"*. The fourth,
  `paperclip`, is also the attachment clip's **control** glyph in the control-affordances list, so
  the notes slot reads as that control rather than as the count. That is consistent, but it means
  the inventory's `paperclip` row is now doing three jobs — the control, the count in a row's
  metadata line, and the offer in a slot — where the other three slots do one each.

## Alternatives considered

**Words in chips — the previous recommendation.** Rule-clean with no decision needed: the glyph sits
*inside* a chip, which the table already allowed. Rejected on **5px of headroom** in a 340px column,
which is a coincidence rather than a design. Still drawn, as the variant above the recommended row.

**No rail: one word, `Add…`.** The cheapest form (~40px) and the only other rule-clean one. Rejected
because it makes invisible the thing the reference gets right — that the *offers* are the affordance,
and a user who cannot see that a task could hold a due date will not go looking for one.

**The rail on the title line.** The reference's own position, costing no vertical space. Rejected on
measurement: it leaves the title 42% of the width it needs, so the casualty of a rail of optional
fields is the task's own name.

**A labelled slot in the protocol card's own form.** Would need no decision at all — and is the
worded rail under another name, at 335px.

**A fixed four slots, filled or not** (the reference's actual behaviour). Rejected: it would draw a
slot for a field the task already has, which puts an offer next to a fact and re-creates the
`Not set` row's confusion at a smaller size.

**A fourteenth glyph for "a note".** Rejected as heavier than the need: `paperclip` already marks a
task's notes in the metadata line, so the slot widens that glyph's job rather than inventing one.
