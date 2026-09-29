import { createFileRoute } from '@tanstack/react-router';

import { TaskDetailScreen } from '@/ui/modes/tasks/task-detail-screen';

/**
 * The Task detail is a **screen**, so it is a route. `03-experience/surfaces.md`
 * files it as one and `05-modules/tasks.md` calls the tap that reaches it "Open
 * detail".
 */
export const Route = createFileRoute('/task/$taskId')({
  component: TaskDetailRoute,
});

function TaskDetailRoute() {
  const { taskId } = Route.useParams();
  return <TaskDetailScreen taskId={taskId} />;
}
