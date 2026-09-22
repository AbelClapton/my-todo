# Onboarding

## Purpose

This flow defines the first 60 seconds of the app: what the user sees,
what they do, and what they have before the flow ends. It exists
because first-run is where most trackers lose users — to a blank
canvas, a wall of permissions, or an explanation of features before
they experience one.

The rule is: **first win in 60 seconds.** The user creates one thing,
completes it, and feels the loop before they understand the product.

## Invariants

- Onboarding is skippable at every step.
- It does not require an account.
- It does not request calendar or contacts permissions before the
  user has any data. Permissions are requested lazily, when a
  feature that needs them is first used.
- It seeds a small, opinionated setup. Not a blank canvas.
- It ends with a completed task. The first win.
- It never explains the event log, the AI, or the architecture.
  Those are discovered through use.

## Specification

### The flow

**Screen 1 — The premise.**

    One sentence:
      "A system for running small experiments on your own life."

    One action: "Get started."
    One skip: "Just let me in."

The sentence is the identity sentence
(`01-foundation/identity.md`), quoted verbatim. It is the first
thing the user sees.

**Screen 2 — Areas.**

    "Which parts of your life do you want to track?"
    Four preselected: Health, Work, Home, Learning.
    User can deselect any, add a custom one, or accept the defaults.
    Action: "Next."

The four defaults seed the Areas layer
(`05-modules/areas-and-goals.md`). The "Inbox" Area is created
silently and cannot be deselected. It receives uncategorized tasks.

**Screen 3 — One habit.**

    "Pick one habit to start."
    A curated list of eight:
      - Meditate
      - Walk
      - Read
      - Drink water
      - Stretch
      - Journal
      - Sleep by 11pm
      - Wake at a consistent time
    User picks one. Each has a sensible cadence and minimum-viable
    preset.
    Action: "Next."

Each habit in the list has a preset cadence and minimum-viable
definition (`05-modules/habits.md`). The presets:

| Habit | Cadence | Minimum |
|---|---|---|
| Meditate | daily | 1 minute |
| Walk | daily | to the mailbox |
| Read | daily | 1 page |
| Drink water | daily | 1 glass |
| Stretch | daily | 1 minute |
| Journal | daily | 1 sentence |
| Sleep by 11pm | daily | within 30 min |
| Wake at a consistent time | daily | within 30 min |

The user can accept the preset or skip this screen entirely.

**Screen 4 — First task.**

    "What's one thing you need to do today?"
    One input field. The user types anything.
    Tier 1 parses it.
    Action: "Add it."

**Note on build order.** Before Tier 1 ships (Phases 0–2 of
`09-roadmap/build-order.md`), screen 4 falls back to raw capture:
the task is created with the literal text, no parsing, no chip. The
onboarding flow ships in Phase 0 with this fallback and is upgraded
to Tier 1 parsing in Phase 3. The UX is identical; the only
difference is whether the "parsed" chip appears.

**Screen 5 — First win.**

    The task appears in a minimal list. The user taps the checkbox.
    Completion animation, haptic, undo toast.
    Copy: "That's the loop."
    Action: "Continue."

This is the "first win in 60 seconds" moment. The user has now
experienced capture → parse → complete → undo, in under a minute.
The undo toast is shown but the user is not prompted to use it; it
is there if they want it.

**Screen 6 — Optional setup.**

    "Want to connect your calendar?"
    Explains: "Your events will appear in the app. Two-way sync.
    You can disconnect anytime."
    Actions: "Connect calendar" / "Not now."

    If "Connect calendar," the OAuth flow runs. If it succeeds,
    today's events appear in the calendar view.

If the user declines, the app still works. The Calendar mode will
show only in-app events until a calendar is connected.

**Screen 7 — Land.**

    The user lands on the Calendar day view.
    The now line shows their habit for today.
    The morning plan does not fire yet — it will fire on the next
    day boundary.

The user's first morning plan fires on day 2 of use. This is
deliberate: the user should experience the app once before it asks
them to plan.

### The local-only mode

If the user skips onboarding (taps "Just let me in"):

- They land on the Calendar day view.
- Areas are seeded with the four defaults.
- No habit, no task.
- Empty states have a single primary action: "Capture something."
- The full app is available.

Skipping is not "incomplete setup." It is a valid path. The user
can run onboarding later via Settings → Advanced → "Reset
onboarding."

### The skip path

At any screen, "Skip" jumps to screen 7 (Land). Partial setup is
preserved (Areas chosen, habit created).

Skipping does not lose data. It only stops the flow early.

### Local-only warning

If the user reaches the end of onboarding without enabling sync
(i.e., always, since auth is opt-in), a quiet line appears in
Settings:

    "Sync: Off. Your data is on this device only. If you uninstall
    the app, it will be lost. [Enable sync]"

This is not shown during onboarding. It is shown in Settings and
in a subtle banner on the second open of the app
(`07-infrastructure/auth.md`).

The banner is dismissable and does not return after dismissal.

### What onboarding does not do

- Does not require an account.
- Does not request all permissions upfront.
- Does not show a feature tour.
- Does not explain the event log, the AI, or the constitution.
- Does not onboard into protocols. Protocols are discovered
  later, when the user has 2+ weeks of data.
- Does not onboard into People, Areas beyond the initial pick, or
  Goals.
- Does not onboard into Settings. Settings is discovered on its
  own.

### Re-onboarding

The flow does not run again automatically. Settings has a "Reset
onboarding" option (Settings → Advanced → "Reset onboarding")
that reopens it for users who want to re-seed Areas or habits.

Re-onboarding preserves existing data. It adds a new habit and
possibly new Areas; it does not delete anything.

## Examples

**A typical first run.**

    User installs, opens.
    "A system for running small experiments on your own life."
    [Get started]
    Picks default Areas.
    Picks "Walk" as the habit.
    Types "Reply to Mark's email."
    Completes it. Sees the loop.
    Declines calendar connection.
    Lands on the Calendar day view.

**A skip.**

    User taps "Just let me in" on screen 1.
    Lands on Calendar.
    Four default Areas exist.
    No habit. No task.
    Empty state: "Capture something."

**A user who connects the calendar.**

    Screen 6, taps "Connect calendar."
    Google OAuth.
    Grants read/write.
    Syncs today's events.
    Lands on Calendar showing their real day.

**A user who runs onboarding again.**

    Settings → Advanced → Reset onboarding.
    Flow opens. User adds "Learning" back, picks "Read."
    Existing habit (Walk) is preserved.
    New habit (Read) is created.
    User lands on Calendar.

**A user on a build before Tier 1.**

    Screen 4, types "Call dentist Tuesday 3pm."
    No preview appears. No chip.
    Task created with title "Call dentist Tuesday 3pm," no due date.
    User can edit it later. The task exists; the parsing does not.
    This is acceptable. The flow works; the intelligence layers in
    later.

## What this doc must NOT do

- This doc does not define the Tier 1 parser. It references it.
- This doc does not define auth. Auth is opt-in and lives in
  `07-infrastructure/auth.md`.
- This doc does not define the calendar integration. It lives in
  `07-infrastructure/integrations.md`.
- This doc does not define the morning plan. That fires on day 2.
- This doc does not define the Areas layer or the Habits module.
  Those are `05-modules/areas-and-goals.md` and
  `05-modules/habits.md`.
- This doc does not lock in the exact copy. Copy is per-screen and
  may be refined in implementation.
- This doc does not onboard into protocols, people, goals, or
  settings. Those are discovered through use.