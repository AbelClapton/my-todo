# Areas and Goals

## Purpose

This doc defines two related layers: Areas (life domains) and Goals
(outcomes under Areas). They are grouped in one doc because they
are structurally similar — both classify other entities, both have
no independent existence, and both are accessed through the same
surfaces.

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
- Areas and Goals do not appear in any mode's navigation. They are
  filters and parents, not destinations.

## Specification

### Areas

An Area is a life domain. Examples: Health, Work, Home, Learning,
Relationships.

- Areas are user-created. The app seeds four defaults on first
  launch: Health, Work, Home, Learning. The user can rename,
  delete, or add.
- There is a built-in "Inbox" Area for uncategorized tasks. It
  cannot be deleted.
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

**Area filter.** In the Tasks and Habits modes, a filter by Area.

**Area list.** In settings, a list of Areas with rename,
archive, and delete actions.

**Goal list.** Accessible from Settings, from the command palette
("Show goals"), and from any protocol detail (tapping the parent
goal). Each Goal shows its active protocol (if any) and its history.

**Goal detail.** Name, Area, active protocol, past protocols,
linked tasks and habits.

**Goal creation.** From the Protocol proposal flow or from the
Goal list.

### Filters

Where Areas appear as filters:

- Tasks mode: filter by Area.
- Habits mode: filter by Area.
- Notes mode: filter by Area (via the note's attachment chain).
- Search: filter by Area.

Areas are not a scope. They are a filter on existing scopes.

### Area assignment

Every Task, Habit, and Goal has an `area_id`. The default on
creation is determined by:

- If created via capture, the parser may infer an Area from the
  text ("work: file taxes" → Work). If unsure, Inbox.
- If created from a Goal or Protocol, the Area is inherited.
- If created manually, the user picks.

Moving a task to another Area is a `task.reassigned_area` log
entry. It is undoable. Habits and Goals are assigned an Area once
at creation and cannot be moved; to change their Area, archive
and recreate them.

### Goals and protocols

A Goal can have:

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

### Archival

Areas can be archived. Archived Areas:

- Stop appearing as filters.
- Their tasks, habits, and goals remain.
- Are findable in settings.

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