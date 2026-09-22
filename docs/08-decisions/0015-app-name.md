# ADR 0015 — App Name: Small Wins

- **Status:** Accepted
- **Date:** 2026-09-22
- **Deciders:** [founder]

## Context

`README.md` line 1 is the only place in the doc set that names the
product: `# [App Name] — Documentation`. The placeholder
`[App Name]` appears exactly once across `docs/`; every other doc
says "the app." That was deliberate — the doc set was written before
a name existed — and it means choosing a name is a one-line change
with no ripple through the spec.

A name is not cosmetic here. It is the first thing the identity test
is applied to, and three constraints follow from docs that already
exist.

**Name the value, not the architecture.** `01-foundation/identity.md`
rejected "Your calendar, finally connected to everything else"
because it "describes architecture, not value. Users do not care
that things are connected; they care what connection lets them do."
A name drawn from the object model — _Event Log_, _Day Graph_,
_Projection_, _Local-First_ — repeats that mistake at the highest
possible level.

**No canonical term as the brand.** The glossary gives every term
exactly one definition and prohibits synonyms; the identity sentence
is quoted verbatim in every AI system prompt. A brand word that
doubles as a domain word — _Protocol_, _Baseline_, _Metric_,
_Compliance_, _Day_ — makes the prompts ambiguous and the glossary
self-contradicting in the same stroke.

**No promise the product cannot make.** `04-ai/constitution.md`
Rule 5 requires health-adjacent claims to cite a source and label
the strength of the evidence, and `04-ai/research-and-protocols.md`
turns that into the protocol report's honesty requirement: a
multi-habit protocol cannot isolate which habit caused an effect,
correlation is not causation, and a null result is a valid result —
"Rule 5 in practice," in that doc's own phrase. The app reports a
delta, labels evidence strength, and defers the interpretation. A
name that promises an outcome ("Sleep Better", "Fix Your Focus")
sells a claim the doc set will not let the AI make.

**Audience.** The product is for people trying to improve their
lives, not for people who already own the vocabulary of
self-experimentation. Several candidates that read well against the
identity sentence (`N1`, `Observatory`, `Hunch`, `Almanac`) read
poorly against this: each needs a sentence of explanation before a
stranger understands what they would be installing. The listing has
one name, one subtitle, and three seconds.

**Constraint from ADR 0014.** Pro is specified but not purchasable in
v1. The name and its framing therefore cannot be built around a
free/Pro split, and no marketing surface may imply a tier the user
cannot buy.

## Decision

**The app is named `Small Wins`.**

- **Store name:** `Small Wins: Habit Tracker` (25 of 30 characters).
- **Subtitle:** `Change one thing at a time` (26 of 30 characters).
- **Categories:** Health & Fitness (primary), Productivity
  (secondary).
- **Price:** free, with no in-app purchase at launch
  (`07-infrastructure/cost-model.md`, ADR 0014).
- **In-app and documentation wordmark:** `Small Wins`.

The name is chosen because it names the unit of progress the product
actually produces — a habit credited, a metric logged, a delta
measured, a six-week question answered — and because it lowers the
perceived cost of starting, which is the product's central claim:
one change at a time, at most three nudges a day, no streaks to
break, everything undoable. It is a feeling word before it is a
product word, which is what the audience installs.

The subtitle is the identity sentence's promise in the audience's
own words, for someone who will never read the sentence. The
sentence frames the product — "small experiments on your own life";
the subtitle names how an experiment is run — one thing at a time.
It translates the promise, not the phrasing, and the two share no
vocabulary, which is the point.

They are kept in sync by inspection against two tests: the subtitle
promises no outcome the doc set will not let the app claim, and it
names no mechanism the product does not have.

**The brand word is not a glossary term and never becomes one.**
`win` does not appear in specs, code, log entry types, UI labels, or
prompts as a synonym for `Task` completion, `Habit` compliance, or a
`Protocol` result. The glossary's no-synonym invariant applies to the
brand exactly as it applies to every other term.

**The name is a product decision.** Changing it requires a new ADR,
not an edit to this one.

Docs updated in the same change: `README.md` line 1. No other file in
`docs/` names the product.

## Consequences

**Positive.**

- The name installs in one line, because the doc set was written
  name-agnostically. There is no vocabulary migration.
- The name passes the identity test at the top level rather than the
  feature level: it names an outcome the user can feel, not the
  machinery that produces it.
- It is legible to the audience `identity.md` describes but whose
  vocabulary the doc set does not speak. A reader who has never heard
  of self-experimentation understands the promise from the name and
  the subtitle alone.
- The brand cannot leak into the glossary, so the
  one-meaning-per-term invariant survives the naming.

**Negative.**

- "Small wins" is a common English phrase. It is descriptive, not
  distinctive: trademark protection is weak, App Store search results
  will be dominated by unrelated uses, and the ranking burden lands
  on the keyword field and the subtitle. Accepted cost, not an
  oversight.
- The name can read as low-ambition — a small app for small things.
  Nothing in the name fixes that; the listing and the first session
  have to.
- The name signals neither the AI tiers nor the calendar hub, so the
  listing carries both.
- `Habit Tracker` in the store name understates the product, which is
  also calendar, tasks, notes, and people. It is the highest-intent
  search phrase in the category, so it is accepted for install
  volume, at the cost of the name being narrower than the product.

**Neutral.**

- Internally the doc set continues to say "the app." The name appears
  in `README.md` and in this ADR, and nowhere else.
- One product-identity string is **not** settled by this ADR: the
  email forwarding domain. ADR 0018 decides *how* it is chosen — at
  cost, independently of the wordmark, and not before a gate — so the
  string itself remains open, and every reference to it now reads
  `in.<domain>` rather than a specific domain
  (`07-infrastructure/integrations.md`, `prompts.md`). That is the
  second and last place a product-identity string appears besides
  `README.md` line 1.
- Store listing copy — description, screenshots, keywords, privacy
  declarations — is not part of the doc set. Where it lives is an
  open question, not decided here.
- The identity sentence is unchanged. The name sits beside it rather
  than replacing it.

## Alternatives considered

- **`Hunch`.** The best fit with the AI-as-research-partner framing,
  and the closest plain-language stand-in for Hypothesis. Rejected:
  it sits one step away from becoming a synonym for a canonical term,
  which the glossary forbids, and it names the user's input rather
  than the product's output.
- **`Findings`.** Strong, because it names the report — the moment
  the product pays off. Rejected: it describes the back half of the
  loop while the daily half is what retains users, and it reads
  clinical to the target audience.
- **`Observatory`, `Almanac`, `N1`, `Daybook`, `Fieldnotes`.** Each
  fits the lab-notebook aesthetic and each was defensible against the
  identity sentence. Rejected on two counts: real-world collisions,
  and each needs a sentence of explanation before a mainstream buyer
  knows what they are installing. `N1` additionally requires the
  reader to already know what n-of-1 means.
- **`One Change`.** The sharpest statement of the mechanism, and the
  closest runner-up. Rejected as the lead because "small wins" names
  the reward while "one change" names the work; an audience that
  installs hope responds to the reward. Retained as the first
  fallback.
- **`Steady`, `Future You`, `Better Days`, `Onward`, `Tend`,
  `Uptick`, `Little Wins`.** Retained as fallbacks. Because swapping
  the name is a one-line change to `README.md` plus store metadata,
  superseding this ADR is cheap — one of the reasons a plain,
  descriptive name was acceptable.
- **A descriptive category name (`Daily Habit Tracker`).** Rejected:
  it names the category rather than the product, and it guarantees
  the app is compared to every other tracker on feature count instead
  of on approach.
- **Ship with no name (`[App Name]` retained).** Rejected: the store
  listing cannot exist without one, and auth, deep links, and the
  share sheet (`07-infrastructure/auth.md`,
  `07-infrastructure/integrations.md`) need a display name and a
  bundle identifier.

## Related

- `01-foundation/identity.md` — the feature test applied to a name
- `01-foundation/glossary.md` — the no-synonym invariant the brand
  must not violate
- `README.md` — line 1, the name's only installation point
- `08-decisions/0014-tier-3-metering.md` — free at launch; no free/Pro
  framing in any marketing surface
- `08-decisions/0009-no-social-integrations.md` — no share-a-streak
  growth loop, so the name and the listing have to earn installs
  themselves
