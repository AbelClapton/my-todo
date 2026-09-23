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

**That second sentence forbids an affordance this doc specifies.**
§Person creation's path 1 is a `+` on the People list that creates a
Person from a name field with **no links**, and §Empty states explains
arrival the opposite way: "People appear here when you link them to a
task, an event, or a note." A Person can therefore exist without links
but cannot arrive without them, and archival removes a Person from a list
of People — three places reading the entity as an atom.

**The enforceable half of the claim is about content.** A Person carries
a name, a `source`, and a lifecycle; it has no field that a link cannot
produce. That is checkable against `02-architecture/object-model.md`, it
is what §The prep card's "adds no data" depends on, and it is the
sentence that actually stops this module becoming a CRM. "Does not exist
on its own" is not testable, which is why the rest of the doc reads past
it — and why the unlinked Person has no designed row (the `[last]` slot
and the counts line are both derived from links).
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

**The row is 3px over its height**, and the two lines are not the
reason: name 20 + meta 18 = 38px of text, plus 9px of padding twice, a
2px gap and a 1px border = **59px** in a **56px** row. No doc subtracts
the chrome. This is the smallest of three such overruns found by the
labs — `row-rich` by 34px for the note row, `row-hero` by 14px for the
protocol card — and the overrun tracks the rows' complexity, which is
the tell that the arithmetic was never done rather than that these
three tokens are individually wrong.

**"Involving them" is undefined, and it is the field's whole meaning.**
Tasks and events **link** to a Person (edges 2 and 5); notes are
**attached** (edge 11), and `05-modules/notes.md` says a note attaches to
exactly one entity. So for a task or an event, one hop. For a note, it
depends whether the walk is direct (the note's own attachment is this
Person) or transitive (the note is attached to a task that is linked to
this Person). **This doc uses both readings**: §The prep card reports
"She mentioned wanting to try pottery" as Sarah's **last note**, and that
exact sentence is `notes.md`'s example of a note attached to a **task**.
One reading must be chosen, and the choice decides how useful the prep
card is — a card that cannot see the pottery note forgets the one thing
the user wanted to remember.

**The field has three names.** The row says `[last: 3w ago]`, §Surfaces'
detail example says "Last talked", and this bullet says "Last activity".
One of them should survive.

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

Tier 2's "Prep me" action on an event produces a text card, and
`04-ai/tier-2-contextual.md` owns its contents. What matters here is
that **every field of it comes out of the People graph**: attendees,
when you last met each of them, the last note and the last completed
task for each, and the open tasks linked to each. The card needs no
store of its own and adds no data.

This is the highest-value feature of the People module. It is
enabled by the graph, not by a separate data store.

### Resurfacing

The People module surfaces quiet People weekly
(`06-flows/resurfacing.md`). The user can mark a Person as "worth
maintaining" (default: on) or "not important" (default: off).
Only "worth maintaining" People resurface.

Resurfacing fires as a nudge, subject to the attention budget
(`03-experience/attention-budget.md`).

**Quiet and the nudge are two different answers to one question.**
This doc makes **Quiet** a scope — "People with no activity in > 30 days
(opt-in view)" — which shows **all** of them. `06-flows/resurfacing.md`
fires a **weekly** nudge over the same threshold, and states no cap: the
forgotten-captures surface two sections earlier caps at "top 5 by age",
while people resurfacing has neither a cap nor an ordering. With 50 quiet
people and one subject per firing, the same person comes round every 50
weeks. Either the scope and the nudge are the same list (and the nudge is
a notification about it) or they are two surfaces, and the doc should say
which.

### Contacts sync

Settings toggle: "Sync contacts" (`integration.contacts.enabled`,
`02-architecture/event-log.md`). When enabled:

- The app reads the contacts list via the platform API.
- Matching is by name + phone/email where available.
- No contact data is sent to the server
  (`02-architecture/local-first.md`).
- The user can select which contacts to import.

**Matching states what to match on and not what a match does.** There is
no resolution rule, so nothing says whether a contact matching an existing
Person links to them or creates a second record — and `person.renamed`
exists, so a Person the user renamed in the app can fail to match on the
next sync. The rule should be ordered and one-sided: **match on phone,
then email, then exact name; a match links, never creates.**

**This is the app's only bulk creation and it has no bulk reversal.**
§Invariants: "Person deletion is not supported; only archival." A single
import writes hundreds of Person records — the largest write the app can
perform, into a local-first store — and undoing it needs one archive per
Person, from a detail screen. **Reversibility** is one of the app's four
invariants and every other operation honours it. The import should either
carry its own identity so the set can be archived as a set (a batch field
on `person.created`, which is an ADR) or be presented with the count it
will write *before* the write.

One consequence of the default belongs on this screen rather than a
Settings doc: "worth maintaining" defaults to **on** for every Person
(`06-flows/resurfacing.md`), so importing 300 contacts opts 300 people into
weekly resurfacing. Import is how the People graph is seeded, and it is
also what makes its nudge unbounded.

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