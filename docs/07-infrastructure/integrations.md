# Integrations

## Purpose

This doc defines which external systems the app integrates with,
what each integration does, and what each explicitly does not do.
It exists because integrations are the most common source of scope
creep — every one is a full-time job to maintain — and because the
app's identity (`01-foundation/identity.md`) is the filter that
decides which ones are worth building.

The rule is: **integrations must feed the loop the app already has.
They do not create new loops.**

## Invariants

- Calendar sync is the only essential integration. It is load-bearing
  (`05-modules/calendar.md`).
- Contacts and Health are cheap, read-only feeds. They are
  one-directional.
- Email forwarding is a pipeline, not an OAuth integration.
- Social media integrations are permanently out of scope.
- Every integration has a freshness policy
  (`02-architecture/data-lifecycle.md`, Invariant 4).
- Every integration can be disabled without breaking the app.

## Specification

### Calendar sync

**Load-bearing.** The Calendar is degraded without it; in-app events
still work in local-only mode.

**Sources supported:** Google Calendar, Apple Calendar (EventKit),
Outlook Calendar (via Microsoft Graph).

**Direction:** Two-way, with rules:

- In-app events sync to the source.
- Source events mirror to the app.
- In-app edits are authoritative for events the app created.
- Source edits are authoritative for events the source created
  (`02-architecture/data-lifecycle.md`).

**What syncs:** Title, time, location, attendees (matched to
People), notes.

**What does not sync:** Tasks, habits, protocols, or anything else.
The calendar integration syncs events only.

**Frequency:** On foreground, on network regain, every 60 seconds
while foregrounded. Push notifications where the provider supports
them.

**Permissions:** Read and write, per calendar the user grants.
Revoking is one of the four actions that require a confirmation
(Invariant 1, `01-foundation/principles.md`). The others are account
deletion, abandoning an active protocol, and signing out all
devices. The revoke control lives in `05-modules/settings.md`.

**Revoking stops the feed. It does not delete what the feed brought in.**

- No further fetches. The mirror stops updating.
- **Mirrored events stay, and are labelled permanently.** With no next sync
there is no fresher data, so each mirrored event keeps its "as of <last
sync>" annotation rather than showing it transiently
  (`02-architecture/data-lifecycle.md`, Invariant 4). The app never hides data
  it cannot refresh, and it never shows it without saying how old it is.
- **They then age out on the normal rule.** Mirrored events prune at 90 days
  (`02-architecture/data-lifecycle.md`), so the mirror empties on its own —
  without one visible deletion, and without the user losing today's plan.
- **In-app events are untouched.** The app owns those.
- **Reconnecting resumes.** The mirror re-fetches and the annotations clear.

Deleting the mirror on revoke was rejected: it would change what past Days show,
and a Day is fixed at the moment it opens
(`02-architecture/day-as-unit.md`). A user revoking access is ending a
subscription, not editing their history.

### Contacts

**Optional.** Used to populate People.

**Source:** Platform contacts API (iOS Contacts, Android Contacts).

**Direction:** One-way (contacts → app).

**What syncs:** Name, phone, email. The user selects which contacts
to import; the app does not import silently.

**Frequency:** Manual (a button) or weekly.

**Privacy:** Contact data is local-only
(`02-architecture/local-first.md`). It is not sent to the server.

**What the app does not do:** Write back to contacts. Merge
duplicates. Sync contact photos.

### Health

**Optional.** Used to auto-fill habit compliance for physical
activities.

**Source:** Apple Health (HealthKit), Google Fit.

**Direction:** One-way (health → app).

**What syncs:**

- Steps (for "walk" habits).
- Sleep duration (for sleep-adjacent habits).
- Workouts (for exercise habits).

Matching is by habit name pattern; the user confirms the match once
per habit.

**Frequency:** On foreground, once per hour while foregrounded.

**Privacy:** Health data is local-only. It is not sent to the
server.

**What the app does not do:** Write back to Health. Pull medical
records. Integrate wearables beyond Health/Fit.

### Email forwarding

**A pipeline, not an OAuth integration.**

**Mechanism:** Cloudflare Email Routing delivers to a Worker, which relays
the message to the user's device (`07-infrastructure/stack.md`,
ADR 0018).

**The address.** The user gets `<user-slug>@in.<domain>`. The slug is
generated, not chosen: 8 lowercase alphanumeric characters, no ambiguous
pairs, never derived from the user's name or email address. It is an
unauthenticated write endpoint — anyone who knows an address can put mail
in it — so entropy is the control that matters, and it is rotatable.
Rotation revokes the old slug the way account deletion revokes it
(`02-architecture/data-lifecycle.md`).

**Who writes the capture.** The Worker writes no log entries and runs no
AI: Tier 1 is on-device (`07-infrastructure/stack.md`), so parsing happens
where the log is. The device writes `note.created` — and `task.created`
if the subject parses as a task — with `sync: false`, because notes are
local-only (ADR 0008). The relay payload is not a log entry and never
becomes one: it is not merged, not projected, and not addressed by `seq`.
Whichever device syncs first writes the capture; the others are told it was
handled and write nothing (ADR 0017).

**The transit, and it is disclosed.** Mail forwarded to this address waits
in a transient capture buffer until a device collects it, then is deleted;
undelivered messages are dropped after 72 hours, and the device is told on
next open that one expired. This is stated where the address is shown,
because the address is a server endpoint and the user is the one choosing
to send to it.

Emails forwarded to this address become captures
(`06-flows/capture.md`), on the device:

1. Subject is parsed by Tier 1.
2. Body becomes a note.
3. If the subject parses as a task, the body attaches to the task.
4. Otherwise, the note attaches to today's Day.

**Body handling.**

- Plain-text body only. HTML bodies are converted to plain text
  via a conservative parser (no remote resource loading).
- Signatures are stripped by heuristic (detect "Sent from",
  standard signature markers, three-plus blank lines followed by a
  short block).
- Attachments are ignored. If the email contains only attachments
  with no body, the note captures the subject and a placeholder:
  "[attached files not captured]".
- Quoted reply chains are kept (they may be useful context). The
  user can trim.

**Deduplication.**

- The app hashes the email's `Message-ID` header.
- If a hash matches an existing capture within 24 hours, the
  duplicate is dropped silently.
- This handles accidental double-forwards and mailing-list loops.

**What the app does not do:** Read the user's inbox. Request Gmail
or Outlook scopes. Maintain an OAuth connection to any mail
provider. Store raw email headers beyond the Message-ID hash.

**Frequency:** On receipt.

**Freshness:** Captures are timestamped with the forward
time.

**Anti-abuse:** Rate limit 100 forwards per day per user. Forwarded
emails from unknown senders are flagged in the note.

### The share sheet

**A platform feature, not a third-party integration.**

Every iOS and Android app can share content to another app. This
app registers as a share target for **text and URLs only**. Images
and files are not accepted (`06-flows/capture.md`).

The share sheet covers 90% of "save this from [app]" use cases
without a single third-party API. Twitter, Safari, Messages,
Photos, Maps — all route through it.

**Frequency:** On share.

**Freshness:** Captures are timestamped with the share time.

### Weather

**Optional.** Used in the calendar's day view and shutdown preview.

**Source:** A weather API (OpenWeatherMap, or a free alternative).

**Direction:** One-way (weather → app).

**What syncs:** Current conditions and today's forecast for the
user's location.

**Frequency:** On foreground, cached for 30 minutes.

**Location:** The user sets a home location; the app does not
track location continuously.

### Search API (internal)

Used by the research pipeline
(`04-ai/research-and-protocols.md`). Not a user-facing integration;
it is an implementation detail of the research feature.

**Provider:** Bing Web Search, Brave Search, or SerpAPI. Selection
is an implementation detail.

**What it returns:** Web search results with titles, URLs, and
snippets.

**What it does not do:** Scrape retailer pages. Access private data.
Bypass paywalls.

### What is out of scope (permanently)

- **Social media integrations of any kind.** They fail the feature
  test (`01-foundation/identity.md`). They do not help the user
  learn about themselves.
- **Slack, Teams, Discord.** Different context, different energy.
- **Notion, Obsidian, Roam bidirectional sync.** Bidirectional is
  a two-way sync conflict generator. Markdown export is the honest
  version.
- **Zapier / Make / IFTTT as a strategy.** A webhook is fine;
  building for these is not.
- **Banking, finance, smart home, media tracking.** Different
  domains. Every one is a distraction.
- **Google Drive, Dropbox, OneDrive.** Notes are local; files are
  out of scope.
- **Twitter/X, Instagram, TikTok.** See above.

### Extension protocol

If, after v1 ships, a specific integration is requested by a
significant portion of users, it can be added via ADR. The test is:
does it feed an existing loop? If yes, consider it. If it creates a
new loop, do not.

The extension protocol exists to give "permanent" above its precise
meaning: *not by drift, and not by request volume*. It does not
mean unamendable. The out-of-scope list changes the same way every
other decision in this doc set does — by ADR.

## Examples

**A user enables calendar sync.**

    Settings → Calendar sync → Connect.
    OAuth flow for Google Calendar.
    User grants read/write to two calendars.
    Sync begins.
    In-app events write to the source. Source events mirror to the
    app.

**A user enables contacts.**

    Settings → Contacts → Import.
    Picks 40 contacts.
    People created with source: 'contacts'.
    No write-back to contacts, ever.

**A user enables health.**

    Settings → Health → Connect.
    Grants read access to Steps, Sleep, Workouts.
    Existing "Walk" habit prompts: "Match to Steps?"
    User confirms.
    Walk habit now auto-fills from health data.

**A user forwards an email.**

    User forwards a contractor email to their address.
    App receives.
    Tier 1 parses subject "Re: tile delivery" as a task.
    Body becomes a note attached to the task.
    Task appears in Inbox.

**A user shares from Safari.**

    User reads an article, taps Share → the app.
    Quick confirm screen: "Captured to Inbox."
    User adds: "For the home office."
    Note created, attached to today's Day.

**A user asks for Slack integration.**

    Not built. The response is:
    "The app doesn't integrate with Slack. You can forward emails,
    or use the share sheet from Slack to capture messages."
    This is a positioning choice, not a limitation.

## What this doc must NOT do

- This doc does not define the capture flow. That is
  `06-flows/capture.md`.
- This doc does not define the research pipeline. That is
  `04-ai/research-and-protocols.md`.
- This doc does not define freshness thresholds. Every threshold —
  including the ones that apply to integration-sourced data — lives
  in the staleness table in `02-architecture/data-lifecycle.md`.
  This doc does not restate the numbers, so they cannot drift.
- This doc does not define People. That is
  `05-modules/people.md`.
- This doc does not define Health's role in habits. That is
  `05-modules/habits.md`.
- This doc does not define tokens, gestures, or motion. It
  references them.
- This doc does not promise features that are out of scope. It
  names them and rejects them.