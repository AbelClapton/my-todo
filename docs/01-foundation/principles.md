# Principles

## Purpose

This doc defines the four invariants that every screen, action, AI
behavior, and piece of code must respect. They are called invariants
because they are not preferences — they are the contract. If a design
or implementation violates one, the design or implementation is wrong,
not the invariant. Changing an invariant requires an ADR
(`08-decisions/`), not an edit to this doc.

The four invariants exist because the app has enough surface area now
that inconsistency is the primary failure mode. A tracker with five
modules and an AI can be coherent, or it can be a collection of
features that each work in isolation. The invariants are what make it
the former.

## Invariants

There are exactly four. They are numbered for reference. They do not
have priority order — all four apply to every surface.

1. **Reversibility.** Every action is undoable.
2. **Explicit consent.** AI proposes; the user disposes.
3. **Attention budget.** The app never exceeds the user's capacity to
   notice.
4. **Freshness.** Synced and AI-gathered data is always labeled with
   its age.

## Specification

### Invariant 1 — Reversibility

**Statement.** Every action that changes state — user or AI — is
undoable for five seconds with a visible countdown. No confirmation
dialogs. Ever.

**Why.** Confirmations are where trust dies. They interrupt, they
insult the user's competence, and they train people to tap "yes"
without reading. Undo is where trust lives: it lets the user act
freely, because the cost of a mistake is near zero.

**Rules.**

- Every mutating action shows a five-second undo toast with a
  countdown ring. Tapping the toast reverses the action.
- Confirmation dialogs are prohibited for all actions except the
  following four, which end something consequential: deleting the
  account (irreversible), revoking calendar sync (irreversible),
  abandoning an active protocol (ends an experiment), and signing
  out all devices (affects devices the user is not holding). Every
  other action is undoable for five seconds instead.
- AI actions that mutate state (applying a proposed schedule,
  adopting a protocol, applying a research note) are subject to the
  same rule. They are append-only events (`02-architecture/event-log.md`)
  and reversible by appending a compensation event.
- The undo window is not configurable. Five seconds is the standard.
- The undo toast does not block the UI. The user can continue working
  while it is visible; if it disappears, the action stands.

**Examples.**

- User swipes a task to complete. A five-second toast appears:
  "Completed. Undo?" User keeps working; the toast fades.
- User asks the assistant to reschedule Thursday's tasks to Friday.
  The assistant proposes a list of mutations. User taps "apply."
  A single toast appears covering all mutations: "Moved 4 tasks.
  Undo?" Undo reverses all four as one atomic operation.
- User deletes a note. Five-second toast. Undo restores it with its
  links intact.

**Violations.**

- A confirmation dialog asking "Are you sure you want to delete this
  task?" — violates, because it should be undo-able instead.
- A destructive action with no undo path ("this cannot be undone") —
  violates, unless the action is one of the four confirmed actions
  listed above (account deletion, calendar sync revocation, protocol
  abandonment, signing out all devices).
- Undo that reverses only part of a multi-step AI action — violates,
  because the user's mental model is the whole action, not its parts.

### Invariant 2 — Explicit consent

**Statement.** The AI produces text and mutation proposals. It never
executes a state change without a user tap. It never generates UI. It
never modifies an active protocol, a metric definition, or an active
habit without explicit consent.

**Why.** Trust in AI features is built entirely on reversibility and
predictability. An AI that acts on its own is one that will eventually
act wrongly, and the user's response will be to disable it entirely.
An AI that proposes is one the user can rely on, because the user is
always the final decision.

**Rules.**

- Tier 1 (ambient parsing) may apply its output silently if confidence
  is above threshold, but the result must be shown with a "parsed"
  chip the user can tap to correct. This is the *only* context where
  the AI mutates state without a discrete tap.
- Tier 2 (contextual) and Tier 3 (assistant) always propose. The user
  taps to apply.
- The AI never generates UI. It produces text (for display) and
  mutation proposals (structured data). The app renders both.
- The AI never modifies a metric definition, a protocol's hypothesis,
  or a protocol's habit list while that protocol is active. These are
  immutable during the active window; changes are new protocol versions.
- The AI never adds a module, entity, edge type, or integration. Those
  are product decisions, not AI decisions.
- Every AI proposal is explainable in one line. If the AI cannot
  explain *why* it is proposing this, it does not propose it.

**Examples.**

- User types "dentist Tuesday 3pm every 6 months." Tier 1 parses this
  into a task with a reminder and a recurrence rule. The input field
  morphs to show the parsed result with a "parsed" chip. Confidence
  was high, so no confirmation was required. If the user taps the
  chip, they can correct the parse.
- User long-presses a task and taps "Research this." The AI returns
  a note proposal with 3–5 candidates. The note does not appear until
  the user taps "Add as note." If they do not tap, nothing happens.
- User asks the assistant "move everything Thursday to Friday." The
  assistant returns "I'll move 4 tasks: [list]. Apply?" The user taps.
  A single undo toast appears (Invariant 1).

**Violations.**

- The AI silently schedules a task on the user's calendar — violates.
- The AI generates a chart, a card layout, or a component — violates.
- The AI, mid-protocol, notices low compliance and removes a habit
  from the protocol — violates. It may *suggest* a change at the
  review date, but not during the active window.
- The AI adds a new field to the note schema to store research
  results — violates. Schema changes are product decisions.

### Invariant 3 — Attention budget

**Statement.** Every surface that wants the user's notice enters a
single ranked queue. The queue fires at most one nudge per hour. The
now line always wins. The only daily obligations are habit checkboxes
and protocol metric logging.

**Why.** The app has, by design, many surfaces that could notify:
the now line, contextual nudges, prep cards, the forgotten surface,
people resurfacing, protocol metric logging, habit checkboxes, the
morning plan, the shutdown ritual, the what-slipped digest, the
weekly review, protocol reviews, price-drop alerts, the inbox sort
ritual. That is fifteen surfaces competing for attention. A user can
absorb maybe three per day. Without a budget, the app becomes noise,
and noise is why people delete trackers.

**Rules.**

- All notification-worthy surfaces register with a single attention
  queue. Nothing fires outside the queue.
- The queue ranks candidates by: urgency (time-sensitive first),
  relevance (tied to a current focus), novelty (has not appeared
  recently), and user history (dismissed surfaces are downranked).
- Maximum one nudge per hour. Maximum three per day, excluding the
  now line and the two daily obligations.
- The now line is not a nudge. It is a persistent, always-visible
  indicator, and it does not consume budget.
- Habit checkboxes and protocol metric logging are daily obligations.
  They surface once per day in a single combined card; they do not
  consume nudge budget, but they also do not repeat.
- If a user dismisses a surface twice, it does not appear for 30 days.
- Nothing fires during focus mode or during a calendar event.
- Nothing fires outside the user's configured quiet hours (default:
  10pm–7am).

**Examples.**

- It is 2pm. A prep card for a 3pm meeting wants to surface. The
  now line is already visible. A contextual nudge about a task gap
  also wants to fire. The queue ranks prep card higher (tied to
  imminent event), fires it, and suppresses the contextual nudge
  for the next hour.
- It is Sunday evening. The weekly review wants to surface, and a
  protocol review is due. The queue combines them into one surface:
  "Weekly review + protocol review ready." One tap opens both.
- User dismisses the "people resurfacing" card twice. It does not
  appear for 30 days. If they dismiss it a third time after that,
  it disappears permanently until they re-enable it in settings.

**Violations.**

- A feature that fires its own notification outside the queue —
  violates.
- Two nudges in the same hour — violates.
- A surface that re-appears after two dismissals before 30 days —
  violates.
- A notification during focus mode — violates.

### Invariant 4 — Freshness

**Statement.** Every piece of synced or AI-gathered data carries a
timestamp. Prices, health data, calendar mirrors, and research notes
show their age. Stale data is labeled, never presented as current,
and the AI is told when its context is stale.

**Why.** The app aggregates data from sources that update on their
own schedules and AI that reads from a snapshot in time. Without
freshness, the user trusts data that is wrong, and the AI reasons
from stale context. Freshness is a trust property, not a technical
nicety.

**Rules.**

- Every record that originates outside the event log (calendar
  mirror, health import, research result, email forward, price
  check) carries two fields: `retrieved_at` (ISO-8601, UTC) and
  `source` (the integration or AI tier that produced it).
- Freshness thresholds are per-data-type and defined in
  `07-infrastructure/integrations.md`. Default thresholds:
  - Calendar mirror: fresh under 15 minutes, stale after 1 hour.
  - Health data: fresh under 24 hours, stale after 72 hours.
  - Research results: fresh under 7 days, stale after 30 days.
  - Prices: fresh under 24 hours, stale after 7 days.
- Stale data is visually labeled (a small "as of [date]" annotation,
  not a red badge). It is never hidden.
- The AI's context payload includes freshness for every retrieved
  item. The AI is instructed to acknowledge staleness when it is
  material ("this price is from March — it may have changed").
- The AI never presents a stale price, metric, or state as current.
- When the app is offline, all synced data is shown with its last
  successful retrieval timestamp.

**Examples.**

- User opens a research note from March. Prices are shown with
  "as of March 14, 2026" underneath. A "Refresh" action re-runs
  the research.
- User asks the assistant "what's on my calendar tomorrow?" The
  assistant's calendar context is 40 minutes stale (the sync is
  behind). It answers, but prefixes: "Based on my last sync 40
  minutes ago..."
- Health data has not synced in 4 days. The habit compliance view
  shows "last synced 4 days ago" and does not present the missing
  days as "not done."

**Violations.**

- Showing a price without a timestamp — violates.
- Presenting calendar data without freshness metadata — violates.
- The AI asserting a fact from stale context without labeling it —
  violates.
- Hiding stale data instead of labeling it — violates. Stale data
  is still data; it just needs a label.

## Examples

These four invariants compose. Consider the "research this" flow:

1. User long-presses a task → "Research this."
2. AI returns a proposal (text + structured results).
3. User taps "Add as note." → Invariant 2 (consent): the AI proposed,
   the user consented.
4. Note appears attached to the task, with `retrieved_at` timestamp
   on every result. → Invariant 4 (freshness).
5. Undo toast appears for five seconds. → Invariant 1 (reversibility).
6. The action does not fire a notification; the user is already in
   the app, looking at the result. → Invariant 3 (attention) is not
   invoked, because the user initiated the action.

Now consider the "protocol review due" flow:

1. Sunday evening. The queue has two candidates: weekly review and
   protocol review.
2. Queue combines them into one surface. → Invariant 3 (attention):
   one nudge, not two.
3. User opens the review. AI generates a report comparing baseline
   to protocol window, with per-habit compliance.
4. AI *proposes* three adjustments. User accepts one. → Invariant 2
   (consent).
5. All AI-sourced data in the report (correlations, effect sizes)
   is labeled with the window it was computed from. → Invariant 4
   (freshness).
6. The accepted adjustment creates a new protocol version. The old
   version remains in the log. → Invariant 1 (reversibility):
   the user can revert to the prior version.

## What this doc must NOT do

- This doc does not define the event log, the object model, or the
  day-as-unit. It defines the invariants those things must respect.
  The architecture lives in `02-architecture/`.
- This doc does not define specific notification surfaces, their
  copy, or their timing. It defines the queue and the cap. Surfaces
  are defined in `06-flows/` and `03-experience/attention-budget.md`.
- This doc does not define the AI's rules beyond consent. The full
  AI contract lives in `04-ai/constitution.md`, which references
  these invariants but adds the AI-specific ones.
- This doc does not define freshness thresholds. It defines the
  *rule* (label stale data). The thresholds live in
  `07-infrastructure/integrations.md`.
- This doc does not list every action that is reversible or not.
  It defines the rule (everything is, except account deletion and
  sync revocation). The list of actions lives in each module doc.