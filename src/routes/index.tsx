import { createFileRoute } from '@tanstack/react-router';

import type { DateString } from '@/domain/ids';

import { DayScreen } from '@/ui/modes/calendar/day-screen';
import { MonthScreen } from '@/ui/modes/calendar/month-screen';
import { WeekScreen } from '@/ui/modes/calendar/week-screen';
import { YearScreen } from '@/ui/modes/calendar/year-screen';

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
  readonly view?: 'day' | 'week' | 'month' | 'year';
  readonly date?: DateString;
};

export const Route = createFileRoute('/')({
  validateSearch: (search: Record<string, unknown>): CalendarSearch => ({
    view:
      search['view'] === 'week'
        ? 'week'
        : search['view'] === 'month'
          ? 'month'
          : search['view'] === 'year'
            ? 'year'
            : 'day',
    ...(typeof search['date'] === 'string' ? { date: search['date'] as DateString } : {}),
  }),
  component: CalendarRoute,
});

function CalendarRoute() {
  const { view, date } = Route.useSearch();
  const props = date === undefined ? {} : { date };

  if (view === 'year') {
    return <YearScreen {...props} />;
  }
  if (view === 'month') {
    return <MonthScreen {...props} />;
  }
  if (view === 'week') {
    return <WeekScreen {...props} />;
  }
  return <DayScreen {...(date === undefined ? {} : { initialDate: date })} />;
}
