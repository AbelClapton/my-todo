import { ulid } from 'ulid';

/**
 * `device_id` is "a ULID generated on first launch"
 * (`07-infrastructure/sync-engine.md`), and it is the second key of the log's
 * total order — so two devices with skewed clocks still produce one consistent
 * order.
 *
 * The doc names secure storage; `localStorage` is the Phase 0 stand-in, because
 * Capacitor's secure storage arrives with the shell apps in Phase 8.
 */
const DEVICE_ID_KEY = 'smallwins.device_id';

export function readOrCreateDeviceId(): string {
  const stored = window.localStorage.getItem(DEVICE_ID_KEY);
  if (stored !== null && stored !== '') {
    return stored;
  }

  const created = ulid();
  window.localStorage.setItem(DEVICE_ID_KEY, created);
  return created;
}
