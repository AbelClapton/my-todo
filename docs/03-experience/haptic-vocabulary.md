# Haptic Vocabulary

## Purpose

This doc defines the closed set of haptic feedbacks the app uses and
when each one fires. It exists because haptics, like gestures and
motion, must be consistent to feel intentional. Users will not
articulate that the completion haptic is the same everywhere; they
will feel that it is, and the app will feel crafted.

The haptic vocabulary is tiny on purpose: four haptics, used
consistently, forever.

## Invariants

- There are exactly four haptics. No screen may add a fifth.
- Each haptic means the same thing everywhere. If a surface uses a
  haptic for a different purpose, that is a bug.
- Haptics complement motion and sound; they never replace them.
  Every haptic is paired with a visual change.
- Haptics respect the system haptic setting. When disabled,
  everything still works; the app just doesn't buzz.
- Haptics never fire on scroll, hover, or passive interaction.
  Only on committed actions.

## Specification

### The four haptics

**1. Completion.** A light, satisfying tap. Signals "done."

Fires on:
- Task completion
- Habit check (full)
- Capture routed to "today"
- A nudge actioned
- A protocol metric logged

Feels like: iOS `UIImpactFeedbackGenerator(style: .light)`.
Android: `HapticFeedbackConstants.CONFIRM`.

**2. Mode switch.** A subtle, quick tick. Signals "moved to a new
place."

Fires on:
- Switching modes in the rail/dock
- Opening a sheet or popover
- Expanding a section
- Toggling a filter that changes what's visible

Feels like: iOS `UISelectionFeedbackGenerator()`. Android:
`HapticFeedbackConstants.CLOCK_TICK`.

**3. Error / warning.** A distinct, firmer buzz. Signals "no" or
"can't."

Fires on:
- Attempting a disabled gesture
- A failed action (network error, invalid input, permission denied)
- An undo window expiring without user action (soft warning)
- A destructive action confirmation (before it fires, not after)

Feels like: iOS `UINotificationFeedbackGenerator(type: .warning)`.
Android: `HapticFeedbackConstants.REJECT`.

**4. Success.** A double-tap pattern. Reserved for larger wins.

Fires on:
- Completing a protocol's baseline period
- Completing a protocol (review date reached)
- Completing all three of today's top three
- A habit streak milestone (every 30 days, not every day)

Feels like: iOS `UINotificationFeedbackGenerator(type: .success)`.
Android: two `CONFIRM` haptics, 80ms apart.

### The long-press haptic

The long-press that opens the contextual menu fires a *very light*
tick at the moment the menu appears. This is a sub-variant of Mode
Switch (the tick), timed to coincide with the visual menu entry. It
is not a fifth haptic; it is the Mode Switch haptic used at a
specific moment.

### When haptics fire relative to motion

Haptics fire at the *beginning* of the associated motion, not at
the end. The hand feels the tap; the eye then confirms what
happened. Leading with haptics makes the app feel responsive; trailing
makes it feel sluggish.

Exception: the Completion haptic fires at the *moment of commit*,
which coincides with the start of the completion animation. This
is intentional.

### What never fires a haptic

- Scrolling
- Hovering (mouse, pointer)
- Focus changes (keyboard navigation)
- Passive data updates (sync arriving, mirror refreshing)
- Nudges appearing (they may animate, but no haptic)
- Auto-saves
- Search-as-you-type
- Any state that the user did not directly cause

### Pairing table

| Interaction | Haptic | Paired motion |
|---|---|---|
| Complete a task | Completion | Completion confirmation (400ms) |
| Check a habit (full) | Completion | Checkmark fill (150ms) |
| Check a habit (minimum) | Completion (softer) | Checkmark fill with a small underline |
| Skip a habit | Mode switch | Row dims, moves to skipped |
| Open contextual menu | Mode switch (light tick) | Menu entry (200ms) |
| Switch modes | Mode switch | Mode indicator slide (200ms) |
| Capture item | Mode switch | Capture field expands |
| Open sheet | Mode switch | Sheet entry (200ms) |
| Attempt disabled gesture | Error | None (silent, haptic only) |
| Failed action | Error | Error toast entry |
| Undo | Mode switch | Toast dismissal |
| Protocol review reached | Success | Report reveal |
| All top three done | Success | Celebration card fade-in |

### Platform implementation

- **iOS.** Use `CoreHaptics` or the `UIFeedbackGenerator` family.
  The four haptics map to `impact(.light)`, `selection()`,
  `notification(.warning)`, and `notification(.success)`.
- **Android.** Use `Vibrator` with `VibrationEffect`. Map to the
  `HapticFeedbackConstants` above.
- **Web.** The Vibration API on supporting browsers
  (`navigator.vibrate`). Where unavailable, haptics are silent.
- **Capacitor.** Use the `@capacitor/haptics` plugin to abstract
  the platform APIs.

### User setting

Haptics are on by default. Users can disable them in settings
(`system.settings_changed`). When disabled:

- No haptic fires on any interaction.
- All motion and visual feedback still occurs.
- The app is fully functional.

## Examples

**Completing a task.**

    User swipes right past threshold and releases.
    Row reveals, commits.
    Completion haptic fires at the moment of commit.
    Completion animation plays (400ms).
    Undo toast appears.

**Attempting to swipe a calendar event left (defer disabled).**

    Row does not move.
    Error haptic fires (short, firm).
    Nothing else happens. No toast, no text.

**Completing all three top-three tasks.**

    User completes the third.
    Completion haptic fires (as usual).
    Then, after a 150ms pause, Success haptic fires.
    A subtle "all three done" card fades in.

**Undo window expiring.**

    User completes a task. Undo toast appears with a countdown.
    User does nothing.
    At t=4.5s, a soft Error haptic fires.
    At t=5s, the toast disappears, and the action stands.

## What this doc must NOT do

- This doc does not define motion. It references motion timing for
  pairing. Motion lives in
  `03-experience/motion-vocabulary.md`.
- This doc does not define gestures. It defines what the hand feels
  in response. Gestures live in
  `03-experience/gesture-vocabulary.md`.
- This doc does not define sound. The app has no sound design; if
  it ever does, sound is defined separately.
- This doc does not define per-screen overrides. There are none.
- This doc does not specify exact platform API calls. It gives the
  mapping; implementation is a code concern.