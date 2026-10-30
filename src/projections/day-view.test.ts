import { describe, expect, it } from 'vitest';

import type { DateString } from '@/domain/ids';
import { INBOX_AREA_ID } from '@/domain/layers/area';
import { FIXTURES, logFromFixture } from '@/test-support/fixtures';
import { createTestLog, taskIdFor, type TestLog } from '@/test-support/log';

import { applyDayView, computeDayView, computeDayViewState, emptyDayView } from './day-view';

const TODAY: DateString = '2026-09-28';
const YESTERDAY: DateString = '2026-09-27';

/**
 * The log starts four days before the Day under test, so the habits are older
 * than the day they are due on — which is the case that proves an `interval`
 * cadence is anchored at creation rather than at the query.
 */
async function seed(): Promise<TestLog> {
  const log = createTestLog({ startAt: '2026-09-24T09:00:00.000Z' });
  const user = { type: 'user' } as const;

  const task = async (
    n: number,
    title: string,
    extra: { scheduled_day?: DateString; scheduled_time?: string } = {},
  ): Promise<string> => {
    const id = taskIdFor(n);
    await log.append({
      type: 'task.created',
      actor: user,
      payload: { task_id: id, title, area_id: INBOX_AREA_ID, source: 'user', ...extra },
    });
    return id;
  };

  const placed = await task(1, 'Standup notes', {
    scheduled_day: TODAY,
    scheduled_time: '09:30',
  });
  await task(2, 'Unplaced chore', { scheduled_day: TODAY });
  const done = await task(3, 'File Q4 taxes');
  const doneYesterday = await task(4, 'Book the table');

  await log.append({
    type: 'task.completed',
    actor: user,
    payload: { task_id: done, completed_at: '2026-09-28T18:00:00.000Z' },
  });
  await log.append({
    type: 'task.completed',
    actor: user,
    payload: { task_id: doneYesterday, completed_at: '2026-09-27T10:00:00.000Z' },
  });

  // A completion that a compensation undid: it must not count as today's.
  const retracted = await task(5, 'Retracted');
  const completed = await log.append({
    type: 'task.completed',
    actor: user,
    payload: { task_id: retracted, completed_at: '2026-09-28T12:00:00.000Z' },
  });
  await log.append({
    type: 'task.uncompleted',
    actor: user,
    compensation_for: completed.id,
    payload: { task_id: retracted },
  });

  await log.append({
    type: 'calendar.created',
    actor: user,
    payload: {
      event_id: taskIdFor(20),
      title: 'Retro',
      start: '2026-09-28T15:00:00.000Z',
      end: '2026-09-28T15:30:00.000Z',
      all_day: false,
      day: TODAY,
    },
  });
  await log.append({
    type: 'calendar.created',
    actor: user,
    payload: {
      event_id: taskIdFor(21),
      title: 'Offsite',
      start: '2026-09-28T00:00:00.000Z',
      all_day: true,
      day: TODAY,
    },
  });
  // Another day's event, which must not appear.
  await log.append({
    type: 'calendar.created',
    actor: user,
    payload: {
      event_id: taskIdFor(22),
      title: 'Tomorrow standup',
      start: '2026-09-29T09:00:00.000Z',
      all_day: false,
      day: '2026-09-29',
    },
  });

  await log.append({
    type: 'habit.created',
    actor: user,
    payload: {
      habit_id: taskIdFor(30),
      name: 'Meditate',
      cadence: { type: 'daily' },
      minimum_viable: '1 minute',
      area_id: INBOX_AREA_ID,
    },
  });
  await log.append({
    type: 'habit.created',
    actor: user,
    payload: {
      habit_id: taskIdFor(31),
      name: 'Walk',
      // Every four days, and the log's clock starts on the 24th — so the anchor
      // puts it on the 28th. Anchored at the query instead, it would not be due.
      cadence: { type: 'interval', every: 4, unit: 'day' },
      area_id: INBOX_AREA_ID,
    },
  });
  await log.append({
    type: 'habit.created',
    actor: user,
    payload: {
      habit_id: taskIdFor(32),
      name: 'Read',
      cadence: { type: 'weekly', days: ['tue'] },
      area_id: INBOX_AREA_ID,
    },
  });
  await log.append({
    type: 'habit.created',
    actor: user,
    payload: {
      habit_id: taskIdFor(33),
      name: 'Journal',
      cadence: { type: 'daily' },
      area_id: INBOX_AREA_ID,
    },
  });
  await log.append({
    type: 'habit.archived',
    actor: user,
    payload: { habit_id: taskIdFor(33) },
  });
  await log.append({
    type: 'habit.checked',
    actor: user,
    payload: { habit_id: taskIdFor(30), day: TODAY, version: 'minimum' },
  });

  await log.append({
    type: 'day.opened',
    actor: user,
    payload: { day: TODAY, tz_offset_minutes: 0, boundary_hour: 5 },
  });
  await log.append({
    type: 'day.planned',
    actor: user,
    payload: { day: TODAY, top_three: [placed, done], source: 'morning' },
  });
  await log.append({
    type: 'day.note_created',
    actor: user,
    payload: { note_id: taskIdFor(40), day: TODAY },
  });
  await log.append({ type: 'day.closed', actor: user, payload: { day: TODAY } });

  return log;
}

describe('day_view', () => {
  it('carries the events of this Day only, in start order', async () => {
    const log = await seed();
    const view = computeDayView(log.entries(), { date: TODAY });

    // The all-day event starts at local midnight, so it sorts first.
    expect(view.events.map((event) => event.title)).toEqual(['Offsite', 'Retro']);
  });

  it('separates the tasks placed on the day from the ones finished on it', async () => {
    const log = await seed();
    const view = computeDayView(log.entries(), { date: TODAY });

    expect(view.tasks_scheduled.map((task) => task.title)).toEqual([
      'Standup notes',
      'Unplaced chore',
    ]);
    // Newest first, and the compensated completion is not a completion at all.
    expect(view.tasks_completed.map((task) => task.title)).toEqual(['File Q4 taxes']);
  });

  it('takes the boundary from the Day that recorded one, and the default otherwise', async () => {
    const log = await seed();
    expect(computeDayView(log.entries(), { date: TODAY }).boundary_hour).toBe(5);
    expect(computeDayView(log.entries(), { date: YESTERDAY }).boundary_hour).toBe(4);
  });

  it('holds the plan, the note and the close for the Day they were written to', async () => {
    const log = await seed();
    const today = computeDayView(log.entries(), { date: TODAY });
    const yesterday = computeDayView(log.entries(), { date: YESTERDAY });

    expect(today.top_three.map((task) => task.title)).toEqual(['Standup notes', 'File Q4 taxes']);
    expect(today.daily_note_id).toBe(taskIdFor(40));
    expect(today.closed).toBe(true);

    expect(yesterday.top_three).toEqual([]);
    expect(yesterday.daily_note_id).toBeUndefined();
    expect(yesterday.closed).toBe(false);
  });

  it('schedules habits by cadence, anchored at creation, and skips the archived', async () => {
    const log = await seed();
    const view = computeDayView(log.entries(), { date: TODAY });

    // Meditate is daily; Walk is every four days from the 24th, which is today;
    // Read runs on Tuesdays; Journal is daily but archived.
    expect(view.habits_due.map((habit) => habit.name)).toEqual(['Meditate', 'Walk']);
    expect(view.habits_due[0]?.outcome).toBe('done_minimum');
    expect(view.habits_due[1]?.outcome).toBeNull();
  });

  it('reports nothing for a Day the log never touched', async () => {
    const log = await seed();
    const view = computeDayView(log.entries(), { date: '2026-12-25' });

    expect(view.events).toEqual([]);
    expect(view.tasks_scheduled).toEqual([]);
    expect(view.tasks_completed).toEqual([]);
    expect(view.top_three).toEqual([]);
    expect(view.daily_note_id).toBeUndefined();
    expect(view.closed).toBe(false);
    // A daily habit is due on a day nothing else happened; an interval habit's
    // due-ness is a function of its anchor, so it is not asserted here.
    expect(view.habits_due.some((habit) => habit.name === 'Meditate')).toBe(true);
    expect(view.habits_due.some((habit) => habit.name === 'Read')).toBe(false);
  });
});

describe('apply agrees with a fresh fold', () => {
  it('produces the same state incrementally as in one pass', async () => {
    const log = await seed();
    const entries = log.entries();

    const incremental = entries.reduce(applyDayView, emptyDayView());
    const once = computeDayViewState(entries);

    expect(incremental.tasks).toEqual(once.tasks);
    expect(incremental.events).toEqual(once.events);
    expect(incremental.habits).toEqual(once.habits);
    expect([...incremental.days.entries()]).toEqual([...once.days.entries()]);
  });

  it('ignores an entry from a domain it does not fold', async () => {
    const log = await seed();
    const before = computeDayViewState(log.entries());

    await log.append({
      type: 'area.renamed',
      actor: { type: 'user' },
      payload: { area_id: INBOX_AREA_ID, name: 'Inbox!' },
    });

    expect(computeDayViewState(log.entries()).tasks).toEqual(before.tasks);
  });
});

describe('every fixture satisfies the compute/apply invariant', () => {
  for (const [name, entries] of Object.entries(FIXTURES)) {
    it(`agrees for ${name}`, async () => {
      const log = await logFromFixture(entries);
      const written = log.entries();

      const once = computeDayViewState(written);
      const incremental = written.reduce(applyDayView, emptyDayView());

      expect(incremental.tasks).toEqual(once.tasks);
      expect(incremental.events).toEqual(once.events);
      expect(incremental.habits).toEqual(once.habits);
      expect([...incremental.days.entries()]).toEqual([...once.days.entries()]);
    });
  }
});
