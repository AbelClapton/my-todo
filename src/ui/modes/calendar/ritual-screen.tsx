import { useNavigate } from '@tanstack/react-router';
import { Check } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

import type { Task } from '@/domain/atoms/task';
import { addDays, dayAt, DEFAULT_DAY_BOUNDARY_HOUR } from '@/domain/day';
import type { DateString } from '@/domain/ids';
import { computeDayView } from '@/projections/day-view';
import { computeTaskList } from '@/projections/task-list';

import { FOCUS_RING } from '@/ui/components/focus-ring';
import { TOAST_HOLDS, Toast } from '@/ui/components/toast';
import { haptic } from '@/ui/haptics';
import { useLog } from '@/ui/data/use-log';
import { formatDay } from '@/ui/format';

import { clearPendingUndo, setPendingUndo, usePendingUndo } from './ritual-undo';
import {
  morningBatch,
  shutdownBatch,
  tomorrowOf,
  undoBatch,
  type ScheduledBefore,
} from './rituals';

/**
 * The two rituals as **one surface**, because they are one surface: three
 * prompts and a commit (`06-flows/shutdown.md`, `06-flows/morning-plan.md`).
 * What differs is which Day each one plans and what it does on the way out —
 * the shutdown also closes the Day and writes the note; the morning plan only
 * schedules and commits.
 *
 * The copy and the order come from the flow docs, step by step. **The plan is a
 * decision, not a report** (§Invariants): the picker shows what to choose from,
 * never everything the user has.
 */

type RitualScreenProps = { readonly kind: 'morning' | 'shutdown' };

/** Three is what the picker encourages; one is a real plan; zero is a skip. */
const MAX_PICKS = 3;
/** "Yesterday's unfinished tasks (top 5)" (§The 60-second structure). */
const CARRYOVER_LIMIT = 5;

export function RitualScreen({ kind }: RitualScreenProps) {
  const navigate = useNavigate();
  const { entries, append, status } = useLog();

  const today = useMemo<DateString>(() => {
    const now = new Date();
    return dayAt(now.toISOString(), -now.getTimezoneOffset(), DEFAULT_DAY_BOUNDARY_HOUR);
  }, []);
  const tzOffsetMinutes = useMemo(() => -new Date().getTimezoneOffset(), []);

  const target = kind === 'morning' ? today : tomorrowOf(today);
  const carryDay = kind === 'morning' ? addDays(today, -1) : today;

  const targetView = useMemo(
    () => computeDayView(entries, { date: target, tz_offset_minutes: tzOffsetMinutes }),
    [entries, target, tzOffsetMinutes],
  );
  const carryView = useMemo(
    () => computeDayView(entries, { date: carryDay, tz_offset_minutes: tzOffsetMinutes }),
    [entries, carryDay, tzOffsetMinutes],
  );

  // The projection's own order, not a second sort: `computeTaskList` is where
  // what a list is ordered by is decided (`02-architecture/projections.md`).
  const rows = useMemo(() => computeTaskList(entries, { scope: 'all', today }), [entries, today]);

  const [kept, setKept] = useState<readonly string[]>([]);
  const [wentWell, setWentWell] = useState('');
  const [query, setQuery] = useState('');

  const carryover = useMemo(
    () =>
      rows
        .filter((row) => row.task.scheduled_day === carryDay && row.task.state === 'open')
        .slice(0, CARRYOVER_LIMIT)
        .map((row) => row.task),
    [rows, carryDay],
  );

  const candidates = useMemo(() => {
    const byId = new Map<string, Task>();
    for (const task of carryover) {
      byId.set(task.id, task);
    }
    for (const row of rows) {
      const task = row.task;
      const wanted =
        task.priority === 'now' || task.due === target || task.scheduled_day === target;
      if (wanted && !byId.has(task.id)) {
        byId.set(task.id, task);
      }
    }

    // The fourth source the flow names — *"anything the user searches for"*. It
    // is not a convenience: without it the picker can only offer tasks the Day
    // already knows about, and the first plan anyone makes has nothing in it.
    const needle = query.trim().toLowerCase();
    if (needle !== '') {
      for (const row of rows) {
        const task = row.task;
        if (task.state === 'open' && task.title.toLowerCase().includes(needle)) {
          byId.set(task.id, task);
        }
      }
    }

    return [...byId.values()];
  }, [rows, carryover, target, query]);

  const [picked, setPicked] = useState<readonly string[]>(() =>
    // A shutdown is a draft, not a plan: the morning picker opens with its three
    // pre-selected (`06-flows/morning-plan.md` §The trigger).
    kind === 'morning' ? targetView.top_three.slice(0, MAX_PICKS).map((task) => task.id) : [],
  );
  const [committed, setCommitted] = useState(false);

  const noteBodies = useMemo<ReadonlyMap<string, string>>(() => {
    const map = new Map<string, string>();
    for (const entry of entries) {
      if (entry.type === 'note.created' || entry.type === 'note.edited') {
        map.set(entry.payload.note_id, entry.payload.body);
      }
    }
    return map;
  }, [entries]);

  const canWrite = status === 'ready';
  const undo = usePendingUndo();

  const toggle = useCallback(
    (list: readonly string[], id: string, limit?: number): readonly string[] => {
      if (list.includes(id)) {
        return list.filter((item) => item !== id);
      }
      if (limit !== undefined && list.length >= limit) {
        return list;
      }
      return [...list, id];
    },
    [],
  );

  const skip = useCallback(async () => {
    if (!canWrite) {
      return;
    }
    await append({
      type: 'day.plan_skipped',
      actor: { type: 'user' },
      payload: { day: today, kind },
    });
    await navigate({ to: '/' });
  }, [append, canWrite, kind, navigate, today]);

  const commit = useCallback(async () => {
    if (!canWrite || picked.length === 0) {
      return;
    }
    setCommitted(true);

    const tasks: readonly ScheduledBefore[] = kept.map((taskId) => {
      const task = rows.find((row) => row.task.id === taskId)?.task;
      return {
        task_id: taskId,
        ...(task?.scheduled_day === undefined ? {} : { day: task.scheduled_day }),
        ...(task?.scheduled_time === undefined ? {} : { time: task.scheduled_time }),
      };
    });

    // The note's body is not on the Day projection — it carries the id only — so
    // the pre-edit body comes from the note fold's own entries.
    const noteId = carryView.daily_note_id;
    const previousNoteBody = noteId === undefined ? undefined : (noteBodies.get(noteId) ?? '');

    const batch =
      kind === 'shutdown'
        ? shutdownBatch({
            today,
            kept,
            top_three: picked,
            wentWell,
            ...(noteId === undefined
              ? {}
              : { dailyNote: { note_id: noteId, body: previousNoteBody ?? '' } }),
          })
        : morningBatch({ today, kept, top_three: picked });

    const appended = [];
    for (const entry of batch) {
      appended.push(await append(entry));
    }

    haptic('completion');
    setPendingUndo({
      message: kind === 'shutdown' ? 'Day closed. Undo?' : 'Planned. Undo?',
      appended,
      before: {
        ...(previousNoteBody === undefined ? {} : { previousNoteBody }),
        tasks,
      },
      compensate: async (compensations) => {
        for (const entry of compensations) {
          await append(entry);
        }
      },
    });

    await navigate({ to: '/', search: { view: 'day', date: target } });
  }, [
    append,
    canWrite,
    carryView.daily_note_id,
    kind,
    kept,
    navigate,
    noteBodies,
    picked,
    rows,
    target,
    today,
    wentWell,
  ]);

  const closing = kind === 'shutdown';
  const title = closing ? 'Close day' : 'Plan today';
  const targetLabel = closing ? 'Tomorrow' : 'Today';

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-space-7 px-space-5 py-space-8">
      <header className="flex items-center justify-between gap-space-3">
        <div className="flex flex-col">
          <h1 className="text-type-title-1 text-text-primary">{title}</h1>
          <p className="text-type-footnote text-text-secondary">{formatDay(today)}</p>
        </div>
        <button
          type="button"
          onClick={() => void skip()}
          disabled={!canWrite}
          className={`rounded-md px-space-4 py-space-2 text-type-subhead text-text-secondary ${FOCUS_RING}`}
        >
          Skip
        </button>
      </header>

      {closing ? (
        <section aria-label="What went well" className="flex flex-col gap-space-2">
          <h2 className="text-type-title-3 text-text-primary">What went well?</h2>
          <input
            type="text"
            value={wentWell}
            onChange={(event) => setWentWell(event.target.value)}
            placeholder="One line for the Daily Note"
            className={`min-h-control-md rounded-md border border-border-default bg-surface-1 px-space-4 text-type-body text-text-primary ${FOCUS_RING}`}
          />
        </section>
      ) : null}

      <section aria-label="What carried over" className="flex flex-col gap-space-2">
        <h2 className="text-type-title-3 text-text-primary">
          {closing ? "What's unfinished" : 'What carried over'}
        </h2>
        {carryover.length === 0 ? (
          <p className="text-type-body text-text-secondary">Nothing carried over.</p>
        ) : (
          carryover.map((task) => (
            <PickRow
              key={task.id}
              task={task}
              checked={kept.includes(task.id)}
              onToggle={() => setKept((current) => toggle(current, task.id))}
              hint={closing ? 'Keep for tomorrow' : 'Keep for today'}
            />
          ))
        )}
      </section>

      <section aria-label="What's ahead" className="flex flex-col gap-space-2">
        <h2 className="text-type-title-3 text-text-primary">{targetLabel}</h2>
        {targetView.events.length === 0 ? (
          <p className="text-type-body text-text-secondary">Nothing on the calendar.</p>
        ) : (
          <>
            <p className="text-type-body text-text-primary">
              First up: <span className="text-text-secondary">{targetView.events[0]?.title}</span>
            </p>
            <ul className="flex flex-col gap-space-1">
              {targetView.events.map((event) => (
                <li key={event.id} className="text-type-footnote text-text-secondary">
                  {event.title}
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section aria-label="Pick three" className="flex flex-col gap-space-2">
        <h2 className="text-type-title-3 text-text-primary">
          Pick three
          <span className="text-type-footnote text-text-secondary">
            {' '}
            · {picked.length} of {MAX_PICKS}
          </span>
        </h2>
        {candidates.length === 0 ? (
          <p className="text-type-body text-text-secondary">Nothing to choose from.</p>
        ) : (
          candidates.map((task) => (
            <PickRow
              key={task.id}
              task={task}
              checked={picked.includes(task.id)}
              onToggle={() => setPicked((current) => toggle(current, task.id, MAX_PICKS))}
            />
          ))
        )}
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Search tasks"
          placeholder="Search tasks"
          className={`mt-space-2 min-h-control-md rounded-md border border-border-default bg-surface-1 px-space-4 text-type-body text-text-primary ${FOCUS_RING}`}
        />
      </section>

      <button
        type="button"
        onClick={() => void commit()}
        disabled={!canWrite || picked.length === 0 || committed}
        className={`min-h-control-lg rounded-lg bg-accent-default px-space-5 text-type-subhead text-on-fill disabled:opacity-40 ${FOCUS_RING}`}
      >
        {closing ? 'Close day' : 'Done'}
      </button>

      {undo === null ? null : (
        <Toast
          message={undo.message}
          holdMs={TOAST_HOLDS.undo}
          onDismiss={clearPendingUndo}
          actionLabel="Undo"
          onAction={() => {
            void (async () => {
              await undo.compensate(undoBatch(undo.appended, undo.before));
              clearPendingUndo();
            })();
          }}
        />
      )}
    </main>
  );
}

/** A row with one checkbox: keep, or pick. No swipe — the gesture vocabulary's
 * non-gesture fallback is the checkbox itself (`03-experience/gesture-vocabulary.md`). */
function PickRow({
  task,
  checked,
  onToggle,
  hint,
}: {
  readonly task: Task;
  readonly checked: boolean;
  readonly onToggle: () => void;
  readonly hint?: string;
}) {
  return (
    <div className="flex min-h-row-default items-center gap-space-3">
      <button
        type="button"
        aria-pressed={checked}
        aria-label={checked ? `Remove ${task.title}` : `Keep ${task.title}`}
        onClick={onToggle}
        className="flex min-h-touch-min min-w-touch-min shrink-0 items-center justify-center"
      >
        <span
          aria-hidden
          className={
            checked
              ? 'flex h-control-xs w-control-xs items-center justify-center rounded-sm border border-accent-default bg-accent-default text-on-fill'
              : 'flex h-control-xs w-control-xs items-center justify-center rounded-sm border border-border-strong bg-surface-1'
          }
        >
          {checked ? <Check size={14} /> : null}
        </span>
      </button>
      <span className="min-w-0 flex-1 text-type-body text-text-primary">{task.title}</span>
      {hint === undefined ? null : (
        <span className="text-type-footnote text-text-secondary">{hint}</span>
      )}
    </div>
  );
}
