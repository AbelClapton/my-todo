import { createFileRoute } from '@tanstack/react-router';

import { RitualScreen } from '@/ui/modes/calendar/ritual-screen';

/**
 * The shutdown (`06-flows/shutdown.md`).
 *
 * A route rather than a mode: the flow is *"not a mode"*, it surfaces once and
 * dismisses itself. Until the command palette and the attention budget exist
 * (Phase 1 items 7 and 9), the invitation on the day view is how it is reached.
 */
export const Route = createFileRoute('/shutdown')({
  component: ShutdownRoute,
});

function ShutdownRoute() {
  return <RitualScreen kind="shutdown" />;
}
