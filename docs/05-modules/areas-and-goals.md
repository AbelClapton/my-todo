# Areas and Goals

## Purpose

This doc defines two related layers: Areas (life domains) and Goals
(outcomes under Areas). They are grouped in one doc because they are
created and named in the same place, and because every Goal sits under
an Area — not because they are the same kind of thing. **An Area is a
classification and a Goal is a body of work.** An Area is seen as a
filter over other lists; a Goal is seen as a screen with its own
history and its own action.

They exist because tasks, habits, and protocols need a home above
them. Without Areas, the app is a flat list. Without Goals,
protocols have no parent.

## Invariants

- An Area is a layer, not an atom
  (`02-architecture/object-model.md`).
- A Goal is a layer under an Area.
- A Task, Habit, or Goal belongs to exactly one Area.
- A Protocol belongs to exactly one Goal.
- Areas and Goals do not attach to Days. They are non-temporal.
- Areas and Goals do not appear in any mode's navigation. **An Area is a
  filter; a Goal is a screen.** The two are not the same kind of thing:
  an Area sorts what already exists, and a Goal holds a history of
  experiments that no filter can carry. Earlier drafts of this doc said
  “they are filters and parents, not destinations”, which is true of an
  Area and false of a Goal — the Goal list has three doors and the Goal
  detail has an action on it.
- **The five built-in Areas are identified by id, not by name.**
  Health, Work, Home, Learning and Inbox are created with fixed ids on
  first launch. Three rules depend on that identity — Inbox cannot be
  archived, the four seeds draw a glyph (`03-experience/components.md`),
  and the four are the ones onboarding offers — and none of them can be
  enforced against a `name` that the user is free to change
  (`02-architecture/data-lifecycle.md`).

## Specification

### Areas

An Area is a life domain. Examples: Health, Work, Home, Learning,
Relationships.

- Areas are user-created. The app seeds four defaults on first
  launch: Health, Work, Home, Learning. The user can rename,
  archive, or add.
- There is a built-in "Inbox" Area for uncategorized tasks. It
  cannot be archived, and it is identified by id rather than by name
  (see Invariants).
- **The Inbox Area is not the inbox list.** They share a word and
  nothing else. The Area is where an uncategorized task *lives*, and it
  is terminal — nothing waits there to be sorted. The list
  (`06-flows/capture.md`) is a queue of unparsed notes and unclassified
  tasks, with a ritual attached. A task can leave the list and still be
  filed under the Area: three of the ritual's four gestures are about
  *when* and *what with*, and none of them is about *which Area*.
- A Task, Habit, or Goal belongs to one Area. It cannot belong to
  zero or two.
- Areas have a name and a state (`active` | `archived`).

### Goals

A Goal is an outcome under an Area. Examples: Improve sleep,
Ship v1, Learn Japanese, Renovate kitchen.

- Goals are user-created.
- A Goal belongs to one Area.
- Goals have a name and a state (`active` | `achieved` |
  `abandoned`).
- Goals do not have due dates. They are not tasks.
- Protocols serve Goals. A Goal can have zero or more protocols
  over its life.
- A Goal is achieved (or abandoned) by user action, not by
  completion of its protocols.

### Surfaces

There is no dedicated mode for Areas and Goals. They appear as:

**Area filter.** A filter by Area, in **two** modes, plus one grouping and
one claim. See §Filters for which is which and which doc owns it.

**Area list.** In settings, a list of Areas with rename and archive
actions, reachable from **one** door: Settings. Nothing else in the app
links to it, and the command palette has no command for it — which is
why the Goal list's three doors are worth comparing against this one.

**Goal list.** Accessible from Settings, from the command palette
("Show goals"), and from any protocol detail (tapping the parent
goal). Each Goal shows its active protocol (if any) and its history.

**Goal detail.** Name, Area, active protocol, past protocols,
linked tasks and habits. A screen rather than a panel, because it
carries two protocols' worth of history and an action.

**Goal creation.** From the Protocol proposal flow or from the
Goal list. Creating a Goal **asks which Area it belongs to** — a Goal
requires one, and neither door supplies a default it could inherit:
the Goal list has no Area in view, and a protocol proposal carries a
Goal rather than an Area. This is why the Goal list's empty state
names the Area step in its detail line rather than only promising the
sheet.

### Empty states

The form is `03-experience/states.md`; the action repairs the cause
(`05-modules/tasks.md`).

| List, empty | Headline | Detail line | Action |
|---|---|---|---|
| **Goal list** | Nothing to aim at. | A Goal is an outcome under an Area. Pick the Area it belongs to. | New goal |
| **Area list** | *(unreachable)* | *(unreachable)* | *(unreachable)* |

**The Goal list can be empty on day one; the Area list cannot.** Nothing creates
a Goal automatically — one arrives from a protocol proposal or from the user —
so a new user's Goal list is genuinely bare. It is also the emptiest surface in
the app for a while: a protocol needs two weeks of data before it can be proposed
at all (`06-flows/onboarding.md`), so this list stays short for a fortnight.

**The Area list has no empty state, and that is the honest answer.** Inbox is
created on first launch and cannot be archived, so the list always has at least
one row and "Nothing beyond Inbox" would be a headline for a state that cannot
occur. An earlier version of this table listed it anyway, reasoning that
`03-experience/states.md` requires every surface to answer for every state. It
does — and the answer for this surface is that the state is unreachable, which
is a stronger thing to write down than a headline nobody will ever read. The
same reasoning does **not** apply to the Goal list: nothing prevents a Goal list
from being empty, and its row stays.

### Filters

Where Areas narrow what you see. **Two filters, one grouping, and one
claim with no owner** — four places that look alike in a diagram and
are not alike in what they do.

- **Tasks: a filter. Specified.** `05-modules/tasks.md` — *"Filters (via
  `Cmd+F` or a filter button): by Area, by Person, by due within N days,
  by completion date."* It owns the control, the chip string, and the
  empty-filtered state with its **Clear filters** recovery.
- **Notes: a filter. Specified.** `05-modules/notes.md` — the note list
  is *"filterable by attachment type, by Area"*. Reached through the
  note's attachment chain rather than a control of its own.
- **Habits: a grouping. Not a filter.** `05-modules/habits.md` gives
  the All scope *"All active habits, **grouped by Area**"*. That
  organises what is already in the list and removes nothing. The
  difference is the recovery: a filter can produce an empty list and so
  owes a way back; a group header cannot produce one.
- **Search: a claim with no owner.** Search reaches every module
  (`06-flows/retrieval.md`), and its screen is specified in that doc —
  but that doc gives the results list one grouping rule and **no Area
  filter**. So an Area filter in search is asserted here and specified
  nowhere. Either `06-flows/retrieval.md` gains it or this line goes;
  the retrieval lab already found that doc owning a rule the palette
  doc contradicted, so the debt is not unfamiliar.

### Area assignment

Every Task, Habit, and Goal has an `area_id`. The default on
creation is determined by:

- If created via capture, **the Area is Inbox.** The user is not asked
  and the text is not parsed for one (see below).
- If created from a Goal or Protocol, the Area is inherited.
- If created manually, the user picks.

Moving a task to another Area is a `task.reassigned_area` log
entry. It is undoable. **A Goal moves the same way**
(`goal.reassigned_area`, same shape, undoable), because a Goal is a
layer like an Area: its identity is the outcome, and the Area is a
filing decision about that outcome. **A Habit cannot move** — its
cadence and minimum are what make it, and re-filing it would move the
protocol it may belong to.

**There is no `work:` prefix.** An earlier draft of this doc said the
parser "may infer an Area from the text (`work: file taxes` → Work)".
That syntax is specified nowhere else — `04-ai/tier-1-parsing.md`
owns what Tier 1 recognises and lists no Area prefix — and it is in
tension with the flow it would serve: `06-flows/capture.md`'s invariant
is that the user *"does not pick a type, an Area, a date, or a
project"* at capture time. A prefixed capture is the user picking an
Area in the field designed so they need not. The feature is withdrawn
rather than documented.
- Zero protocols (a goal without a plan yet).
- One active protocol.
- Multiple past protocols.

Protocols appear in the Goal detail. The Goal detail shows:

- Current protocol (if any).
- Past protocols with their deltas.
- Linked tasks and habits that serve the goal (via the Area, plus
  explicit links if any).

The Goal detail is where "test one variable" lives: after a
protocol completes with a clear positive delta, the Goal detail
shows the option to run a follow-up protocol.

**The condition is the delta, not the Goal's status.** The follow-up
action is offered when the **most recent completed protocol's delta is
positive** — a read over the reports the detail already lists. It is not
offered because the Goal is `active`, which would also be true of a Goal
reopened after an abandonment whose data never moved.

### Archival

Areas can be archived. Archived Areas:

- Stop appearing as filters.
- Their tasks, habits, and goals remain.
- Are findable in settings.
- **Are restorable.** `area.unarchived` reverses the archive, per
  `02-architecture/data-lifecycle.md`'s invariant that archival is
  reversible everywhere it exists. "Findable in settings" was reaching
  for this and did not say it.

Goals can be marked `achieved` or `abandoned`. Both states:

- Move the Goal out of the active list.
- Keep its protocols and reports.
- Are reversible (`goal.reopened`).

### What Areas and Goals are not

- Not a project management system.
- Not tags. An entity belongs to one Area, not many.
- Not a hierarchy of subtasks. Goals are not "projects"; they
  are outcomes that protocols serve.
- Not a journaling surface. They have no notes of their own
  (notes attach to protocols, not to goals).

## Examples

**Default Areas on first launch.**

    Health
    Work
    Home
    Learning
    (Inbox — for uncategorized tasks)

**A Goal with an active protocol.**

    Improve sleep
      Area: Health
      Status: active
      Current protocol: Sleep protocol (day 18 of 42)
      Past protocols: none
      Linked habits: Same wake time, No screens after 10pm
      Linked tasks: none

**A Goal with past protocols.**

    Learn Japanese
      Area: Learning
      Status: active
      Past protocols:
        - Vocabulary app (14+28 days, delta +0.8) — completed
        - Listening practice (14+28 days, delta +0.2) — abandoned
      Current protocol: (none)
      Action: [Propose a protocol]

**Filtering tasks by Area.**

    Tasks → Filter → Area → Work
    List shows only Work tasks.

**Moving a Goal to another Area.**

    Learn Japanese
      Area: Learning → Work        (changed from the Goal detail)
      Past protocols: 2, unchanged
      Log: goal.reassigned_area { goal_id, area_id }
      Undo: available

    The two past protocols were run while the Goal sat under Learning.
    They move with the Goal, because a protocol belongs to its Goal and
    not to the Area the Goal was filed under that month.

## What this doc must NOT do

- This doc does not define the Area or Goal entities. It defines
  the module (such as it is). Entities are in
  `02-architecture/object-model.md`.
- This doc does not define protocols. Protocols live in
  `05-modules/protocols.md`.
- This doc does not define tokens, gestures, or motion. It
  references them.
- This doc does not define tasks or habits. It defines how Areas
  filter them. Tasks live in `05-modules/tasks.md`; habits in
  `05-modules/habits.md`.
- This doc does not define a dedicated mode. There isn't one.