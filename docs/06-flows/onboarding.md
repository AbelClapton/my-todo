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

The seven screens are full-screen pages, in the order below. They
replace the app shell rather than floating over it
(`03-experience/app-shell.md`):

- A seven-segment progress indicator sits at the top, filled in
  `accent-default`. It stays seven segments: a variant that grouped them into
  setup · the win · land was rejected, because an unread grouping is noise and
  a read one needs a legend this flow has no room for.
- "Skip" sits top-trailing where it differs from the screen's own path —
  screens 2–5. On screens 1 and 6 the screen already carries a decline ("Just
  let me in", "Not now"), and a second affordance for the same act would need
  decoding at exactly the wrong moment.
- Screen 7 carries no chrome at all — no progress, no skip — because
  there is nowhere left to go.
- Pages transition with the screen push
  (`03-experience/motion-vocabulary.md`): forward is leftward, back is
  rightward, and back is available on screens 2–6.
- **The primary action is the last thing on the page**, full width, at
  `control-lg`. Every screen has exactly one.
- **Nothing animates on arrival.** A screen is static until the user acts; the
  only motion in the flow is motion the user caused.

**Screen 1 — The premise.**

    One sentence:
      "A system for running small experiments on your own life."

    One line, `type-footnote`, `text-muted`: "About a minute."
    One action: "Get started."
    One decline: "Just let me in."

The sentence is the identity sentence
(`01-foundation/identity.md`), quoted verbatim. It is the first
thing the user sees, set at `type-display` and left-aligned, and it is
the only `type-display` in the flow — a second one would dilute it.

**"About a minute." is the flow's own invariant said out loud.** First-run's
promise is "first win in 60 seconds" and the flow delivers it, so the line is a
disclosure rather than a claim. It is also what earns the tap this screen asks
for: without it the user is asked to spend attention before they know what it
costs.

**Screen 2 — Areas.**

    "Which parts of your life do you want to track?"
    Four preselected, each with its Area glyph: Health, Work, Home, Learning.
    User can deselect any, add a custom one, or accept the defaults.
    Action: "Next."

The four defaults seed the Areas layer
(`05-modules/areas-and-goals.md`). Each of the four carries the glyph the task
row shows for that Area (`03-experience/components.md`), so the iconography is
learnt here rather than met for the first time in a list.

**The Inbox chip is drawn without a glyph, on purpose.** It sits in the same
row as the four and it is the one chip that is not a part of anyone's life, so
the missing glyph is consistent with the rule rather than a gap in it — and the
row is the first place the difference between the four and the fifth is visible.

**The "Inbox" Area is shown, not silent.** It is created on this screen and
cannot be deselected, so it appears as a dashed chip reading "Inbox · always on"
with one line saying what it is for. It was previously created silently, and the
argument against silence belongs on this screen rather than in a doc: the user is
choosing their Areas, and one of them is being chosen for them.

**"Add" is a chip in the same row as the Areas.** One control type and one place
for the same act, rather than a separate button below the chips.

The question stays a question. Recasting it as a statement ("Four areas to
start.") was rejected: the chips are pre-filled either way, so the statement
saves the user no tap, and asking is what makes this screen the first act of the
experiment rather than a confirmation dialog.

**Screen 3 — One habit.**

    "Pick one habit to start."
    One line above the list, `type-callout`: "All daily, and every one has a
      version you can finish in a minute."
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

Every preset is daily and every minimum is deliberately small, so **"daily" is
said once above the list rather than eight times inside it**, and the column the
user reads down is the column that differs. Each row's minimum sits on the
trailing edge at `type-callout` in `text-secondary`: scannable down the list, and
never louder than the habit's own name. A variant that promoted the minimum above
the habit name was rejected for reading oddly outside this screen.

The order is the spec's order, as listed below. Sorting by size of commitment
was rejected: a non-obvious order needs a footnote to explain it, and the
footnote costs more than the sort gives.

Each habit in the list has a preset cadence and minimum-viable definition
(`05-modules/habits.md`). The presets:

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

The cadence column is why it is said once above the list: every row is `daily`.

The user can accept the preset or decline the screen entirely.

**Screen 4 — First task.**

    "What's one thing you need to do today?"
    One input field, focused on arrival.
    Tier 1 parses it, and the parse appears as a chip as the user types.
    Action: the keyboard's own return key, labelled "Add it."

**The action is the keyboard.** There is no separate button. A button below the
field would be the first thing the keyboard covers, which is the mistake every
other layout of this screen makes.

**The field is not focused on arrival.** Programmatic focus does not reliably
open the keyboard — on iOS it requires a user gesture, so both `focus()` and
`autofocus` are unreliable inside a WebView, and the flow should not depend on
behaviour it cannot verify. The field is therefore the screen's affordance: it is
the only control on a page that asks one question, and tapping it is the gesture
that raises the keyboard whose return key reads "Add it". The cost is real and
accepted: a user looking for a button finds none. The field is one tap away, and
"Skip" is the way out.

**The question stays a heading.** It remains above the field while the user
types, so the screen keeps answering what it is for.

**Note on build order.** Before Tier 1 ships (Phases 0–2 of
`09-roadmap/build-order.md`), screen 4 falls back to raw capture: the task is
created with the literal text. The flow ships in Phase 0 with this fallback and
is upgraded in Phase 3. The UX is identical — the only difference is whether the
chip appears — so there is one copy of this screen, not two, and no line may
refer to the parse.

**Screen 5 — First win.**

    The task appears in a minimal list. The user taps the checkbox.
    Completion animation, haptic, undo toast.
    Copy: "That's the loop." at `type-title-1`.
    Action: "Continue."

This is the "first win in 60 seconds" moment. The user has now
experienced capture → parse → complete → undo, in under a minute.
The undo toast is shown but the user is not prompted to use it; it
is there if they want it.

**The row stays, and stays checked.** It is the proof of what just happened and
the only thing still on screen once the toast has gone. A variant that drew the
moment after the row left the list was rejected: it removes the proof and leaves
the sentence carrying alone what a checked checkbox was carrying.

**The action sits above the toast's band.** This is the only screen in the app
where an undo toast and a flow action are on screen together
(`03-experience/components.md`), so the action block lifts rather than being
covered by it.

**No recap and no celebration.** A variant naming the three steps (captured ·
parsed · completed) was rejected twice over: it explains, which this flow does
not do, and it names the parse on a screen that must read the same before Tier 1
ships. `06-flows/completion.md`'s celebration card belongs to the third of the
top three, and on day one there is no streak to earn it.

**Screen 6 — Optional setup.**

    "Want to connect your calendar?"
    Two labelled rows:
      Reads — events already in your calendar
      Writes — events you add here
    One line: "Two-way sync, and you can disconnect anytime."
    Actions: "Connect calendar" / "Not now."

    If "Connect calendar," the OAuth flow runs. If it succeeds,
    today's events appear in the calendar view.

**"Two-way sync" is unpacked into two rows**, because it is the whole consent
question compressed into two words the user has no way to read. A third row
covering disconnection was rejected: it repeats "you can disconnect anytime",
and three rows of terms is a heavier ask than the last screen before the app
should make. The two button labels are the spec's, word for word.

If the user declines, the app still works. The Calendar mode will
show only in-app events until a calendar is connected.

**Screen 7 — Land.**

    The user lands on the Calendar day view.
    The day shows the task completed on screen 5, in the Completed
    section (`05-modules/calendar.md`).
    The now line shows the day's next scheduled item, or
    "Nothing scheduled — [Capture]" if the day is bare
    (`06-flows/doing-the-day.md`).
    The morning plan is suppressed for the rest of today — the setup
    flow was the day's ritual. It fires on the first open of the
    next day (`06-flows/morning-plan.md`).

**The arrival shows what the last sixty seconds produced.** The task completed on
screen 5 appears in the day's Completed section, so the flow's first win is the
first thing the day's record holds rather than something the user has to go
looking for. This is what makes the arrival continuous with the flow instead of a
fresh start.

The user's first morning plan fires on day 2 of use. This is
deliberate: the user should experience the app once before it asks
them to plan.

### The local-only mode

If the user skips onboarding (taps "Just let me in"):

- They land on the Calendar day view.
- Areas are seeded with the four defaults.
- No habit, no task, so the timeline is empty and the now line reads
  "Nothing scheduled — [Capture]". The Day view has no whole-view empty state:
  the Daily Note always exists (`05-modules/calendar.md`).
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

The banner is one of the **two** surfaces **exempt** from the
attention budget: it fires once per install, dismissal is permanent
for its trigger, and it never competes for the hourly slot. Exempt
surfaces have no `SurfaceId` and no settings toggle
(`03-experience/attention-budget.md`, ADR 0013 as amended by
ADR 0023).

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