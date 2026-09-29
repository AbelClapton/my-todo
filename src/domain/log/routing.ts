import type { EventType } from '../events';

/**
 * Routing, not payload: the sync engine reads this and no projection ever does
 * (`02-architecture/event-log.md`).
 *
 * ADR 0008 keeps **note bodies, metric logs and person data** local-only by
 * default, with a per-category opt-in in settings. A caller that knows the
 * setting has been turned on writes `sync: true` explicitly; a caller that does
 * not writes `undefined` and lets this decide.
 *
 * This is a helper, not a rule the append API enforces, because the opt-in is a
 * setting the log does not hold — `sync.sensitive_backup` is itself an entry.
 */
export function isLocalOnlyByDefault(type: EventType): boolean {
  return (
    type.startsWith('note.') ||
    type.startsWith('person.') ||
    type === 'protocol.metric_logged' ||
    type === 'habit.checked' ||
    type === 'habit.unchecked' ||
    type === 'habit.skipped'
  );
}
