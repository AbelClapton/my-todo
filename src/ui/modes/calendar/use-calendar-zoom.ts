import { useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';

import type { DateString } from '@/domain/ids';

/**
 * The Calendar's zoom, from the keyboard.
 *
 * `03-experience/gesture-vocabulary.md` puts pinch on the calendar — *"Day ↔ Week ↔
 * Month ↔ Year"* — and gives it one keyboard equivalent: **`Cmd +` / `Cmd -`**. The
 * platform notes then say what a web build owes: *"Gestures are pointer-based where
 * supported, but keyboard equivalents are the primary path."*
 *
 * **Year is the level that does not exist yet.** The zoom walks the levels that have
 * been built and clamps at the end of that list, rather than pretending Year is one
 * keypress away.
 */
export type CalendarLevel = 'day' | 'week' | 'month';

const LEVELS: readonly CalendarLevel[] = ['day', 'week', 'month'];

export function useCalendarZoom(level: CalendarLevel, date: DateString | undefined): void {
  const navigate = useNavigate();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!event.metaKey && !event.ctrlKey) {
        return;
      }
      const zoomIn = event.key === '+' || event.key === '=';
      const zoomOut = event.key === '-' || event.key === '_';
      if (!zoomIn && !zoomOut) {
        return;
      }
      event.preventDefault();
      const at = LEVELS.indexOf(level);
      const next = LEVELS[Math.max(0, Math.min(LEVELS.length - 1, at + (zoomIn ? 1 : -1)))];
      if (next === undefined || next === level) {
        return;
      }
      void navigate({ to: '/', search: { view: next, ...(date === undefined ? {} : { date }) } });
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [level, date, navigate]);
}
