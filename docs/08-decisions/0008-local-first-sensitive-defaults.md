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
uploaded, and v1 has no first-class migrate action: a local-only
entry reaches the server only when it is written again. An edit is a
*new* entry carrying the same content, so editing a note after
opting in uploads its body, and the note becomes multi-device by
being edited (`07-infrastructure/sync-engine.md` states the
mechanism and its limits).

An explicit per-entry migration action — "copy this one to the
cloud" — is deferred, not rejected. It cannot be undone once the
server holds the payload, so it needs a confirmation dialog, and
Invariant 1 permits those for exactly four actions
(`01-foundation/principles.md`). Building it therefore means
amending that invariant, which is not worth doing before sync
exists to migrate into.

## Consequences

**Positive.**

- Users who never enable cloud backup never have their most private
  data leave the device.
- The architecture supports this cleanly via the `sync: false` flag
  on log entries, which ADR 0012 adds to the `LogEntry` shape.
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
- One path puts capture content on a server: email forwarding. The
  message passes through the mail provider and waits in a bounded
  transient buffer until a device collects it, then is deleted
  (`07-infrastructure/integrations.md`, ADR 0017). Forwarding is opt-in
  — an address is issued only to a user who asks for one — and the
  transit is disclosed where the address is shown.

## Alternatives considered

- **Sync everything by default.** Simpler, but the app's privacy
  story weakens considerably.
- **Sync nothing by default.** Would break multi-device for notes,
  which is a common user expectation.
- **Per-note toggle.** Too much friction; users do not want to
  decide per-note.

## Related

- `02-architecture/local-first.md`
- `02-architecture/event-log.md`
- `07-infrastructure/auth.md`
- `05-modules/settings.md`
- ADR 0012 — where the `sync` field becomes legal in the log shape.