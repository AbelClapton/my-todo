import type { TaskScope } from '@/projections/task-list';

/**
 * The Tasks mode's empty states.
 *
 * The strings are `05-modules/tasks.md`'s table verbatim; the **form** — a
 * `type-display` headline, one line in `text-secondary`, one action, `space-10`
 * padding, static, no glyph — is `03-experience/states.md`'s.
 *
 * The rule the table exists for: **the action repairs the cause of the
 * emptiness.** There are three causes and three repairs — no data, nothing
 * matches the filter, nothing falls inside the window — and where the cause
 * cannot be repaired from this surface the action falls back to capture, which
 * is the one action that is always available.
 */
export type EmptyAction = 'capture' | 'clear_filters' | 'show_all_time';

export type EmptyState = {
  readonly headline: string;
  readonly detail: string;
  /** `null` is a finding: the Someday pile is the first of exactly two such
   * surfaces, because an empty parking lot is an answer rather than a dead
   * end. */
  readonly action: EmptyAction | null;
};

export const EMPTY_STATES: Readonly<Record<TaskScope, EmptyState>> = {
  today: {
    headline: 'Nothing on today.',
    detail: 'Tasks appear here once they have a day.',
    action: 'capture',
  },
  next: {
    headline: 'Nothing flagged.',
    detail: 'Flag a task now or next and it appears here.',
    action: 'capture',
  },
  someday: {
    headline: 'Nothing parked.',
    detail: 'Setting a task aside keeps it out of Today without deleting it.',
    action: null,
  },
  all: {
    headline: 'Nothing open.',
    detail: 'Everything you capture lands here first.',
    action: 'capture',
  },
};

/**
 * Today empty and Someday empty mean **opposite** things: Today empty means
 * nothing has a day, Someday empty means nothing has been set aside. They do
 * not share a sentence.
 */
export const TODAY_EMPTY_NOTE = 'Capture puts a task in Inbox, not on today.';
