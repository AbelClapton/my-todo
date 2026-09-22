# Identity

## Purpose

This doc defines what the app is, in one sentence, and the test that
every future feature must pass. It exists because without a single
organizing idea, the app drifts into feature soup — a tracker with an
AI bolted on, an integration hub, a productivity suite. The identity
sentence is the tiebreaker for every ambiguous decision.

## Invariants

- There is exactly one identity sentence. It does not get amended,
  qualified, or extended. If it needs to change, it is replaced, and
  every doc that references it is updated.
- Every feature, screen, flow, module, and AI action must pass the
  feature test. If it fails, it is cut or reframed — not shipped with
  an exception.
- The identity sentence is quoted verbatim at the top of every
  AI system prompt. The AI never paraphrases it.

## Specification

### The sentence

> **A system for running small experiments on your own life.**

### Why this sentence

Three candidates were considered:

1. **"The place your day lives."** — Tracker-first. Clear, but generic.
   Every calendar and task app could claim it. It describes a category,
   not a product.

2. **"Your calendar, finally connected to everything else."** — Hub-first.
   Accurate but describes architecture, not value. Users do not care
   that things are connected; they care what connection lets them do.

3. **"A system for running small experiments on your own life."** —
   Protocol-first. Distinct, defensible, and it subsumes the other two:
   the day is the unit of the experiment, and the calendar is the
   instrument panel. It also gives every feature a clear purpose —
   to produce knowledge about the user — which is the only thing that
   justifies the AI surface area.

### The feature test

Every proposed feature must answer **yes** to all three:

1. **Does it help the user learn something about themselves?**
   — Tasks, habits, protocols, reviews, insights, research: yes.
   — Social feeds, integrations for their own sake, gamification: no.

2. **Does it fit inside the day as the atomic unit?**
   — Anything with a time, a completion state, or a recurrence: yes.
   — Anything that lives outside time (documents, media libraries,
   finance ledgers): no.

3. **Does it reduce a decision rather than add one?**
   — Defer dates, day templates, minimum habits, buffer time: yes.
   — Type pickers at capture, manual prioritization schemes,
   configurable everything: no.

A feature that fails any of the three is cut or reframed until it
passes. "Reframed" is important: a finance tracker fails test 2, but
"track spending as a habit with a metric" passes all three. The
identity is not a filter against features; it is a filter against
*shapes* of features.

### What this identity implies

**For the design system.** The app should feel like a lab notebook,
not a productivity tool. Calm, legible, instrument-like. Not playful,
not gamified, not corporate. Data is the aesthetic.

**For the roadmap.** The first-class features are the ones that
produce insight: protocols, reviews, correlations, time machine,
semantic search. Everything else is infrastructure to feed those.

**For the AI.** The assistant is a research partner, not an agent.
It proposes hypotheses, gathers evidence, writes reports, and defers
every decision to the user. It never acts on the user's behalf without
explicit consent.

**For integrations.** An integration is only justified if it feeds
the loop. Calendar sync feeds planning. Health data feeds habit
compliance. Email forwarding feeds capture. Social media feeds
nothing — it fails the test.

**For monetization.** If the app is a system for self-experimentation,
the paid tier is more experiments, deeper reports, longer history —
not removing ads or unlocking basic features.

## Examples

**Feature: "Buy a standing desk" research.** Task exists, user long-presses
→ "Research this." AI returns 3–5 candidates as a note attached to the
task. Passes all three: user learns their own criteria (test 1), attaches
to a task with a day (test 2), and it replaces the decision of "where do
I even start" with "which of these four" (test 3).

**Feature: Sleep protocol.** Goal "Improve sleep" → AI proposes a
protocol with 2–4 habits, a metric, a baseline period, and a review
date. Passes all three: this is the purest form of the identity
(test 1), it is a window of days (test 2), and it removes the decision
of "what should I even try" (test 3).

**Feature: Social sharing of streaks.** Fails test 1 — the user does not
learn anything about themselves. Cut, permanently.

**Feature: Notion sync.** Fails test 2 — it introduces a second
non-temporal store the app has to reconcile with. Reframe as markdown
export (which is one-directional and does not require sync) and it
passes.

**Feature: Configurable priority matrix (Eisenhower, etc.).** Fails
test 3 — it adds a decision framework rather than removing a decision.
Cut. If a user wants prioritization, the app offers exactly three
priorities (now, next, later) and does not let them configure more.

## What this doc must NOT do

- This doc does not define modules, features, or flows. It defines the
  test those things must pass.
- This doc does not define the design system. It defines the feeling
  the design system should express ("lab notebook, not productivity
  tool") but not the tokens, colors, or components.
- This doc does not define AI behavior. It defines the AI's *role*
  (research partner, not agent) but not its rules, tiers, or prompts.
  Those live in `04-ai/`.
- This doc does not list every feature that passes or fails. It gives
  the test and a small number of examples. The full feature inventory
  is the roadmap (`09-roadmap/`).