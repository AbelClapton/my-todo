import { createFileRoute } from '@tanstack/react-router';

import { NewEventScreen } from '@/ui/modes/calendar/new-event-screen';

/**
 * The New event screen, reached from the `+` in the Calendar header
 * (`05-modules/calendar.md` §Surfaces).
 */
export const Route = createFileRoute('/event/new')({
  component: NewEventRoute,
});

function NewEventRoute() {
  return <NewEventScreen />;
}
