# Auth

## Purpose

This doc defines how users authenticate, how sessions work, and how
accounts are managed. It exists because auth touches every sync
operation, every cloud AI call, and the account deletion flow
(`02-architecture/data-lifecycle.md`), and getting it wrong means
either a security hole or a UX wall.

The model is: **boring, standard, delegated.** Auth is not where
this app innovates.

## Invariants

- Auth is delegated to a provider. The app does not store
  passwords.
- Sessions are long-lived. Users do not re-authenticate weekly.
- Local-first means the app works without auth. Auth gates sync
  and cloud AI, not local use.
- Account deletion is a real, permanent, one-tap-from-settings
  operation (with one confirmation).
- No social login required. Email magic-link is the default.

## Specification

### Provider

**Supabase Auth** for v1.

Reasons:

- Email magic-link out of the box.
- Apple and Google sign-in out of the box.
- Identity only. Application data lives in SQLite/Turso
  (`07-infrastructure/stack.md`), so Supabase holds credentials and
  sessions and nothing else. No application schema is coupled to it.
- Reasonable free tier.
- Standard OIDC under the hood; changing identity providers does not
  touch application data or the log schema.

Alternatives considered:

- **Clerk.** Excellent UX, expensive at scale.
- **Auth0.** Enterprise-grade, overkill for v1.
- **Firebase Auth.** Tightly coupled to Firestore; this app uses
  SQLite/Turso.
- **Custom.** No. Auth is not a differentiator.

### The auth flow

**First launch.** The user is in a local-only state. Everything
works. Sync and cloud AI are disabled.

**Enabling sync.** From settings, "Enable sync." The user:

1. Picks a method (email magic-link, Apple, Google).
2. Completes the flow.
3. The app links the current local log to the new account.
4. Sync begins.

The user is not prompted to auth on first launch. Auth is opt-in
when the user wants multi-device.

**Subsequent launches.** The session is restored from secure
storage. No re-auth.

### Sessions

- Session tokens: JWT, 1-hour expiry, refreshed automatically.
- Refresh tokens: 30-day expiry, rotated on use.
- Session storage: Secure Enclave (iOS), Keystore (Android),
  encrypted local storage (web).
- Session revocation: from settings, "Sign out all devices."

Sessions do not expire on a schedule. A user who opens the app once
a month stays signed in.

### Email magic-link

The default. The user enters their email, receives a link, taps it.
No password. Standard flow.

If the user wants a password, they can set one after the first
magic-link login (via settings). Not required.

### Apple and Google sign-in

Optional, off by default. When enabled:

- Apple: uses `Sign in with Apple` on iOS, redirect on web.
- Google: uses OAuth 2.0.

The user's email is the primary identifier. Social IDs are
secondary, stored as linked identities.

### Auth state in the app

The app has three auth states:

1. **Local-only.** No account. Log is on-device. Sync and cloud AI
   disabled.
2. **Authenticated.** Account linked. Log syncs. Cloud AI enabled
   (subject to quota).
3. **Authenticated, sync paused.** Auth error or user pause.
   Local edits continue. Sync resumes on fix.

The state is visible in settings. It is not surfaced in the main UI
(no "sign in" banner) unless the user has explicitly tried to use a
cloud feature.

### Cloud AI gating

Cloud AI (Tier 3 complex queries, research) requires auth. On-device
AI (Tier 1, Tier 2, local semantic search) does not.

When a local-only user invokes a cloud feature:

    "This needs a connection and an account. Enable sync?"
    [Enable]  [Not now]

If "Not now," the feature is disabled with a note: "Available after
you enable sync."

### Account deletion

From settings: "Delete account."

One confirmation:

    "Delete your account? This removes your data from our servers
    permanently. Your local data will be wiped too — export first if
    you want a copy."

    [Delete account]  [Cancel]

On confirm:

1. Local data is wiped (after export prompt).
2. Server tombstones the log
   (`02-architecture/data-lifecycle.md`).
3. Forwarding address revoked.
4. Calendar and health sync tokens revoked.
5. Cloud AI history deleted.
6. A deletion record is retained for 30 days, then purged.

This is one of the four actions that require a confirmation in the
app (Invariant 1, `01-foundation/principles.md`). The others are
revoking calendar sync, abandoning an active protocol, and signing
out all devices.

### Export before delete

The confirmation flow offers: "Export your data first?"

- **Export as JSON.** Full log.
- **Export as Markdown.** Notes only.
- **Export as ICS.** Calendar events only.

All three are one-directional. There is no import path
(`02-architecture/data-lifecycle.md`).

### Security posture

- All network traffic is HTTPS. No exceptions.
- The server never sees plaintext sensitive data (`sync: false`
  entries).
- Cloud AI calls send only the minimal context
  (`04-ai/retrieval-layer.md`), not the full log.
- Search API keys are server-side only.
- The client never holds a provider API key.

### What auth does NOT do

- Does not gate local use. The app works fully offline and
  account-free.
- Does not require a username. Email is the identifier.
- Does not sync without the user's explicit opt-in.
- Does not track "last active" or session analytics.
- Does not send marketing email.

### Account recovery

- **Lost email access.** Not recoverable by the app. The user
  creates a new account; the old account's data is exportable if
  they can access the email.
- **Lost device.** Sign in on a new device; sync restores the log.
- **Forgotten password (if set).** Standard reset flow via email.

## Examples

**A local-only user.**

    User installs the app. Uses it for a week. No account.
    Everything works. Sync is disabled with a setting:
      "Sync: Off. [Enable]"
    User enables sync after a week.
    Prompted for email. Magic link. Session established.
    Log is linked. Sync begins.

**A user on a second device.**

    User signs in on a new phone.
    Initial sync streams the full log.
    All data appears.

**A user with a cloud AI query but no account.**

    User (local-only) hits Cmd+K, types "what's on my calendar
    tomorrow."
    This is a simple Tier 3 query and can run locally.
    It answers, no auth needed.

    User types "research standing desks."
    This requires cloud research.
    Prompt: "This needs a connection and an account. Enable sync?"
    User taps "Not now."
    The feature is disabled with a note.

**Deleting an account.**

    Settings → Delete account.
    Confirmation dialog.
    User confirms.
    Export prompt: "Export first?"
    User exports JSON.
    Account deleted. Local data wiped.
    Server tombstones the log.
    30 days later, the deletion record is purged.

## What this doc must NOT do

- This doc does not define the sync protocol. That is
  `07-infrastructure/sync-engine.md`.
- This doc does not define data lifecycle. That is
  `02-architecture/data-lifecycle.md`.
- This doc does not define AI tiers. Those are in `04-ai/`.
- This doc does not define the auth provider's UI. It defines the
  app's auth behavior. The provider's screens are theirs.
- This doc does not define billing or subscription. That is a
  later ADR if needed.