# Cost Model

## Purpose

This doc defines what runs on-device, what runs in the cloud, what
is metered, and how costs are tracked. It exists because AI features
have a per-call cost, and a successful app that ignores this will
discover it as a crisis at scale.

The model is: **on-device by default; cloud where necessary;
metered where expensive.**

## Invariants

- Every AI feature has a defined cost per call.
- The retrieval layer enforces budgets per call
  (`04-ai/retrieval-layer.md`).
- Research is metered per user (`04-ai/research-and-protocols.md`).
- Cloud AI requires auth (`07-infrastructure/auth.md`).
- On-device AI is free to the user and to the app.
- The user can see their usage in settings.

## Specification

### On-device vs. cloud

| Feature | Runs on | Cost to app |
|---|---|---|
| Tier 1 parsing | On-device | $0 |
| Tier 2 local actions (break down, find related) | On-device | $0 |
| Semantic search (embeddings + retrieval) | On-device | $0 |
| Tier 3 simple queries (state, history) | On-device | $0 |
| Tier 3 complex queries (reasoning) | Cloud | per-call |
| Research (web search) | Cloud | per-call + search API |
| Weekly review generation | Cloud | per-call |
| Protocol report generation | Cloud | per-call |
| Voice STT | On-device | $0 |

Roughly 80% of AI interactions run on-device and cost nothing.

### Per-call cost estimates

These are estimates for planning, not contracts. Actual costs depend
on the provider and model.

| Call type | Input tokens | Output tokens | Est. cost |
|---|---|---|---|
| Tier 1 parse | 200 | 50 | $0 (local) |
| Tier 2 local | 1,000 | 300 | $0 (local) |
| Tier 3 simple | 2,000 | 500 | $0 (local) |
| Tier 3 complex | 8,000 | 1,000 | $0.02 |
| Research | 5,000 + search | 2,000 | $0.05 + $0.01 |
| Weekly review | 6,000 | 800 | $0.02 |
| Protocol report | 4,000 | 1,000 | $0.02 |

The dominant cost is research, at roughly $0.06 per call.

### Metering

Two features are metered per user in v1: research (10/month free,
100/month Pro) and Tier 3 complex queries (50/month free,
unlimited on Pro). Everything else is unmetered because it either
runs locally or is rare enough that the aggregate cost is
acceptable.

**Research quota:**

| Tier | Monthly research calls |
|---|---|
| Free | 10 |
| Pro | 100 |
| Unlimited | unlimited (subject to abuse limits) |

The user sees their usage in settings: "Research: 4 of 10 this
month. Resets Oct 1."

When the quota is exhausted:

    "Monthly research limit reached. Resets Oct 1."
    [Upgrade]  [OK]

The "Upgrade" path is out of scope for v1: there is no billing, so
Pro cannot be bought and the button is a placeholder with no
destination.

**Pro is specified, not purchasable.** Pro appears in this doc as an
engineering target, not as a shipped gate. No feature is restricted
by a tier the user cannot buy, and the Free-tier quotas below are a
v1 product commitment — changing them requires a new ADR
(`05-modules/settings.md`, ADR 0014).

**Tier 3 complex query quota:**

| Tier | Monthly complex queries |
|---|---|
| Free | 50 |
| Pro | unlimited (subject to rate limits) |

The user sees usage in settings: "Complex queries: 12 of 50 this
month. Resets Oct 1."

When exhausted, Tier 3 falls back to simple mode (on-device) with a
notice: "Complex queries used up. Falling back to simple mode until
Oct 1."

### Cost tracking

Every cloud AI call is logged:

    {
      call_id: ULID,
      user_id: string,
      type: 'tier3' | 'research' | 'review' | 'report',
      input_tokens: number,
      output_tokens: number,
      cost_cents: number,
      duration_ms: number,
      model: string,
      timestamp: ISO-8601,
    }

These logs are:

- Aggregated per user per month for quota enforcement.
- Aggregated globally for cost monitoring.
- Retained 90 days, then rolled up to monthly totals.
- Never shared with third parties.

### Budget enforcement

The retrieval layer enforces per-call budgets
(`04-ai/retrieval-layer.md`):

- Tier 2: 1 unit.
- Tier 3 simple: 3 units.
- Tier 3 complex: 10 units.
- Research: 50 units (metered separately).

If a call exceeds its budget, it terminates with a partial answer
and a note. The user is not charged for a failed call.

### Abuse prevention

- Rate limit: 60 cloud AI calls per user per hour.
- Research: hourly sub-limit of 5 (in addition to the monthly
  quota).
- If a user exceeds the rate limit, cloud features are disabled
  for 1 hour with a message: "Too many requests. Try again in an
  hour."
- Anomalous patterns (e.g., 100 research calls in 10 minutes)
  trigger a manual review.

### Free tier

The free tier includes:

- All local features (unlimited).
- 10 research calls per month.
- Unmetered Tier 3 simple queries.
- Metered Tier 3 complex queries: 50 per month.
- Weekly reviews: unlimited.

This is intentionally generous on local features (which cost the
app nothing) and metered on cloud features (which cost the app
money).

### Pro tier (specified, not purchasable)

Not purchasable in v1: there is no billing. The numbers below are
engineering targets, not a gate (`05-modules/settings.md`,
ADR 0014). Planned:

- 100 research calls per month.
- Unlimited Tier 3 complex queries (subject to rate limits).
- Extended history (nothing is deleted anyway, so this is
  marketing, not a real gate).

Pricing is TBD. The point of this doc is not pricing; it is the
cost discipline that makes pricing possible.

### What is not metered

- On-device AI (free).
- Sync (bandwidth is cheap; not metered).
- Storage (the log grows slowly; not metered).
- Notes, tasks, events, habits (unlimited).

The app does not price-gate basic functionality. It prices the
expensive AI features.

### Infrastructure costs

Not per-user metering: the fixed and semi-fixed costs of running the
service. Listed here because this doc is the cost authority and they
were previously absent entirely (ADR 0018).

| Item | Cost | Notes |
|---|---|---|
| Domain | ~$10/year | At cost, Cloudflare Registrar. The only unavoidable purchase, and it is deferred to the gate in ADR 0018. |
| Hosting | $0 while building | Cloudflare Workers free tier, usable commercially. |
| Inbound email | $0 | Cloudflare Email Routing. The documented 100/day/user forwarding cap is also a cost ceiling. |
| Outbound email | $0 to 3,000/month, then paid tiers | A message per login. |

**Why auth email is not metered, but is listed.** A magic link costs a
fraction of a cent, and metering logins would be hostile for no gain. But
it is the one cost that scales with the **whole user base** rather than
with engagement — every user logs in, whether or not they use anything
else — so it belongs in monitoring alongside cost per user, not behind a
gate.

### Monitoring

The server tracks:

- Cost per user, per day, per month.
- Cost per call type.
- Quota exhaustion rate.
- Failure rate per call type.

Dashboards are internal. Users see only their own usage.

## Examples

**A typical month, free tier.**

    User calls research 6 times.
    User runs 40 Tier 3 complex queries.
    User runs unlimited Tier 3 simple queries.
    User gets 4 weekly reviews.
    Total app cost: ~$0.36 (research) + $0.80 (Tier 3) + $0.08
    (reviews) = ~$1.24/month.

**A heavy month.**

    User calls research 10 times (quota hit mid-month).
    User runs 50 Tier 3 complex queries (quota hit).
    User gets 4 weekly reviews.
    Total app cost: ~$0.60 + $1.00 + $0.08 = ~$1.68.
    After quota exhaustion, the user sees the messages above.

**A power user on Pro.**

    100 research calls.
    Unlimited Tier 3 complex (say, 200).
    Total app cost: ~$6 + $4 = ~$10/month.
    At a Pro price of $10-15/month, this is sustainable.

**A quota exhaustion.**

    User attempts research.
    App: "Monthly research limit reached. Resets Oct 1."
    [Upgrade]  [OK]
    User taps OK.
    Research is disabled for the month.

**Cost anomaly.**

    User makes 100 research calls in 10 minutes.
    Rate limit hits at call 6 (hourly sub-limit of 5).
    Cloud features disabled for 1 hour.
    Alert fires to ops.
    If the pattern repeats, the account is flagged for review.

## What this doc must NOT do

- This doc does not define AI tiers. Those are in `04-ai/`.
- This doc does not define auth. That is
  `07-infrastructure/auth.md`.
- This doc does not define pricing for the Pro tier. That is a
  later ADR.
- This doc does not define specific model providers. Those are
  implementation details.
- This doc does not define billing infrastructure. There is none
  in v1.
- This doc does not define the research pipeline. That is
  `04-ai/research-and-protocols.md`.