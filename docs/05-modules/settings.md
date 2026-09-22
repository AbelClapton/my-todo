# Settings

## Purpose

This doc defines the Settings surface: every setting the app
exposes, where it lives, and what it does. It exists because settings
are referenced throughout the docs (`system.settings_changed`, quiet
hours, sync toggle, notification channels, per-surface toggles,
suppressed surfaces, export, delete account) but were never
canonically listed.

Settings is a surface, not a mode. It has no entry in the mode
navigation. It is reached via the command palette ("Settings") or a
gear icon in the header of any mode.

## Invariants

- Every setting that stores a value has a `SettingsKey` in
  `02-architecture/event-log.md`. Adding a key is a doc change.
- Changing a setting logs `system.settings_changed`.
- Settings are grouped, not flat. Groups are stable.
- No setting is hidden behind a premium tier in v1.
- Destructive actions in Settings have a confirmation. There are
  exactly three in Settings: **Delete account**, **Revoke calendar
  access**, and **Sign out all devices**. All three are in the
  sanctioned list of four in Invariant 1
  (`01-foundation/principles.md`). The fourth, abandoning an active
  protocol, lives in `05-modules/protocols.md`.
- Settings never contains feature discovery. Settings is a
  configuration surface, not a menu of features.

## Specification

### Groups

**Account.**

- Email (read-only if authenticated; "Local only" otherwise)
- Sign in / Sign out
- Delete account (confirmed; irreversible)
- Export data (JSON, Markdown, ICS)

**Sync.**

- Sync enabled (on/off)
- Cloud backup for sensitive categories (on/off)
- Last sync time (informational)
- Force sync now (action)
- Retry network now (action; appears only when a network error is
  pending)
- Sign out all devices (confirmed; affects devices the user is not
  holding)

**Day.**

- Day boundary (midnight, 3am, 4am, 5am)
- Timezone (read-only display; follows device)
- Week starts on (Sunday, Monday)

**Reviews.**

- Weekly review day (Sunday through Saturday; default Sunday)
- Weekly review time (default 18:00 local)
- Monthly review enabled (on/off; default off)
- Annual review enabled (on/off; default off)

**Notifications and nudges.**

- Quiet hours start
- Quiet hours end
- Nudge frequency (Standard, Reduced, Minimal)
- Per-surface toggles (one per surface in the attention catalog)
- Suppressed surfaces (list with re-enable toggles)
- Notification channels (push, in-app banner, badge; each on/off)

**AI.**

- Research usage this month (informational)
- Research quota reset date (informational)
- Complex query usage this month (informational)
- AI audit mode (on/off)
- On-device only (on/off; disables all cloud AI)

**Appearance.**

- Theme (system, light, dark)
- Default mode on app open (Calendar, Tasks, Habits, Notes)
- Haptics (on/off)
- Auto-linking in notes (on/off)

**Language.**

- Language override (default: device locale)

**Lapsed recovery.**

- Lapse threshold (7, 14, 21, 30 days)

**Integrations.**

- Calendar: connect / disconnect / manage calendars
- Revoke calendar access (confirmed; irreversible; revokes the
  OAuth tokens)
- Contacts: import / refresh
- Health: connect / match habits
- Weather: set home location (stored value; see the "Weather home
  location" note below)

**Advanced.**

- Reset onboarding
- Rebuild projections (action; for debugging)
- Developer mode (on/off; shows the tool-call diagnostics buffer)
- Reset all settings (reversible; undo toast only)

**About.**

- Version
- Privacy policy (link)
- Terms of service (link)
- Changelog
- Send feedback (mailto)

No social links. No rate-the-app prompt.

### Notes on specific settings

**Day boundary.** Changing it does not rewrite history. Past Days
keep their original attribution (`02-architecture/day-as-unit.md`).

**Weekly and monthly reviews.** The four review settings map to
`review.weekly_day`, `review.weekly_time`, `review.monthly_enabled`,
and `review.annual_enabled`. The weekly review fires at the chosen
day and time. Monthly and annual reviews are off by default; when
enabled, they surface via the attention budget at lower priority
than the weekly review (`05-modules/review.md`).

**Per-surface toggles.** Each surface in the attention budget
catalog (`03-experience/attention-budget.md`) has its own toggle,
keyed as `nudge.surface.<SurfaceId>.enabled`. Disabling a surface
removes it from the queue permanently until re-enabled.

**Suppressed surfaces.** Surfaces auto-suppressed by two dismissals
(then 30 days, then permanently) are listed here with a "Re-enable"
button.

**Notification channels.** Three channels — push, in-app banner,
badge — each keyed as `notification.channel.<channel>.enabled`.
They are global; per-surface channel selection is out of scope for
v1. A surface fires through every enabled channel.

**AI audit mode.** When enabled, every `ai.proposed`, `ai.applied`,
and `ai.rejected` entry appears in a visible list in Settings. This
is the user-facing view of AI activity: what the AI proposed, what
the user accepted, what they rejected. Off by default.

This is distinct from **Developer mode**, which surfaces the
client-side diagnostics buffer: tool calls, sync operations, and
other operational telemetry. Developer mode is for debugging;
audit mode is for the user's own trust in the AI.

**On-device only.** When enabled, Tier 3 complex queries and
research are disabled. The app still runs Tier 1 and Tier 2 locally.

**Weather home location.** Stored as
`integration.weather.home_location`, value `{ lat, lon, label }`.
The label is user-facing ("Home"); the coordinates are for the
API. Set from this settings screen; never updated automatically
(`07-infrastructure/integrations.md`).

**Rebuild projections.** Recomputes all projections from the log.
Useful after a bug. Does not touch the log.

**Reset all settings.** Resets every `SettingsKey` to its default.
Logs one `system.settings_changed` per key, in one append batch.
The UI undo toast reverses the batch atomically by compensating
every entry it created; no shared grouping ID is stored in the
log (`02-architecture/event-log.md`). Does not touch user data.
No confirmation dialog; undo is the safety net.

**Delete account.** One of the four confirmed actions (see
Invariant 1, `01-foundation/principles.md`). See
`07-infrastructure/auth.md` for the full flow.

**Sign out all devices.** Revokes sessions on the server. Local
logs on each device are preserved; devices revert to local-only
mode. No data is deleted. Confirmed, because the user cannot undo
a sign-out on a device they are not holding.

**Revoke calendar access.** Revokes the OAuth tokens the calendar
integration holds and stops all calendar sync. The mirror stays in
the local log and becomes permanently stale. Confirmed, because it
is irreversible: reconnecting creates a new grant. See
`07-infrastructure/integrations.md`.

**Reset onboarding.** Reopens the onboarding flow
(`06-flows/onboarding.md`). Adds a new habit and possibly new
Areas; does not delete anything.

### Behavior

- Settings open as a full-screen sheet from the command palette or
  as a panel pushed from the gear icon.
- The list uses `row-compact` (44px) rows, grouped by section with
  a `type-title-3` header and `space-8` separation between groups.
- Toggles fire the Mode switch haptic on change
  (`03-experience/haptic-vocabulary.md`).
- Every settings change shows the standard five-second undo toast
  (Invariant 1). Undo logs a compensating `system.settings_changed`.
- Only three actions in Settings show a confirmation dialog:
  Delete account, Revoke calendar access, and Sign out all devices.
  Every other action is undoable instead.

## Examples

**Changing the day boundary.**

    Settings → Day → Day boundary → 4am
    Logs system.settings_changed { key: 'day.boundary_hour', value: 4 }
    Undo toast appears for 5 seconds.
    Future days use 4am. Past days unchanged.

**Disabling a nudge surface.**

    Settings → Notifications → Per-surface → "Low-energy matching" → off
    Logs system.settings_changed
      { key: 'nudge.surface.low_energy.enabled', value: false }
    The surface is removed from the queue.

**Re-enabling a suppressed surface.**

    Settings → Notifications → Suppressed surfaces → "People
    resurfacing" → Re-enable
    Logs system.settings_changed
      { key: 'nudge.surface.people.enabled', value: true }
    The surface returns to the queue.

**Changing the weekly review day.**

    Settings → Reviews → Weekly review day → Monday
    Logs system.settings_changed
      { key: 'review.weekly_day', value: 'monday' }
    The next weekly review fires on Monday at the configured time.

**Enabling AI audit mode.**

    Settings → AI → AI audit mode → on
    Logs system.settings_changed { key: 'ai.audit_mode', value: true }
    A new list appears below the toggle: every AI proposal,
    application, and rejection, newest first, with the item it
    acted on and the explanation.

**Export before delete.**

    Settings → Account → Delete account.
    Confirmation: "Delete your account? This removes your data from
    our servers permanently. Your local data will be wiped too —
    export first if you want a copy."
    [Delete account] [Cancel]
    User taps Delete.
    Prompt: "Export your data first?"
    [Export as JSON] [Export as Markdown] [Export as ICS] [Skip]
    User exports JSON. Account deleted.

**Signing out all devices.**

    Settings → Sync → Sign out all devices.
    Confirmation: "Sign out all devices? You'll need to sign in
    again on each one. Your data stays safe on the server."
    [Sign out] [Cancel]
    User confirms.
    All sessions revoked server-side.
    This device reverts to local-only mode until re-authenticated.

**Reset all settings.**

    Settings → Advanced → Reset all settings.
    No confirmation.
    One system.settings_changed per key is logged, in one append
    batch.
    Undo toast: "Reset all settings. Undo?"
    If tapped, compensations reverse every entry in the batch.
    If the toast expires, the reset stands.

## What this doc must NOT do

- This doc does not define the settings schema. That is
  `02-architecture/event-log.md` (the `SettingsKey` union).
- This doc does not define the attention budget. It references it.
  The budget and its surfaces are
  `03-experience/attention-budget.md`.
- This doc does not define auth. It references it. Auth is
  `07-infrastructure/auth.md`.
- This doc does not define integrations. It references them.
  Integrations are `07-infrastructure/integrations.md`.
- This doc does not define the AI tiers or the retrieval layer.
  Those are in `04-ai/`.
- This doc does not lock in the visual layout of Settings beyond
  the row height and group structure. Exact section order and copy
  are per-implementation.
- This doc does not add new settings speculatively. Adding a
  setting requires a `SettingsKey` in `event-log.md` and an update
  to this doc.