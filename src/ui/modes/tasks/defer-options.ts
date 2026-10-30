import type { Task } from '@/domain/atoms/task';
import { addDays } from '@/domain/day';
import type { DateString } from '@/domain/ids';
import type { TaskRescheduledPayload } from '@/domain/events/task';

/**
 * The defer sheet's answers, resolved to dates.
 *
 * `05-modules/tasks.md` fixes the rows — *"Tomorrow, Next week, Someday, Pick a
 * date…"* — and leaves one thing undefined: *"Open: what 'Next week' resolves
 * to."* The design lab draws the two readings side by side and closes with
 * *"which definition of Next week ships — the sheet proves one is needed, not
 * which."*
 *
 * **It ships as the next calendar week's Monday.** Defer means *"when the task
 * becomes visible"*, so "next week" is the first day of the next week rather
 * than a seven-day delay: on a Friday, +7 days makes the task visible on
 * another Friday, which is not what the phrase says. Every row shows the date
 * it resolves to, so the promise is on screen rather than in the reader's head.
 *
 * **Three of the four rows write `defer`; the fourth writes a state.** `Someday`
 * is not a date at all — *"no due dates, no scheduling"* — so it is
 * `task.marked_someday` and it is drawn below a rule, because it answers a
 * different question.
 */

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

/** Parses a Day at UTC midnight, the same anchor `domain/day.ts` uses. */
function utcDay(day: DateString): Date {
  return new Date(`${day}T00:00:00Z`);
}

/** `Wed 1 Oct` — the lab's own format, spelled out rather than localised. */
export function formatDay(day: DateString): string {
  const date = utcDay(day);
  return `${WEEKDAYS[date.getUTCDay()]} ${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]}`;
}

/**
 * The next calendar week's Monday — at least tomorrow, so the answer is never
 * "today" (which would not defer anything). This is the lab's `nextMonday()`.
 */
export function nextMonday(today: DateString): DateString {
  let day = addDays(today, 1);
  while (utcDay(day).getUTCDay() !== 1) {
    day = addDays(day, 1);
  }
  return day;
}

/** The rows that write `defer`. The fourth row writes a state instead. */
export type DeferDateChoice = {
  readonly key: 'tomorrow' | 'next-week';
  readonly label: string;
  readonly day: DateString;
  /** What the label resolves to, drawn beside it. */
  readonly resolved: string;
};

export function deferDateChoices(today: DateString): readonly DeferDateChoice[] {
  const tomorrow = addDays(today, 1);
  const nextWeek = nextMonday(today);
  return [
    { key: 'tomorrow', label: 'Tomorrow', day: tomorrow, resolved: formatDay(tomorrow) },
    { key: 'next-week', label: 'Next week', day: nextWeek, resolved: formatDay(nextWeek) },
  ];
}

/**
 * The payload that sets a defer date **without touching `due`**.
 *
 * `task.rescheduled` carries both temporal fields and an absent key *clears*
 * it (`10-engineering/code-conventions.md`), so a defer that sent only `defer`
 * would silently drop the task's deadline. Sending `due` back unchanged is what
 * makes the sheet's promise — *"the defer sheet sets defer, not due"* — true at
 * the level of the log rather than only in the copy.
 *
 * The same function is the undo: called with the pre-change snapshot and *its
 * own* defer, it re-states the pair the task had, which is a compensation built
 * from the event's own vocabulary rather than a deletion.
 */
export function reschedulePayload(
  task: Task,
  defer: DateString | undefined,
): TaskRescheduledPayload {
  return {
    task_id: task.id,
    ...(task.due === undefined ? {} : { due: task.due }),
    ...(defer === undefined ? {} : { defer }),
  };
}
