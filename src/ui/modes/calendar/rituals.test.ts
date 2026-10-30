import { describe, expect, it } from 'vitest';

import type { LogEntry } from '@/domain/events';
import type { PendingEntry } from '@/domain/log/append';
import type { DateString } from '@/domain/ids';
import { computeDayView, type DayView } from '@/projections/day-view';

import {
  morningBatch,
  morningPlanDue,
  shutdownBatch,
  shutdownDue,
  tomorrowOf,
  undoBatch,
  withWentWell,
} from './rituals';

const TODAY: DateString = '2026-09-28';
const TOMORROW: DateString = '2026-09-29';
const NOTE = '01J8Z0N0T0E0000000000000AA';
const A = '01J8Z0T0A0000000000000000A1';
const B = '01J8Z0T0B0000000000000000B1';

/** A Day view with nothing on it, which is what a trigger is asked about. */
function view(patch: Partial<DayView> = {}): DayView {
  return { ...computeDayView([], { date: TODAY }), ...patch };
}

/** Appends give each entry an id; the undo reads them back. */
function appended(entries: readonly PendingEntry[]): LogEntry[] {
  return entries.map(
    (entry, index) =>
      ({
        ...entry,
        id: `01J8Z0E0${String(index).padStart(4, '0')}0000000000000`,
        timestamp: '2026-09-28T21:00:00.000Z',
        schema_version: 1,
        device_id: '01J8Z0D0000000000000000000D',
        seq: index,
      }) as LogEntry,
  );
}

describe('the morning plan trigger', () => {
  it('fires in the four hours quiet hours leave it', () => {
    const opened = view({ opened: true });
    expect(morningPlanDue(opened, 6, true)).toBe(false);
    expect(morningPlanDue(opened, 7, true)).toBe(true);
    expect(morningPlanDue(opened, 10, true)).toBe(true);
    expect(morningPlanDue(opened, 11, true)).toBe(false);
  });

  it('does not fire for a Day rollover has not opened, or before onboarding ends', () => {
    expect(morningPlanDue(view({ opened: false }), 8, true)).toBe(false);
    expect(morningPlanDue(view({ opened: true }), 8, false)).toBe(false);
  });

  it('treats a shutdown draft as a reason to fire, not as a plan', () => {
    expect(morningPlanDue(view({ opened: true, planned_source: 'shutdown' }), 8, true)).toBe(true);
    expect(morningPlanDue(view({ opened: true, planned_source: 'morning' }), 8, true)).toBe(false);
  });

  it('does not fire again after its own skip — but a shutdown skip says nothing', () => {
    expect(morningPlanDue(view({ opened: true, skipped: ['shutdown'] }), 8, true)).toBe(true);
    expect(morningPlanDue(view({ opened: true, skipped: ['morning'] }), 8, true)).toBe(false);
  });
});

describe('the shutdown trigger', () => {
  it('waits for the evening and stops at a closed Day', () => {
    expect(shutdownDue(view({ opened: true }), 20)).toBe(false);
    expect(shutdownDue(view({ opened: true }), 21)).toBe(true);
    expect(shutdownDue(view({ opened: true, closed: true }), 22)).toBe(false);
  });

  it('is ended by its own skip only', () => {
    expect(shutdownDue(view({ opened: true, skipped: ['morning'] }), 22)).toBe(true);
    expect(shutdownDue(view({ opened: true, skipped: ['shutdown'] }), 22)).toBe(false);
  });
});

describe('the what-went-well line', () => {
  it('is prepended above what the user wrote during the day', () => {
    expect(withWentWell('Felt sharp.', 'shipped the Q4 draft')).toBe(
      '> What went well: shipped the Q4 draft\n\nFelt sharp.',
    );
  });

  it('writes nothing for an empty answer, and no blank line for an empty body', () => {
    expect(withWentWell('Felt sharp.', '   ')).toBe('Felt sharp.');
    expect(withWentWell('', 'shipped it')).toBe('> What went well: shipped it\n');
  });
});

describe('the shutdown batch', () => {
  it('plans for tomorrow, closes today, edits the note, then keeps tasks', () => {
    const entries = shutdownBatch({
      today: TODAY,
      kept: [A],
      top_three: [A, B],
      wentWell: 'shipped it',
      dailyNote: { note_id: NOTE, body: 'Felt sharp.' },
    });

    expect(entries.map((entry) => entry.type)).toEqual([
      'day.planned',
      'day.closed',
      'note.edited',
      'task.scheduled_to_day',
    ]);
    expect(entries[0]?.payload).toEqual({
      day: TOMORROW,
      top_three: [A, B],
      source: 'shutdown',
    });
    expect(entries[1]?.payload).toEqual({ day: TODAY });
    expect(entries[2]?.payload).toEqual({
      note_id: NOTE,
      body: '> What went well: shipped it\n\nFelt sharp.',
    });
    expect(entries[3]?.payload).toEqual({ task_id: A, day: TOMORROW });
  });

  it('leaves the note alone when there is nothing to say or no note', () => {
    const noText = shutdownBatch({
      today: TODAY,
      kept: [],
      top_three: [A],
      wentWell: '  ',
      dailyNote: { note_id: NOTE, body: 'Felt sharp.' },
    });
    expect(noText.some((entry) => entry.type === 'note.edited')).toBe(false);

    const noNote = shutdownBatch({
      today: TODAY,
      kept: [],
      top_three: [A],
      wentWell: 'shipped it',
    });
    expect(noNote.some((entry) => entry.type === 'note.edited')).toBe(false);
  });

  it('plans tomorrow, which is the day after the one being closed', () => {
    expect(tomorrowOf('2026-12-31')).toBe('2027-01-01');
  });
});

describe('the morning plan batch', () => {
  it('keeps first and commits second', () => {
    const entries = morningBatch({ today: TODAY, kept: [A, B], top_three: [A] });

    expect(entries.map((entry) => entry.type)).toEqual([
      'task.scheduled_to_day',
      'task.scheduled_to_day',
      'day.planned',
    ]);
    expect(entries[2]?.payload).toEqual({ day: TODAY, top_three: [A], source: 'morning' });
  });
});

describe('the undo batch', () => {
  it('reverses a shutdown in reverse order, each entry compensating its target', () => {
    const entries = appended(
      shutdownBatch({
        today: TODAY,
        kept: [A],
        top_three: [A],
        wentWell: 'shipped it',
        dailyNote: { note_id: NOTE, body: 'Felt sharp.' },
      }),
    );

    const undo = undoBatch(entries, { previousNoteBody: 'Felt sharp.', tasks: [] });

    expect(undo.map((entry) => entry.type)).toEqual([
      'task.unscheduled_from_day',
      'note.edited',
      'day.reopened',
      'day.unplanned',
    ]);
    expect(undo.every((entry) => entry.compensation_for !== undefined)).toBe(true);
    // The note goes back to the body it had, not to empty.
    expect(undo[1]?.payload).toEqual({ note_id: NOTE, body: 'Felt sharp.' });
  });

  it('restates a task that had a day, and unschedules the one that did not', () => {
    const entries = appended(morningBatch({ today: TODAY, kept: [A, B], top_three: [A] }));

    const undo = undoBatch(entries, {
      tasks: [{ task_id: A, day: '2026-09-27', time: '09:30' }],
    });

    expect(undo.map((entry) => entry.payload)).toEqual([
      { day: TODAY },
      { task_id: B, day: TODAY },
      { task_id: A, day: '2026-09-27', time: '09:30' },
    ]);
    expect(undo.map((entry) => entry.type)).toEqual([
      'day.unplanned',
      'task.unscheduled_from_day',
      'task.scheduled_to_day',
    ]);
  });

  it('ignores entries neither ritual writes', () => {
    const [entry] = appended([
      {
        type: 'day.plan_skipped',
        actor: { type: 'user' },
        payload: { day: TODAY, kind: 'morning' },
      },
    ]);
    if (entry === undefined) {
      throw new Error('the helper must produce an entry');
    }
    expect(undoBatch([entry], { tasks: [] })).toEqual([]);
  });
});
