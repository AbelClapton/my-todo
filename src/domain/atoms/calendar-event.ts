import type { DateString, Instant } from '../ids';

/**
 * The Event atom (`02-architecture/object-model.md`): anything with a time.
 *
 * Named `CalendarEvent` in code because `Event` is a DOM global and the two
 * would shadow each other in every mode file.
 *
 * The log namespace is `calendar.*` for the same reason, in the other
 * direction (ADR 0007).
 */

export type CalendarEventSource =
  'in_app' | 'google_calendar' | 'apple_calendar' | 'outlook_calendar';

export type CalendarEvent = {
  readonly id: string;
  readonly title: string;
  readonly start: Instant;
  readonly end?: Instant;
  /**
   * The one Event field that is not a time, and it changes how the two time
   * fields are read: an all-day event still carries `start` at its first local
   * midnight, because `day` is derived from it, but the clock values are **not
   * drawn** and the event belongs in the calendar's band rather than on its
   * axis (ADR 0026). A genuine 24-hour timed event is `all_day: false`.
   */
  readonly all_day: boolean;
  /** Derived from `start` in the local timezone. */
  readonly day: DateString;
  readonly source: CalendarEventSource;
  readonly people: readonly string[];
  readonly deleted: boolean;
};
