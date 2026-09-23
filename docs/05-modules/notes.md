# Notes

## Purpose

This doc defines the Notes module: the surface where bodies of text
live. It exists because notes are the app's connective tissue — they
attach to tasks, events, habits, protocols, people, and days, and
they are what the AI reads when it needs narrative context.

Notes are the only module that exists in two places: as a home (a
list and editor) and as an attachment (something every other module
can have).

## Invariants

- Every note attaches to exactly one entity: a Task, Event, Habit,
  Protocol, Day, or Person (edge 11,
  `02-architecture/object-model.md`).
- A note cannot be unattached. It can be reattached
  (`note.reattached`).
- The Daily Note (`02-architecture/day-as-unit.md`) is a Note
  attached to a Day. It is created automatically, one per day.
- A Day may have additional Notes attached (reviews, retrospective
  entries). The Daily Note is the auto-created one; the model permits
  many Notes per Day (edge 11).
- Notes are markdown. No rich text, no embeds, no attachments
  (files are out of scope; see "What this doc must NOT do").
- **Notes do not contain images.** Attachment support is out of
  scope for v1.
- Notes are local-first by default (see
  `02-architecture/local-first.md` and ADR 0008).
- Note search is semantic
  (`04-ai/retrieval-layer.md`).

## Specification

### Scopes

- **Recent.** Notes edited in the last 14 days, newest first.
- **All.** All notes, filterable by attachment type, by Area, by
  Person.
- **Daily.** Only Daily Notes, one per day. Notes attached to a Day
  by other flows (reviews, retrospectives) appear under Recent and
  All.

**"One per day" needs its filter stated.** `note.created` and
`day.note_created` both produce a Note whose attachment is a Day, so
the Daily scope is only "one per day" if it filters on **which event
created the note**. If it filters on the attachment it is not one per
day at all: `06-flows/capture.md` attaches every unparsed capture to
**today's Day**, so a single morning's captures put a dozen notes on
today and the scope that promises one shows them all. That filter is
also the distinction between "the Daily Note" and "a note attached to
a Day", which the prose uses interchangeably and the UI would have to
teach with no name for it.

### Empty states

The form is `03-experience/states.md`; the action repairs the cause
(`05-modules/tasks.md`).

| Scope, empty | Headline | Detail line | Action |
|---|---|---|---|
| **Recent** | Nothing written lately. | The last 14 days of notes, newest first. | New note |
| **All** | Nothing written. | A note attaches to a task, a person, a day, or a protocol. | New note |
| **Daily** | — | — | — |

**The Daily scope is never empty.** A Daily Note is created for every
Day at rollover (`day.note_created`,
`02-architecture/day-as-unit.md`), so the scope always holds at least
today's. This is the same reason the Calendar has no whole-view empty
state (`05-modules/calendar.md`).

The **New note** action opens the attachment target picker rather than
a bare editor, because a note without a parent is not a thing this app
has (`05-modules/notes.md`, Attaching and reattaching).

**This contradicts the app's other way of writing a note.**
`06-flows/capture.md` creates a note with `note.created` "attached to
today's Day by default" and closes with "**Does not require the user
to pick anything.**" So the app already has a default parent for a
note — **today's Day** — and this action is the one place that refuses
to use it. The two docs disagree about whether writing a note requires
a decision, and the justification above ("a note without a parent is
not a thing this app has") is what capture disproves. Either the
picker stays and capture gains one, or the picker offers **Today** as
a pre-selected default and keeps "Pick something else…" for the
minority case.

### The note row

    Title (or first line)                   [attachment chip]
    First two lines of body…
    Edited 2d ago

- **Title.** Optional. If empty, the first line of the body is
  used.
- **Preview.** Two lines, `type-callout`, `text-secondary`.
- **Attachment chip.** Shows where the note lives:
  "→ Buy standing desk" (task), "→ Sarah" (person), "→ Today"
  (day), "→ Sleep protocol" (protocol).

Row height is `row-rich` (72px).

**The row does not fit its own height.** At the token sizes in
`03-experience/design-tokens.md` the three text parts are 24px
(title, `type-title-3`) + 40px (preview, `type-callout` ×2) + 18px
(stamp, `type-footnote`) = **82px**, before any row padding. Drawn at
its natural height the row is **111px**, so a 700px phone shows 6
notes rather than 9.

There are three ways out and the doc must pick one: `row-rich`
becomes a **minimum** rather than a height (which re-sizes every rich
row in the app), the preview is **one line**, or the **stamp** goes.
This is arithmetic, not taste — the height and the parts cannot both
be honoured.

**The header line can spend its width twice.** For a note attached to
a task, the chip is the task's title: the doc's own example is a row
titled "Plan Sarah's birthday" whose chip reads "→ Plan Sarah's
birthday". The chip names the **entity** it is attached to, not the
entity's title — "→ Sarah", not "→ Plan Sarah's birthday".

### Surfaces

**List.** Recent / All / Daily.

**Editor.** A markdown editor. Title field at top, body below.
Autosaves on blur and every 5 seconds while typing
(`note.edited`). No save button.

**The autosave rate is a log decision nobody has made.**
`02-architecture/event-log.md` defines `note.edited` as
`{ note_id, body, title? }` — the **whole body**, not a diff — and
states no coalescing rule, and the log is append-only. So ten minutes
of writing produces **120** entries carrying the whole document, an
hour produces **720**, and the note editor becomes the app's only
surface whose write rate is set by a timer. `04-ai/retrieval-layer.md`
never says when embeddings are recomputed either, so nothing states
whether typing re-embeds the note. **Both need a decision** — the
natural one being that consecutive saves in one editing session are
superseded rather than appended, and that the index rebuilds on blur.

**The body has no reversal and the attachment does.** Reversibility is
one of the four invariants, and the body is the only content in the
app a user writes by hand — yet §Reattaching gives the *attachment* an
undo toast and the body has nothing, while saving itself unattended.
The 5-second ticks are the undo stack if anyone wants them to be.

**Note detail (read-only mode).** For notes attached to other
entities, the attachment's detail shows the note preview. Tapping
opens the editor.

**This heading contradicts its own sentence** — a "read-only mode"
whose first behaviour is "tapping opens the editor" is a preview, not
a mode. The surface also makes the Note the app's most-rendered atom:
the doc's own count of the Daily Note's homes is wrong for the same
reason (see §The Daily Note).

**Generated notes need one rule, and there are two of them.**
`05-modules/review.md`'s weekly review and `05-modules/protocols.md`'s
protocol report are both Notes written by the app, and both are required
to cite their sources — the review by Invariant 4, the report by
`04-ai/research-and-protocols.md`'s report structure. Both citations live
in the note body, and the note body is editable, so the requirement is
currently enforced by nothing.

The rule, stated once here and applied by both:

> A **generated** note's Sources block is part of the artefact, not the
> body. The user may edit it — the note is theirs — and `note.edited`
> records the change. What the block may not contain is a **relative**
> freshness claim ("calendar as of 2 hours ago"), because a relative
> claim inside a stored document is wrong by exactly the time since it
> was written. Record the snapshot moment, and say what was true then.

**Search.** Semantic search across notes, accessible via the
command palette or a search field in the Notes mode.

### The Daily Note

One per day, created automatically at day rollover
(`02-architecture/day-as-unit.md`).

- Title defaults to the date: "Tue, Sep 22."
- Body starts empty.
- The Daily Note is the AI's natural context anchor
  (`04-ai/retrieval-layer.md`).
- It is not a journal in the "diary" sense. It is a scratchpad and
  a log. The user may write anything or nothing.

The Daily Note appears in three places:

1. The Notes mode (Recent and Daily scopes).
2. The Calendar's Day view (as a preview card).
3. The shutdown flow (`06-flows/shutdown.md`).

**That is three surfaces across two homes, and the list has four
items.** Item 1 names two scopes, which are both the Notes mode — so
the cut is either "three surfaces" or "four places", and the count has
to pick one. The same shape of error appeared in the Calendar, where
three docs described three different features under one name.

### Attaching and reattaching

Notes are created with an attachment:

- From a task detail: "Add note" → new note attached to the task.
- From an event detail: same.
- From a habit detail: same.
- From a protocol detail: same.
- From a person detail: same.
- From the Notes mode: pick an attachment target (search).

Reattaching: from the note editor's overflow menu, "Move to…"
opens a target picker. Logs `note.reattached`.

### Markdown

Supported:

- Headings (`#`, `##`, `###`).
- Bold, italic, strikethrough.
- Lists (ordered, unordered).
- Links (`[text](url)`).
- Block quotes.
- Inline code and code blocks.
- Checkboxes (`- [ ]`, `- [x]`).

Not supported:

- Tables (rarely needed, expensive to render on mobile).
- Images (see "What this doc must NOT do").
- Embeds (no iframes, no rich previews).

Links render as tappable. External links open in the system
browser.

### Auto-linking

If the body contains a Person's name, the name renders as a
tappable link to that person. This is a *free-text mention*, not a
canonical edge (`02-architecture/object-model.md`). The link is
visual only; it does not appear in the graph.

To avoid false positives on common words that are also names (Will,
Grace, Mark, Rose, etc.), auto-linking requires **both** of these
conditions:

1. The name appears in Title Case exactly as it does in the People
   list.
2. The Person has appeared in a prior interaction (task, event, or
   note) within the last 90 days.

If either condition fails, the name renders as plain text.

**These two conditions fix two different errors, and only one of them
is a property of the text.** Condition 1 prevents the *generic-word*
error ("Mark the checkbox as done") and depends on the body and the
People list, both of which are in the log. Condition 2 prevents the
*stale-person* error and depends on **today's date** — so a note is not
a stable document. Identical bytes link a name on day 20 since last
contact and do not on day 111, with no signal to the reader that a link
was suppressed. That is the **freshness** invariant ("never shown a
value that silently changed") applied to the module whose entire
content is the value.

**Recency belongs in disambiguation, not in rendering.** Its real use
is choosing *which* Person when two share a name — a case this section
does not mention. As a render gate it makes every note's appearance a
function of the wall clock, and no projection can reproduce it from
the log alone. Condition 1 should decide candidacy, position ("Mark
the…", sentence-initial) should decide not-a-name, and recency should
tiebreak.

Auto-linking is a display feature. The user can disable it in
settings (`auto_linking.enabled`).

### Extraction

Notes support one AI action: "Extract tasks" (Tier 2,
`04-ai/tier-2-contextual.md`). It scans the note for actionable
items and proposes tasks. Proposed tasks are previewed and applied
with consent.

This is the only AI action that creates new entities from a note.

### Freshness

Notes are local. No freshness metadata is required, except for
notes that were generated by research or AI
(`04-ai/research-and-protocols.md`). Those carry `retrieved_at`
and `source` per row within the note body.

## Examples

**A note attached to a task.**

    Title: (empty)
    Body: "She mentioned wanting to try pottery. Look for
           beginner classes in the area."
    Attached to: Task "Plan Sarah's birthday"
    Chip: → Plan Sarah's birthday

**The Daily Note.**

    Title: Tue, Sep 22
    Body: "Felt sharp this morning. The contractor called — tile
           arrives Friday. Idea: try a standing desk."
    Attached to: Day 2026-09-22

**Auto-linking, correctly applied.**

    Body: "Ask Mark about the pricing page before Friday."
    Mark is in People, was linked in a task 20 days ago.
    "Mark" renders as a link.

**Auto-linking, correctly skipped.**

    Body: "Mark the checkbox as done, then archive."
    "Mark" is Title Case but Mark (person) has not appeared in the
    last 90 days.
    Renders as plain text.

**Extracting tasks.**

    User opens a note about a project.
    Long-press → "Extract tasks."
    Tier 2 returns:
      - "Email Sarah about pricing" (no date)
      - "Draft the spec" (no date)
      - "Review with Mark" (no date)
    User selects two, taps "Apply."
    Two tasks created, attached to the same Area as the note's
    parent (if any) or Inbox.

**Searching semantically.**

    User (in command palette): "what did I write about the
      kitchen renovation?"
    semantic_search({ query: "kitchen renovation" }) returns 4
    notes, 1 task, 2 events.
    Results shown with a one-line "why this matched" for each.

**Reattaching a note.**

    User opens a note attached to Task A.
    Overflow → "Move to…"
    Picks Task B.
    Logs note.reattached.
    Chip updates: → Task B.
    Undo toast appears.

## What this doc must NOT do

- This doc does not define the Note atom. It defines the module.
  The atom is in `02-architecture/object-model.md`.
- This doc does not define attachments or file uploads. Those are
  out of scope; a Note is a body of text. If files are added
  later, they require an ADR.
- This doc does not support images in note bodies. A future ADR
  could add them, but v1 does not.
- This doc does not define AI behavior beyond "Extract tasks." It
  references Tier 2.
- This doc does not define search internals. Search lives in
  `04-ai/retrieval-layer.md`.
- This doc does not define the Daily Note's role in the AI's
  context beyond a reference. Context assembly lives in
  `04-ai/retrieval-layer.md`.
- This doc does not define tokens, gestures, or motion. It
  references them.