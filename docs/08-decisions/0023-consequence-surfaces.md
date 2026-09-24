# ADR 0023 — A Consequence Surface Is Not a Nudge

- **Status:** Accepted
- **Date:** 2026-09-24
- **Deciders:** [founder]

## Context

ADR 0013 fixed the attention budget at "three surfaces are exempt from the
budget, and only these three": the onboarding local-only banner, the
"all three done" card, and the lapse-recovery card. ADR 0021 then added a
fourth requirement to the exemption criterion — a blocked firing must
**preserve** the trigger rather than consume it — and wrote it as a property
of the exemption rather than of one flow: *"any surface whose trigger is a
state rather than a schedule must be able to wait."*

**The third surface cannot obey that.** Its trigger is *"the completed task
was the third of today's top three"* (`06-flows/completion.md`) — a state, and
one that expires at midnight. `attention-budget.md` also requires exempt
surfaces to obey quiet hours, focus mode and in-event suppression, and quiet
hours are **540** of a day's **1440** minutes. So a user who completes the
third item at 22:30 has the card blocked, and the next eligible open is 07:00
— at which point "today's top three" is the new day's empty list. The card is
deleted, not delayed, and the fourth requirement's own logic says that is a
defect.

**The card was on the wrong list.** `attention-budget.md`'s definition of a
nudge is three conditions, all required: a nudge *"interrupts the user … wants
a decision or action … is not user-initiated."* The card is the direct
consequence of a completion the user just made, so it fails the third
condition. So do the undo toast and the completion note field, which fire
beside it and which no doc has ever filed anywhere — they are simply outside
the budget and nobody had to say why.

The exemption list exists for surfaces that **do** interrupt the user and are
let through anyway. A consequence surface is not interrupting anyone.

## Decision

**Read condition 3 as causation, not navigation.** *"Not user-initiated"* means
the user's gesture caused this surface, not that the user opened a screen the
surface then rendered into. `attention-budget.md` already lists "tapping
search, opening the calendar, long-pressing a task" as examples, and every one
of those is a *request*; a surface that answers a request is a different thing
and the definition never distinguished them.

**Name the class. A consequence surface is the direct rendering of a mutation
the user just made.** It is outside the budget, outside the exempt list, and
outside quiet hours, focus mode and in-event suppression — not by exception,
but because it was never a nudge:

- the undo toast (`06-flows/completion.md`)
- the completion note field (`06-flows/completion.md`)
- the protocol metric toast (`06-flows/completion.md`)
- the "all three done" card (`06-flows/completion.md`)

**The exempt list drops from three to two:** the onboarding local-only banner
and the lapse-recovery card. Both triggers outlast any block — a lifetime, and
a lapse.

**The exemption criterion gains its boundary.** "Must be able to wait" assumes
the wait ends before the trigger does, and that is not automatic:

> A surface whose trigger expires inside the longest block it can be given is
> not eligible to be exempt. Either its trigger outlasts the block, or it is a
> consequence surface, or it enters the catalog and pays.

Docs updated in the same change: `03-experience/attention-budget.md` (the
definition, the class, the list, the criterion), `06-flows/completion.md` (the
card's claim), and a pointer note in ADR 0013.

## Consequences

**Positive.**

- The budget's coverage is now total on the first question a reader asks
  ("does this count?"), instead of total only after the exemption table has
  been cross-checked against the trigger's lifetime.
- Three surfaces that were filed nowhere are now named, and the toast and the
  note field stop depending on the reader noticing that they are not in the
  catalog.
- The fourth requirement gains the clause it needed. The lapse lab found the
  rule; this ADR finds where the rule stops applying, which is the part that
  makes the rest of it usable.
- The "all three done" card can fire at 23:00, which is the only time some
  users finish their third item.

**Negative.**

- A surface can now be outside the budget without appearing in a list of
  things outside the budget. The mitigation is that the class has a name and a
  test, so it can be applied to a candidate rather than looked up — but the
  exempt table is no longer a complete answer to "what escapes the budget?",
  and readers who used it as one will be wrong.
- "User-initiated" is now doing two jobs in one word: a request, in the
  existing examples, and a cause, in the new reading. The paragraph
  distinguishes them; the phrase does not.
- The card's once-per-day and permanent-dismissal guarantees were previously
  carried by the exemption's test 1 and test 2, and are now carried by the
  card's own specification. They are still stated there, but the enforcement
  moved from a shared rule to a per-surface sentence.

**Neutral.**

- No `SurfaceId` changes. The card was never in the catalog and does not enter
  it, so the three sets ADR 0013 keeps in step are untouched.
- No settings change. Exempt surfaces have no per-surface toggle and
  consequence surfaces do not gain one.

## Alternatives considered

- **Exempt anything "fired in response to a user action or app open."**
  Rejected by ADR 0013 and rejected here for a different reason. ADR 0013's
  objection is that every nudge fires on an app open, so the wording would
  empty the invariant. This ADR's test is narrower and does not have that
  property: a consequence surface cannot occur at any other time and cannot be
  caused by anything but the one gesture it belongs to. **This is not that
  proposal re-offered** — it is the class that proposal was reaching for,
  defined so that it excludes the app open.

- **Give the card an exemption and let it ignore the context rules.** Right
  outcome, wrong mechanism, and it was the first shape tried. It needs a
  carve-out written into four rules, and it leaves the exempt list describing
  a category that is half "let through anyway" and half "never applied".

- **Queue the card and fire it at the next eligible open.** The fourth
  requirement taken literally. Rejected: the next eligible open is the next
  morning, and the card would congratulate the user about a list that no
  longer exists — a worse outcome than the bug, and a live contradiction of
  the card's own once-per-day guarantee.

- **Put the card in the catalog and let it pay.** Rejected: finishing your own
  top three would spend one of the day's three nudges and could silence the
  weekly review. That is precisely the outcome the exemption existed to
  prevent, which is the signal that the surface was mis-filed rather than
  under-served.

- **Shorten quiet hours, or start them later.** Rejected as a fix for the
  wrong problem. It changes the budget for every surface in the app to make
  one card reachable, and it leaves the definition's third condition
  ambiguous.

- **Delete the card.** Rejected. It is the app's only acknowledgement of a
  completed goal and its placement is correct in every other respect; the
  defect was in which list it sat on.
