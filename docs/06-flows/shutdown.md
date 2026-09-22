# Shutdown

## Purpose

This flow defines the user's last interaction of the day: a
90-second ritual that closes today and sets up tomorrow. It exists
because a day that ends without closing leaks into the next day as
guilt, and because a tomorrow that is already decided lets the user
sleep.

The shutdown is the mirror of the morning plan. The morning plan
commits; the shutdown reviews and pre-commits.

## Invariants

- Shutdown is not a mode. It surfaces once per day, at the user's
  configured shutdown time (default: 21:00 local) or when the user
  opens the app after the day boundary if the previous day was not
  closed.
- It is skippable with one tap.
- It is undoable for five seconds after commit
  (Invariant 1, `01-foundation/principles.md`), covering the
  entire shutdown as one atomic batch.
- It surfaces subject to the attention budget: no shutdown during
  focus mode, during an event, or during quiet hours (unless the
  user triggers it manually).
- It is 90 seconds, not a report. Three prompts, one preview.

## Specification

### The trigger

Shutdown surfaces:

- At the user's configured time (default 21:00 local) if the app is
  in the foreground.
- As a push notification if enabled.
- When the user opens the app after the configured shutdown time and
  the day is not yet closed.
- When the user opens the app after the day boundary and the
  previous day was not closed (see "Closing yesterday").
- Via the command palette: "Close day."

### The 90-second structure

Three prompts, each optional, plus a preview.

**Prompt 1 — What went well.** A single-line field:

    "What went well today?"
    [                                        ]

Free text. Logged as part of the Daily Note.

**Prompt 2 — What's unfinished.** A short list of today's
incomplete tasks. The user swipes:

- Right → keep for tomorrow.
- Left → defer.
- Down → remove (someday or archive). Never a delete
  (`03-experience/gesture-vocabulary.md`).

**Prompt 3 — Tomorrow's top three.** A picker of candidates:

- Tasks kept in Prompt 2.
- Tasks with `due` tomorrow.
- Tasks scheduled for tomorrow.
- Anything the user searches for.

The user picks three. Optionally, they tap "Draft-day" to have
Tier 3 propose a schedule for tomorrow
(`06-flows/morning-plan.md`).

**Preview — Tomorrow.** A compact timeline of tomorrow's events
plus the three tasks. Read-only here. The morning plan will offer
edits.

### The commit

Tapping "Close day":

1. Logs `day.planned` with tomorrow's top three.
2. Logs `day.closed` for today.
3. Appends the "what went well" line to today's Daily Note.
4. Logs `task.scheduled_to_day` for each kept task.
5. Dismisses the shutdown.

The user lands on the calendar day view for tomorrow.

### The what-slipped digest

If the user did not reschedule slipped tasks in the "what's
unfinished" step, the digest fires after the commit.

The digest's copy, surfaces, and behavior are defined in
`06-flows/disruption.md` under "The what-slipped digest." Shutdown
calls it if not already fired; it does not maintain its own copy.

Here the digest is **content inside shutdown completion**, not a
surface of its own: shutdown already holds the hour's slot, so the
digest consumes nothing. It only spends budget when it fires on its
own — a standalone `what_slipped` nudge on a day shutdown was
skipped (ADR 0013).

### Tomorrow preview

The preview at the end of shutdown is the app's most-loved feature
per user research in similar apps. It shows:

- Tomorrow's events (compact timeline).
- Tomorrow's top three.
- Any scheduled tasks.
- Weather, if the integration is enabled.

It is read-only. The morning plan is where edits happen.

### Skipping

A "Skip" button. Tapping:

- Dismisses shutdown.
- Logs `day.plan_skipped` for the shutdown.
- Does not fire again today.

The user can access shutdown via the command palette at any time.

### Closing a day late

If the user did not close the day yesterday and opens the app
today:

- The morning plan surfaces first.
- After the morning plan, a quiet prompt:
  "Yesterday wasn't closed. Close it now?"
  [Close yesterday]  [Skip]

Closing yesterday:

- Logs `day.closed` for the previous day.
- Uses the same three prompts (what went well, what's unfinished,
  top three — but the top three becomes "today's top three").
- The "what's unfinished" list includes tasks that slipped
  yesterday.

### The Daily Note update

The "what went well" line is prepended to the Daily Note as a
blockquote:

    > What went well: shipped the Q4 draft ahead of time.

The Daily Note is the Day's narrative layer
(`05-modules/notes.md`). Shutdown is the main way it gets filled in
beyond incidental captures.

## Examples

**A typical shutdown.**

    User opens the app at 9:15pm.
    Shutdown card appears:

      **Good evening.**
      Let's close today.

      ——— What went well? ———

      [ Shipped the Q4 draft ahead of time.        ]

      ——— What's unfinished? ———

      [ ] File Q4 taxes              Home · due Fri
      [ ] Call contractor            Home · @Mark
      [ ] Buy standing desk          Home

      Swipe right to keep, left to defer, down to remove.

      ——— Tomorrow's top three ———

      ☐ File Q4 taxes
      ☐ Call contractor
      ☐ Buy standing desk
      ☐ Draft Q4 plan (due tomorrow)

      [Skip]                                    [Close day]

    User types the "what went well" line.
    Keeps File Q4 taxes and Call contractor.
    Removes Buy standing desk (someday).
    Picks File Q4 taxes, Call contractor, Draft Q4 plan.
    Taps "Close day."

      ——— Tomorrow ———

      09:00 Standup
      11:00 1:1 with Mark
      13:00 Draft Q4 plan (top 3)

      Top three: File Q4 taxes, Call contractor, Draft Q4 plan

    Shutdown dismisses.
    Calendar day view for tomorrow appears.

**A late close.**

    User opens the app at 7:30am without having closed yesterday.
    Morning plan runs first.
    After commit:
      "Yesterday wasn't closed. Close it now?"
      [Close yesterday]  [Skip]

    User taps Close yesterday.
    The what's unfinished list shows yesterday's slippers.
    The top three becomes today's top three.

**A shutdown skipped.**

    User taps Skip at 9pm.
    No further prompting.
    The user can close the day via the command palette if they
    change their mind.

**The Daily Note after shutdown.**

    Daily Note for Sep 22:
      > What went well: shipped the Q4 draft ahead of time.

      Felt sharp this morning. The contractor called — tile
      arrives Friday.

    (The shutdown line is prepended as a blockquote. The rest was
    written by the user during the day.)

## What this doc must NOT do

- This doc does not define the morning plan. That is
  `06-flows/morning-plan.md`.
- This doc does not define the what-slipped digest. That is
  `06-flows/disruption.md`. Shutdown calls it.
- This doc does not define the Daily Note. That is
  `05-modules/notes.md`.
- This doc does not define Tier 3's draft-day behavior. That is
  `04-ai/tier-3-assistant.md`.
- This doc does not define the attention budget. It references
  it.
- This doc does not define tokens, gestures, or motion. It
  references them.