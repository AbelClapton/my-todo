import { daysBetween } from './day';
import type { Cadence, Weekday } from './events/habit';
import type { DateString } from './ids';

/**
 * Cadence arithmetic: **which days does this cadence actually schedule?**
 *
 * `05-modules/habits.md` §Cadence model hands this question to a named helper,
 * `scheduled_days_for(habit, window)`, and §The habit row gives the helper's
 * anchor: the denominator is *"the days the cadence actually scheduled, capped at
 * the window and **beginning on the habit's creation date**"*.
 *
 * That sentence is what makes `interval` decidable at all. `habit.created` has no
 * start field, so a cadence of "every 3 days" needs an origin, and the creation
 * date is the one the doc names — counting from anywhere else would be a rule the
 * log cannot support without a new event.
 */

/**
 * The weekday of a Day.
 *
 * A Day is a calendar date, not an instant (`02-architecture/day-as-unit.md`), so
 * it is parsed at UTC midnight exactly as `domain/day.ts` does: the question is
 * "which weekday is this date", and anchoring both ends the same way is what makes
 * the answer independent of the machine's timezone.
 */
export function weekdayOf(day: DateString): Weekday {
  const index = new Date(`${day}T00:00:00Z`).getUTCDay();
  switch (index) {
    case 0:
      return 'sun';
    case 1:
      return 'mon';
    case 2:
      return 'tue';
    case 3:
      return 'wed';
    case 4:
      return 'thu';
    case 5:
      return 'fri';
    default:
      return 'sat';
  }
}

/**
 * True when `cadence`, created on `createdAt`, schedules `day`.
 *
 * Nothing is scheduled before the habit existed, and `interval` counts whole days
 * from creation — so a fortnightly habit created on the 1st is due on the 1st, the
 * 15th, the 29th.
 */
export function cadenceSchedules(
  cadence: Cadence,
  createdAt: DateString,
  day: DateString,
): boolean {
  const elapsed = daysBetween(createdAt, day);
  if (elapsed < 0) {
    return false;
  }

  switch (cadence.type) {
    case 'daily':
      return true;
    case 'weekly':
      return cadence.days.includes(weekdayOf(day));
    case 'interval': {
      const every = cadence.unit === 'week' ? cadence.every * 7 : cadence.every;
      return elapsed % every === 0;
    }
  }
}
