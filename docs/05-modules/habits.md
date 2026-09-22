# Habits

## Purpose

This doc defines the Habits module: the surface where recurring
behaviors are checked, tracked, and reviewed. It exists because
habits are the atomic unit of the protocol system
(`05-modules/protocols.md`) and the daily obligation that keeps the
app's data alive (Invariant 3).

The Habits mode is not a streak game. It tracks compliance —
"18 of 28 days" — and treats skips as data, not failures.

## Invariants

- Every habit has a cadence. Every cadence resolves to specific
  days (`02-architecture/object-model.md`).
- Every habit may have a minimum-viable version. The minimum is
  not a lesser check; it counts as compliance on bad days.
- Compliance is the canonical measure. Streaks are a display
  variant.
- Skipping is not failing. A skip is an intentional log entry,
  not a missed day.
- A habit that is part of a protocol in `baseline` or `active`
  status cannot have its cadence or minimum changed (Rule 3,
  `04-ai/constitution.md`).
- Daily obligations (habits due today) surface once per day in the
  daily obligations card, and do not consume attention budget
  (Invariant 3).

## Specification

### Scopes

- **Today.** Habits due today, with checkboxes.
- **All.** All active habits, grouped by Area.
- **History.** Per-habit history: compliance over time, with a
  window selector (7 days, 30 days, 90 days, custom).

### Empty states

The form is `03-experience/states.md`; the action repairs the cause
(`05-modules/tasks.md`).

| Scope, empty | Headline | Detail line | Action |
|---|---|---|---|
| **Today** | Nothing due today. | Habits appear here on the days their cadence falls on. | Add a habit |
| **All** | Nothing tracked. | Every habit gets a version you can do on a bad day. | Add a habit |
| **History** | Nothing to show. | This fills in as you check the habit off. | Add a habit |

The action is the same in all three because the cause is the same:
there are no habits yet. Once habits exist, no scope can be empty except
**History** on a habit created today, which is the only case where the
detail line is doing real work rather than pointing at the action.

### Cadence model

A cadence is one of:

- `{ type: 'daily' }` — every day.
- `{ type: 'weekly', days: Weekday[] }` — specific weekdays.
- `{ type: 'interval', every: N, unit: 'day' | 'week' }` — every
  N days or weeks.

Cadence determines `scheduled_days_for(habit, window)`
(`02-architecture/projections.md`).

### The habit row

    [checkbox] Habit name                  [compliance]
               Cadence · area

- **Checkbox.** Tap checks full. Long-press opens a mini-menu:
  "Minimum" and "Skip."
- **Title.** Tap opens detail.
- **Compliance.** Shown as "18/28" or "64%". The default is
  counts, not percent, because counts are honest.
- **Minimum indicator.** If a habit has a minimum and the user
  checked minimum today, the checkbox shows a subtle underline.

Row height is `row-default` (56px).

### Surfaces

**Today view.** Checkboxes for habits due today.

**Habit detail.** Name, cadence, minimum-viable, Area, parent
protocol (if any), compliance chart, and history.

**Compliance chart.** A small horizontal strip of the last 28 days
with each day colored by token: full (`success-default`), minimum
(`success-subtle` with a 1px `success-default` ring), repair
(`surface-1` with a 1px `accent-default` ring), skip (`surface-3`),
and missed (`border-strong`). Repairs
are visually distinct from full checks because they are not full
compliance — they are logged to keep a streak alive, and the chart
records this honestly.

**Check interaction.** Tapping the checkbox:

1. Fires the Completion haptic.
2. Fills the checkbox (150ms).
3. Logs `habit.checked` with `version: 'full'`.
4. No undo toast. The checkbox is the reversing affordance and the
   row stays visible for the session, so `habit.*` is one of the
   three log types that use the direct-toggle mechanism
   (`08-decisions/0010-undo-exemptions.md`). Tapping again logs
   `habit.unchecked`.

Long-press the checkbox to choose Minimum or Skip.



### Minimum-viable

Every habit can define a minimum. The minimum is the floor, not a
lesser check. Examples:

- Full: "Read 30 minutes." Minimum: "Read 1 page."
- Full: "Meditate 10 minutes." Minimum: "Meditate 1 minute."
- Full: "Run 5k." Minimum: "Walk to the mailbox."

When checked at minimum, the habit still counts for compliance. The
chart distinguishes full (`success-default`) from minimum
(`success-subtle`), but
both are "done."

The minimum is what makes a habit survivable. A missed day is a
failure; a floor hit is a win.

### Skipping

Skips are intentional. The user is saying "not today, on purpose."

- Long-press the checkbox → "Skip."
- Logs `habit.skipped`.
- Shown in the chart as gray, not red.
- Does not break the streak (streaks count scheduled days, and
  skips are excluded).
- Reversed by long-pressing again → [Full] [Minimum].
  `habit.skipped` is in the closed set, so no toast is needed
  (`08-decisions/0010-undo-exemptions.md`).

A skip is different from a missed day. Missed days are derived (no
entry on a scheduled day); skips are logged.

### Streaks

Streaks exist as a display variant, not a primary metric.

- Current streak: consecutive scheduled days with a full,
  minimum, or repair entry, excluding skips.
- Longest streak: all-time.
- The streak is shown in the habit detail, not on the row.

Milestones (every 30 days) fire the Success haptic once.

**Repair.** A broken streak (a scheduled day was missed, not
skipped) can be repaired once per month via the resurfacing flow
(`06-flows/resurfacing.md`). Repair logs `habit.checked` with
`version: 'repair'` for the missed day. Repairs count toward the
streak but are not full compliance and are shown distinctly in the
compliance chart.

### Habit creation

Two paths:

1. **Capture.** "Meditate every morning" → Tier 1 parses into a
   habit (see `04-ai/tier-1-parsing.md`).
2. **Manual.** From the Habits mode, tap `+`. Form: name, cadence,
   minimum (optional), Area.

### Habit and protocol

A habit may be standalone or part of a protocol.

- Standalone: user-created, no parent protocol.
- Protocol: created when a protocol is adopted. The habit's
  cadence, minimum, and metric are fixed by the protocol
  (`05-modules/protocols.md`).

Protocol habits appear in the Today view alongside standalone
habits, with a small protocol indicator.

### Archival

Habits can be archived. Archived habits:

- Stop appearing in Today and All.
- Remain in the log.
- Are findable in History.

The user can re-activate an archived habit at any time
(`habit.unarchived`, `02-architecture/event-log.md`).

## Examples

**Today view.**

    [ ] Meditate                10/14 this month
    [x] Walk                    18/22 this month
    [ ] Read (min)              14/22 this month
    [ ] Stretch                 6/14 this month   [Sleep protocol]

**Checking at minimum.**

    User long-presses "Read" checkbox.
    Mini-menu: [Full] [Minimum] [Skip]
    User taps "Minimum."
    Checkbox fills with a subtle underline.
    Logs habit.checked with version: 'minimum'.

**Skipping.**

    User long-presses "Meditate."
    Taps "Skip."
    Row dims slightly, checkbox shows a gray dash.
    Logs habit.skipped.

**Compliance history.**

    Habit: Meditate
    Cadence: daily
    Last 28 days: 22 full, 4 minimum, 0 repair, 1 skip, 1 missed
    Compliance: 26/28 (93%) — skips excluded from scheduled count
    Current streak: 12
    Longest streak: 34

**Compliance with a repair.**

    Habit: Meditate
    Cadence: daily
    Last 28 days: 20 full, 4 minimum, 2 repair, 1 skip, 1 missed
    Compliance: 26/28 (93%) — repairs count toward the streak
    but are not full compliance
    Current streak: 12
    Longest streak: 34

**An attempt to change a protocol habit's cadence.**

    Habit "Same wake time" is part of an active protocol.
    User opens the habit detail and taps "Change cadence."
    App shows: "This habit is part of an active protocol.
    Cadence can't change until the protocol completes."
    The action is disabled, not blocked with a dialog.

## What this doc must NOT do

- This doc does not define the Habit atom. It defines the module.
  The atom is in `02-architecture/object-model.md`.
- This doc does not define protocols. Habits reference protocols;
  protocols live in `05-modules/protocols.md`.
- This doc does not define tokens, gestures, or motion. It
  references them.
- This doc does not define the daily obligations card. It
  references it. The card lives in
  `03-experience/attention-budget.md`.
- This doc does not define streak computation. It defines what
  streaks mean. Computation is in
  `02-architecture/projections.md`.
- This doc does not define the AI's role in habits beyond Rule 3.
  Tier 2's "Why am I slipping?" is in
  `04-ai/tier-2-contextual.md`.