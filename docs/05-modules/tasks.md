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
- **Metadata line.** `type-footnote`, `text-secondary`. Composed
  from: Area name, due date (if any), note count, person links,
  parent task indicator.
- **Priority indicator.** `priority: now` shows a small dot in
  `accent-default`. `next` and `later` have no indicator (their
  absence is the signal).
- **Deferred chip.** If defer is today or earlier, a subtle chip
  appears: "deferred 2d."

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
    tomorrow). The metadata line updates: "deferred tomorrow."

**Completing from the list.**

    User swipes right past 40%.
    Row reveals a checkmark.
    User releases.
    Completion haptic, completion animation, undo toast.
    Row removes from list.

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
- This doc does not define other modules. Areas live in
  `05-modules/areas-and-goals.md`; People in
  `05-modules/people.md`.