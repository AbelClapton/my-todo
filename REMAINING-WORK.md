# Remaining Work — Documentation Consistency Pass

**Status as of:** 2026-09-22 — **The review is finished, production
is planned, and the design surface is specified.** Rounds 1–5 complete:
ADRs 0010–0016 are reflected in the
docs, triage items 1–19 are closed, the roadmap judgement calls are
settled, and `error-handling.md` and ADRs 0002–0009 have been read.
**ADR 0017** (forwarded mail ownership) and **ADR 0018** (production
stack and mail providers) close items 20 and 21 and settle every
production choice except one: **the domain string itself**, which needs
availability and taste, and is deliberately deferred to a gate rather
than a date.

The design pass (§10) then produced `03-experience/surfaces.md`,
`components.md`, `app-shell.md`, and `states.md`, closed all fifteen gaps
it exposed, and recorded the two decisions that are not obvious as
**ADR 0019** (waiting never animates) and **ADR 0020** (an update is
never announced).
**Purpose:** continuation point for the doc-consistency review of `docs/`.

This file lives at the repo root, not in `docs/`, because `docs/` is a
numbered spec set with a mandatory five-section structure and its own
doc-writing rules. This is an operational backlog, not a spec.

---

## 1. Where things stand

### Done — do not redo

**Round 1 (unambiguous fixes):**

- `01-foundation/glossary.md` — haptics listed as correct four
  (`completion, mode switch, error, success`); motion summary
  corrected; gesture summary now lists six with back-swipe and pinch.
- `03-experience/design-tokens.md` — elevation count ("only four
  levels" → five); added `duration-longpress` to the motion token table.
- `02-architecture/object-model.md` — edge 11 "(one-to-one, required)"
  → "(exactly one, required)".
- `02-architecture/day-as-unit.md` — Daily Note created by
  `daily_note.created` (was an invented `note.attached_to` mechanism).
- `02-architecture/data-lifecycle.md` — "three irreversible actions"
  → four confirmations; dropped the fourth export format.
- `02-architecture/projections.md` — removed the `attention.*` log-domain
  row from the invalidation table.
- `07-infrastructure/auth.md`, `07-infrastructure/integrations.md` —
  same three→four confirmation count fix.
- `07-infrastructure/sync-engine.md` — "client does not poll" wording;
  undo attribution pointed at Invariant 1 + compensations, not the motion doc.
- `05-modules/settings.md` — confirmation count two → three, with
  **Revoke calendar access** added to the Integrations group, a spec
  paragraph, and the Behavior list.
- `05-modules/habits.md` — habit immutability window is `baseline` and
  `active`, not just `active`.
- `09-roadmap/milestones.md` — "all 8 are true" → 10; notes/edge-11 wording.
- `04-ai/retrieval-layer.md` — added the missing `research` tool.
- `README.md` — dates rule now scopes ISO to specs/payloads/examples and
  defers UI copy to glossary display forms.
- `prompts.md` — 12 domains incl. `attention` → 11 domains.
- `06-flows/disruption.md` — "Shifted 4 items" → "tasks".
- `06-flows/shutdown.md` — append → prepend; two shutdown triggers split.
- Deleted `10-engineering/qualitiy-standards.md` (byte-identical duplicate
  of `quality-standards.md`).

**Round 2 (ADRs + agreed in-doc fixes):**

- Wrote `docs/08-decisions/0010-undo-exemptions.md` through
  `0014-tier-3-metering.md`. See section 5 for the decisions.
- Stripped frozen line-number citations from all five new ADRs
  (they only cite files now).
- `04-ai/research-and-protocols.md`, `04-ai/tier-3-assistant.md` —
  research is 50 units; `cost-model.md` named as the authority.
- `07-infrastructure/integrations.md` — calendar sync is
  "Load-bearing," not "Essential / not usable without it."
- `05-modules/calendar.md`, `01-foundation/glossary.md` — mirrored
  events are sourced from the integration, edits write through;
  in-app events are owned by the app.
- `05-modules/notes.md` — a Day may have additional Notes; Daily scope
  vs Recent/All clarified.
- `06-flows/disruption.md`, `06-flows/lapsed-recovery.md` — handoff uses
  `lapse.threshold_days`; "lapse window (21 days)" → "archive horizon."
- `03-experience/gesture-vocabulary.md`, `04-ai/tier-3-assistant.md` —
  Tier 2 keyboard is `Cmd+Enter`; `Cmd+K` is only the palette; mobile
  long-press-on-mode-switcher collision clarified.
- `README.md` — AI doc rule now permits module docs to own user-visible
  output while keeping prompt construction in `04-ai/`.
- `10-engineering/quality-standards.md` — analytics justification added.
- `07-infrastructure/auth.md`, `07-infrastructure/stack.md` — dropped the
  Turso/RLS and Postgres-exportability justifications; identity-only framing.
- `02-architecture/event-log.md`, `05-modules/settings.md`,
  `05-modules/calendar.md` — added bare `default_mode` and
  `developer_mode` keys, the Appearance row, and the `calendar.md` reference.
- `09-roadmap/build-order.md`, `09-roadmap/milestones.md` — reordered
  (see section 6 for the three judgement calls that may need revisiting).

### Round 3 — the ADRs, implemented

Batches A–E and the original triage list (items 1–12) are done. The
per-batch record below is the audit trail: what changed, file by file,
and the judgement calls each batch forced.

**Still open — one item, and it is deliberately deferred:**

- **The domain string** (item 17a). Everything around it is decided: a
  `.com` (or `.app`) from Cloudflare Registrar, chosen independently of
  the wordmark, bought at the gate — before the first magic link to a
  real user, or before Phase 7's forwarding. Nothing can be bought until
  availability is checked, and nothing blocks on it until then.

Everything else in this file is closed, including the ADR read-through
in section 4, item 19, and items 20–21 (ADRs 0017 and 0018).

### The per-batch record

- **Batch A — ADR 0010, done.** Invariant 1 rewritten in
  `principles.md` (two mechanisms, closed set, reachability test,
  new violations, new example). `completion.md`: habit sites are
  toggle references, the protocol metric log gained its toast (spec
  and the logging example). `habits.md`: check interaction + skip
  reversal. `disruption.md`: the shove gained its toast. (The
  audit's "line ~143, batch reschedule" was actually the shove; the
  digest's batch case already had one.)
- **Batch B — ADR 0011, done except one open item.**
  `gesture-vocabulary.md` is eight gestures: two new definitions,
  two new matrix columns, the note-list row fixed, the
  swipe-down-vs-pull-down rule written into the disabled feedback
  section, colour coding de-`danger`-ed, keyboard table extended,
  and a removal example. `glossary.md` summary, and the verbs in
  `capture.md`, `morning-plan.md`, `shutdown.md`,
  `lapsed-recovery.md`, `resurfacing.md`. Two rows added to
  `tasks.md`'s action table. Open: section 3 item 15.
- **Batch C — ADR 0012, done.** `event-log.md`: `sync?: boolean` added
  to `LogEntry` with its routing rules; `daily_note.created` →
  `day.note_created` with the permanent replay clause; `habit.unarchived`
  and `person.unarchived` added. `object-model.md`, `day-as-unit.md`
  (2 sites) renamed. `projections.md`: `inbox` re-derived, no
  `source: 'capture'`. `sync-engine.md`: the flag is legal, plus the
  no-backfill and data-loss paragraphs. `habits.md`, `people.md`:
  re-activation names its type. `areas-and-goals.md`: "delete" gone,
  and the Inbox Area "cannot be archived" rather than "deleted".
  ADR 0008 points at 0012. `auth.md`'s `sync: false` claim confirmed
  unchanged.
- **Batch D — ADR 0013, done.** `attention-budget.md`: catalog gained
  `streak_repair` **and** the "Used for" column the ADR refers to;
  new "Contextual variants" and "Exempt surfaces" sections; exempt
  rows added to the not-a-nudge list and to the per-surface toggle
  bullet; the catalog/union/settings triad stated at the catalog head.
  `event-log.md`: `SurfaceId` gained `streak_repair`. `settings.md`:
  exempt surfaces have no toggle. `morning-plan.md`: the "not a nudge"
  claim replaced by budget-governed. `shutdown.md` and `disruption.md`:
  the digest's double-fire resolved (content inside shutdown; only the
  skipped-shutdown firing spends budget). `resurfacing.md`: streak
  repair is the `streak_repair` surface. `onboarding.md`,
  `completion.md`, `lapsed-recovery.md`: the three exempt surfaces
  named as exempt. `doing-the-day.md`: gap/cancelled/quick-task nudges
  named as `contextual` variants. `disruption.md`: the calendar-shift
  offer named as a `contextual` variant.
- **Batch E — ADR 0014, done.** `local-first.md`: per-user quota
  tracking added to Server responsibilities. `cost-model.md`: Pro
  retitled "specified, not purchasable", the Upgrade placeholder
  explained, and the "no gate behind an unbuyable tier" rule stated.
  `settings.md`: the premium-tier invariant now cites it, and the
  three usage rows say "usage and remaining quota".
- **Section 3 items 1–12, done.** (1) `calendar.md`'s metric row covers
  `baseline` and `active`. (2) The Day view's preview slot is now "Day
  notes" — a card per note attached to the day — which covers both
  `notes.md` and `review.md`. (3) The contacts toggle names
  `integration.contacts.enabled`. (4) `protocols.md` quotes the identity
  sentence verbatim, with its "A". (5) **`02-architecture/data-lifecycle.md`
  now owns freshness thresholds**; `principles.md` (two sites) and
  `integrations.md` point there, and the four numeric restatements in
  `integrations.md` plus the one in `calendar.md` are gone. (6)
  "Permanent" in `integrations.md` is defined as "not by drift, not by
  request volume". (7) `auth.md`'s refresh window is sliding and the
  "does not expire" claim is scoped to it. (8) `code-conventions.md`'s
  optional-vs-nullable rule is inverted to match the payloads, and its
  Zod example uses `.optional()`. (9–10) `onboarding.md` screen 7 and
  `morning-plan.md`'s trigger list agree: the plan is suppressed for the
  rest of the onboarding day. (11) `README.md` names its two exemptions
  from the five-section shape. (12) Vocabulary sweep, see below.

**Round 3 decisions worth remembering.**

- **Freshness thresholds: `data-lifecycle.md` is the owner.** It already
  had the complete six-row table, and `calendar.md` already pointed
  there. The other three docs now point at it too.
- **Item 12's scope.** The sweep replaced `item`/`items` where it stood
  for a Task or for an inbox row. Genuine generic uses are left alone:
  "menu item", "timeline items", "a list of related items", and Tier
  1's `items: Array<{…}>` payload field. The sweep needed a canonical
  noun for an inbox row, so **`Capture` and `Inbox` are now defined in
  the glossary** (a new "Capture and the inbox" section); otherwise the
  replacement would have broken the glossary's own rule that an
  undefined term is not canonical.

**Round 3 notes on the section 8 checklists.**

- `drop` survives only in ADR 0011's own Context section.
- `re-activate` deliberately survives in `habits.md` and `people.md`,
  now with `habit.unarchived` / `person.unarchived` named beside it.
  Section 8 reads as if the word should vanish; the Batch C table only
  asked for the type to be named. Chose the latter.
- `source: 'capture'` survives in `projections.md` as the sentence that
  says there is no such marker.

### Round 4 — decisions taken, error handling read

Five decisions were put to the founder and answered; all are recorded in
section 5.

- **ADR 0016 written** — notes have no removal state. The note list's
  swipe down is disabled, no `note.archived` type is added, and ADR 0011
  carries a pointer to it. See section 3 for why this also settled
  item 14 (the people list's archive moved to swipe down).
- **Silence is not consent** — Tier 1's unanswered confirmation no longer
  applies itself, stated at the assertion site, as a rule in Invariant 2,
  and in `capture.md`'s pipeline.
- **Roadmap** — voice stays in Phase 8 (native-only), the attention
  budget stays in Phase 1 with the invariant exception written down, and
  "test one variable" moved to Phase 5.

And the never-reviewed engineering doc was read:

- **`error-handling.md`** — seven defects fixed. The detail is in
  section 4; the shape of them is that this doc had been describing a
  system that does not exist (a 3-second banner threshold, a
  freshness threshold no table defines, an absolute "no error for
  offline" beside a copy row for it), and it referenced one setting
  — crash reporting — that Settings never exposed.

And **ADR 0015 (app name) was reviewed** — two of its factual claims
were wrong and are corrected: a crossed citation of `constitution.md`
Rule 5 against `research-and-protocols.md`, and an identity inventory
that missed the forwarding-domain placeholder (item 17). Its subtitle
rationale was tightened so it no longer conflates the identity
sentence's frame with the mechanism the subtitle names. Item 18 came
out of the same review.

---

## 2. The ADR batches — implemented in Round 3

Two ADRs sit outside these batches and are already reflected in the
docs: **0015 (app name)** was written alongside this pass, and
**0016 (notes have no removal state)** came out of Round 4's decisions.
The tables below cover 0010–0014 only.

All five ADRs are now reflected in the docs. The tables below are the
audit trail: they map each ADR to the files it touched, and they are the
checklist to re-run if an ADR is ever amended. The per-batch record in
section 1 says what each file actually says now.

Line numbers below were accurate on 2026-09-22 and will drift. Match on
the quoted text, not the line.

### Batch A — ADR 0010 (undo)

| File | Change |
|---|---|
| `docs/01-foundation/principles.md` | Rewrite Invariant 1: every mutating action is undoable via **toast** (default) or **direct toggle** (closed set). Add the reachability test. Update the rules list, the violations list ("a destructive action with no undo path" still violates), and the composition examples. |
| `docs/06-flows/completion.md` | Three sites. Habit check/uncheck (line ~132) becomes a toggle reference to ADR 0010. **`protocol.metric_logged` (lines ~152 and ~205) must GAIN the toast** — the daily obligations card is dismiss-once, so there is no toggle-back path. |
| `docs/05-modules/habits.md` | Line ~86: keep as a toggle, cite ADR 0010 and the closed set. |
| `docs/06-flows/disruption.md` | Line ~143: **batch reschedule must GAIN the toast** — a toggle cannot reverse a multi-event mutation. |

### Batch B — ADR 0011 (gestures)

| File | Change |
|---|---|
| `docs/03-experience/gesture-vocabulary.md` | "exactly six gestures" (line ~14) and "### The six gestures" (line ~28) → eight. Add swipe-up (attach) and swipe-down (remove from this list, reversibly) definitions. Add two columns to the gesture-to-surface matrix and fix the **note-list row** (it is currently swipe-left = delete, which breaks the uniformity rule the doc states). Update disabled-gesture feedback wording. Delete moves to long-press + overflow only. |
| `docs/01-foundation/glossary.md` | Gesture summary currently says six; must become eight after the ADR lands. |
| `docs/06-flows/capture.md` | Lines ~105/~107: swipe-down verb is "Delete" → remove/reversibly; keep swipe-up = attach. |
| `docs/06-flows/morning-plan.md` | Lines ~57/~156: swipe-down "Drop" → remove semantics (someday or archive). |
| `docs/06-flows/shutdown.md` | Line ~167: "down to drop" → remove semantics. |
| `docs/06-flows/lapsed-recovery.md` | Line ~91: "down to delete" → remove semantics. |
| `docs/06-flows/resurfacing.md` | Line ~46: "down to delete" → remove semantics. |

### Batch C — ADR 0012 (log shape and type list)

| File | Change |
|---|---|
| `docs/02-architecture/event-log.md` | Add `sync?: boolean` to the `LogEntry` shape (routing field, default true, never read by a projection). Rename `daily_note.created` → `day.note_created` (line ~159) and **state the replay obligation**: projections must keep accepting the old type string; `schema_version` does not increment. Add `habit.unarchived` — `{ habit_id }` and `person.unarchived` — `{ person_id }`. Domain list stays at eleven. |
| `docs/02-architecture/object-model.md` | Line ~166: `daily_note.created` → `day.note_created`. |
| `docs/02-architecture/day-as-unit.md` | Lines ~38 and ~153: same rename. |
| `docs/02-architecture/projections.md` | Line ~71: `inbox` is currently "`task.created` entries with `source: 'capture'`". Drop the `'capture'` source; redefine as "created but not scheduled, archived, or completed." |
| `docs/07-infrastructure/sync-engine.md` | The `sync: false` flag is now legal. Add the no-backfill statement (enabling cloud backup applies to new entries only) and the data-loss path (a local-only entry exists only on the device that wrote it). |
| `docs/07-infrastructure/auth.md` | Line ~163: `sync: false` reference is now consistent; no change to the claim, just confirm. |
| `docs/05-modules/habits.md` | Line ~169: re-activation now has `habit.unarchived` behind it. |
| `docs/05-modules/people.md` | Line ~127: same for `person.unarchived`. |
| `docs/05-modules/areas-and-goals.md` | Line ~35 ("rename, delete, or add") and line ~64: drop "delete" — Areas archive; `area.deleted` is deliberately not added. |
| `docs/08-decisions/0008-local-first-sensitive-defaults.md` | Update the implementation notes to point at ADR 0012. |

### Batch D — ADR 0013 (attention budget scope)

| File | Change |
|---|---|
| `docs/03-experience/attention-budget.md` | Add `streak_repair` to the catalog table. Add the three-part exemption criterion and the three exempt surfaces (onboarding banner, all-three-done card, lapse-recovery card), stating that exempt surfaces have no `SurfaceId` and no settings toggle. Note that the gap nudge, cancelled-event nudge, and quick-task nudge are `contextual` variants — the doc's "must NOT do" list already says this, so ratify rather than rewrite. |
| `docs/02-architecture/event-log.md` | Add `streak_repair` to the `SurfaceId` union. |
| `docs/05-modules/settings.md` | Per-surface toggle list stays in sync with the catalog; add the line that exempt surfaces have no toggle. |
| `docs/06-flows/morning-plan.md` | Line ~20 says "surfaces subject to the attention budget"; line ~40 says "not a nudge." Per ADR 0013 the plan **is** budget-governed. Fix line ~40. |
| `docs/06-flows/shutdown.md` | Resolve the double-fire: the what-slipped digest is content inside shutdown completion (no budget); it is a standalone `what_slipped` nudge only when shutdown was skipped (consumes budget). |
| `docs/06-flows/resurfacing.md` | Streak repair becomes its own surface (`streak_repair`), not an unnamed nudge. |
| `docs/06-flows/doing-the-day.md` | Align the gap-nudge section with the `contextual` variant framing. |
| `docs/06-flows/onboarding.md`, `docs/06-flows/completion.md`, `docs/06-flows/lapsed-recovery.md` | Mark the banner, the all-three-done card, and the recovery card as **exempt** surfaces, and say so explicitly so they are not read as unregistered nudges. |

### Batch E — ADR 0014 (metering)

| File | Change |
|---|---|
| `docs/02-architecture/local-first.md` | "Server responsibilities" list needs a per-user quota-tracking entry. |
| `docs/07-infrastructure/cost-model.md`, `docs/05-modules/settings.md` | ADR 0014 decided that Pro is specified but not purchasable, and that no feature sits behind an unbuyable tier. State it in both docs; the "Upgrade placeholder" vs "no premium tier" tension is not yet written down anywhere. |

---

## 3. Findings

All items are closed except the domain **string** in 17. Items 1–12 were
resolved in Round 3; 13–16, 18 and 19 came later; 20 and 21 were closed
on 2026-09-22 by ADRs 0017 and 0018, which also settled the rest of 17.
The table below is the record of what was found, not a to-do list.

**Closed in this pass:**

- **18** — `auth.md`'s magic-link section now states the return path
  (universal link on iOS, app link on Android, URL-scheme fallback,
  ordinary browser link on web), so the ADR's reference to deep links
  finally has a home and the phone-side auth story has no hole in it.
- **19** — fixed by documenting the mechanism that already exists, on
  the founder's agreement of 2026-09-22. See the row for what was
  changed and what was deliberately deferred.

**Items 13–16, resolved as:**

- **13** — Tier 1's 10-second auto-apply is **removed**. An unanswered
  confirmation no longer applies itself; the raw capture is kept and
  the parse stays on offer in the inbox. Stated at the assertion site
  (`04-ai/tier-1-parsing.md`), as a new rule in Invariant 2
  ("silence is not consent"), and in `capture.md`'s pipeline.
- **14** — The people list's archive moves to **swipe down** and swipe
  left is disabled there. ADR 0011's *decision* already said
  Person → archive for swipe down; the matrix had followed its
  *Context* aside instead. ADR 0016's "disabled rather than
  repurposed" principle forced the question, and **the founder
  ratified it on 2026-09-22**. The accepted cost: anyone who learned
  "swipe a person left to archive" finds that swipe inert now, since
  the removal sits one direction over. Reconsider only if
  people-archive-on-swipe-left has already reached real users. The
  clean way to give swipe left a job there would be a person "not
  now" state (snooze the relationship), which People does not have
  and which would need its own ADR.
- **15** — **`ADR 0016` written:** notes have no removal state, the
  note list's swipe down is disabled, no new event types are added.
  ADR 0011 carries a pointer to it.
- **16** — ADR 0011's "(Person, Area, Note)" gloss is superseded by
  `capture.md`'s picker list, and its amendment note now says so.

**The Round 4 findings, recorded above as they were when found:**

These were in the original review but fell outside both the ADR set and
the in-doc fix list. All are small.

| # | Where | Issue |
|---|---|---|
| 1 | `docs/05-modules/calendar.md` ~line 54 | Metric input row shows only "if a protocol is active"; `protocols.md` surfaces it during `baseline` too. |
| 2 | `docs/05-modules/notes.md` ~line 91 and `docs/05-modules/review.md` ~line 88 | Both say a preview card appears in the Calendar Day view; `calendar.md`'s Day view layout has no slot for one. |
| 3 | `docs/05-modules/people.md` ~line 107 | "Sync contacts" toggle does not reference `integration.contacts.enabled`, though the key exists. |
| 4 | `docs/05-modules/protocols.md` ~line 8 | Quotes the identity sentence without the leading "A". `identity.md` requires verbatim quoting. |
| 5 | `docs/05-modules/calendar.md`, `docs/01-foundation/principles.md`, `docs/07-infrastructure/integrations.md`, `docs/02-architecture/data-lifecycle.md` | Circular threshold ownership: `principles.md` names `integrations.md` as the source; `integrations.md` disclaims ownership and points to `data-lifecycle.md`; `calendar.md` points to `data-lifecycle.md`. Also `integrations.md` is missing the research and prices thresholds that `data-lifecycle.md` defines. Pick one owner and make the other three point at it. |
| 6 | `docs/07-infrastructure/integrations.md` | Social is "permanently out of scope" in one place and "a *current* decision, not a permanent one" in the closing note. |
| 7 | `docs/07-infrastructure/auth.md` ~line 76 vs ~line 69 | "Sessions do not expire on a schedule" vs 30-day refresh-token expiry. |
| 8 | `docs/10-engineering/code-conventions.md` ~line 136 | "No optional fields where a union would work" contradicts the documented optional payload fields (`due?`, `defer?`, `priority?`) and the doc's own Zod example, which uses `.nullable()`. |
| 9 | `docs/06-flows/onboarding.md` ~line 127 | Now line "shows their habit for today"; habits are not a now-line source per `doing-the-day.md`. |
| 10 | `docs/06-flows/onboarding.md` ~lines 128-131 | "First morning plan fires on day 2" vs `morning-plan.md` firing on the first open of any day. |
| 11 | `docs/README.md` ~line 58 | "Every doc follows the same five-section shape" is false for ADRs 0001–0014 and for `prompts.md`. Either narrow the rule or name the exemptions. |
| 12 | ~24 sites | Vocabulary sweep: "item/items" used for Task in `06-flows/capture.md`, `lapsed-recovery.md`, `morning-plan.md`, `resurfacing.md`, and in `07-infrastructure/integrations.md` (contacts/email capture wording). Glossary forbids synonyms. Only `disruption.md`'s undo string was fixed. |
| 13 | `docs/04-ai/tier-1-parsing.md` | The mid-confidence confirmation chip auto-applies after 10 seconds if untouched. That is a second silent-mutation path alongside the ≥0.85 case. Confirm it is intended under Invariant 2, or make it require a tap. |
| 14 | `docs/03-experience/gesture-vocabulary.md` | People list: ADR 0011's Context bills swipe-left = archive as consistent with "not now / later", but its swipe-down mapping lists Person → archive. Resolved for now by keeping archive on swipe left and disabling swipe down there; a note under the matrix records why. Revisit if the ADR is read as "swipe down is the only removal gesture". |
| 15 | `docs/03-experience/gesture-vocabulary.md`, `docs/02-architecture/event-log.md` | **Needs a decision.** ADR 0011 maps note swipe-down to "leaves Recent", but Recent is derived ("Notes edited in the last 14 days", `05-modules/notes.md`) and the Note object has only `deleted` — there is no `note.archived` and no such type in the log. Either add `note.archived`/`note.unarchived` (a new type needs a new ADR per the event-log invariant) or make the gesture non-mutating. The mapping is currently written into the matrix as the ADR's authority says. |
| 16 | `docs/08-decisions/0011-gesture-vocabulary-expansion.md` vs `docs/06-flows/capture.md` | Attach-picker contents disagree: the ADR says "(Person, Area, Note)", `capture.md` says "(Person, Area, Goal, or an existing task)". `gesture-vocabulary.md` now follows `capture.md`. |
| 17 | `docs/07-infrastructure/integrations.md` ~line 111, `prompts.md` ~line 1234 | **Decided 2026-09-22 except the domain string.** ADR 0017 settles the slug rules and who writes a forwarded capture; ADR 0018 settles the domain policy, the registrar, both mail providers, and the gate. Only the *string* is open, pending availability. The finding was that the address was still the placeholder `<user-slug>@in.your-app.com`, in two files, and `<user-slug>` was defined nowhere. Three sub-decisions: **(a)** the domain — recommend decoupling it from the wordmark, because forwarding addresses are written into users' mail clients and cannot be reissued when the name changes; **(b)** the slug rules — it is an unauthenticated write endpoint, so guessability is a privacy control, and it should be user-changeable as the only remediation for a leaked address; **(c)** the **provider** (Resend or similar). Note that a provider does not remove this item — it *requires* a verified domain. **Founder intent, 2026-09-22: stay free for now** — deploy the app to a free Vercel subdomain, use Supabase Auth's built-in magic-link email while developing, and keep a placeholder rather than issuing real addresses against a cheap domain. ADR 0018 replaces Vercel with Cloudflare Workers for exactly the reason this check existed — the Hobby plan is non-commercial, which is a poor fit for an app with a store listing — so the founder's free-for-now intent survives the check intact. |
| 20 | `docs/07-infrastructure/integrations.md`, `docs/07-infrastructure/sync-engine.md`, `docs/02-architecture/local-first.md` | **Closed by ADR 0017.** The resolution: the Worker relays only, the device parses with Tier 1 and writes the entry, and undelivered mail waits in a bounded transient buffer that is disclosed where the address is shown. The problem it fixed — the server receives forwarded mail, but the client owns the log and a forwarded capture becomes a **local-only** note. So it cannot be a server-created log entry: that would put the body where ADR 0008 keeps it out of, and leave the server authoring an entry it must not sync. The coherent design is that the server holds the message only transiently, pushes the parsed payload to the device, and the device writes `note.created` with `sync: false`. No doc says this. |
| 21 | `docs/07-infrastructure/stack.md`, `docs/07-infrastructure/cost-model.md` | **Closed by ADR 0018.** `stack.md` now carries hosting, domain, and both mail rows, and `cost-model.md` has an Infrastructure costs subsection. The gaps it filled: no email layer appeared in `stack.md`'s core stack table, and `cost-model.md` had no email line item at all — even though auth email is a message per login for every user, the one cost that scales with the whole user base rather than with engagement. The cost model's own justification ("unmetered because it runs locally or is rare") does not cover it. It needs listing, not metering; the inbound 100/day/user cap is worth naming as the cost ceiling it is. **Also unaddressed: no doc names a hosting platform.** `quality-standards.md` has a deploy policy (staging on merge, production manual) but no target, and `sync-engine.md`'s WebSocket notification path does not sit naturally on a serverless platform — pull-on-foreground is the documented fallback, but the choice should be deliberate. |
| 18 | `docs/07-infrastructure/auth.md` ~line 83 | **Closed.** Its text said auth, deep links, and the share sheet "need a display name and a bundle identifier". The share sheet and auth were documented; deep links appeared in no doc. `auth.md` now documents the magic-link return path. |
| 19 | `docs/08-decisions/0008-local-first-sensitive-defaults.md`, `docs/07-infrastructure/sync-engine.md` | **Closed 2026-09-22.** Both promised a user could migrate an existing local-only entry, and no doc defined how. Resolved by documenting the mechanism that does exist: an edit is a *new* entry carrying the same content, so a local-only note reaches the second device by being edited (`note.edited` carries the whole body; `person.renamed` does the same for a name). Metric-log history has no equivalent path, and the asymmetry is now stated. An explicit per-entry migrate action is deferred, not rejected — it is irreversible once the server holds the payload, so it needs a fifth confirmation and an Invariant 1 amendment. |

---

## 4. Docs never reviewed

**Closed.** `error-handling.md` was read and corrected in Round 4 (see
below). ADRs 0002–0009 were read end to end in the read-through after
it — 0006 and 0007 included, which an earlier version of this list had
missed.

### The ADR read-through (0002–0009, plus 0015)

Five objective defects, all fixed, plus item 19:

- **ADR 0002** — "Every temporal entity attaches to exactly one Day"
  contradicted `day-as-unit.md`, which states that a Protocol spans
  Days and does not attach to one. Rewritten to match the doc it
  decides.
- **ADR 0004** — rejected React Native for violating the "one codebase
  invariant". No such invariant exists anywhere in the doc set. The
  rejection now stands on the reason it actually rests on.
- **ADR 0006** — two mechanism claims had been overtaken by later
  docs: `due` "surfaces in the now line" (the now-line sources are
  focus, event, next event, next *scheduled* task, top-priority open
  task — not `due`), and "a `due` task that is not completed by end of
  day becomes part of the what-slipped digest" (slipped means
  `scheduled_day: today`; a passed `due` is the separate "overdue"
  category). Both corrected.
- **`day-as-unit.md`** — its invariant enumeration was missing Task
  scheduling, which its own Specification lists as attaching to a Day.
- **ADR 0015** — reviewed before this pass; two claims corrected then,
  and one of its own notes corrected here.

**Verified and left alone:** ADR 0003, ADR 0007, and ADR 0005's
mechanism claims all hold against the docs. "Reminder" in UI copy is
not a glossary gap — the glossary explicitly declines to define
microcopy and says its absence is the prohibition on a *term*, which is
exactly what ADR 0006 states.

### What `error-handling.md` was carrying

Seven defects, all fixed. Their shape is that the doc described a
system that does not exist.

1. "a subtle banner if persistent (>3s)" had no source, and
     contradicted the example (a banner at 8s) and the retry policy.
     Now: nothing while transient; one neutral line once the retry
     ladder is exhausted (user-initiated) or the 1-hour threshold
     passes (background sync).
  2. The retry policy sent background sync to "the freshness
     threshold," but `data-lifecycle.md` has no sync row. Now: the
     sync indicator's 1-hour threshold, which is also when the
     settings retry button appears.
  3. "No error is surfaced for being offline" was absolute, against
     the copy table's persistent-offline row. Reconciled: offline
     never produces an error state, but the informational line can
     appear once the failure is persistent.
  4. The AI log-rotation note said `proposal_id`; `ai.failed` carries
     `call_id`.
  5. The retry ladder said "2s, 4s, 8s, up to 60s. Maximum 5
     retries" — five steps never reach 60s. Split: the ladder is
     2/4/8/16/32 for user-initiated calls; the 60s cap belongs to the
     background loop, which never gives up on its own.
  6. The app-root boundary offered "[Reload]" and a bug-report link;
     the taxonomy and copy table say "[Reload] [Report]".
  7. **Crash reporting had no setting.** `error-handling.md` and
     `quality-standards.md` both described an opt-in toggle that
     `settings.md` never exposed. Added to the About group as
     `crash_reports.enabled`, default off, with the data it may send
     spelled out.

---

## 5. Decisions already made — do not re-litigate

| ADR | Decision |
|---|---|
| 0010 | Invariant 1 gains a second undo mechanism (direct toggle) with a **closed set**: `habit.checked`, `habit.unchecked`, `habit.skipped`. Adding to the set requires an ADR. Toggle is valid only if the reversing affordance stays reachable (row visible, same session, surface not dismiss-once). Everything else keeps the toast. |
| 0011 | Eight gestures. Swipe up = attach. Swipe down = "remove from this list, reversibly" (task→someday, habit→archive, person→archive, inbox→remove); never destructive. Swipe left uniform everywhere. Delete moves off swipe. **Amended by 0016:** the note row is withdrawn — notes have no removal state, so the note list's swipe down is disabled. |
| 0012 | `sync?: boolean` on `LogEntry`. `daily_note.created` → `day.note_created` with a permanent replay obligation and no `schema_version` bump. `habit.unarchived` and `person.unarchived` added. `area.deleted` NOT added — the "delete" wording is removed from the module doc instead. `task.created.source` is NOT extended; `inbox` is re-derived from existing fields. |
| 0013 | One new SurfaceId: `streak_repair`. Gap and calendar-shift nudges are `contextual` variants. Exactly three exempt surfaces against a three-part criterion. Morning plan is budget-governed. The digest is content inside shutdown, not a surface. |
| 0014 | `cost-model.md` is authoritative for metering, quotas, and unit costs. Tier 3 complex queries metered 50/month Free. Research is 50 units per call. Quota blocks the call with the reset date; no silent degradation. Pro is specified but not purchasable, and no feature sits behind an unbuyable tier. |
| (no ADR) | Doc-writing rule: module docs own the user-visible AI output (structure, tone, banned language); prompt construction, tool selection, and confidence handling stay in `04-ai/`. Recorded in `README.md`, not as an ADR. |
| (no ADR) | Analytics: the log makes analytics technically possible; declining to build them is a values decision. Recorded in `quality-standards.md`. ADR 0001 stays untouched as the historical record. |
| 0015 | **App name is `Small Wins`** (store name `Small Wins: Habit Tracker`, subtitle `Change one thing at a time`). Only `README.md` line 1 carries it; every other doc says "the app." The brand word is never a glossary synonym — "win" is not a Task completion, a Habit compliance entry, or a Protocol result. The store listing must not mention a paid tier (ADR 0014 makes Pro unbuyable). Written outside this pass. |
| 0016 | **Notes have no removal state.** The note list's swipe down is disabled, not repurposed; `note.archived` / `note.unarchived` are NOT added. Amends ADR 0011's note mapping. |
| 0017 | **Forwarded mail: the server relays, the device writes.** The mail Worker writes no log entries and runs no AI; Tier 1 is on-device, so the device writes `note.created` with `sync: false`. One-shot delivery, keyed to avoid duplicates. Undelivered messages wait in a bounded transient buffer, dropped after 72 hours, disclosed where the address is shown. Slug: generated, 8 lowercase alphanumeric characters, never derived from name or email, rotatable with the old slug revoked. |
| 0018 | **Production stack.** Hosting: Cloudflare Workers, with Netlify as the named fallback. Domain: Cloudflare Registrar at cost, chosen independently of the wordmark, `.com` preferred. Outbound mail: Resend as Supabase Auth's custom SMTP. Inbound: Cloudflare Email Routing to a Worker — chosen over a provider inbound product because the documented 100/day-per-**user** cap cannot be met by a 100/day-**total** free tier. Mailbox and shell-build automation deferred with triggers, not dates. Turso is the server store, not the sync mechanism. Domain purchase gated on the first real magic link or Phase 7, whichever comes first. |
| 0019 | **Waiting never animates.** No spinner, no shimmer, no indeterminate progress anywhere in the app. Under 400ms shows nothing; past it, a static `surface-2` placeholder plus one line in `text-secondary`; countable waits show the count; the uncountable one (a cloud model call) shows text and no progress. The 400ms threshold is a delay, not a duration token. A design that seems to need a spinner has a product problem. Adding one later needs this ADR amended, not a states-table edit. |
| 0020 | **An update is never announced.** No toast, banner, dialog, badge, or "what's new"; a new build is picked up on the next cold launch and never takes over a live session. The consequence is an obligation: an old client must stay correct, so the log schema and sync protocol must tolerate a client several versions behind for as long as a session can live. A build identifier in settings is not an announcement. If an old client can ever be wrong, that needs a new ADR. |
| (no ADR) | **Silence is not consent.** Tier 1's unanswered confirmation no longer applies itself; the raw capture is kept and the parse stays on offer in the inbox. Recorded as a rule in Invariant 2, not as an ADR — it is what Invariant 2 always meant. |
| (no ADR) | **People list:** archive is swipe down, swipe left disabled there. Follows ADR 0011's decision plus ADR 0016's principle. **Ratified 2026-09-22**, muscle-memory break accepted. A person "not now" state is the way to give swipe left a job there, but it introduces a state People do not have and needs its own ADR. |
| (no ADR) | **Roadmap, all three calls settled.** Voice capture stays in Phase 8 (native-only; one implementation, no throwaway browser-STT path). The attention budget stays in Phase 1, with the "modules before flows" exception now written into `build-order.md`'s invariant rather than left implicit. "Test one variable" moves to Phase 5, with the protocol report that carries it. |

---

## 6. Roadmap judgement calls — all three settled in Round 4

These were applied during the reorder and flagged as revisitable. All
three are now decided; see section 5 for the decisions.

1. **Voice capture stays in Phase 8.** On-device STT arrives with the
   Phase 8 plugins (`07-infrastructure/stack.md`). A browser-STT path
   for Phase 3 was rejected. `build-order.md` now says why, in the
   phase itself.
2. **The attention budget stays in Phase 1.** `build-order.md`'s
   "modules before flows" invariant now carries the exception
   explicitly, so the next reader does not rediscover it as a bug.
3. **"Test one variable" moved to Phase 5**, with the protocol report
   that carries it. Phase 4 no longer lists it.

---

## 7. What is left

One purchase, deferred by design.

**Before the first magic link to a real user, or before Phase 7's
forwarding — whichever comes first — buy the domain.** Check `.com`
availability first, fall back to `.app`, and pick something that does not
derive from the wordmark (ADR 0018). Then write the string into four
places: `integrations.md`, `auth.md`'s sending subdomain, the forwarding
build prompt in `prompts.md`, and ADR 0015's note about the placeholder.

Everything else is decided, and **development is not blocked on it**:
build against Supabase's built-in email and a free host subdomain. The
one thing to verify at implementation time rather than assume is that
the Turso client and TanStack Start both run on the Workers runtime — if
they do not, Netlify is the named fallback and nothing else changes.

---

## 8. Verification

Run after Round 3 closed (2026-09-22). This is now a **regression check**:
if any of the first group starts returning new hits, an edit has undone
a fix.

**Returning only expected hits — pass:**

    No undo toast          habits.md 86, completion.md 136 + 215 (all three
                           are the toggle cases, each citing ADR 0010),
                           ADR 0010 line 41
    exactly six gestures   nothing
    The six gestures       nothing
    daily_note.created     ADR 0012 (5 sites) + event-log.md's replay
                           clause, which must keep the old string
    source: 'capture'      projections.md only, in the sentence saying
                           there is no such marker
    rename, archive, and delete
                           ADR 0012 only, describing the old wording
    gap nudge              doing-the-day.md (its own section, now framed
                           as a contextual variant), attention-budget.md,
                           ADR 0013
    not a nudge            four now-line contexts only (glossary,
                           principles, attention-budget, doing-the-day)

**Deliberately not zero:** `re-activate` survives in `habits.md` and
`people.md`, each naming `habit.unarchived` / `person.unarchived` beside
it. The Batch C table asked for the type to be named, not the word to
disappear. Do not "fix" this.

**Returning hits — pass:**

    streak_repair          attention-budget.md x2, resurfacing.md x2,
                           event-log.md, ADR 0013
    sync?: boolean         event-log.md, ADR 0012
    day.note_created       event-log.md x2, day-as-unit.md x2, object-model.md
    habit.unarchived       event-log.md, habits.md, ADR 0012
    person.unarchived      event-log.md, people.md, ADR 0012
    default_mode           event-log.md, calendar.md
    developer_mode         event-log.md

**Also pass:** `drop` survives only in ADR 0011's own Context section;
`down to drop` and `down to delete` return nothing.

---

## 9. Production choices — decided (ADR 0018)

The research below is kept as the record of what was weighed and what was
verified. **It is now decided:** ADR 0018 for the choices and the gate,
and section 5 for the summary. Two things are worth keeping from this
section as written, because they shaped the decision rather than being
solved by it: the inbound volume conflict (a free inbound tier capped at
100/day **total** cannot serve a documented 100/day **per user** promise —
the reason inbound and outbound use different providers), and the Turso
question (the provider's replication is not this app's sync engine, which
is the doc set's own push/pull/merge).

### The shape being proposed

| Layer | Proposed | Cost |
|---|---|---|
| Domain registrar | Cloudflare Registrar (at-cost, free DNS/WHOIS/SSL) | ~$10/yr |
| Web app host | Cloudflare Workers or Netlify (both official TanStack Start partners) | free tier |
| Server DB | Turso Cloud, "hybrid": local SQLite + background sync | free tier |
| Auth + cloud AI | Supabase project + serverless functions for Tier 3/research | free tier |
| Outbound email | Resend as Supabase Auth's custom SMTP | free to 3K/mo, then $20/50K |
| Inbound email | Cloudflare Email Routing + a Worker, on the `in.` subdomain | free, uncapped |
| Human mailbox | Fastmail (or Zoho $1, Google $7) | $5/mo — optional |
| Shell builds | Appflow (or Capawesome Cloud / Codemagic) to automate `cap sync` + submission | paid |

Cheapest coherent version of this: **~$10/yr plus optional mailbox.** That
fits the founder's free-for-now intent: everything except the domain has a
free tier good enough to build against, and the domain is the gate.

### Where it collides with the doc set — check before adopting

1. **Resend Inbound's free tier is 100/day *total*, while
   `integrations.md` caps forwarding at 100/day *per user*.** The doc's
   cap is unreachable on that tier the moment the feature has more than
   one active user. This is an argument for the Cloudflare Email Routing
   option (free, uncapped), or for the provider's paid tier, or for
   lowering the documented cap. The cap is currently written as a
   product commitment, so changing it is a decision.
2. **The pasted advice calls Turso's hybrid model "the sync layer."**
   This doc set specifies its own sync: `sync-engine.md` defines a
   push/pull/merge protocol over the event log, and Phase 6 in
   `build-order.md` lists it as work to build. `stack.md` puts the client
   on SQLite/WASM via Drizzle and Turso on the server. Turso is the
   **store**, not the mechanism, and a provider's embedded-replica sync
   is a different design from the documented one. Substituting it is an
   ADR, not a config choice.
3. **Shell-build automation names Appflow.** Verify first — Ionic has been
   winding Appflow down, and Capawesome Cloud and Codemagic are the
   current names in that space. Treat the pick as open.
4. **Workers and the notification path.** `sync-engine.md` has the server
   notifying devices over WebSocket when foregrounded on web/desktop.
   That needs Durable Objects on Workers, or the documented
   pull-on-foreground fallback. This is item 21's hosting question, and
   Cloudflare is now a concrete candidate for it rather than a blank.
5. **No doc mentions a human mailbox**, but the App Store requires a
   support contact, so `support@` is operationally necessary even though
   it is not a product surface. Deferrable: a free forward to a personal
   inbox works until support volume exists.

### What it confirms

- The `in.` subdomain convention in `integrations.md` is right, and the
  reason is worth keeping: keep inbound on the subdomain so the root
  domain stays free for a real mailbox.
- Supabase's built-in email is not production-grade, which is why a
  custom SMTP provider is needed at all — the doc set currently names no
  provider (`auth.md`).
- Sentry, manual production deploys, and "operational monitoring, no
  product analytics" all match `quality-standards.md` and
  `error-handling.md` as written.

### What it does not touch

**Item 20 is untouched by all of it.** Who writes the log entry for a
forwarded email — and how a local-only `note.body` avoids resting on the
server that received it — is unaffected by which provider receives the
mail. Cloudflare Email Routing to a Worker makes the question *sharper*,
not easier: the Worker is server-side code holding the message body, so
the relay-to-device design in item 20 is exactly what that Worker must
implement.

The slug rules (item 17b) are also untouched. They remain the half of the
email work that is a security boundary rather than an infrastructure
choice.

---

## 10. Design gaps — all filled

`03-experience/surfaces.md` and `03-experience/components.md` were written
on 2026-09-22 to give UI design one place to start from. Writing them
exposed fifteen gaps. **All fifteen are settled**, each in the doc that
owns the surface; `surfaces.md` carries the table mapping each gap to its
answer.

What it took, in shape:

- **Two new docs, because nothing owned the surfaces.** `app-shell.md`
  (mode navigation, the four floating layers, stacking and z-order, the
  palette surface, onboarding chrome, updates) and `states.md` (empty,
  waiting, stale, partial, error, disabled, offline, first-run).
- **Two decisions**, both argued where they live and both worth not
  reversing quietly. **Waiting never animates** (ADR 0019) — no spinners,
  no shimmer, because a spinner asserts progress a local-first app usually
  does not have. **An update is never announced** (ADR 0020) — the app
  picks up a new version on the next cold launch, and nothing is
  server-dependent enough for an old client to be wrong.
- **Animation was accounted for** in `motion-vocabulary.md`: one new
  transition, *state change (hover, focus, press)*, and one new catalog
  entry, *waiting*, which is in the catalog precisely because the app
  never animates it. The hover delay reuses `duration-longpress` rather
  than adding a seventh duration, which the invariants forbid.
- **Visual values were borrowed, not invented.** The focus ring is the
  `border-strong` + `border-focus` pair that already existed; hover and
  pressed reuse `surface-2` and `surface-3`; the skeleton reuses
  `surface-2`; the tooltip reuses popover styling. **No new colour value
  was added**, so dark mode inherits every one of these states.
- **Owner docs took their own gaps.** The top three's form went to
  `calendar.md`; the palette's contents and the search-results surface to
  `retrieval.md`; onboarding's chrome to `onboarding.md`.

## 11. Suggested next step

**Start design with the task row, then the Tasks mode, then the seven
onboarding screens.** That is M0's entire UI surface
(`09-roadmap/milestones.md`), and it is the path the worked example in
`03-experience/surfaces.md` walks. Everything built after it stands on
rows and scopes that will already be right.

Design now; build the screens after the projection framework exists
(`09-roadmap/build-order.md`). Building a mode before projections is the
one ordering the roadmap calls out as guaranteed rework.
