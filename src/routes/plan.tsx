import { createFileRoute } from '@tanstack/react-router';

import { RitualScreen } from '@/ui/modes/calendar/ritual-screen';

/**
 * The morning plan (`06-flows/morning-plan.md`) — the same surface as the
 * shutdown, planning today instead of tomorrow, and reachable deliberately
 * outside the 7am–11am window where it fires on its own.
 */
export const Route = createFileRoute('/plan')({
  component: MorningPlanRoute,
});

function MorningPlanRoute() {
  return <RitualScreen kind="morning" />;
}
