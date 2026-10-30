import { useEffect, useState } from 'react';

import type { Task } from '@/domain/atoms/task';
import type { DateString } from '@/domain/ids';

import { FOCUS_RING } from '@/ui/components/focus-ring';
import { Sheet } from '@/ui/components/sheet';

import { deferDateChoices } from './defer-options';

/**
 * The defer sheet, as `design/tasks-lab.html` recommends it.
 *
 * `05-modules/tasks.md` gives the four rows and the one thing they disagree
 * about: *"Three of the four rows write `defer`, and the fourth writes a
 * state."* The lab's recommendation is what this renders —
 *
 * - **the task is named**, because the row it acts on is behind the scrim and a
 *   sheet that hides its own object is asking to be trusted with an invisible
 *   noun;
 * - **every dated row shows the date it resolves to**, which is what turns
 *   "Next week" from a promise into a date (`defer-options.ts`);
 * - **`Someday` sits below a `Then` rule**, because it answers a different
 *   question, and it says *no date* rather than leaving the difference to be
 *   inferred.
 *
 * **`Pick a date…` reveals a native date input in Phase 0.** `tasks.md` says
 * the row opens a picker, and the picker's home is the Calendar overlay that
 * arrives with Phase 1 — so this is a stand-in, not a second implementation of
 * the same control: it is one `<input type="date">` in the sheet, and it is
 * replaced rather than kept when the overlay lands.
 */

export type DeferSheetProps = {
  /** The task the sheet is about, or `null` when it is closed. */
  readonly task: Task | null;
  readonly today: DateString;
  readonly onClose: () => void;
  readonly onDefer: (task: Task, day: DateString) => void;
  readonly onSomeday: (task: Task) => void;
};

export function DeferSheet({ task, today, onClose, onDefer, onSomeday }: DeferSheetProps) {
  const [picking, setPicking] = useState(false);

  // Each opening starts from the four rows: a sheet that reopened on the date
  // input would have remembered a choice the user abandoned.
  useEffect(() => {
    if (task === null) {
      setPicking(false);
    }
  }, [task]);

  return (
    <Sheet
      open={task !== null}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
      title={task?.title ?? 'Defer'}
      description="Becomes visible on this day. Not when it is on the calendar."
    >
      {task === null ? null : (
        <div className="flex flex-col px-space-3 pb-space-4 pt-space-3">
          {deferDateChoices(today).map((choice) => (
            <ChoiceRow
              key={choice.key}
              label={choice.label}
              hint={choice.resolved}
              onClick={() => onDefer(task, choice.day)}
            />
          ))}

          {picking ? (
            <div className="flex flex-col gap-space-2 px-space-2 py-space-2">
              <input
                type="date"
                aria-label="Pick a date"
                min={today}
                autoFocus
                onChange={(event) => {
                  const day = event.target.value;
                  if (day !== '') {
                    onDefer(task, day as DateString);
                  }
                }}
                className={`h-control-lg w-full rounded-md border border-border-default bg-bg-sunken px-space-4 text-type-body text-text-primary ${FOCUS_RING}`}
              />
            </div>
          ) : (
            <ChoiceRow label="Pick a date…" onClick={() => setPicking(true)} />
          )}

          <p className="mt-space-2 px-space-2 pb-space-1 text-type-footnote text-text-secondary">
            Then
          </p>

          <ChoiceRow label="Someday" hint="no date" onClick={() => onSomeday(task)} />
        </div>
      )}
    </Sheet>
  );
}

/**
 * One row of the sheet at `control-md`, with its resolved value on the trailing
 * edge in tabular figures so the two date rows line up.
 */
function ChoiceRow({
  label,
  hint,
  onClick,
}: {
  readonly label: string;
  readonly hint?: string;
  readonly onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-control-md w-full items-center justify-between gap-space-4 rounded-md px-space-2 text-left ${FOCUS_RING}`}
    >
      <span className="text-type-body text-text-primary">{label}</span>
      {hint === undefined ? null : (
        <span className="text-type-footnote tabular-nums text-text-secondary">{hint}</span>
      )}
    </button>
  );
}
