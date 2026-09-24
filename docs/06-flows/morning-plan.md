# Morning Plan

## Purpose

This flow defines the user's first interaction of the day: a
60-second planning ritual that turns yesterday's carryover and
today's events into a committed plan. It exists because the morning
is where the day either gets decided or gets away, and because a
plan made consciously is more likely to be followed than a list
that simply exists.

The morning plan is not a dashboard. It has one job: commit to
three things.

## Invariants

- The morning plan is not a mode. It surfaces once per day, in the
  first app open after the day boundary
  (`02-architecture/day-as-unit.md`).
- It surfaces subject to the attention budget. It does not fire
  during focus mode, during an event, or during quiet hours. **In-event
  suppression wins outright** — the plan waits for the event to end
  rather than talking over it. "It surfaces even on busy days" means a
  day with many events, not a moment inside one.
- It is skippable with one tap. If skipped, it does not fire again
  that day.
- It surfaces even on busy days. Even 10 seconds of commitment is
  better than none.
- **Its commit is one atomic batch, undoable for five seconds after
  the fact** (Invariant 1, `01-foundation/principles.md`, ADR 0010).
  The batch is the `task.scheduled_to_day` writes and the
  `day.planned` entry together — reversing half of it would leave the
  day's top three pointing at tasks that are no longer scheduled.
- The plan is a decision, not a report. It does not show every
  task. It shows what to choose from.

## Specification

### The trigger

The morning plan surfaces on the first app open of a day, if:

- The day has a `day.opened` entry (i.e., rollover has already
  run for today).
- **The user has not already confirmed a plan for that day** — no
  `day.planned` with `source: 'morning'` for today. A
  `day.planned { source: 'shutdown' }` from last night is **not** a
  confirmed plan: it is a draft, and it is the reason this ritual
  exists. The picker opens with it pre-selected and the user edits or
  accepts it.
- The user has not skipped it that day — no `day.plan_skipped` with
  `kind: 'morning'` for today.
- The user has finished onboarding. It is suppressed for the rest of
  the day onboarding completes, and first fires on the next day's
  first open (`06-flows/onboarding.md`).

It surfaces as a full-screen card when the user opens the app in the
morning. It is not a notification; it is the first screen after the
calendar if the user opens in the morning window (default 5am–11am
local).

**Quiet hours cut that window short, and the doc says so here rather
than leaving it to arithmetic.** The budget's default quiet hours are
10pm–7am, so the automatic surface is **7am–11am** — four of the six
stated hours. The 5am–7am stretch stays reachable through the command
palette, which is user-initiated and therefore not a nudge. If the
intent is for the card to greet an early riser at 5am,
`03-experience/attention-budget.md` must name the morning plan in its
quiet-hours rule; until it does, the plan cannot fire there.

It is budget-governed all the same. The plan consumes a slot when it
fires unprompted; it consumes no slot when the user opens it
deliberately (`03-experience/attention-budget.md`, ADR 0013). Being
full-screen is about the ritual, not about exemption.

Outside the morning window, the plan is accessible via the command
palette ("Plan today") but does not surface automatically.

### The 60-second structure

Three steps, each optional, and **"three" is a target rather than a
minimum.** The plan commits **one to three** tasks: three is what the
picker encourages and what the design is built around, and one is a
real plan when the day is already full. Zero is not — a plan with no
commitment is a skip, and the flow has a button for that.

**Step 1 — What carried over.** A short list of yesterday's
unfinished tasks (top 5, sorted by priority then age). Each row
carries a **checkbox** (keep) and an **overflow menu** (defer,
someday, open) — the non-gesture fallback
`03-experience/gesture-vocabulary.md` requires of every gesture. The
user can also swipe each one to:
- **Keep** (swipe right) — schedule for today.
- **Defer** (swipe left) — defer sheet.
- **Remove** (swipe down) — mark someday. Never a delete
  (`03-experience/gesture-vocabulary.md`, which owns this vocabulary
  and carries this surface in its matrix).

**Step 2 — What's today.** The day's events, shown as a compact
timeline. Not editable here; the calendar handles that. The user
just sees the shape of the day. **The timeline states the first
event** — the now line is chrome with its own six-source order and is
not this surface's to redefine (`06-flows/doing-the-day.md`).

**Step 3 — Pick three.** The user picks three tasks for the day.
Candidates:
- Tasks kept in Step 1.
- Tasks with `priority: now`.
- Tasks with `due: today`.
- Anything the user searches for.

The picker shows candidates as a scrollable list with checkboxes.
The user picks **up to three**; a shutdown draft arrives
pre-selected. A "Done" button commits, and is enabled from one
selection onward.

### The commit

Tapping "Done":

1. Logs `task.scheduled_to_day` for each kept task.
2. Logs `day.planned` with the top three and
   `source: 'morning'`.
3. Dismisses the plan.

The user lands on the calendar day view. The whole commit is one
atomic batch, undoable for five seconds (§Invariants).

Day rollover (logging `day.opened`, creating the Daily Note, and
closing the previous day via `day.closed` if the user closed it)
happens separately, triggered by the first app open after the
boundary (`02-architecture/day-as-unit.md`). By the time the
morning plan surfaces, the current Day is already open. The plan
does not log `day.opened` or `day.closed`.

### Skipping

A "Skip" button in the top right. Tapping it:

- Dismisses the plan.
- Logs a `day.plan_skipped` entry with `kind: 'morning'` (for the
  attention queue's history). The `kind` matters: the shutdown writes
  the same event type for the same day, and the two must not suppress
  each other.
- Does not fire again that day.

### Draft-day accept/reject

An optional enhancement, surfaced when the user has been using the
app for 2+ weeks:

Tier 3 proposes a draft schedule based on:
- The user's energy patterns (deep tasks in the morning, light tasks
  after lunch, if the pattern exists).
- Calendar density.
- Defer dates.
- Due dates.

The proposal is shown as a list of scheduled blocks with accept/
reject swipes:

- **Swipe right.** Accept the block.
- **Swipe left.** Reject. The task goes to a "pool" at the bottom.
- **Tap.** Edit the time.

This is a negotiation, not an autopilot. The user accepts, rejects,
or edits every block.

### Energy-aware slots

If the app has ≥ 14 days of data, the draft proposal uses energy
patterns:

- Deep tasks scheduled in the user's historically productive hours.
- Light tasks scheduled in the user's historically low-energy hours.

This is not shown as an explanation. It is just how the draft is
ordered. If the user asks "why this time?", the assistant can
explain.

### Combined with the daily obligations

If the user has habits due or a protocol metric, the daily
obligations card (`03-experience/attention-budget.md`) surfaces
after the plan. One card, all checkboxes.

**The card's trigger is not this doc's to set.** The budget owns it:
*"once per day, at a time based on the user's typical first open
(learned)."* What this doc owns is the **order on a first open where
more than one of these wants to appear**, which is the same moment for
all of them:

1. **The morning plan**, if it is eligible.
2. **Yesterday's prompt** — *"Yesterday wasn't closed. Close it
   now?"* — if the day before was never closed
   (`06-flows/shutdown.md`).
3. **The obligations card**, last, because it is the only one of the
   three that returns every day and the only one with no ritual
   around it.

If the plan is skipped or suppressed, **the card leads** — it does not
wait for a ritual that is not coming.

## Examples

**A typical morning plan.**

    User opens the app at 7:30am.
    Full-screen card:

      **Good morning.**
      Let's plan today.

      ——— What carried over ———

      [ ] Draft Q4 plan                    Work · due today
      [ ] File Q4 taxes                    Home · due Fri
      [ ] Call contractor                  Home · @Mark
      [ ] Buy standing desk                Home

      Swipe right to keep, left to defer, down to remove.

      ——— Today ———

      09:00 Standup
      11:00 Design review
      15:00 1:1 with Mark

      ——— Pick three ———

      ☐ Draft Q4 plan
      ☐ Call contractor
      ☐ Buy standing desk
      ☐ File Q4 taxes

      [Skip]                              [Done]

    User swipes Draft and Call to keep.
    Defer's File Q4 taxes.
    Removes Buy standing desk (someday).
    Picks three from the remaining list.
    Taps Done.
    Calendar day view appears.

**A skipped morning plan.**

    User taps Skip.
    Card dismisses.
    No further prompting today.
    The user can access it via the command palette if they change
    their mind.

**A draft-day proposal (after 2+ weeks of data).**

    User taps Done after picking three.
    Instead of dismissing, the plan shows:

      ——— Draft schedule ———

      Swipe right to accept, left to reject.

      08:30–09:00  Draft Q4 plan (deep)
      11:00–12:00  Design review (event)
      13:30–14:15  Call contractor (light)
      15:00–15:30  1:1 with Mark (event)

      ——— Pool ———

      (tasks you rejected go here)

    User accepts three, rejects the Call contractor block.
    Call contractor goes to the pool at the bottom.
    The user can drag it back to a slot or leave it for later.

**A busy day.**

    User opens the app at 9:15am, already late for a 9:00 event.
    The plan does not fire: it does not surface during an event.
    The event ends at 10:00. The plan surfaces then, once the user
    has the app in front of them again.

      **Good morning — short on time?**
      Pick three, skip the rest.

      (compressed view: carryover collapsed to a count, "3 tasks
       from yesterday")

      ——— Pick three ———

      ...

    The user picks three in 10 seconds.
    The plan commits. The now line shows the current event.

## What this doc must NOT do

- This doc does not define the Daily Note. The Daily Note is
  `05-modules/notes.md`.
- This doc does not define the shutdown flow. Shutdown is
  `06-flows/shutdown.md`.
- This doc does not define the attention budget. It references it.
  The budget is `03-experience/attention-budget.md`.
- This doc does not define Tier 3's draft-day behavior. Tier 3 is
  `04-ai/tier-3-assistant.md`.
- This doc does not define tokens, gestures, or motion. It
  references them.
- This doc does not define energy-pattern detection. That is an
  implementation detail of the draft-day proposal.