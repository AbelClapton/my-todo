import {
  BookOpen,
  Briefcase,
  Calendar,
  Check,
  Clock,
  HeartPulse,
  House,
  Paperclip,
  Timer,
  User,
} from 'lucide-react';
import type { ComponentType } from 'react';

import { Link } from '@tanstack/react-router';

import type { Task } from '@/domain/atoms/task';
import { BUILT_IN_AREA_IDS } from '@/domain/layers/area';
import type { TaskListRow } from '@/projections/task-list';
import { iconSize } from '@/ui/tokens';

/**
 * The task row, exactly as **ADR 0030** decides it:
 *
 * 1. **The title owns the first line and wraps.** It is the only phrase on the
 *    row, and it never truncates — every variant that competed for its width
 *    clipped 2–3 titles of five.
 * 2. **One context line beneath it.** The section on the left as a glyph and a
 *    word; every other fact on the right as **a glyph alone** — no chip, no
 *    word, no value.
 * 3. The row's own side padding is `space-4`, so its band starts on the screen
 *    inset (`space-5`, "always") and its content box is 332px at 390px.
 * 4. **A row token is a minimum**, not a height (ADR 0031): 66px of content
 *    draws at 72px, and a wrapped title draws at its measured 90px.
 *
 * The recorded cost, kept in the code rather than in a commit message: **the row
 * no longer says *when*.** `Calendar` means "this has a date", so due, overdue
 * and scheduled share one glyph. The values are one tap away in the detail, and
 * whether that is the point or an amputation is the question ADR 0030 could not
 * answer.
 */

/** Glyphs at `icon-xs` — inline with `type-footnote`, which is the line they sit in. */
const MARK_SIZE = iconSize['icon-xs'];

type Glyph = ComponentType<{
  readonly className?: string;
  readonly size?: number;
  readonly role?: string;
  readonly 'aria-label'?: string;
  readonly 'aria-hidden'?: boolean;
}>;

/**
 * Only the **four seeded Areas** draw a glyph, and they bind to **ids** rather
 * than names, which is what makes a rename safe (ADR 0022). Inbox and every
 * user-created Area are name-only — and Inbox is where capture puts everything,
 * so the glyphless case is the common one.
 */
const AREA_GLYPHS: ReadonlyMap<string, Glyph> = new Map<string, Glyph>([
  [BUILT_IN_AREA_IDS.health, HeartPulse],
  [BUILT_IN_AREA_IDS.work, Briefcase],
  [BUILT_IN_AREA_IDS.home, House],
  [BUILT_IN_AREA_IDS.learning, BookOpen],
]);

type Mark = { readonly key: string; readonly label: string; readonly Glyph: Glyph };

/**
 * The facts, each as the inventory's own glyph.
 *
 * The inventory carries **four time glyphs** — `calendar`, `clock`, `timer`,
 * `repeat` — and a Task has no cadence, so `repeat` never appears here; it is a
 * Habit's mark. `user` and `paperclip` are the person and note glyphs, and
 * `paperclip` now covers *the note relation* rather than only the count
 * (ADR 0029).
 *
 * Each mark carries `role="img"` and a label, because the row is where the facts
 * are *scannable* and a screen reader still has to be told what they are. The
 * values themselves are in the detail, and the label says which kind of fact it
 * is rather than its value — which is the honest description of what the row
 * can say.
 */
function marksFor(task: Task, noteCount: number): readonly Mark[] {
  const marks: Mark[] = [];

  if (task.due !== undefined || task.scheduled_day !== undefined) {
    marks.push({ key: 'date', label: 'has a date', Glyph: Calendar });
  }
  if (task.defer !== undefined) {
    marks.push({ key: 'defer', label: 'is deferred', Glyph: Clock });
  }
  if (task.estimated_minutes !== undefined) {
    marks.push({ key: 'estimate', label: 'has an estimate', Glyph: Timer });
  }
  if (task.people.length > 0) {
    marks.push({
      key: 'people',
      label: `linked to ${task.people.length} ${task.people.length === 1 ? 'person' : 'people'}`,
      Glyph: User,
    });
  }
  if (noteCount > 0) {
    marks.push({
      key: 'notes',
      label: `${noteCount} ${noteCount === 1 ? 'note' : 'notes'}`,
      Glyph: Paperclip,
    });
  }

  return marks;
}

type TaskRowProps = {
  readonly row: TaskListRow;
  readonly areaName: string;
  readonly onToggleDone: () => void;
};

export function TaskRow({ row, areaName, onToggleDone }: TaskRowProps) {
  const { task } = row;
  const isDone = task.state === 'completed';
  const AreaGlyph = AREA_GLYPHS.get(task.area_id);
  const marks = marksFor(task, row.note_count);

  return (
    <li className="flex min-h-row-rich items-start gap-space-3 px-space-4">
      {/*
        `touch-min` is a **hit area**, not a control height: the box is
        `control-xs` (24px) and the transparent padding around it fills the
        difference (`03-experience/design-tokens.md`).
      */}
      <button
        type="button"
        onClick={onToggleDone}
        aria-pressed={isDone}
        aria-label={isDone ? `Mark “${task.title}” as not done` : `Mark “${task.title}” as done`}
        className="flex min-h-touch-min min-w-touch-min shrink-0 items-center justify-center"
      >
        <span
          aria-hidden="true"
          className={
            isDone
              ? 'flex h-control-xs w-control-xs items-center justify-center rounded-sm border border-accent-default bg-accent-default text-on-fill'
              : 'flex h-control-xs w-control-xs items-center justify-center rounded-sm border border-border-strong bg-surface-1'
          }
        >
          {/* The tick is drawn only when done: an unconditional one paints a
              dark check inside every empty box (strokes are `currentColor`). */}
          {isDone ? <Check size={MARK_SIZE} /> : null}
        </span>
      </button>

      <Link
        to="/task/$taskId"
        params={{ taskId: task.id }}
        className="flex min-w-0 flex-1 flex-col items-start gap-space-2 py-space-2 text-left"
      >
        <span className="min-w-0 text-type-body text-text-primary">{task.title}</span>
        <span className="flex w-full items-center gap-space-3 text-type-footnote text-text-secondary">
          <span className="flex items-center gap-space-2">
            {AreaGlyph === undefined ? null : (
              <AreaGlyph className="text-text-muted" size={MARK_SIZE} aria-hidden />
            )}
            <span>{areaName}</span>
          </span>
          {/* `ml-auto` is a flex push rather than spacing, so the facts hold the
              trailing edge even on a row with no section to push against. */}
          <span className="ml-auto flex items-center gap-space-3 text-text-muted">
            {marks.map(({ key, label, Glyph }) => (
              <Glyph key={key} role="img" aria-label={label} size={MARK_SIZE} />
            ))}
          </span>
        </span>
      </Link>
    </li>
  );
}
