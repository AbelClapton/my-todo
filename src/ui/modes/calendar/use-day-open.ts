import { useEffect, useRef } from 'react';
import { ulid } from 'ulid';

import { DEFAULT_DAY_BOUNDARY_HOUR } from '@/domain/day';
import type { DayView } from '@/projections/day-view';

import { useLog } from '@/ui/data/use-log';
import { dailyNoteTitle } from '@/ui/format';

/**
 * Day rollover (`02-architecture/day-as-unit.md` §Day rollover).
 *
 * *"At the boundary, the app: opens the incoming Day (`day.opened`), creates the
 * Daily Note for the incoming Day (`day.note_created`)"* — in that order, and
 * once. The once is what the `handled` ref is for, and it is keyed on the date so
 * that navigating away and back does not reopen a Day that is already open.
 *
 * Two readings this makes explicit rather than leaving implicit:
 *
 * - **`day.opened` is written only for the Day the clock is in.** A past Day the
 *   user navigates to was either opened when it happened or *"never opened"*, and
 *   the doc says those *"are still Days; they just have no `day.opened` entry"* —
 *   so back-dating an open would rewrite history.
 * - **The Daily Note is written for any Day viewed without one**, because
 *   `05-modules/notes.md` says the Daily scope *"is never empty: a Daily Note is
 *   created for every"* day. A Day with no note would be the one place the Notes
 *   mode could show an empty Daily scope.
 *
 * Both writes are attributed to `system`: no user action caused them, and the log
 * keeps that distinction (`02-architecture/event-log.md`).
 */

export type DayOpenParams = {
  readonly isToday: boolean;
  readonly tzOffsetMinutes: number;
};

export function useDayOpen(view: DayView, params: DayOpenParams): void {
  const { append, status } = useLog();
  const handled = useRef<string | null>(null);

  useEffect(() => {
    if (status !== 'ready' || handled.current === view.date) {
      return;
    }
    handled.current = view.date;

    void (async () => {
      if (params.isToday && !view.opened) {
        await append({
          type: 'day.opened',
          actor: { type: 'system' },
          payload: {
            day: view.date,
            tz_offset_minutes: params.tzOffsetMinutes,
            boundary_hour: DEFAULT_DAY_BOUNDARY_HOUR,
          },
        });
      }

      if (view.daily_note_id !== undefined) {
        return;
      }

      // The body starts empty and the title is the date, both of which
      // `05-modules/notes.md` §The Daily Note specifies.
      const noteId = ulid();
      await append({
        type: 'note.created',
        actor: { type: 'system' },
        payload: {
          note_id: noteId,
          title: dailyNoteTitle(view.date),
          body: '',
          attached_to: { type: 'day', id: view.date },
        },
      });
      await append({
        type: 'day.note_created',
        actor: { type: 'system' },
        payload: { note_id: noteId, day: view.date },
      });
    })();
  }, [
    append,
    status,
    view.date,
    view.opened,
    view.daily_note_id,
    params.isToday,
    params.tzOffsetMinutes,
  ]);
}
