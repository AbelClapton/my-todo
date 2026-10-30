import { createFileRoute } from '@tanstack/react-router';

import { DayScreen } from '@/ui/modes/calendar/day-screen';

/**
 * The app's entry route is the **Calendar's Day view**, because the Calendar is
 * the hub (`05-modules/calendar.md`) and it is what onboarding lands on
 * (`06-flows/onboarding.md` §Screen 7).
 *
 * The Tasks mode moved to `/tasks` when the Calendar arrived. Phase 1's remaining
 * Calendar views — week, month, year — are the same route with a different view,
 * not new routes: the date is the state a view reads.
 */
export const Route = createFileRoute('/')({
  component: CalendarRoute,
});

function CalendarRoute() {
  return <DayScreen />;
}
