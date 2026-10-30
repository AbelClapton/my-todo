/**
 * The four haptics, and nothing else (`03-experience/haptic-vocabulary.md`).
 *
 * The doc is a closed set: *"There are exactly four haptics. No screen may add a
 * fifth."* So this module exports four names and one function, and a surface
 * names the **meaning** it is expressing rather than a vibration pattern.
 *
 * **Web has no severity API.** `navigator.vibrate` takes one pattern, so the
 * intensity the doc describes in platform terms (`.light`, `selection()`,
 * `.warning`) has to be encoded as duration. The durations below are the
 * encoding: the completion tap is one short pulse, the mode-switch tick is
 * shorter, an error is a pulse–gap–pulse the hand reads as "no", and success is
 * two taps 80ms apart, which is the interval the doc names.
 *
 * Haptics are on by default and a setting turns them off
 * (`system.settings_changed { key: 'haptics' }`). That setting is part of the
 * Settings module, which Phase 0 does not have, so `setHapticsEnabled` is the
 * seam it will call — until then everything fires.
 */

export type Haptic = 'completion' | 'mode-switch' | 'error' | 'success';

const PATTERNS: Readonly<Record<Haptic, number | readonly number[]>> = {
  completion: 10,
  'mode-switch': 5,
  error: [20, 40, 20],
  success: [10, 80, 10],
};

let enabled = true;

/** The seam the Settings module calls. Nothing calls it in Phase 0. */
export function setHapticsEnabled(next: boolean): void {
  enabled = next;
}

/**
 * Fires one haptic. Silent where the platform has no Vibration API, which the
 * doc makes an acceptable state rather than a degraded one: *"Where
 * unavailable, haptics are silent."*
 */
export function haptic(kind: Haptic): void {
  if (!enabled || typeof navigator === 'undefined') {
    return;
  }
  const pattern = PATTERNS[kind];
  const vibrate = navigator.vibrate?.bind(navigator);
  if (vibrate === undefined) {
    return;
  }
  vibrate(typeof pattern === 'number' ? pattern : [...pattern]);
}
