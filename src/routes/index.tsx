import { createFileRoute } from '@tanstack/react-router';

import { TasksMode } from '@/ui/modes/tasks/tasks-mode';

/**
 * The app's entry route is the Tasks mode, because Phase 0 ships one mode.
 * The other three arrive with Phase 1–2 and the route tree grows with them
 * (`09-roadmap/build-order.md`).
 */
export const Route = createFileRoute('/')({
  component: TasksRoute,
});

function TasksRoute() {
  return <TasksMode />;
}
