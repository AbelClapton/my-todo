import { Link } from '@tanstack/react-router';
import { useMemo } from 'react';

import { computeTaskDetail } from '@/projections/task-detail';

import { FOCUS_RING } from '@/ui/components/focus-ring';
import { useLog } from '@/ui/data/use-log';

import { useAreaNames } from './use-tasks';

/**
 * The Task detail.
 *
 * `05-modules/tasks.md` gives this screen nine fields and six actions and says
 * **"the layout is unspecified"**, so the field rows below are the anatomy
 * `03-experience/components.md` now carries: a field row is `control-md`, which
 * is what a `[label] [value]` row costs at `type-body` with `space-4` of padding
 * (ADR 0031 put it in the Controls table).
 *
 * **Not built here, and each is a decision the set already made:**
 *
 * - **The rail of unlabelled slots** (ADR 0029) holds the fields that are *not*
 *   set, and every slot opens that field's picker. No picker exists yet — the
 *   date picker is a Calendar overlay (Phase 1) and the hour is the chip row
 *   ADR 0031 specifies.
 * - **"Schedule to day", reschedule, link person, link note, break down,
 *   research.** The first two need the date picker, the next two need the person
 *   picker and the note editor, and the last two are Tier 2 (Phase 3).
 * - **Completion is not here on purpose.** `tasks.md` lists it on the row — the
 *   checkbox and swipe right — not among the detail's actions, and the undo
 *   toast lives with the list.
 */
export function TaskDetailScreen({ taskId }: { readonly taskId: string }) {
  const { entries } = useLog();
  const areaName = useAreaNames();
  const detail = useMemo(() => computeTaskDetail(entries, { task_id: taskId }), [entries, taskId]);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-space-6 px-space-5 py-space-8">
      <Link to="/" className={`w-fit rounded-md text-type-body text-accent-text ${FOCUS_RING}`}>
        ‹ Tasks
      </Link>

      {detail === undefined ? (
        <p className="text-type-body text-text-secondary">This task is not in the log.</p>
      ) : (
        <>
          <h1 className="text-type-title-1 text-text-primary">{detail.task.title}</h1>

          <dl className="flex flex-col">
            <Field label="Area" value={areaName(detail.task.area_id)} />
            <Field label="Scheduled" value={scheduledLabel(detail.task)} />
            <Field label="Due" value={detail.task.due ?? null} />
            <Field label="Defer" value={detail.task.defer ?? null} />
            <Field
              label="Estimate"
              value={
                detail.task.estimated_minutes === undefined
                  ? null
                  : `${detail.task.estimated_minutes} min`
              }
            />
            <Field label="Priority" value={detail.task.priority} />
            <Field
              label="People"
              value={detail.task.people.length === 0 ? null : `${detail.task.people.length}`}
            />
            <Field label="State" value={detail.task.state} />
          </dl>

          {detail.children.length === 0 ? null : (
            <section className="flex flex-col gap-space-2">
              <h2 className="text-type-title-3 text-text-primary">Subtasks</h2>
              <ul className="flex flex-col">
                {detail.children.map((child) => (
                  <li key={child.id}>
                    <Link
                      to="/task/$taskId"
                      params={{ taskId: child.id }}
                      className={`flex min-h-control-md items-center rounded-md text-type-body text-accent-text ${FOCUS_RING}`}
                    >
                      {child.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {detail.notes.length === 0 ? null : (
            <section className="flex flex-col gap-space-2">
              <h2 className="text-type-title-3 text-text-primary">Notes</h2>
              <ul className="flex flex-col gap-space-4">
                {detail.notes.map((note) => (
                  <li key={note.id} className="flex flex-col gap-space-1">
                    {note.title === undefined ? null : (
                      <h3 className="text-type-subhead text-text-secondary">{note.title}</h3>
                    )}
                    <p className="max-w-prose whitespace-pre-wrap text-type-body text-text-primary">
                      {note.body}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </main>
  );
}

function scheduledLabel(task: {
  readonly scheduled_day?: string;
  readonly scheduled_time?: string;
}): string | null {
  if (task.scheduled_day === undefined) {
    return null;
  }
  // A day with no hour is a legal and common state meaning "belongs to the day,
  // not placed in it" (ADR 0025).
  return task.scheduled_time === undefined
    ? `${task.scheduled_day} · not placed`
    : `${task.scheduled_day} at ${task.scheduled_time}`;
}

/**
 * A `[label] [value]` row at `control-md`. The label is `shrink-0` and has no
 * fixed width, because the doc fixes the row's **height** rather than its
 * columns and a fixed label column is a layout decision this screen has not been
 * given.
 */
function Field({ label, value }: { readonly label: string; readonly value: string | null }) {
  return (
    <div className="flex min-h-control-md items-center gap-space-4 border-b border-border-subtle">
      <dt className="shrink-0 text-type-subhead text-text-secondary">{label}</dt>
      <dd
        className={
          value === null ? 'text-type-body text-text-muted' : 'text-type-body text-text-primary'
        }
      >
        {value ?? 'Not set'}
      </dd>
    </div>
  );
}
