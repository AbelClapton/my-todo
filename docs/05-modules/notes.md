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

### Surfaces

**List.** Recent / All / Daily.

**Editor.** A markdown editor. Title field at top, body below.
Autosaves on blur and every 5 seconds while typing
(`note.edited`). No save button.

**Note detail (read-only mode).** For notes attached to other
entities, the attachment's detail shows the note preview. Tapping
opens the editor.

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