# ADR 0009 — No Social Integrations

- **Status:** Accepted
- **Date:** 2026-09-22
- **Deciders:** [founder]

## Context

Many productivity apps integrate with social media: importing posts,
sharing streaks, cross-posting achievements, pulling saved content
from Twitter/X, Instagram, TikTok, etc.

These integrations typically serve one of two purposes: growth
(encouraging users to share, which brings new users) or content
capture (letting users save things they see).

## Decision

**Social media integrations are permanently out of scope.** No
import, no export, no sharing, no cross-posting.

Content capture from social media is handled by the **share sheet**
(`07-infrastructure/integrations.md`), which is a platform feature,
not a social integration. Any app can share text or a link to this
app; the app does not maintain a connection to any social platform.

## Consequences

**Positive.**

- The app's identity stays focused on the user's own life, not
  their public persona.
- No maintenance burden for a class of integrations that break
  constantly.
- No growth pressure to add "share your streak" or similar features,
  which contradict the identity sentence
  (`01-foundation/identity.md`).
- The share sheet covers 90% of the capture use case anyway.

**Negative.**

- Users who want to save a Twitter thread must share it via the
  share sheet, which is fine, or copy-paste it, which also works.
- No viral growth loop. The app must grow through other means
  (word of mouth, App Store, content).

**Neutral.**

- The rejection is deliberate, not a gap.

## Alternatives considered

- **Read-only social import (e.g., "save this tweet").** Covered by
  the share sheet. No integration needed.
- **Share streaks to social.** Fails the identity test — the app is
  a lab notebook, not a coach or a feed.
- **Cross-post protocols or reports.** Same problem. Reports are
  private.

## Related

- `07-infrastructure/integrations.md`
- `01-foundation/identity.md`