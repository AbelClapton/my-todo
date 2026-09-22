# Remaining Work — Documentation Consistency Pass

**Status as of:** 2026-09-22
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

### In flight

Nothing partially applied. Everything in section 2 is unstarted.

---

## 2. Blocking: the ADRs are not implemented yet

The five ADRs describe decisions the docs do not yet reflect. Until
these land, the docs contradict their own ADRs.

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

## 3. Untriaged findings — no owner yet

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

---

## 4. Docs never reviewed

- `docs/10-engineering/error-handling.md` — **zero coverage.** The review
  subagent assigned to it failed three times and it was never read. It
  governs error shapes that `code-conventions.md` also specifies, so it
  is the highest-value unreviewed file.
- `docs/08-decisions/0002`–`0005`, `0008`, `0009` — checked only by
  targeted grep (Capacitor, wake word, social integrations, domain count,
  `sync` flag), never read end to end.

---

## 5. Decisions already made — do not re-litigate

| ADR | Decision |
|---|---|
| 0010 | Invariant 1 gains a second undo mechanism (direct toggle) with a **closed set**: `habit.checked`, `habit.unchecked`, `habit.skipped`. Adding to the set requires an ADR. Toggle is valid only if the reversing affordance stays reachable (row visible, same session, surface not dismiss-once). Everything else keeps the toast. |
| 0011 | Eight gestures. Swipe up = attach. Swipe down = "remove from this list, reversibly" (task→someday, habit→archive, person→archive, note→leaves Recent); never destructive. Swipe left uniform everywhere. Delete moves off swipe. |
| 0012 | `sync?: boolean` on `LogEntry`. `daily_note.created` → `day.note_created` with a permanent replay obligation and no `schema_version` bump. `habit.unarchived` and `person.unarchived` added. `area.deleted` NOT added — the "delete" wording is removed from the module doc instead. `task.created.source` is NOT extended; `inbox` is re-derived from existing fields. |
| 0013 | One new SurfaceId: `streak_repair`. Gap and calendar-shift nudges are `contextual` variants. Exactly three exempt surfaces against a three-part criterion. Morning plan is budget-governed. The digest is content inside shutdown, not a surface. |
| 0014 | `cost-model.md` is authoritative for metering, quotas, and unit costs. Tier 3 complex queries metered 50/month Free. Research is 50 units per call. Quota blocks the call with the reset date; no silent degradation. Pro is specified but not purchasable, and no feature sits behind an unbuyable tier. |
| (no ADR) | Doc-writing rule: module docs own the user-visible AI output (structure, tone, banned language); prompt construction, tool selection, and confidence handling stay in `04-ai/`. Recorded in `README.md`, not as an ADR. |
| (no ADR) | Analytics: the log makes analytics technically possible; declining to build them is a values decision. Recorded in `quality-standards.md`. ADR 0001 stays untouched as the historical record. |

---

## 6. Judgement calls from the roadmap reorder — may need revisiting

These were applied but are reversible if they read wrong.

1. **Voice capture moved Phase 3 → Phase 8**, on the grounds that
   `stack.md` specifies on-device STT via a Capacitor plugin that does not
   exist until Phase 8. If web/desktop voice should ship earlier via
   browser STT, it returns to Phase 3 and M8 keeps only the native path.
2. **Attention budget moved into Phase 1.** ADR 0013 makes the morning
   plan budget-governed, which created a Phase 1 → Phase 2 dependency and
   violated build-order's own "modules before flows" invariant. Phase 1 now
   builds the queue and caps; the daily obligations card stays in Phase 2
   because it needs habits.
3. **"Test one variable" is in Phase 4** as a review-time option, but
   `research-and-protocols.md` describes it as a suggestion inside the
   AI-generated report, which is Tier 3 (Phase 5). If it is purely an AI
   report suggestion, it belongs in Phase 5.

---

## 7. Suggested order

1. **Batches A–E plus untriaged items 1–12 as one pass.** Mostly
   one-to-three-line edits; items 1–12 fold naturally into their
   neighbouring batch (#5 and #7 next to Batch C/E, #10 next to Batch D).
2. **Item 13** and section 6's judgement calls need a decision, not an edit.
3. **Section 4** (`error-handling.md` read, then ADR 0002–0009 end to end).

---

## 8. Verification

After batches A–E, these greps should return nothing:

    No undo toast                      # except ADR 0010's own description
    exactly six gestures
    The six gestures
    daily_note.created                 # except ADR 0012 and the replay clause
    source: 'capture'
    re-activate                        # except inside ADR 0012
    rename, archive, and delete
    gap nudge                          # except the contextual-variant framing
    not a nudge                        # except where genuinely non-nudge

And these should each return a hit:

    streak_repair                      # in attention-budget.md and event-log.md
    sync?: boolean                     # or equivalent, in event-log.md
    day.note_created
    habit.unarchived
    person.unarchived
    default_mode
    developer_mode
