# Tier 2 — Contextual

## Purpose

This doc defines Tier 2: the inline AI actions that operate on a
focused item. It exists because the highest-value AI in a daily
tracker is not a chat interface — it is a long-press on a task that
does something useful with that specific task, using that task's
context.

Tier 2 is user-initiated. It always proposes. It never executes
without a tap.

## Invariants

- Tier 2 is always user-initiated. There is no ambient Tier 2.
- Tier 2 always produces a proposal. The user taps to apply
  (Rule 1).
- Tier 2 uses the focused item as primary context, plus whatever
  the retrieval layer fetches.
- Tier 2 never modifies an active protocol (Rule 3).
- Tier 2 never generates UI (Rule 2).
- Every Tier 2 call is logged (`ai.proposed`, then `ai.applied` or
  `ai.rejected`).

## Specification

### The invocation

Tier 2 is invoked via long-press on any atom (Task, Event, Note,
Habit). The contextual menu appears (see
`03-experience/gesture-vocabulary.md`). The menu's contents are
item-type-specific.

Keyboard: `Cmd+K` on a focused item.

### The action catalog

Each action is a specific Tier 2 function. The menu shows a subset
based on the item type and state.

**On a Task:**

- **Research this.** Runs web research on the task's subject.
  Returns a note proposal with 3–5 candidates (for shopping) or a
  synthesis (for informational). See
  `04-ai/research-and-protocols.md`.
- **Break this down.** Proposes 2–5 subtasks. Creates a parent
  task with children (Task → Task edge).
- **Reschedule.** Proposes a new due or defer date based on
  current context (calendar density, adjacent tasks, energy).
- **Link person.** Searches People and proposes a Task → Person
  link.
- **Add note.** Opens a note composer attached to the task.
- **Find related.** Runs semantic search over the user's own
  notes, tasks, and events. Returns a list of related items.

**On an Event:**

- **Prep me.** Returns a prep card: attendees (People), when you last
  met each of them, the last note about each, the last completed task
  with each, open tasks linked to each, and any notes attached to the
  event. **This list owns the card's contents** — `05-modules/people.md`
  describes the same card and points here rather than repeating it.
- **Find related.** Semantic search over the user's own data.
- **Reschedule.** Proposes new times, respecting buffer and travel
  time.

**On a Habit:**

- **Why am I slipping?** Analyzes compliance over the recent
  window and proposes an explanation. Does not modify anything.
- **Adjust cadence.** Proposes a new cadence based on compliance
  patterns. Does not apply unless the habit is not part of an
  active protocol (Rule 3).
- **View history.** Opens the compliance view.

**On a Note:**

- **Summarize.** Produces a shorter version of the note.
- **Extract tasks.** Finds actionable items in the note and
  proposes tasks.
- **Find related.** Semantic search.
- **Suggest tags.** (No tags exist in the model; this action is
  listed here as a placeholder and is disabled until tags are
  added via ADR.)

**On a Protocol (at review time only):**

- **Generate report.** Produces the protocol report. See
  `04-ai/research-and-protocols.md`.
- **Suggest adjustment.** Proposes protocol changes for the
  *next* version. Never modifies the active one (Rule 3).

### The proposal shape

Every Tier 2 action returns:

    {
      tier: 2,
      action: string,
      proposal: {
        type: 'text' | 'mutations' | 'note',
        text?: string,
        mutations?: Array<{
          target: string,
          operation: string,
          payload: object,
          explanation: string
        }>,
        note?: {
          body: string,
          attached_to: { type: string, id: ULID },
          metadata?: object
        }
      },
      explanation: string       // one line, why this proposal
    }

The UI renders the proposal:

- **text:** shown in a sheet, with "Copy" and "Dismiss."
- **mutations:** shown as a list of changes, with "Apply" and
  "Cancel."
- **note:** shown as a preview, with "Add as note" and "Cancel."

### The "explanation" field

Every proposal carries a one-line explanation. It is displayed
under the proposal. Rule 4 (always explainable) applies.

Examples:
- "T2 was due Thursday; moving to Friday."
- "Found 4 candidates under $500, newest first."
- "Compliance dropped after the skip on Sep 15."

### Applying a proposal

When the user taps "Apply":

1. The app validates the mutations against the schema.
2. If valid, it appends the corresponding log entries with
   `actor: { type: 'ai', id: 'tier-2' }`.
3. It logs `ai.applied` with `applied_as` listing the entry ULIDs.
4. A five-second undo toast appears (Invariant 1).
5. The proposal sheet dismisses.

If invalid, the app shows an error and does not apply. The AI is
retried or the error is surfaced.

### Research specifics

"Research this" is the most complex Tier 2 action. Its full
specification lives in `04-ai/research-and-protocols.md`. In brief:

1. Tier 2 receives the task.
2. It calls the `research` tool (see `04-ai/retrieval-layer.md`)
   with a query derived from the task title and description.
3. The research tool runs web search (cloud) and synthesizes.
4. Tier 2 wraps the result in a note proposal.
5. The user reviews and taps "Add as note."

The note is attached to the task. Its results carry `retrieved_at`
and `source` (Invariant 4).

### Costs and metering

- Most Tier 2 actions cost 1 unit.
- "Research this" costs 50 units and is metered separately
  (see `07-infrastructure/cost-model.md`).
- The user sees a running total in settings if they want it.

### Where a result lands

**A result lands in the surface it was invoked from.** Long-pressing a row in a list
opens the contextual menu as a sheet and the result appears in a sheet with it, because
a list row has no surface for a card to land in. Long-pressing the same atom **inside
its detail** puts the result there instead, inline, because the detail is the surface the
result is about.

Inline matters more than it looks. `03-experience/app-shell.md` allows at most one sheet
at a time, so a result shown in a sheet would dismiss the very detail it was asked about
and leave the card sitting over a long-press menu. And a detail is where the room is: an
event detail draws well under half its body before the card arrives, and the card is what
the rest of that space is for.

This is also why a detail offers an **invitation** rather than the result itself. Tier 2
has no ambient mode (Invariants), so the card cannot be present until it is asked for.
The invitation names what the card would read, and the card replaces it in place.

### Fallbacks

If Tier 2 cannot produce a proposal (e.g., research returns
nothing, or the model is offline):

- The action shows an error message where the result would have
  landed — in the detail it was invoked from, or in the sheet:
  "Couldn't complete. Try again?"
- No partial proposals are shown.
- The user can dismiss and try later.

## Examples

**Research this (a shopping task).**

    User long-presses task T1: "Buy standing desk."
    Menu appears. User taps "Research this."

    Tier 2 calls research({ query: "standing desk under $500,
      good for small apartment, adjustable height" }).

    Research returns 4 sources with timestamps.

    Proposal:
      {
        type: 'note',
        note: {
          body: "## Standing desk options (as of 2026-09-22)
                1. **Autonomous SmartDesk Core** — $399
                   [link] — Best overall for small spaces
                2. **Fully Jarvis Bamboo** — $549
                   [link] — Above budget, best build quality
                3. **IKEA Idåsen** — $299
                   [link] — Cheapest, limited height range
                4. **Branch Duo** — $449
                   [link] — Best for standing-only use
                *Prices as of 2026-09-22. Refresh for current.*",
          attached_to: { type: 'task', id: 'T1' }
        },
        explanation: "Found 4 options under or near $500."
      }

    User taps "Add as note." Note attaches to T1.
    Undo toast appears.

**Break this down.**

    User long-presses task T1: "Plan Sarah's birthday."
    User taps "Break this down."

    Proposal:
      {
        type: 'mutations',
        mutations: [
          { target: 'task:new',
            operation: 'create',
            payload: { title: "Pick a date", parent_task_id: 'T1',
                       area_id: <same as T1> },
            explanation: "First step: decide when." },
          { target: 'task:new',
            operation: 'create',
            payload: { title: "Book venue or restaurant",
                       parent_task_id: 'T1' },
            explanation: "Depends on the date." },
          { target: 'task:new',
            operation: 'create',
            payload: { title: "Send invites", parent_task_id: 'T1' },
            explanation: "After venue is booked." },
          { target: 'task:new',
            operation: 'create',
            payload: { title: "Order cake", parent_task_id: 'T1' },
            explanation: "Close to the date." }
        ],
        explanation: "Four steps for planning a birthday."
      }

    User taps "Apply." Four subtasks created, linked to T1.
    Undo reverses all four atomically.

**Prep me (an event).**

    User long-presses event E1: "Design review with Sarah."
    User taps "Prep me."

    Proposal:
      {
        type: 'text',
        text: "**Design review with Sarah — 11:00 today**

               **Last talked:** 3 weeks ago (Sep 1, coffee)
               **Last note about Sarah:** 'She mentioned wanting
                 to review the onboarding flow before we ship.'
               **Last completed task with Sarah:** 'Send Sarah
                 the mockups' (Sep 8)
               **Open tasks linked to Sarah:** 1
                 - 'Get feedback on pricing page' (due Friday)

               **Suggested focus:** Follow up on the onboarding
                 flow she mentioned."
      }

    Shown in a sheet. User can copy or dismiss. No mutations.

**Why am I slipping? (a habit).**

    User long-presses habit H1: "Meditate."
    User taps "Why am I slipping?"

    Tier 2 calls query_compliance({ habit_id: 'H1',
      window: { start: '2026-09-01', end: '2026-09-22' } }).

    Proposal:
      {
        type: 'text',
        text: "Compliance over 22 days: 12 of 22 (55%).
               You hit it on 10 of 11 weekdays, 2 of 11 weekends.
               Slipping is concentrated on weekends.
               Suggestion: consider a minimum-viable version for
               weekends (e.g., 1 minute instead of 10)."
      }

    No mutations. Just an insight.

## What this doc must NOT do

- This doc does not define the constitution. It references Rules
  1, 2, 3, and 4. The rules live in
  `04-ai/constitution.md`.
- This doc does not define research behavior in full. It
  references the research tool. The full spec lives in
  `04-ai/research-and-protocols.md`.
- This doc does not define the gesture. It defines what happens
  after long-press. The gesture lives in
  `03-experience/gesture-vocabulary.md`.
- This doc does not define Tier 1 or Tier 3. They are separate
  docs.
- This doc does not define the retrieval layer. It references
  tools. The retrieval layer lives in
  `04-ai/retrieval-layer.md`.
- This doc does not define UI rendering of proposals. It defines
  the proposal shape. Rendering is per-screen.