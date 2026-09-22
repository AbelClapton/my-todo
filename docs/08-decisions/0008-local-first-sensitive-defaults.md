# ADR 0008 — Local-First Sensitive Data Defaults

- **Status:** Accepted
- **Date:** 2026-09-22
- **Deciders:** [founder]

## Context

The app handles several categories of data that users consider
sensitive: notes (which may contain private thoughts, health
information, or relationship details), metric logs (health-adjacent),
and person data (relationships). The local-first architecture
(`02-architecture/local-first.md`) allows the app to keep these
categories on-device by default while still syncing tasks, events,
and metadata.

## Decision

By default, the following categories are **local-only** and are
never sent to the server:

- Note bodies (`note.created`, `note.edited`).
- Metric logs (`protocol.metric_logged`).
- Person data (`person.*`).

Other categories — tasks, events, habits, protocols, areas,
goals, days, and AI — sync to the server as normal.

Users may opt into cloud backup for sensitive categories via
Settings → Sync → "Cloud backup for sensitive categories." When
enabled, new entries in those categories use `sync: true` and sync
to the server. Existing local-only entries are not retroactively
uploaded (the user must explicitly migrate them).

## Consequences

**Positive.**

- Users who never enable cloud backup never have their most private
  data leave the device.
- The architecture supports this cleanly via the `sync: false` flag
  on log entries.
- The privacy posture is a differentiator, and it is honest — the
  server genuinely never sees this data.

**Negative.**

- Multi-device use requires cloud backup for these categories, or
  the user's notes, metric logs, and person data do not appear on
  their second device.
- Users who lose their device without enabling cloud backup lose
  those categories permanently.
- The onboarding and settings must explain this clearly.

**Neutral.**

- The flag is per-entry. Changing the setting affects new entries,
  not existing ones.

## Alternatives considered

- **Sync everything by default.** Simpler, but the app's privacy
  story weakens considerably.
- **Sync nothing by default.** Would break multi-device for notes,
  which is a common user expectation.
- **Per-note toggle.** Too much friction; users do not want to
  decide per-note.

## Related

- `02-architecture/local-first.md`
- `07-infrastructure/auth.md`
- `05-modules/settings.md`