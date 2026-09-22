# ADR 0003 — AI Proposes, Never Executes

- **Status:** Accepted
- **Date:** 2026-09-22
- **Deciders:** [founder]

## Context

The app has three tiers of AI: parsing (Tier 1), contextual actions
(Tier 2), and assistant (Tier 3). The AI can mutate state in several
ways: creating tasks, rescheduling events, adopting protocols,
generating notes.

The design question: does the AI execute actions directly, or does
it propose them and wait for user consent?

Arguments for direct execution: fewer taps, faster flows, feels
"smart."

Arguments for proposals: trust, reversibility, accountability.

## Decision

Adopt **propose, never execute** as a constitutional rule (Rule 1,
`04-ai/constitution.md`). The AI produces text and structured
mutation proposals. A user must explicitly consent before any
mutation is applied. The single exception is Tier 1 parsing at
high confidence, which applies silently with a correctable chip.

## Consequences

**Positive.**

- Every AI action is reversible (Invariant 1 becomes enforceable).
- The user is always the final decision.
- An AI bug cannot silently corrupt the user's data.
- AI actions are auditable (every `ai.applied` is a log entry).
- The assistant can be more aggressive in its suggestions, because
  the user always has a veto.

**Negative.**

- One extra tap per AI-initiated mutation. Acceptable trade for
  trust.
- Tier 1's silent-apply exception requires careful confidence
  thresholds (0.85).
- Users who want a fully autonomous assistant will be disappointed.
  This is intentional.

**Neutral.**

- The proposal architecture is more code than direct execution.
  Worth it.

## Alternatives considered

- **Direct execution with confirmation dialogs.** Confirmation
  dialogs are what this app is built to avoid. They interrupt
  without building trust.
- **Direct execution with undo.** Undo exists (Invariant 1), but
  without consent, the AI's actions feel unpredictable. The user
  should never be surprised by a state change.
- **Fully autonomous AI.** The trust cost exceeds the convenience.
  Also introduces unbounded risk (see Rule 6, never add structure).

## Related

- `04-ai/constitution.md` — Rule 1.
- `04-ai/tier-2-contextual.md`, `04-ai/tier-3-assistant.md` —
  how proposals are produced and applied.
- `01-foundation/principles.md` — Invariants 1 and 2.