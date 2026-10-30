import { useCallback, useEffect, useMemo, useState } from 'react';

import type { Note } from '@/domain/atoms/note';
import { DEFAULT_DAY_BOUNDARY_HOUR, addDays, dayAt } from '@/domain/day';
import type { DateString } from '@/domain/ids';
import { computeDayView, type DayView } from '@/projections/day-view';
import { foldLog } from '@/projections/framework';
import { applyNoteEntry } from '@/projections/note-fold';
import { computeNowLine, type NowLine } from '@/projections/now-line';

import { useLog } from '@/ui/data/use-log';

/**
 * What the Day view **reads** (`02-architecture/projections.md`).
 *
 * Three projections and no state of its own: the day (a fold over the whole log),
 * the now line (the same fold, asked a different question), and the notes
 * attached to this Day, which is the one thing `day_view` carries an id for and
 * not a body.
 *
 * **The offset and the Day are read once, at mount.** A Day does not turn over
 * under an open app (`02-architecture/day-as-unit.md`), and a timezone offset that
 * changed mid-session would renumber every Day the user is looking at.
 */

export type UseDay = {
  readonly today: DateString;
  readonly date: DateString;
  readonly isToday: boolean;
  readonly tzOffsetMinutes: number;
  readonly view: DayView;
  readonly nowLine: NowLine;
  /** Notes attached to this Day: the Daily Note first, then the rest. */
  readonly notes: readonly Note[];
  readonly goToPreviousDay: () => void;
  readonly goToNextDay: () => void;
  readonly goToToday: () => void;
};

const MINUTE_MS = 60_000;

/** The now line is a foreground instrument; a minute is as fine as it needs. */
const NOW_TICK_MS = MINUTE_MS;

export function useDay(initialDate?: DateString): UseDay {
  const { entries } = useLog();

  const tzOffsetMinutes = useMemo(() => -new Date().getTimezoneOffset(), []);
  const today = useMemo<DateString>(() => {
    const now = new Date();
    return dayAt(now.toISOString(), tzOffsetMinutes, DEFAULT_DAY_BOUNDARY_HOUR);
  }, [tzOffsetMinutes]);

  const [date, setDate] = useState<DateString>(initialDate ?? today);
  const [now, setNow] = useState(() => new Date().toISOString());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date().toISOString()), NOW_TICK_MS);
    return () => window.clearInterval(timer);
  }, []);

  const view = useMemo(
    () => computeDayView(entries, { date, tz_offset_minutes: tzOffsetMinutes }),
    [entries, date, tzOffsetMinutes],
  );

  const nowLine = useMemo(
    () => computeNowLine(entries, { now, date, tz_offset_minutes: tzOffsetMinutes }),
    [entries, now, date, tzOffsetMinutes],
  );

  const notes = useMemo(() => {
    const all = foldLog<readonly Note[]>({ empty: [], apply: applyNoteEntry }, entries);
    const attached = all.filter(
      (note) => !note.deleted && note.attached_to.type === 'day' && note.attached_to.id === date,
    );
    // The Daily Note first (`05-modules/calendar.md` §The Day view layout), and
    // the projection is what says which one that is.
    const dailyId = view.daily_note_id;
    return dailyId === undefined
      ? attached
      : [...attached].sort((a, b) => (a.id === dailyId ? -1 : b.id === dailyId ? 1 : 0));
  }, [entries, date, view.daily_note_id]);

  const goToPreviousDay = useCallback(() => setDate((current) => addDays(current, -1)), []);
  const goToNextDay = useCallback(() => setDate((current) => addDays(current, 1)), []);
  const goToToday = useCallback(() => setDate(today), [today]);

  return {
    today,
    date,
    isToday: date === today,
    tzOffsetMinutes,
    view,
    nowLine,
    notes,
    goToPreviousDay,
    goToNextDay,
    goToToday,
  };
}
