import { describe, expect, it } from 'vitest';

import { UlidSchema } from '../ids';
import { BUILT_IN_AREA_IDS, canArchiveArea } from '../layers/area';

import { EVENT_TYPES, PAYLOAD_SCHEMAS, parseLogEntry, parsePayload } from './index';

/**
 * Two things are asserted here that the doc set states as rules and nothing
 * else enforces: the type list and the schema map are the **same set**, and the
 * built-in Area ids are real ULIDs.
 */

describe('the event registry', () => {
  it('has one payload schema per type, and no extra key', () => {
    expect(Object.keys(PAYLOAD_SCHEMAS).sort()).toEqual([...EVENT_TYPES].sort());
  });

  it('names 82 types across exactly 11 domains', () => {
    expect(EVENT_TYPES).toHaveLength(82);

    const domains = new Set(EVENT_TYPES.map((type) => type.split('.')[0]));
    expect([...domains].sort()).toEqual([
      'ai',
      'area',
      'calendar',
      'day',
      'goal',
      'habit',
      'note',
      'person',
      'protocol',
      'system',
      'task',
    ]);
  });

  it('does not have `attention` as a domain — nudge telemetry is not the log', () => {
    expect(EVENT_TYPES.some((type) => type.startsWith('attention.'))).toBe(false);
  });

  it('rejects a payload that does not match its type', () => {
    expect(() => parsePayload('task.created', { task_id: 'not-a-ulid' })).toThrow();
  });

  it('accepts an estimate and rejects a non-positive one', () => {
    const base = {
      task_id: BUILT_IN_AREA_IDS.inbox,
      title: 'Call contractor',
      area_id: BUILT_IN_AREA_IDS.work,
      source: 'user',
    };

    expect(parsePayload('task.created', { ...base, estimated_minutes: 30 })).toMatchObject({
      estimated_minutes: 30,
    });
    expect(() => parsePayload('task.created', { ...base, estimated_minutes: 0 })).toThrow();
  });

  it('keeps `due` a Day and refuses an instant in it', () => {
    const base = {
      task_id: BUILT_IN_AREA_IDS.inbox,
      title: 'File taxes',
      area_id: BUILT_IN_AREA_IDS.work,
      source: 'user',
    };

    // The stale example in `code-conventions.md` used ISO instants here; a Day
    // is `YYYY-MM-DD` and an instant in the field is a bug the boundary catches.
    expect(() => parsePayload('task.created', { ...base, due: '2026-09-29T15:00:00Z' })).toThrow();
    expect(parsePayload('task.created', { ...base, due: '2026-09-29' })).toMatchObject({
      due: '2026-09-29',
    });
  });

  it('validates a whole entry read back from storage', () => {
    expect(() =>
      parseLogEntry({
        id: BUILT_IN_AREA_IDS.inbox,
        type: 'task.created',
        timestamp: '2026-09-28T09:00:00.000Z',
        actor: { type: 'user' },
        payload: {
          task_id: BUILT_IN_AREA_IDS.inbox,
          title: 'Buy desk',
          area_id: BUILT_IN_AREA_IDS.work,
          source: 'user',
        },
        schema_version: 1,
        device_id: BUILT_IN_AREA_IDS.inbox,
        seq: 1,
      }),
    ).not.toThrow();
  });
});

describe('the built-in Areas', () => {
  it('are five valid ULIDs', () => {
    const ids = Object.values(BUILT_IN_AREA_IDS);
    expect(ids).toHaveLength(5);
    for (const id of ids) {
      expect(UlidSchema.safeParse(id).success).toBe(true);
    }
  });

  it('are distinct', () => {
    expect(new Set(Object.values(BUILT_IN_AREA_IDS)).size).toBe(5);
  });

  it('cannot archive Inbox, and can archive the four seeds', () => {
    expect(canArchiveArea(BUILT_IN_AREA_IDS.inbox)).toBe(false);
    expect(canArchiveArea(BUILT_IN_AREA_IDS.health)).toBe(true);
  });
});
