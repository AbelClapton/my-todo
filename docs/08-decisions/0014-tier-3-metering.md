# ADR 0014 — Tier 3 Metering and Cost Authority

- **Status:** Accepted
- **Date:** 2026-09-22
- **Deciders:** [founder]

## Context

The doc set disagrees with itself about whether a user-visible limit
exists at all, and about what research costs.

**Metering.**

- `07-infrastructure/cost-model.md` — "Two features are metered
  per user in v1: research (10/month free, 100/month Pro) and Tier 3
  complex queries (50/month free, unlimited on Pro)." It also defines
  quota-exceeded copy with a reset date.
- `04-ai/tier-3-assistant.md` — "Tier 3 is not metered per user in the
  free tier, but the cost is tracked and reported in settings."
- `05-modules/settings.md` — presents complex-query usage as
  "(informational)".

**Unit cost for research.**

- `07-infrastructure/cost-model.md` — research costs **50 units**.
- `04-ai/research-and-protocols.md` — research costs **10 units**.
- `04-ai/retrieval-layer.md` and `04-ai/tier-2-contextual.md` say 50.

There is no doc-level tiebreaker for either conflict. `cost-model.md`
owns costs; `tier-3-assistant.md` owns Tier 3 behavior; and neither is
obviously subordinate to the other. Worse, the disagreement is not
editorial: it decides whether a user can hit a wall in v1, and what
happens when they do. Editing one doc to match the other would settle
a product decision by fiat, which is what this ADR exists to prevent.

Related but distinct: the Pro tier in
`07-infrastructure/cost-model.md` is defined with an "Upgrade" path
that is "not built in v1 (no billing yet)", while
`05-modules/settings.md` states as an invariant that "No setting is
hidden behind a premium tier in v1."

## Decision

**`07-infrastructure/cost-model.md` is authoritative** for metering,
quotas, and unit costs. Other docs reference it by name rather than
restating numbers. This is the general rule: numbers live in one doc,
and every other doc points at it.

**Tier 3 complex queries are metered in v1:** 50/month on Free,
unlimited on Pro. Simple and local Tier 3 queries are not metered.

**Research is metered at 50 units per call.**
`07-infrastructure/cost-model.md` is correct;
`04-ai/research-and-protocols.md`'s "10 units" is wrong.

**Hitting a quota blocks the call.** The user sees the quota-exceeded
message with the reset date. The app does not silently degrade to a
local approximation, and it does not fail without explanation.

**`settings.md` keeps showing usage as informational**, but the label
becomes "usage and remaining quota," since a limit now exists. It
remains informational in the sense that it is not an action surface.

**Pro quotas are specified but not purchasable in v1.** No billing
exists. The rule that follows from `settings.md` holds: no feature is
gated behind a tier that cannot be bought. Pro numbers appear in the
cost model as engineering targets, not as a shipped gate.

**Free-tier quotas are a v1 product commitment.** Changing them
requires a new ADR.

Docs updated in the same change: `04-ai/tier-3-assistant.md`,
`04-ai/research-and-protocols.md`, `04-ai/retrieval-layer.md`,
`04-ai/tier-2-contextual.md`, `05-modules/settings.md`, and the
Free/Pro tables in `07-infrastructure/cost-model.md`.

## Consequences

**Positive.**

- One authority for every number, so quota drift stops being possible
  by accident.
- The user-visible behavior at the limit is defined rather than
  implied, including the reset date copy.
- A capability that was free-but-undefined becomes free-with-a-number,
  which is what the cost model needs to be reportable.
- The "no feature behind an unbuyable tier" invariant survives
  contact with the Pro tables.

**Negative.**

- A previously unlimited capability becomes limited in v1. That is a
  user-visible reduction and should be communicated, not buried in a
  cost doc.
- Quota state must be tracked per user, server-side. This adds a
  server responsibility that `02-architecture/local-first.md`'s
  "Server responsibilities" list does not currently include, so that
  list needs an amendment.
- Metering interacts with `ai.on_device_only` and `ai.audit_mode` in
  ways no doc yet states: with on-device-only enabled, Tier 3 complex
  queries are disabled outright, so quota becomes irrelevant rather
  than consumed.
- Running out of research quota mid-protocol can leave a user unable
  to refresh a stale research note, which touches Invariant 4's
  freshness promise. The quota message must not be the only signal.

**Neutral.**

- No change to Tier 1 or Tier 2 costs; both remain on-device and
  unmetered.
- The "Unlimited" row in `07-infrastructure/cost-model.md` is retained
  as a Pro target and is explicitly not a v1 purchasable tier.

## Alternatives considered

- **Declare `tier-3-assistant.md` authoritative and remove the Tier 3
  quota from the cost model.** Rejected: Tier 3 complex queries are
  the most expensive call in the app, and bounding them is the cost
  model's entire purpose. Removing the quota would leave the cost
  model describing an unbounded product.
- **Meter but never block — warn only.** Rejected: a warning with no
  limit is the same as no limit, and it makes the cost model
  unreportable, because the reported figure has no enforcement behind
  it.
- **Defer to v2 and ship Tier 3 unmetered.** Rejected: retrofitting a
  limit after users have had unlimited access is a harder change than
  introducing one at launch, and the cost model exists precisely to
  bound this before launch.
- **Edit both docs to agree, with a comment noting the decision.**
  Rejected: that is the drift mechanism this review has been catching.
  A comment records that a choice was made but not why, and the next
  editor has no authority to cite.
