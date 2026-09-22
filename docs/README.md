# Small Wins — Documentation

## The identity sentence

> **A system for running small experiments on your own life.**

Every feature, screen, integration, and AI action in this app is tested against
that sentence. If it does not help the user learn something about themselves,
it does not belong.

## What this app is

A daily activity tracker built around the calendar as the hub, with
four modes (Calendar, Tasks, Habits, Notes) and four cross-cutting
layers (Protocols, People, Areas/Goals, Review). It is local-first,
event-sourced, and AI-augmented at three tiers.

It is not: a social app, a finance app, a document store, a project manager,
a chat interface with a calendar attached, or an integration hub.

## Reading order

Docs are numbered. Read them in order. Each one assumes the previous ones.

1. `01-foundation/identity.md` — the identity sentence and the feature test
2. `01-foundation/principles.md` — the four invariants every surface must respect
3. `01-foundation/glossary.md` — canonical terms (read before any other doc)
4. `02-architecture/event-log.md` — the append-only event log (the spine)
5. `02-architecture/object-model.md` — four atoms, four layers, eleven edges
6. `02-architecture/projections.md` — how state is computed from events
7. `02-architecture/day-as-unit.md` — the day as the atomic product unit
8. `02-architecture/local-first.md` — client/server split, sync, conflicts
9. `02-architecture/data-lifecycle.md` — staleness, drift, archival, deletion
10. `03-experience/design-tokens.md` — the single source of visual truth
11. `03-experience/gesture-vocabulary.md` — one gesture vocabulary, everywhere
12. `03-experience/motion-vocabulary.md` — one motion vocabulary, everywhere
13. `03-experience/haptic-vocabulary.md` — four haptics, forever
14. `03-experience/attention-budget.md` — the ranked queue and the nudge cap
15. `03-experience/surfaces.md` — every surface the app renders, in one list
16. `03-experience/components.md` — the app's UI primitives
17. `03-experience/app-shell.md` — the chrome: navigation, layers, stacking
18. `03-experience/states.md` — the states every surface shares
19. `04-ai/constitution.md` — the eight rules in every prompt
20. `04-ai/retrieval-layer.md` — tools, not context dumps
21. `04-ai/tier-1-parsing.md` — ambient natural language → structured data
22. `04-ai/tier-2-contextual.md` — inline actions on focused items
23. `04-ai/tier-3-assistant.md` — cross-module queries and mutations
24. `04-ai/research-and-protocols.md` — the research → protocol → report loop
25. `05-modules/*` — one file per module
26. `06-flows/*` — one file per user flow
27. `07-infrastructure/*` — stack, sync, auth, cost, integrations
28. `08-decisions/*` — architecture decision records; start at `08-decisions/README.md` for the index
29. `09-roadmap/build-order.md` — the sequence of what to build, in order
30. `09-roadmap/milestones.md` — the testable checkpoints
31. `10-engineering/code-conventions.md` — how code is written
32. `10-engineering/error-handling.md` — how errors are surfaced and recovered
33. `10-engineering/testing.md` — what is tested and how
34. `10-engineering/quality-standards.md` — what "done" means, and what runs in CI

## Doc structure

Every doc in the numbered spec set follows the same five-section
shape. Three files are deliberately not specs and do not follow it:
this `README.md` (an index), `08-decisions/*` (ADRs carry Context,
Decision, Consequences, and Alternatives considered, and
`08-decisions/README.md` is their index), and `prompts.md` (an
operational file, not a doc set member).

    # Title

    ## Purpose
    One paragraph: what this doc defines and why it exists.

    ## Invariants
    Bullet list: rules that must never be violated. These are the
    contract. If code or design violates an invariant, the code or
    design is wrong, not the invariant.

    ## Specification
    The actual content — schemas, flows, tokens, rules, examples.

    ## Examples
    Concrete examples the AI can pattern-match against.

    ## What this doc must NOT do
    Explicit prohibitions. Every doc ends with these. They exist because
    AI will expand scope if not fenced in.

## Doc writing rules

- One concept per doc. If a doc needs two "Purpose" paragraphs, split it.
- Invariants are sacred. Propose changes via an ADR, never by editing in place.
- Every schema, token, or rule must be referenced by name, not restated.
  (e.g., "uses the `Event` atom from `02-architecture/object-model.md`")
- No doc may define UI unless it is in `03-experience/` or `05-modules/`.
- No doc may define AI behavior unless it is in `04-ai/`. Module docs
  may define the user-visible output of an AI action (structure, tone,
  prohibited language) for their own module; prompt construction, tool
  selection, and confidence handling stay in `04-ai/`.
- Prohibitions are mandatory. Do not leave the section empty.
- Dates: absolute, ISO-8601, in specs, payloads, and examples.
  Never "recently" or "last week." UI copy uses the display forms
  in `01-foundation/glossary.md`.
- Time: UTC in storage, local in display, always labeled.

## For AI assistants reading this

Before writing any code, screen, schema, or prompt:
1. Read `01-foundation/identity.md` and apply the feature test.
2. Read `01-foundation/principles.md` and confirm the work does not violate
   any of the four invariants.
3. Read `01-foundation/glossary.md` and use canonical terms only. Do not
   invent synonyms.
4. Read the specific doc for the area you are working in.
5. If a request conflicts with an invariant, stop and surface the conflict.
   Do not silently work around it.