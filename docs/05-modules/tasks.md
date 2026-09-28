# Tasks

## Purpose

This doc defines the Tasks module: the surface where open work is
listed, filtered, and acted on. It exists because tasks are the
app's most-used atom, and the task list is where the defer/due
distinction, the priority model, and the completion loop become
visible.

The Tasks mode is *not* a project manager. It is a list of things
with a completion state, organized by what's visible now and what's
deferred.

## Invariants

- Every task belongs to exactly one Area
  (`02-architecture/object-model.md`).
- Every task has one of five states: `open`, `completed`,
  `someday`, `archived`, `deleted`.
- Deferred tasks are hidden from "today" and "next" scopes until
  their defer date.
- Completed tasks remain in the log; they are hidden from default
  views after 30 days.
- Swipe right completes; swipe left defers. Same everywhere
  (`03-experience/gesture-vocabulary.md`).
- Every completion is undoable (Invariant 1).

## Specification

### Scopes

The Tasks mode has four scopes, switchable via a segmented control
in the header:

- **Today.** Three sources, and the row says which one put it
  there: scheduled for today, **due today or earlier**, or a defer
  date of today or earlier. Overdue and deferred-past tasks appear
  at the top carrying their reason as a chip ("overdue 2d",
  "deferred 2d").
- **Next.** Everything open that Today and Someday do not hold —
  the complement, not a priority filter (ADR 0028).
- **Someday.** Tasks marked `someday`. No due dates, no scheduling.
- **All.** Everything open, sorted by due date ascending, then
  priority.

**The four are a partition, and that is a decision rather than a
description** (ADR 0028). Read as predicates the older rules were not
one: `Next` keyed on `priority`, so a task whose only date was a deadline
belonged to no scope at all, `priority: later` was claimed by none, and a
task deferred into the past *while* carrying `priority: next` sat in two
at once. Measured over twelve realistic tasks
(`design/tasks-lab.html`, "The four scopes"): **5 had no scope, 1 had
two.** The missing rule is also already written down three times —
`06-flows/resurfacing.md`, `06-flows/disruption.md` and
`08-decisions/0006` all say an overdue task shows in Today with a chip —
and this doc's own "A typical Today view" example carried **2 of its 4
rows** that its definition excluded. The hole mattered most where it was
least visible: `04-ai/tier-1-parsing.md` turns "call dentist Tuesday"
into a task with `due` and nothing else, so the app's most common capture
was in no scope but All.

Filters (via `Cmd+F` or a filter button): by Area, by Person, by
due within N days, by completion date (for the completed log).

### The task row

**The layout below is the chip row, and it is what the shipped row replaces.**
`design/tasks-lab.html`'s recommended row is chosen: **the title owns the first
line and wraps to a second when it needs one; one context line beneath it carries
the section on the left as a glyph and a word, and every other fact on the right
as a glyph alone** — no chip, no word and no value — at `space-4` (12px) of the
row's own side padding, with no frame around the list and no priority dot.
Measured on it, the row is **66px** (inside `row-rich`, and 90px when a title
wraps) and the context line's content is **114px of 332px**.

The bullets below are kept because they are the record of what this retires — the
cap of two, the priority order that decides which two survive, and the trailing
chips — and the cap figures further down are why it retires them. **An ADR is owed
for the row's anatomy**, because the cap, the priority order and the fifth fact's
missing slot all live inside it.

    [checkbox] Title                         [metadata]
               Area · due Tue · 1 note · @Sarah

- **Checkbox.** Tap completes. Swipe right also completes.
- **Title.** `type-body`. Tap opens detail.
- **Metadata line.** `type-footnote`, `text-secondary`. **Identity only:**
  Area name, note count, person links, parent task indicator. Where the
  Area **has** a glyph, the glyph sits in this line immediately before
  the Area's name (`icon-xs`, `text-muted`) — not at the head of the
  row, which `03-experience/components.md` forbids because it breaks the
  checkbox column and repeats a word already on the line. Only the four
  seeded Areas have one; Inbox and every user-created Area are name-only.

**Open: whether the note count and the person carry a glyph too.**
`03-experience/components.md`'s inventory places `paperclip` at "the note
count in a task row's metadata line" and `user` at "a linked person", which
reads as an inline glyph in this line in both cases. The row drawn in
`design/tasks-lab.html` carries the **Area's** glyph only, because
`design/palette-lab.html` panel F is the density check on exactly this
question — *"two glyphs in a 13px line… this is where the idea either holds
or collapses"* — and the panel that survived it (D) kept the category glyph
and nothing else. A line carrying three glyphs, one per fragment, has never
been drawn. Recorded rather than decided.
- **Priority indicator.** `priority: now` shows a small dot in
  `accent-default`. `next` and `later` have no indicator (their
  absence is the signal).

**Open: the list now carries no priority signal at all.** Both the dot and the
accent border the lab drew for it were removed on instruction, because in a
borderless row the dot sat in a gutter the row no longer has. So the rule above
describes something **nothing draws**: the only priority indicator in the module
is gone, and `03-experience/components.md`'s row composition still lists it
(*"checkbox, title, identity metadata line, priority dot, and at most two time
chips"*). Either the dot returns in a form that survives a borderless row, or
the field stops being visible outside the detail. Recorded rather than decided.
- **Time chips.** Every time fact is a chip on the trailing edge, not
  text in the metadata line: **due** ("due Thu"), **scheduled**
  ("15:00"), **duration** ("40m"), **cadence** ("weekly"), and
  **deferred** ("deferred 2d"). `scheduled` is the fifth fact and the
  newest: `scheduled_time` is a **point**, not a span, so its chip
  carries an hour and its task may have no duration at all (ADR 0025).
  Time changes constantly and identity does not, so separation keeps
  the metadata line to one job and makes the chips a column the eye
  can scan down.

**The row shows at most two chips.** The cap is a measurement rather than a
taste, and it depends entirely on how wide the row's content box is. Three
things have to be fixed before a figure means anything: the row is drawn at the
real **390px**; every chip carries the `icon-xs` glyph it is drawn with, which
makes a chip 54–62px wide rather than the 38–62px a word alone suggests; and
the row's content box is **332px** — the phone's 388px of content, minus the
documented `space-5` screen inset twice and the row's own `space-4` side padding
twice, because the row is a band whose content is inset inside it exactly as the
scope control above it is.

On that row the title gets **216px** with one chip, **162px** with two, and
**84px** with three.

**Three chips do not wrap**: the title truncates, so the cap of two holds. But
it holds less hard than this doc used to claim, and the figures it carried
before — 195 / 144 / 60, taken from `design/palette-lab.html` — are **not
comparable to these**, because that lab insets its rows differently. Neither
number is wrong; neither doc said which row it measured; and that is why this
passage has been corrected **four times**.

**So the row's own inset is stated here, which was the missing quantity.** A list
row **adds `space-4` (12px) of its own side padding inside the screen inset**, so
the row's band starts on the screen inset — the same line the scope control's band
starts on above it — and the content inside the band is inset in turn, exactly as
the scope control's selected pill is. `design/palette-lab.html` insets its rows
by `space-6` (20px) instead: 4px more, an 8px narrower content box, and titles
8–13px narrower. Either is defensible on its own; what is not defensible is
quoting a title width without saying which row it was measured on.

**Open: whether the cap survives at 332px.** Three chips leave the title
**84px**, so the third chip still costs the title most of its room and the cap of
two holds — but the case is now a matter of degrees rather than the cliff the
original 60px implied. The recommended row in `design/tasks-lab.html` retires the
cap altogether, because a row whose title owns its own line has no width to
defend.
the row height is fixed, the pressure never shows as overflow — it shows
as **title starvation**, which looks fine at a glance and is therefore
worse. Anything beyond the cap lives in the detail view.
(`design/tasks-lab.html`, "The list", measures all three, and the
clipped-title count in each variant with them.)

**Withdrawn: an earlier pass of that lab measured 210 / 172 / 110**, and
this doc recorded that the stated figures did not reproduce. The lab was
drawing its chips **without the `icon-xs` glyph every chip carries**
(`design/palette-lab.html`, V4: *"the time glyph moved into the chip"*),
so its chips were up to 16px narrower than the app's and its titles
correspondingly wider — a measurement of a chip the app does not draw.
The doc's figures were right and the correction was the error — though the two
sets were never comparable in the first place, which is the finding above.

**The title owns its own row, and that is now chosen.** The layout above puts the
chips on the **title's** line and the identity line beneath it, which is why three
chips starve the title at all. Moving **all** of the row's context into the second
line gives the title the full width and lets it wrap, and the starvation disappears.

What this passage first feared was that the pressure would simply move from the
title to the context line. Drawn and measured in `design/tasks-lab.html`, it does
not — because the facts on that line are **glyphs and not chips**: the widest
context line is **114px of 332px**. The row is **66px**, inside `row-rich` (72px)
with 6px to spare, and **90px** only when a title wraps — which is 1 of the lab's 7
fixtures — and 90px matches no token, since
`03-experience/design-tokens.md` ends its row-height table with *"Every list uses
one of these four. No custom row heights."*

So the cost is not space at all: it is that an icon-only fact says **which kinds of
time a task has, and not one of their values**. That and the height are recorded at
the head of this section, and the **ADR this row's anatomy needs is owed — it is
not written yet.**

When a task has more than two time facts, the cap keeps them in this
order: **deferred, overdue, due, cadence, duration**. The signals that
change what the user does next are the ones that survive. `scheduled`
belongs in that list and has **no rank in it yet** — which is the open
question below.

**Open: the cap, or a column?** A task due Friday and placed at 15:00 has
two facts and the cap is already spent, so the fifth fact does not starve
the title — it **displaces** one of the two that were there. The two
answers (`design/tasks-lab.html`, "The list") are a cap that decides what
to drop, or a **fixed two-slot column** in place of one: `due` and
`scheduled` are the two facts that change what you do next, so they are
the two the column holds, and duration and deferral show only when those
are empty. The column costs the same 76px on a row carrying nothing,
which is why this is a decision and not a correction.

Row height is `row-rich` (72px) when metadata is present,
`row-default` (56px) when it is not.

**The checked state is the accent, not a separate green.** A checked box fills
with `accent-default` and carries a white tick (`on-fill`). This is the
convention every platform already uses for a checkbox, and it resolves a real
collision: the priority dot is also the accent, so the two marks in a row are
now distinguished by form — an 8px dot versus a 24px filled box — instead of by
two similar colours pretending to be different. `success` keeps its job for
compliance, confirmation, and the completion toast.

**Metadata is `type-footnote` (13px), not `type-callout` (15px).** The line sits
under a `type-body` title and reads as subordinate apparatus; at 15px it competed
with the title it belongs to. It must fit on one line at 390px —
"Work · due Tue · 1 note · @Sarah" does.

### Surfaces

**List.** Four scopes, filtered.

**Detail.** Title, notes, subtasks (children), people, scheduled day and
time, due, defer, priority, area. Actions: edit, reschedule, link
person, link note, break down (Tier 2), research (Tier 2).

The **layout** is unspecified. `03-experience/components.md`'s Controls
table is where a control's height is decided, it lists ten controls, and
it contains no field row — so what a field looks like is yet to be
decided. `design/tasks-lab.html` ("The detail") derives one and measures
it at **40px** (`control-md`), with the three temporal fields grouped and
each carrying its own meaning as a caption.

**The rail holds the fields that are not set.** Drawn and measured in the
detail-filled screen of `design/tasks-lab.html`: the facts a task *has* are
rows, and the fields it does **not** have are a rail of **unlabelled
slots** under the header — one glyph per absent field, drawn from the
inventory's own set, tapping which opens that field's picker (ADR 0029).
It replaces the row that announces an empty field: drawn that way, a
half-filled task spent **four of its seven rows** saying *Not set*. The
alternative — a chip carrying the glyph *and* the word — is the form
`03-experience/components.md` permitted without a decision, and it measures
**335px** of a 356px column against the rail's **168px**, leaving **21px**
of headroom where the rail leaves 188. The rail is therefore the one thing
on this screen that exists because of a measurement rather than a rule.

**Open: the slot's height.** Drawn at 36px it resolves to no control
token — `control-sm` is 32 and `control-md` is 40 — and `touch-min`'s 44 is
a **hit area**, not a height ("padding or a transparent hit area fills the
difference", `03-experience/design-tokens.md`). So the slot has to be told
which token it is, and `control-md` with a padded hit area is the
proposal (ADR 0029).

**Open: what the hour control is.** Every control the set gives for
putting a task on a day is **day-granular** — this screen's action is
*"Schedule to day"*, which *"opens date picker"*, and the defer sheet's
rows are relative days. `scheduled_time` (ADR 0025) therefore has **no
control anywhere except Tier 1 parsing**. The lab proposes four hour
chips at `control-sm`'s scale, appearing only once a day is set; whether
that is a new control or an instance of the segmented control is part of
the same undecided question.

**Capture.** Pull down from the list; also available from the
command palette. Inline parsing (Tier 1).

**Defer sheet.** Opened by swipe left. Options: Tomorrow, Next
week, Someday, Pick a date… The defer sheet is a bottom sheet
with four rows.

**Three of the four rows write `defer`, and the fourth writes a state.**
`Tomorrow`, `Next week` and `Pick a date…` set `defer` — a day, *"when
the task becomes visible"* — while `Someday` means *"no due dates, no
scheduling"* (its own scope definition below), so it cannot be a `defer`
date at all. It is `task.marked_someday`, which every other doc binds to
swipe down. One list, two event types, and this is the only place that
says so.

**The sheet names the task it is about.** The row it acts on is behind the
scrim: measured, the sheet is **258px**, **31%** of the phone, covering
**197px** of the list with the swiped row underneath it
(`design/tasks-lab.html`, "The defer sheet"). A sheet that hides its
own object and then says only *"becomes visible on this day"* is asking
to be trusted with an invisible noun.

**Open: what "Next week" resolves to.** Nothing in the set defines it,
and it is the one row that is not a date picker — so it is the row a user
has to trust. Its two readings (`+7 days`, or the next calendar week's
Monday) are **1 to 6 days apart** depending on the weekday, which is the
size of the ambiguity rather than a rounding difference.

**Someday pile.** The Someday scope is a flat list with no dates
and no metadata line. It is a parking lot, not a backlog.

### Empty states

`03-experience/states.md` owns the form — a `type-display` headline, one
line in `text-secondary`, one action, `space-10` padding, static, no
glyph. This section owns the strings and the reason for each.

**The action repairs the cause of the emptiness.** There are three causes
and three repairs, and no fourth:

| Cause | Repair |
|---|---|
| There is no data | Capture |
| Nothing matches the filter | Clear the filter |
| Nothing falls inside the window | Widen the window |

Where the cause cannot be repaired from this surface, the action falls
back to capture — the one action that is always available and never wrong —
and the detail line states what actually puts a task in the scope.

| Scope, empty | Headline | Detail line | Action |
|---|---|---|---|
| **Today** | Nothing on today. | Tasks appear here once they have a day. | Capture something |
| **Next** | Nothing flagged. | Flag a task now or next and it appears here. | Capture something |
| **Someday** | Nothing parked. | Setting a task aside keeps it out of Today without deleting it. | **None** |
| **All** | Nothing open. | Everything you capture lands here first. | Capture something |
| **All, filtered** | No tasks match. | The active filters, named — e.g. "Area: Work · due within 7 days" | Clear filters |
| **Completed, empty** | Nothing completed. | The log covers the last 30 days by default. | Show all time |

**Someday carries no action, and it is the first of exactly two such
surfaces.** A parking lot with nothing parked is not a dead end and not a
problem, so there is nothing to repair. Offering "Capture something" there
would be the one thing this scope must never do: read as a prompt to fill
it. Every other empty state in the app carries exactly one action; the
second exception is the People mode's Quiet scope
(`05-modules/people.md`).

**Today-empty and Someday-empty mean opposite things.** Today empty means
nothing has a day; Someday empty means nothing has been set aside. Neither
is a failure and neither headline says so — but they are different states
and they do not share a sentence.

**The filtered empty state names the filter, never the absence.**
"No results found" is banned by `03-experience/states.md`; naming what is
excluding the tasks, and offering to remove it, is the same information
with a way out. This is also the one empty state whose action is not
capture, because the list is not empty — the query is.

Today's detail line is deliberate. Capture puts a task in Inbox, not on
today, so the line says what does put it there.

**Checked at 390px.** Every headline fits on one line at `type-display`,
the widest being "Nothing completed." at 280px. Every detail line is two
lines or fewer. The block is therefore the same height in all six scopes,
which is why no scope needs its own layout argument.

### Actions

| Action | Gesture | Result |
|---|---|---|
| Complete | Swipe right, tap checkbox | `task.completed`, undoable |
| Defer | Swipe left | Defer sheet |
| Attach | Swipe up | Attachment picker (`03-experience/gesture-vocabulary.md`) |
| Remove | Swipe down | `task.marked_someday`, undoable |
| Open detail | Tap | Detail view |
| Contextual AI | Long-press | Tier 2 menu |
| Capture | Pull down | Inline capture |
| Filter | Filter button, `Cmd+F` | Filter sheet |
| Change scope | Segmented control | Switch scope |
| Schedule to day | Detail → "Schedule" | Opens date picker |

### Completion

Completing a task:

1. Fires the Completion haptic
   (`03-experience/haptic-vocabulary.md`).
2. Plays the completion animation (400ms, per
   `03-experience/motion-vocabulary.md`).
3. Logs `task.completed`.
4. Shows a five-second undo toast (Invariant 1).
5. If the task was the third of the top three, fires the Success
   haptic and shows the celebration card.

### Defer vs. due

The distinction is load-bearing and the app explains it in context:

- **Due** is a deadline.
- **Defer** is when the task becomes visible.

A task can have both. A task deferred to Thursday with a due date
of Friday does not appear in Today until Thursday.

The task detail shows both as separate fields. The defer sheet
sets defer, not due. The scheduling action in the detail sets
scheduled_day (which affects the calendar), not due.

Four temporal fields, four purposes:

- `scheduled_day` — appears on this day's calendar
- `scheduled_time` — appears **at** this hour on that day's axis
- `defer` — becomes visible on this day
- `due` — must be done by this day

**A time of day is offered at creation, and it is optional.** Every
creation path — the inline capture field, Tier 1 parsing, and the task
detail — asks for the day and the hour together, and the hour is never
required: a task with a day and no time is *scheduled but unplaced* and
appears in the Day view's band rather than on its axis (ADR 0025). A time
of day is not a deadline; a deadline is `due`, which is a day and only a
day.

**A time of day is always placed on a day.** `scheduled_time` without a
`scheduled_day` is unrepresentable, because the hour is an offset into a
Day — `02-architecture/day-as-unit.md` puts the boundary at 4am by default,
so "9am" is a position between 04:00 and 04:00 and not an instant. Setting
an hour on a task with no day sets the day to today first.

An **event** needs no such field: an Event's `start` *is* its time
(`02-architecture/object-model.md`), so `calendar.md`'s New event screen
already asks for it and nothing is added there.

### Duration and estimates — recorded, not decided

**The app consumes an estimated duration in four places, and no field holds
one.**

- The row's **duration chip** ("40m") — specified above, filed as a
  component in `03-experience/components.md`, with the `timer` glyph
  described as *"a span: an estimated or logged duration."*
- The gap nudge, which offers open tasks that fit the gap *"based on
  user-estimated duration (if available) or a heuristic"*
  (`06-flows/doing-the-day.md`).
- The low-key-day card, offering *"4 things under 10 minutes"*
  (`06-flows/resurfacing.md`).
- The completion prompt itself — *"why did this take longer than
  expected?"* — which asks the user to explain a deviation from an
  expectation nothing recorded (`06-flows/completion.md`).

**The ask is to close that loop:** with an estimate and a scheduled hour on
a task, the app can tell the user how far off their estimates are. It
already says it intends to — `06-flows/completion.md` states the completion
note *"is used to detect estimate-vs-actual patterns."*

**It needs a field before it needs a surface.** The candidates are an
`estimated_minutes` on the Task, or reading the estimate out of completion
history alone. Recorded rather than decided, because it adds a field to the
atom and a key to `task.created` — ADR-shaped — and because the two
consumers that want it most are heuristics that already function without
it: both fall back, and neither fallback is wrong, only less useful.
`estimated_minutes` is a **span**, unlike `scheduled_time`, which is a point
(ADR 0025) — they are not the same field and neither substitutes for the
other.

**One constraint on the surface, whichever way it goes.** An estimation
error is a number about the user's own record, and this set has refused that
shape twice: *"there is no counter, no pressure"* in
`06-flows/lapsed-recovery.md` is about **tone**, and `05-modules/review.md`
lets the review describe what the data suggests while forbidding it from
prescribing an action. So the feature is a statement about **one task's own
estimate** — "you said 30 minutes; it took 50" — and not a running score,
and it is not a nudge: `03-experience/attention-budget.md`'s test would give
it a `SurfaceId`, a toggle and a budget line, which is a much larger
decision than the field.

### The completion log

Completed tasks are findable via search and the time machine, and in the
**All** scope with the "Completed" filter applied — a **state of that
screen, not a screen of its own** (`03-experience/surfaces.md`; the same
correction the Time machine needed).

The window is the app's **one** window selector — 7 / 30 / 90 / custom
(`03-experience/components.md`), the control the Habits mode already
uses — and it defaults to **7 days**. This doc previously said "the last
30 days" while `06-flows/completion.md` said "day, week, month": two
vocabularies for one control, and a third answer for its default.

**A completed row carries its own time, in a leading column.** It is a
record rather than a task: `completed_at` is the fact the log exists for,
and it is deliberately **not** a sixth chip — the five chips are what an
*open* task has. Rows read `10:12 · Send the invoice`, and a day heads its
group with its count (`Today · 3`), because "what did I do" is a question
about a day before it is a question about a task.

Completion notes are optional. The completion action opens a small
inline field: "why did this take longer than expected?" Skippable
with a tap outside or "Skip."

### Area assignment

Every task belongs to one Area. The default Area is "Inbox" (a
built-in Area that exists for uncategorized tasks). The user can
move a task to another Area from the detail.

Areas are not folders. A task belongs to one Area; that's it.

### Freshness

Tasks are local. No freshness metadata is required unless the task
was created from an external source (e.g., a research note
attached to a task). In that case, the note carries the metadata,
not the task.

## Examples

**A typical Today view.**

    Today | Next | Someday | All

    [ ] File Q4 taxes                          Home · due Fri
        deferred 2d
    [x] Draft Q4 plan                          Work · 1 note
    [ ] Call contractor                        Home · @Mark
    [ ] Buy groceries                          Home · due Sun

**Swipe left to defer.**

    User swipes "Buy groceries" left.
    Defer sheet appears:
      Tomorrow
      Next week
      Someday
      Pick a date…
    User picks "Tomorrow."
    Row reanimates to its new position (it stays, defer is
    tomorrow). The deferred chip updates to "deferred tomorrow."

**Completing from the list.**

    User swipes right past 40%.
    Row reveals a checkmark.
    User releases.
    Completion haptic, completion animation, undo toast.
    Row removes from list.

**The Someday scope, empty.**

    Nothing parked.
    Setting a task aside keeps it out of Today without deleting it.

    ← and nothing below it. No action.

The Someday pile is the only surface in the app where this is right: an
empty parking lot is an answer, not a dead end, so there is nothing to
repair and nothing to offer.

**The All scope, filtered, empty.**

    Nothing open.

    [filter] Area: Work · due within 7 days

         No tasks match.
         Area: Work · due within 7 days · has a person
         [ Clear filters ]

The list is not empty; the query is. So the action clears the query rather
than adding to the list.

**Long-press for AI.**

    User long-presses "Buy standing desk."
    Contextual menu appears:
      Research this
      Break this down
      Reschedule
      Link person
      Add note
    User taps "Research this."
    Tier 2 runs (see `04-ai/tier-2-contextual.md`).

## What this doc must NOT do

- This doc does not define the Task atom. It defines the module
  that lists and acts on tasks. The atom is in
  `02-architecture/object-model.md`.
- This doc does not define token values. It references tokens.
- This doc does not define Tier 2 actions in full. It references
  them.
- This doc does not define the capture flow. Capture lives in
  `06-flows/capture.md`.
- This doc does not define the shutdown flow. It lives in
  `06-flows/shutdown.md`.
- This doc does not define the form of a state. It owns the empty-state
  strings, but the form they sit in is `03-experience/states.md`.
- This doc does not define other modules. Areas live in
  `05-modules/areas-and-goals.md`; People in
  `05-modules/people.md`.