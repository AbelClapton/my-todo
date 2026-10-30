import { createFileRoute } from '@tanstack/react-router';

import { TasksMode } from '@/ui/modes/tasks/tasks-mode';

/**
 * The Tasks mode (`05-modules/tasks.md`), reached from the dock.
 *
 * It moved here from `/` when the Calendar's Day view took the entry route: the
 * Calendar is the hub, and a mode is a place you navigate to rather than the
 * place you land.
 */
export const Route = createFileRoute('/tasks')({
  component: TasksRoute,
});

function TasksRoute() {
  return <TasksMode />;
}
