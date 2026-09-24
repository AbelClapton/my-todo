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

- **Today.** Tasks scheduled for today, plus tasks with a defer
  date of today or earlier. Deferred-past tasks appear at the top
  with a subtle "deferred" chip.
- **Next.** Tasks with `priority: now` or `priority: next` that
  are not scheduled for today.
- **Someday.** Tasks marked `someday`. No due dates, no scheduling.
- **All.** Everything open, sorted by due date ascending, then
  priority.

Filters (via `Cmd+F` or a filter button): by Area, by Person, by
due within N days, by completion date (for the completed log).

### The task row

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
- **Priority indicator.** `priority: now` shows a small dot in
  `accent-default`. `next` and `later` have no indicator (their
  absence is the signal).
- **Time chips.** Every time fact is a chip on the trailing edge, not
  text in the metadata line: **due** ("due Thu"), **duration**
  ("40m"), **cadence** ("weekly"), and **deferred** ("deferred 2d").
  Time changes constantly and identity does not, so separation keeps
  the metadata line to one job and makes the chips a column the eye
  can scan down.

**The row shows at most two chips.** The cap is a measurement rather
than a taste: at 390px, one chip leaves the title 195px, two leave it
144px, and three take 232px of the row and leave the title 60px and
wrapping. Since the row height is fixed at `row-rich`, the pressure
never shows as overflow — it shows as **title starvation**, which looks
fine at a glance and is therefore worse. Anything beyond the cap lives
in the detail view.

When a task has more than two time facts, the cap keeps them in this
order: **deferred, overdue, due, cadence, duration**. The signals that
change what the user does next are the ones that survive.

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

**Detail.** Title, notes, subtasks (children), people, due,
defer, priority, area. Actions: edit, reschedule, link person,
link note, break down (Tier 2), research (Tier 2).

**Capture.** Pull down from the list; also available from the
command palette. Inline parsing (Tier 1).

**Defer sheet.** Opened by swipe left. Options: Tomorrow, Next
week, Someday, Pick a date… The defer sheet is a bottom sheet
with four rows.

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

Three temporal fields, three purposes:

- `scheduled_day` — appears on this day's calendar
- `defer` — becomes visible on this day
- `due` — must be done by this day

### The completion log

Completed tasks are findable via search and the time machine, and
via a "Completed" filter in the All scope. The filter shows tasks
completed in the last 30 days by default.

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