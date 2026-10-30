import { createFileRoute } from '@tanstack/react-router';

import type { DateString } from '@/domain/ids';

import { DayScreen } from '@/ui/modes/calendar/day-screen';
import { WeekScreen } from '@/ui/modes/calendar/week-screen';

/**
 * The Calendar's entry route.
 *
 * **A date and a zoom level are search state**, not component state, because the
 * Week's focus line opens a Day and the zoom is a keyboard action: both have to be
 * reachable as a link, and both are the kind of thing a browser's back button
 * should undo. The Day view is the default — it is the hub the app lands on
 * (`05-modules/calendar.md`, `06-flows/onboarding.md` §Screen 7).
 */
type CalendarSearch = {
  readonly view?: 'day' | 'week';
  readonly date?: DateString;
};

export const Route = createFileRoute('/')({
  validateSearch: (search: Record<string, unknown>): CalendarSearch => ({
    view: search['view'] === 'week' ? 'week' : 'day',
    ...(typeof search['date'] === 'string' ? { date: search['date'] as DateString } : {}),
  }),
  component: CalendarRoute,
});

function CalendarRoute() {
  const { view, date } = Route.useSearch();
  return view === 'week' ? (
    <WeekScreen {...(date === undefined ? {} : { date })} />
  ) : (
    <DayScreen {...(date === undefined ? {} : { initialDate: date })} />
  );
}
