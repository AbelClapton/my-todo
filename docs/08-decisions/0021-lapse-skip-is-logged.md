# ADR 0021 — The Lapse Skip Is Logged

- **Status:** Accepted
- **Date:** 2026-09-24
- **Deciders:** [founder]

## Context

`06-flows/lapsed-recovery.md` is the flow that decides whether a lapsing
user comes back permanently or uninstalls. It has two doors and a skip
link, and it claims a property in `03-experience/attention-budget.md`'s
terms: the card is one of exactly three exempt surfaces, and
"dismissal is permanent for that lapse."

> **Read the count as history.** The exempt list is two, not three: ADR 0023
> established that the "all three done" card is a **consequence surface** and
> so is outside the budget by definition rather than by exemption. Nothing in
> this ADR's decision changes — `system.lapse_skipped` is still the lapse's
> resolution, still per-lapse, and the card is still exempt with a one-shot
> trigger. This paragraph records what the docs said at the time.

Two problems, and they are the same problem.

**1. The permanence had no record.** §Skipping said, in full, *"Does
not log anything."* The two doors log; the skip did not. So nothing in
the log said the card had ever been dealt with, and the flow's claim
that it fires once per lapse rested on something else.

**2. The something else was the trigger's own state, consumed by the
open that read it.** The trigger was *"≥ 14 days since the last
`day.opened`"*. Rollover writes today's `day.opened` on the same open
that evaluates the flow, and rollover is not budget-governed — so the
condition is true for the instant before its evaluation and false
immediately after. The card is also required, like every exempt surface,
to obey quiet hours, focus mode and in-event suppression. A user who
returns at 06:40 therefore consumes the lapse and never sees the card,
and neither they nor anyone reading the log can tell that it happened.

This is a defect about **state durability**, not about copy, and it
cannot be fixed by editing prose: the log has no entry that means "the
lapse was resolved". `system.fresh_start` and `system.catch_up` record
the two doors and nothing records the third exit.

`02-architecture/event-log.md` fixes the rule that makes this an ADR:
*"The log entry's `type` determines its payload schema. Adding a new type
requires an ADR."*

## Decision

**Add one log type: `system.lapse_skipped` — `{ lapsed_days }`.**

- The skip logs it. §Skipping's *"Does not log anything"* is withdrawn.
- The three ways to be done with the card are now three entries —
  `system.fresh_start`, `system.catch_up`, `system.lapse_skipped` — one
  per exit, so "once per lapse" is a fact the log states rather than one
  the gap arithmetic happens to produce.

**The trigger becomes durable.** The card surfaces when both hold:

1. The gap between the **last two** `day.opened` entries is ≥ the
   configured threshold (7, 14, 21, 30; default 14).
2. No resolution entry has been logged since the later of those two
   entries.

Reading the gap between *two* entries rather than *the last one* makes
the condition survive the open that evaluates it, so a firing blocked by
quiet hours, focus mode or an event **waits for the next eligible open
instead of being lost**.

**No `system.lapse_shown`.** Firings are not logged, in this flow or any
other: `03-experience/attention-budget.md` is explicit that the queue
*"records the firing in the client diagnostics buffer (not the event
log)"*, and ADR 0001's log is a record of state changes rather than of
what the user was shown. Recording the showing would have been the
obvious-looking fix and would have put presentation events in the
source of truth.

**The morning plan is not suppressed.** §The trigger's *"The flow
replaces the morning plan on that day"* is withdrawn: the plan runs
after the card, which is what four other places in the same doc already
said. The lapse card takes the day's first position; it does not take
the plan's place.

## Consequences

**Positive.**

- The card can no longer be lost to the clock. An early riser who
  returns at 06:40 sees it at the next eligible open, which is the
  behaviour the flow's whole purpose requires.
- "Once per lapse" is observable. A reader can answer *why didn't the
  card appear?* from the log alone, without reconstructing rollover
  timings.
- The exemption rule gains the property it was missing. Any exempt
  surface whose trigger is a state rather than a schedule must be able
  to wait; two of the three are one-shot, so this was a latent hazard for
  the onboarding banner as well.
- The plan runs on the return day, which is the day the user most needs
  it.

**Negative.**

- One more log type, and the `system.*` namespace grows to seven.
- A skip is no longer free of side effects, so §Skipping's promise that
  skipping is invisible to the user is true of the UI and not of the
  log. That is the intended trade: the log is local-first and
  `sync: false` is available if it ever needs to be.
- Excluding resolved lapses costs one predicate over a short,
  day-bounded range of entries. Cheap, but not zero.

## Alternatives considered

**Log a `system.lapse_shown` and key the trigger on its absence.**
Rejected. It contradicts `attention-budget.md`'s rule that firings go to
the diagnostics buffer, and it makes an exempt surface the only one in
the app that writes a log entry for being displayed. It also fixes the
wrong half: knowing the card was shown does not tell you whether the
user did anything about it.

**Keep the gap against the last `day.opened` and gate rollover on the
budget.** Rejected. Rollover creates the Day and the Daily Note, writes
`day.opened`, and closes the outgoing day. Gating it on quiet hours would
gate the app's clock on the attention budget, which inverts the
dependency the architecture is built on.

**Extend `day.plan_skipped` with a third `kind: 'lapse'`.** Rejected
even though `day.plan_skipped` already carries `kind: 'morning' |
'shutdown'`. That type is about a **Day's plan**, and its two values name
the rituals that plan a day. A lapse is a property of the user's absence
across Days, not of one Day's plan; the entry would have to carry a date
it does not mean. The domain is wrong, so the type is wrong.

**Do not log the skip; derive permanence from the lapse window closing.**
Rejected. It works only while the trigger reads a state the app rewrites.
That is precisely the coupling being removed here, and it is what made
the card loseable in the first place.

**Surface the card again on every open until a door is chosen.**
Rejected. It converts a one-shot exempt surface into a repeating nudge,
which the three-part exemption criterion forbids — test 2 is that
dismissal is permanent for its trigger.
