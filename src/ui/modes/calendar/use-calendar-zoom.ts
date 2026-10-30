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
 * **Only Day and Week exist so far.** The zoom clamps at Week rather than pretending
 * Month is one keypress away; Month and Year are the views that have not been built.
 */
export type CalendarLevel = 'day' | 'week';

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
      const target: CalendarLevel = zoomIn ? 'week' : 'day';
      void navigate({ to: '/', search: { view: target, ...(date === undefined ? {} : { date }) } });
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [level, date, navigate]);
}
