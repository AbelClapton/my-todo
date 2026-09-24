# Decisions (ADRs)

## What this folder is

One file per decision that should not be re-litigated. An ADR records
**why** something is the way it is, at the moment it was decided, in four
sections — Context, Decision, Consequences, Alternatives considered. That
is why ADRs are exempt from the five-section spec shape the numbered docs
use (`README.md`).

An ADR is the authority for its subject. When a spec and an ADR disagree,
the spec is the thing that is out of date.

**How to read one.** Read the Decision section first. If you are about to
change behaviour the ADR covers, read the whole thing, because the
Alternatives section exists to stop you re-proposing the thing that was
already rejected.

**How to change one.** Do not rewrite the decision. Write a new ADR that
supersedes it, and add a pointer note to the old one naming the new
number. Two existing examples: ADR 0016 amends ADR 0011's note mapping,
and ADR 0019 records a decision ADR 0005's shape would have used.

**Numbering.** Sequential, four digits, never reused. The next one is
**0023**.

## The index

| ADR | Decision |
|---|---|
| 0001 | **Append-only event log as the source of truth.** Current state is a projection computed from the log; every state change is an entry; undo is a compensation entry; sync replicates entries; deletion is a tombstone. |
| 0002 | **The Day is the atomic product unit.** Everything temporal attaches to exactly one Day, and the Day is the join key across every module. Things that span days (a Protocol) or that are definitional rather than temporal (an Area, a Goal, a Person) do not attach; they are what Days are about. The calendar is the primary view of Days. |
| 0003 | **The AI proposes; it never executes.** Every mutation requires explicit user consent. The single exception is Tier 1 parsing at high confidence, which applies silently with a correctable chip. |
| 0004 | **Capacitor for v1**, not Tauri — Tauri's mobile developer experience was judged not yet battle-tested. Revisit when it matures. |
| 0005 | **No wake word.** Push-to-talk only. Always-listening is rejected on privacy, battery, licensing, and false-accept grounds rather than on cost. |
| 0006 | **Reminders fold into Tasks and Events.** No Reminders module, no `reminder` atom, no reminders mode — `due`/`defer` and event prep already do the work. |
| 0007 | **The `event.*` log namespace is renamed `calendar.*`.** The collision between the log's own "event" vocabulary and the Event atom is unmanageable in code and in prompts. |
| 0008 | **Note bodies, metric logs, and person data are local-only by default.** Opt in per category in settings; existing local-only entries are not retroactively uploaded, and v1 has no first-class migration — an edit is a new entry, so editing is how an entry reaches the server. |
| 0009 | **Social integrations are permanently out of scope.** No import, export, sharing, or cross-posting. The share sheet is a platform feature and is not an integration. |
| 0010 | **Invariant 1 gains a second undo mechanism** (a direct toggle) with a **closed set**: `habit.checked`, `habit.unchecked`, `habit.skipped`. Adding to the set requires an ADR. The toggle is valid only while the reversing affordance stays reachable. Everything else keeps the undo toast. |
| 0011 | **Eight gestures.** Swipe up attaches; swipe down removes from the list reversibly and is never destructive; swipe left is uniform everywhere; delete moves off swipe. **Amended by 0016** — the note row's swipe down is withdrawn. |
| 0012 | **Log entry shape and the type list.** `sync?: boolean` on `LogEntry`; `daily_note.created` becomes `day.note_created` with a permanent replay obligation and no `schema_version` bump; `habit.unarchived` and `person.unarchived` added; `area.deleted` deliberately not added; `task.created.source` not extended. |
| 0013 | **Attention budget scope.** One new `SurfaceId` (`streak_repair`); gap and calendar-shift nudges become `contextual` variants; exactly three exempt surfaces against a three-part criterion; the morning plan is budget-governed and the digest is content inside shutdown, not a surface. |
| 0014 | **`cost-model.md` is authoritative** for metering, quotas, and unit costs. Tier 3 complex queries are metered at 50/month Free; a research call is 50 units. Quota blocks the call and states the reset date — no silent degradation. Pro is specified but not purchasable, and no feature sits behind an unbuyable tier. |
| 0015 | **The app is `Small Wins`** (store name `Small Wins: Habit Tracker`). Only `README.md` line 1 carries it; every other doc says "the app." The brand word is never a glossary synonym, and the store listing must not mention a paid tier (ADR 0014). |
| 0016 | **Notes have no removal state.** The note list's swipe down is disabled rather than repurposed, and `note.archived`/`note.unarchived` are not added. Amends ADR 0011's note mapping. |
| 0017 | **Forwarded mail: the server relays, the device writes.** The mail Worker writes no log entries and runs no AI; the device parses with Tier 1 and writes with `sync: false`. One-shot delivery keyed by id. Undelivered mail waits in a bounded transient buffer, dropped after 72 hours and disclosed where the address is shown. The slug is generated, 8 lowercase alphanumerics, never derived from name or email, rotatable. |
| 0018 | **Production stack.** Cloudflare Workers hosting (Netlify the named fallback), a domain at cost chosen independently of the wordmark, Resend for outbound via Supabase's custom SMTP, and Cloudflare Email Routing to a Worker for inbound. Deferred with triggers: the human mailbox and shell-build automation. Turso is the server store, not the sync mechanism. |
| 0019 | **Waiting never animates.** No spinner, no shimmer, no indeterminate progress anywhere. Under 400ms shows nothing; past it, a static `surface-2` placeholder plus a line in `text-secondary`; countable waits show the count. A design that seems to need a spinner has a product problem. |
| 0020 | **An update is never announced.** No toast, banner, dialog, badge, or "what's new" — a new build is picked up on the next cold launch and never takes over a live session. The obligation that follows: an old client must stay correct, so the log schema and sync protocol must tolerate a client several versions behind. |
| 0021 | **The lapse skip is logged.** `system.lapse_skipped` added, so the flow's three exits are three entries and "once per lapse" is stated rather than inferred. The trigger becomes durable — the gap between the **last two** `day.opened` entries, not since the last one — so a firing blocked by quiet hours, focus mode or an event waits instead of being lost. No `system.lapse_shown`: firings go to the diagnostics buffer. The lapse card does not suppress the morning plan. |
| 0022 | **Layers are restorable and moveable.** `area.unarchived` added, so "archival is reversible" is true of every type that has an archive event — the third instance of the defect ADR 0012 fixed twice. `goal.reassigned_area` added, retiring the archive-and-recreate workaround that left a Goal's protocols unreachable from the Goal in use. A Habit still cannot move. No `area.deleted` (0012's ruling stands) and no `glyph` field on Area (the four glyphs bind to ids, which is what makes a rename safe). |

## Decisions with no ADR

These are decisions, and they are recorded — just not as ADRs, because
each is either a rule the doc set already implied or a values call rather
than an architecture choice. They are listed here so the index is
complete and nobody re-opens one by accident.

| Where it is recorded | Decision |
|---|---|
| `README.md` (doc-writing rules) | **Module docs own the user-visible AI output** (structure, tone, banned language); prompt construction, tool selection, and confidence handling stay in `04-ai/`. |
| `10-engineering/quality-standards.md` | **No product analytics.** The log makes them technically possible; declining to build them is a values decision. ADR 0001 stays untouched as the historical record. |
| `01-foundation/principles.md` (Invariant 2) | **Silence is not consent.** Tier 1's unanswered confirmation does not apply itself; the raw capture is kept and the parse stays on offer in the inbox. |
| ADR 0011 + ADR 0016, host docs | **People list:** archive is swipe down, swipe left disabled there, ratified 2026-09-22 with the muscle-memory break accepted. A person "not now" state is the way to give swipe left a job there, but it introduces a state People do not have and needs its own ADR. |
| `09-roadmap/build-order.md` | **Three roadmap calls:** voice capture stays in Phase 8 (native-only, one implementation, no throwaway browser-STT path); the attention budget stays in Phase 1 with the "modules before flows" exception written into the invariant; "test one variable" moves to Phase 5 with the protocol report that carries it. |
| `03-experience/components.md` (Icons) + `07-infrastructure/stack.md` | **Lucide is the icon set, and a glyph never introduces a colour.** The dependency is recorded in stack.md; the rule that an icon is always `currentColor` is what lets one be added without a colour decision. Rejected alongside it, on evidence in `design/README.md`: a leading row icon (breaks the checkbox column), a per-Area category colour system (four hues collide with the accent and the three semantics), a glyph above an empty state's headline (repeats the headline or the action), and an `icon-xl` empty-state glyph the token table had already promised. |

## The one open decision

**The domain string.** ADR 0018 decides how it is chosen and gates the
purchase, but the string itself needs availability and taste. Every
reference to it reads `in.<domain>` as a placeholder in the meantime.
ADR 0018 carries the checklist for what to update when it is bought.
