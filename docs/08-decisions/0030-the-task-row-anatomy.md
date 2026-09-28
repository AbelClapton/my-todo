# ADR 0030 — The Task Row's Anatomy

- **Status:** Accepted
- **Date:** 2026-09-28
- **Deciders:** [founder]

## Context

The task row has never been decided in one place. It has been *accumulated*:
`05-modules/tasks.md` gave it `[checkbox] Title [metadata]` over an identity line, a **cap of two
chips**, a **priority order** deciding which two survive when a task has more, a **priority dot** for
`priority: now`, and two row heights. `03-experience/design-tokens.md` gave it four row heights and
closed the list with *"Every list uses one of these four. No custom row heights."*
`03-experience/components.md` gave it a composition line. Nothing anywhere said **how wide the row's
content box is**, or whether a row adds side padding inside the screen inset.

`design/tasks-lab.html` drew it, and the cap's figures moved **six times in one day** — none of them
because a fixture changed:

| row drawn | 1 / 2 / 3 chips |
|---|---|
| no glyphs, framed card, `space-7` inset | 210 / 172 / 110 |
| glyphs, framed card, `space-7` inset | 194 / 140 / 62 |
| glyphs, borderless, `space-7` inset | 196 / 142 / 64 |
| glyphs, borderless, `space-5` inset, row padding 0 | 240 / 186 / 108 |
| …row padding `space-5` | 208 / 154 / 76 |
| …row padding `space-4` | **216 / 162 / 84** |

**Every one of those is a measurement of a different row.** The cap's figures were quoted in the doc
as though they were properties of chips, when they are properties of a rectangle — and nobody had
fixed the rectangle. That is the reason this ADR exists: the row has to be one thing before any number
about it can be written down. `design/palette-lab.html`'s 195 / 144 / 60 are not wrong either; they
are a measurement of its own row, which insets rows differently, and neither doc said so.

Six screens in `design/tasks-lab.html` now carry an accepted row, one per screen, and this ADR is the
row they share.

## Decision

**The row is title-owned, and everything else on it is a glyph.**

1. **The title takes the first line and wraps** to a second when it needs one. It is the only text on
   the row that is a phrase.
2. **One context line beneath it.** On the left, the **section** — its glyph and its name
   (`icon-xs`, `type-footnote`, `text-muted` glyph). On the right, **every other fact as a glyph
   alone**: no chip, no word, no value. The facts are the inventory's own four time glyphs plus its
   person and note glyphs, and nothing is invented.
3. **The row's own side padding is `space-4`** (12px). The row's band therefore starts on the screen
   inset — `space-5`, *"always"*, `03-experience/design-tokens.md` — on the same line the scope
   control's band starts on, and the content inside the band is inset in turn, exactly as the scope
   control insets its selected pill. The content box is **332px** at 390px.
4. **The list is not a frame.** No border, no radius, no `overflow: hidden`, and no rule between rows.
   A row carries its state on hover and press instead.
5. **The cap of two is retired**, and with it the **priority order** that decided which two survive
   and the **two-slot column** that replaced them. A row that never competes for width has nothing to
   cap.
6. **No priority indicator in the list.** Both the dot and the accent border that carried the same
   signal are gone; `priority` is visible in the task detail and nowhere else.
7. **Heights:** `row-rich` when the title takes one line — measured at **66px**, 6px inside the token
   — and `row-default` (56px) when the row carries no context at all. **A wrapped title measures 90px,
   which is not a token**, and that is the one piece of this decision still open.

## Consequences

**Positive.**

- **The title never truncates.** Every variant that competes for the title's width clips 2–3 titles of
  five; the accepted row clips **0 of 7**, including a title long enough to wrap.
- **The facts cost 168px of a 332px line.** The chip row spent 335px of it — more than the line had —
  and the column took a fixed 76px before the title got any.
- **Four open questions retire together**: the cap of two, the priority order, the fixed column, and
  the fifth fact's missing slot. They were one question wearing four hats.
- The figures are now quotable, because the row whose rectangle they describe is stated in one place.

**Negative.**

- **The row no longer says *when*.** `calendar` means "this has a date", and due, overdue and
  scheduled all share it — so the task due Friday and the task scheduled for 15:00 read identically.
  The row can say **which kinds of time a task has and not one of their values.** One tap in the
  detail is where the values are, and whether that is the point or an amputation is the question this
  ADR cannot answer for you.
- **No priority signal is visible in the list at all**, where `03-experience/components.md`'s row
  composition still lists the dot. Either the dot returns in a form that survives a borderless row, or
  the field is detail-only from now on.
- **A wrapped title's 90px matches no token**, and `design-tokens.md` forbids custom row heights. The
  one-line case needs no new token; this case needs the decision.
- The rail's glyphs have to be **learned**, and the section's word is the only thing on the context
  line that teaches by reading rather than by recall.

**Neutral.**

- No new component, no new glyph, no new container, no new log type and no new field. The context line
  is built from the inventory `03-experience/components.md` already carried.

## Alternatives considered

**The cap of two, kept.** The doc's rule and the palette lab's measurement. Rejected because the cap
exists only to defend the title's width, and a row whose title owns its own line has no width to
defend — the cap was a remedy for a layout that no longer exists.

**The fixed two-slot column.** The lab's previous recommendation: a constant 76px of the row given to
`due` and `scheduled`. Rejected as the same remedy in a different shape, and it cost the title 76px
permanently to protect it from a problem a second line removes for free.

**The worded rail** — a chip carrying each fact's glyph *and* its word. Rule-clean, and it was the
recommendation until ADR 0029. Rejected there on width: **335px of a 332px content box**, which is
more than the line has.

**The glyph rail with words, on the context line.** Drawn. Rejected: the section is the only word the
line needs, because it is the only fact that identifies the task rather than dating it.

**Keeping the framed card and the rules between rows.** Rejected: the frame cost a pixel a side, a
hairline cost a pixel a row and therefore a row of list, and the frame was what made the list read as
a table rather than as a list.

## Open, and recorded here rather than in four places

1. **Whether the row must say when.** If it must, the fix is a glyph per **fact** rather than per
   **kind**, and the inventory carries four time glyphs.
2. **What a wrapped title's row height is.** 90px currently, which is between `row-rich` (72) and
   `row-hero` (96).
3. **Whether `priority` is visible in the list at all.**
