# ADR 0017 — Forwarded Mail: Who Writes the Capture

- **Status:** Accepted
- **Date:** 2026-09-22
- **Deciders:** [founder]

## Context

`07-infrastructure/integrations.md` gives every user a personal
forwarding address (`<user-slug>@in.<domain>`) and says a forwarded
email becomes a capture. `02-architecture/local-first.md` lists
"provide a forwarding address for email capture" as a **server**
responsibility.

Three decisions already in the doc set make the naive implementation
impossible:

- The client holds the full log, and the server is a sync peer, not an
  authority (`02-architecture/local-first.md`).
- Notes are local-only by default: `sync: false` (`08-decisions/0008`).
- **Tier 1 runs on-device** (`07-infrastructure/stack.md`). The server
  has no parser.

So a forwarded email cannot become a server-created `note.created`
entry. That entry would be authored by the server, would carry a
`sync: false` payload — meaning the server writes data it is then
forbidden from syncing — and would need parsing the server cannot do.
No doc said who writes the entry, and the answer is not obvious from any
one of them.

Two smaller gaps came with it: the `<user-slug>` was defined nowhere, and
delivery has to survive the user's phone being asleep for a while.

## Decision

**The server relays; the device writes.**

1. **The mail Worker writes no log entries and runs no AI.** It receives
   the message, keeps the subject and a plain-text body, and relays them
   to the user's device. It enforces the address-level rules that exist
   to protect the endpoint: rate limit, sender allowlist state, and size.
2. **The device parses and writes.** Tier 1 runs where the log is, per
   `stack.md`. The device writes `note.created`, and `task.created` if
   the subject parses as a task, both with `sync: false` — because notes
   are local-only (ADR 0008).
3. **Delivery is one-shot.** The relay payload carries an id. Whichever
   device syncs first writes the entry; the others are told it was
   handled and write nothing. A forwarded email never produces two
   captures.
4. **Undelivered messages wait in a transient capture buffer.** The
   buffer is not the event log, is not a projection input, is not
   addressed by `seq`, and is never merged. It holds nothing but the
   relay payload. It is deleted on delivery, and dropped after **72
   hours**, after which the device is told on next open that a forwarded
   email expired rather than delivered.
5. **The transit is disclosed where the address is shown.** The address
   is a server endpoint, and forwarding is an act the user takes
   knowingly. The disclosure is a line at the point of issue: mail
   forwarded here waits on the server until a device collects it, then
   is deleted.

**The slug is generated, not chosen:** 8 lowercase alphanumeric
characters, no ambiguous pairs, never derived from the user's name or
email address. It is an unauthenticated write endpoint — anyone who
knows an address can put mail in it — so entropy is the control that
matters, and it is rotatable. Rotation revokes the old slug the way
account deletion revokes it (`02-architecture/data-lifecycle.md`).

Docs updated in the same change: `07-infrastructure/integrations.md`
(the address rules, the ownership, the buffer),
`07-infrastructure/sync-engine.md` (the relay payload is not a log
entry), `02-architecture/local-first.md` (server responsibilities), and
ADR 0008's neutral list.

## Consequences

**Positive.**

- The log keeps a single author per entry: the client. The server never
  writes a `sync: false` payload.
- On-device Tier 1 stays the only parser, so forwarding adds no AI to the
  server and no second implementation to drift.
- The privacy story stays checkable: the only capture content the server
  can see is (a) in flight during a request and (b) a bounded buffer for
  mail no device has collected.
- The buffer has a natural cost ceiling, because the address already has
  a documented rate limit.

**Negative.**

- Forwarding is the one capture path that cannot work with every device
  offline *and* the server stateless. A device has to come online within
  72 hours or the message is dropped.
- The server now stores something that is not the log. That is a real
  amendment to "the server holds only what is necessary for multi-device
  use," and it is the reason this ADR exists rather than a paragraph in
  `integrations.md`.
- Entropy in the slug costs the user a memorable address. A chosen slug
  reads better and is worth less.
- The 72-hour window is a product number with no precedent in the doc
  set. It is a default, not a finding; shortening it narrows the window
  in which a forwarded email can be lost.

**Neutral.**

- No event types change. No payload changes. The relay payload is not a
  log entry and never becomes one.
- Nothing here depends on the mail provider. Cloudflare Email Routing and
  a provider's inbound webhook are interchangeable behind this decision
  (`08-decisions/0018`).

## Alternatives considered

- **The server writes `note.created` with `sync: false`.** The obvious
  implementation, and the one the docs accidentally imply. Rejected: the
  server would author an entry it must not sync, and it cannot parse
  without a Tier 1 model it does not have.
- **No buffer: relay only to a connected device, and bounce otherwise.**
  Rejected: a phone asleep at the wrong moment would lose a forwarded
  email, and the user has no way to know that forwarding is only
  reliable when the app is open.
- **A long server-side retention (30 days) so nothing is ever lost.**
  Rejected: at 30 days this is no longer a relay buffer, it is a
  server-side store of note bodies — which is the thing ADR 0008 exists
  to prevent.
- **Encrypt the buffer to a per-user public key, so the server never
  holds a readable body.** Attractive, and it is the design to revisit
  first if v1's disclosure reads badly. Rejected for now: the key has to
  be usable by every device the user owns, which means distributing it
  through something — and that something is either the server or a backup
  the server holds. The disclosure is cheaper than the key management.
- **A user-chosen slug (`abel@in.…`).** Rejected: memorable, and
  trivially enumerable. Anyone could enumerate plausible names and inject
  captures, or learn who uses the app.
