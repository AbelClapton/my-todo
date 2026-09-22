# ADR 0018 — Production Stack and Mail Providers

- **Status:** Accepted
- **Date:** 2026-09-22
- **Deciders:** [founder]

## Context

`07-infrastructure/stack.md` names a language, framework, two databases,
a UI stack, a shell, and an auth service. It names **no host** and **no
mail provider**. `10-engineering/quality-standards.md` defines a deploy
policy (staging on merge, production manual) with no target.

The gap was invisible until two features needed it: auth sends email
(magic links, Phase 6), and forwarding receives it (Phase 7). Both need a
domain. The domain also supplies the files that verify universal links,
which is how the magic link returns to the app on mobile
(`07-infrastructure/auth.md`).

Two constraints shaped this decision. The working constraint is the
founder's: **stay free while building, and do not block development on
purchases.** The architectural one is that the sync engine's notification
path wants a long-lived connection (`07-infrastructure/sync-engine.md`),
which serverless platforms do not provide natively.

## Decision

**Hosting: Cloudflare Workers.** It is an official TanStack Start
partner; its free tier is usable commercially, unlike Vercel's Hobby
plan, which is designated non-commercial and would be a problem for an
app with a store listing; and it puts the registrar, DNS, inbound mail
routing, and the web app in one dashboard instead of four. Durable
Objects are available for the sync engine's WebSocket path when Phase 6
needs them, and pull-on-foreground is already the documented fallback, so
nothing is blocked if they are not used. **Netlify is the named
fallback** — the other official partner — if the Workers runtime fights
TanStack Start or the Turso client.

**Domain: registered at cost, chosen independently of the wordmark.**
Cloudflare Registrar, which sells at cost with no renewal markup and
includes DNS, WHOIS privacy, and SSL. The domain is **not** derived from
the app name: forwarding addresses are written into users' mail clients
and cannot be reissued, so the domain must outlive any rename — and
ADR 0015 keeps several fallback names on the bench. `.com` preferred;
`.app` acceptable. The domain *string* is the one choice this ADR does
not make, because it depends on availability and taste.

**Outbound mail: Resend, as Supabase Auth's custom SMTP.** Supabase's
built-in email is development-only — rate-limited and unable to send to
arbitrary recipients — so auth needs a provider before it faces a real
user. Resend sends from a dedicated sending subdomain, which keeps
transactional deliverability away from the inbound capture domain.

**Inbound mail: Cloudflare Email Routing plus a Worker.** Free, uncapped,
and in the same dashboard. It is chosen over a provider's inbound product
principally on volume: `integrations.md` caps forwarding at 100/day **per
user**, and a free inbound tier capped at 100/day **total** cannot serve
that promise past the first active user. The Worker implements ADR 0017.

**Deferred, with triggers rather than dates:**

- **A human mailbox** (`support@`). The App Store requires a support
  contact, and a free forward to a personal inbox satisfies it until
  support volume exists. Trigger: the first support load that a personal
  inbox makes awkward.
- **Shell build automation.** Manual Xcode and Gradle builds for the
  first release. Ionic Appflow is not assumed — its status is doubtful —
  and Capawesome Cloud or Codemagic are the names to evaluate. Trigger:
  the second release, or the first time a build needs reproducing.
- **Turso Cloud.** Used as the server store, exactly as `stack.md`
  already says. Not used as a sync mechanism; the sync engine is this
  doc set's own push/pull/merge over the event log
  (`07-infrastructure/sync-engine.md`). Adopting a provider's replication
  instead would be a different architecture and needs its own ADR.

**The purchase gate.** One domain, roughly $10/year, bought before
**either** of: the first magic link sent to a real user, or Phase 7's
forwarding. Nothing before that point needs it, and development proceeds
against Supabase's built-in email and a free host subdomain.

Docs updated in the same change: `07-infrastructure/stack.md` (a hosting
row, a domain row, and two mail rows), `07-infrastructure/cost-model.md`
(infrastructure costs, which the model did not list),
`07-infrastructure/auth.md` (the sending path), and
`07-infrastructure/integrations.md` (the inbound mechanism).

## Consequences

**Positive.**

- Development is unblocked: every piece except the domain has a free
  tier, and the domain is needed by two features that are phases away.
- One vendor covers domain, DNS, hosting, and inbound mail, so there are
  fewer accounts, fewer dashboards, and no cross-provider DNS debugging.
- The commercial-use question is settled up front rather than at store
  submission.
- The architecture stays portable: the host choice touches deployment,
  not the event log, the sync protocol, or the client.

**Negative.**

- Cloudflare Workers is a constrained runtime compared with Node hosts.
  TanStack Start supports it officially, but a dependency that assumes
  Node APIs — including the Turso client — has to be checked at
  implementation time rather than assumed.
- Durable Objects are a paid-plan dependency if the WebSocket path is
  wanted later. The fallback is documented, but it is a fallback.
- Cloudflare Registrar has no support for some TLDs and its DNS UI is
  plain. Accepted for at-cost pricing and one dashboard.
- A name-independent domain means the app's web address may not match its
  wordmark. That is the point, and it is also a small branding cost.

**Neutral.**

- No doc in `docs/` changes its architecture; this ADR fills a gap rather
  than reworking one.
- Cost while building is a domain plus zero, and the free tiers are the
  plan rather than a stopgap.

## Alternatives considered

- **Vercel.** The default answer, and it supports TanStack Start directly.
  Rejected on terms rather than technology: the Hobby plan is designated
  non-commercial, the app intends a store listing and a specified Pro
  tier, and the same reasoning that made ADR 0014 keep Pro unbuyable
  applies to deploying a product on a non-commercial plan.
- **Netlify as the primary.** The other official partner, a Node runtime,
  and a mature function story. Rejected only because it does not cover
  the domain, DNS, or inbound mail, so it would be a second vendor for no
  gain. It stays the fallback.
- **Railway or Render.** Container-based, closer to a traditional server,
  and the most comfortable home for a long-lived WebSocket. Rejected for
  v1: more operations than a solo builder should carry while the product
  is still being figured out.
- **Self-hosted mail.** Rejected without further discussion. Deliverability
  for magic links from a fresh IP is a losing fight, and running an SMTP
  receiver to save $0 is a poor trade against the time.
- **One provider for both mail directions.** Simpler on paper, and it is
  what makes the volume conflict above fatal: the free inbound cap is
  lower than the documented per-user promise. Splitting by direction
  costs one extra dashboard and removes the conflict.
- **Buying the domain now to unblock URLs in docs.** Rejected: the docs
  can carry `in.<domain>` as a placeholder, and a placeholder that nobody
  can read wrong is better than a purchase made before it is needed.
