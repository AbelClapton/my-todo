# ADR 0005 — No Wake Word

- **Status:** Accepted
- **Date:** 2026-09-22
- **Deciders:** [founder]

## Context

Voice capture is a feature of the app: push-to-talk STT for capture
(`06-flows/capture.md`), and voice input into the command palette
(`04-ai/tier-3-assistant.md`). Both are defined in the stack
(`07-infrastructure/stack.md`).

A common extension of voice capture is always-listening **wake word**
activation ("Hey [App]"). Wake word would let the user start a voice
interaction without holding a button.

Wake word is a fundamentally different engineering problem than
push-to-talk:

- **Continuous microphone access.** The mic is on all the time. This
  is a privacy and battery concern even when processing is
  on-device.
- **Low-power audio processing.** Wake word models must run under
  ~5% CPU to be viable. Battery drain is measurable on mobile.
- **False accept / false reject tradeoff.** A wake word model is
  tuned for typically fewer than 0.1 false accepts per day and fewer
  than 5% false rejects. Getting this right requires careful tuning
  per device and per environment.
- **Platform-specific implementations.** Porcupine (Picovoice) and
  openWakeWord are the common choices. Each requires license keys,
  native builds, model assets, audio stream management, and
  probability threshold tuning.
- **OS kill-backs.** Android and iOS aggressively kill background
  processes for battery optimization. A wake word listener can be
  killed silently, and the user has no idea why it stopped working.

The user-facing problems are worse than the technical ones:

- **Creepiness.** Users find always-on microphones unsettling even
  when they understand the processing is on-device.
- **Acoustic hallucinations.** Custom wake words trigger false
  positives in noisy environments, because standard STT engines are
  biased toward common dictionary words.
- **Adoption decay.** Most users disable wake word after a week.
  The engineering cost is wasted.

## Decision

**Do not build wake word.** Build push-to-talk only.

If wake word is added later, it requires a new ADR with a clear
user-facing reason (e.g., hands-free task capture while driving)
and a documented plan for the battery, licensing, and platform
issues above.

## Consequences

**Positive.**

- No always-on microphone. No privacy concerns.
- No battery drain from continuous audio processing.
- No license keys, model assets, or native build complexity.
- No acoustic hallucination problem.
- No OS kill-back issue.
- Push-to-talk covers 90% of voice value at 5% of the cost. The
  remaining 10% (hands-free while driving or cooking) is not worth
  the full engineering and trust cost.
- The app is honest about when it is listening: only while the mic
  button is held.

**Negative.**

- Voice capture requires a button press. It is not fully
  hands-free.
- Some users will ask for wake word. The answer is: the app is
  designed for deliberate capture. Users who want hands-free can
  use the platform assistant (Siri Shortcuts, Google Assistant)
  to open the app and start capture.

**Neutral.**

- Push-to-talk is a well-solved problem. Every major platform has
  on-device STT. There is no innovation required; the feature is
  reliable.
- If wake word becomes important later, the codebase can add it
  without restructuring. The decision is reversible.

## Alternatives considered

**Porcupine (Picovoice).**

- Works. Production-ready. Custom wake words available.
- Requires license keys, native builds, and per-device tuning.
- Rejected for v1: the cost is real, the value is speculative, and
  the user-facing problems remain.

**openWakeWord.**

- Open source. Free.
- Requires managing model assets, audio streams, and probability
  thresholds.
- Rejected for v1: same reasons as Porcupine, plus more
  implementation work.

**Platform wake word (Siri / Google Assistant integration).**

- Possible via app intents and shortcuts.
- Users say "Hey Siri, capture in [App]" and the app opens with
  a capture field ready.
- Rejected for v1: it pushes users into the OS assistant, not the
  app. It is also per-platform work.
- Worth revisiting in a later phase if hands-free capture is
  requested.

**Hybrid: wake word only when the app is foregrounded.**

- The mic listens while the app is open, not in the background.
- Reduces battery and privacy concerns but does not solve the
  acoustic hallucination problem.
- Rejected for v1: adds complexity for a marginal gain over
  push-to-talk.

## Related

- `07-infrastructure/stack.md` — voice STT implementation.
- `06-flows/capture.md` — the push-to-talk flow.
- `04-ai/tier-3-assistant.md` — voice input into the palette.
- `01-foundation/identity.md` — the app is a lab notebook, not an
  always-on assistant.