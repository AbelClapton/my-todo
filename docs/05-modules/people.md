# People

## Purpose

This doc defines the People module: the surface where the humans
in the user's life are represented and linked to tasks, events, and
notes. It exists because People is the app's connective layer for
relationships — the feature that makes "prep me for a meeting" and
"when did I last talk to Sarah" possible.

People is not a CRM. It is a lightweight entity that connects the
other modules.

## Invariants

- A Person is a layer, not an atom
  (`02-architecture/object-model.md`). It does not exist on its
  own; it classifies links.
- A Person links to Tasks, Events, and Notes via canonical edges
  2, 5, and 11. No other edges.
- Person data is local-first
  (`02-architecture/local-first.md`).
- Contacts sync is one-way (contacts → app). The app does not
  write back.
- Person deletion is not supported; only archival.

## Specification

### Scopes

- **All.** All active People, sorted by recent activity.
- **Recent.** People with activity in the last 30 days.
- **Quiet.** People with no activity in >30 days (opt-in view;
  see `06-flows/resurfacing.md`).

### Empty states

The form is `03-experience/states.md`; the action repairs the cause
(`05-modules/tasks.md`).

| Scope, empty | Headline | Detail line | Action |
|---|---|---|---|
| **All** | Nobody added. | People appear here when you link them to a task, an event, or a note. | Add a person |
| **Recent** | Nobody added. | Activity in the last 30 days puts someone here. | Add a person |
| **Quiet** | Everyone's current. | This is where people go when you have not touched anything of theirs in a month. | **None** |

**Quiet carries no action, and it is the second such surface in the app.**
A quiet list with nobody in it is good news, so there is nothing to repair
— which is why the headline states the good news rather than the absence,
and why the same reasoning that gives Someday no action
(`05-modules/tasks.md`) applies here. `03-experience/states.md` now lists
both exceptions and holds the count at two.

### The person row

    Sarah Chen                              [last: 3w ago]
    2 open tasks · 1 upcoming event

- **Name.**
- **Last activity.** Most recent task, event, or note involving
  them.
- **Links summary.** Counts.

Row height is `row-default` (56px).

### Surfaces

**List.**

**Person detail.** Name, links (tasks, events, notes), recent
activity timeline, and notes attached to the person.

**Person picker.** Used when linking a task or event to a person.
Search-by-name, with a "New person" option.

**Link editor.** From a task or event, "Link person" opens the
picker.

### Person creation

Two paths:

1. **Manual.** From the People list, tap `+`. Form: name.
2. **Contacts import.** Settings offers a one-time import. Users
   select which contacts to include; the app does not import
   silently.

A Person created manually has `source: 'manual'`. A Person created
from contacts has `source: 'contacts'`.

### Linking

Tasks and events can be linked to People. Links are logged as
`task.linked_person` / `calendar.linked_person` and unlinked as
`task.unlinked_person` / `calendar.unlinked_person`.

Notes are attached to People (edge 11) like any other attachment.
A note attached to a Person is about that Person.

### The prep card

Tier 2's "Prep me" action on an event produces a text card
(`04-ai/tier-2-contextual.md`). It reads from the People graph:

- Attendees (linked People).
- Last note about each attendee.
- Last completed task with each attendee.
- Open tasks linked to each attendee.

This is the highest-value feature of the People module. It is
enabled by the graph, not by a separate data store.

### Resurfacing

The People module surfaces quiet People weekly
(`06-flows/resurfacing.md`). The user can mark a Person as "worth
maintaining" (default: on) or "not important" (default: off).
Only "worth maintaining" People resurface.

Resurfacing fires as a nudge, subject to the attention budget
(`03-experience/attention-budget.md`).

### Contacts sync

Settings toggle: "Sync contacts" (`integration.contacts.enabled`,
`02-architecture/event-log.md`). When enabled:

- The app reads the contacts list via the platform API.
- Matching is by name + phone/email where available.
- No contact data is sent to the server
  (`02-architecture/local-first.md`).
- The user can select which contacts to import.

Sync is manual (a button) or periodic (weekly). The app does not
poll.

### Archival

People can be archived. Archived People:

- Stop appearing in All and Recent.
- Stop resurfacing.
- Remain in the log.
- Their linked tasks, events, and notes remain.

The user can re-activate at any time (`person.unarchived`,
`02-architecture/event-log.md`).

## Examples

**A person detail.**

    Sarah Chen

    Recent activity
      Sep 1  — Coffee (event)
      Sep 8  — Sent mockups (task, completed)
      Sep 14 — Note: "She mentioned wanting to try pottery."

    Open tasks (2)
      [ ] Get feedback on pricing page        due Fri
      [ ] Send revised mockups                no date

    Upcoming events (1)
      Sep 22  Design review                   11:00

    Notes
      "She mentioned wanting to try pottery. Look for beginner
       classes in the area."

**Prep me.**

    User long-presses event E1: "Design review with Sarah."
    Taps "Prep me."
    Tier 2 returns:
      Last talked: 3 weeks ago (Sep 1, coffee)
      Last note: "She mentioned wanting to try pottery."
      Last completed task: "Send Sarah the mockups" (Sep 8)
      Open tasks: 2
      Suggested focus: Follow up on the onboarding flow.

**Resurfacing.**

    Monday morning:
    "You haven't talked to Sarah in 6 weeks. Worth reaching out?"
    [Add a task] [Dismiss]
    Tap "Add a task" → capture field prefilled: "Reach out to
      Sarah."

## What this doc must NOT do

- This doc does not define the Person entity. It defines the
  module. The entity is in `02-architecture/object-model.md`.
- This doc does not define contact sync implementation. It lives
  in `07-infrastructure/integrations.md`.
- This doc does not define the prep card content generation.
  That is Tier 2, in `04-ai/tier-2-contextual.md`.
- This doc does not define the resurfacing flow. It lives in
  `06-flows/resurfacing.md`.
- This doc does not define tokens, gestures, or motion. It
  references them.
- This doc does not define CRM features (deal stages, notes
  history, reminders). People is a connective entity, not a CRM.