import { describe, expect, it } from 'vitest';

import { createTestLog } from '@/test-support/log';

import { DEFAULT_NUDGE_SETTINGS, readNudgeSettings } from './settings';

/**
 * The queue reads two keys from the log, and the point of reading them is that the
 * doc's defaults are a starting point rather than a constant.
 */

describe('the settings the queue reads', () => {
  it('falls back to the doc defaults when nothing has been changed', async () => {
    const log = createTestLog();
    expect(readNudgeSettings(log.entries())).toEqual(DEFAULT_NUDGE_SETTINGS);
    expect(DEFAULT_NUDGE_SETTINGS.quietHours).toEqual({ startHour: 22, endHour: 7 });
    expect(DEFAULT_NUDGE_SETTINGS.frequency).toBe('standard');
  });

  it('takes the last change to each key, and ignores the rest', async () => {
    const log = createTestLog();
    const user = { type: 'user' } as const;

    await log.append({
      type: 'system.settings_changed',
      actor: user,
      payload: { key: 'quiet_hours.start', value: 23 },
    });
    await log.append({
      type: 'system.settings_changed',
      actor: user,
      payload: { key: 'quiet_hours.end', value: 6 },
    });
    await log.append({
      type: 'system.settings_changed',
      actor: user,
      payload: { key: 'nudge.frequency', value: 'reduced' },
    });
    await log.append({
      type: 'system.settings_changed',
      actor: user,
      payload: { key: 'theme', value: 'dark' },
    });

    expect(readNudgeSettings(log.entries())).toEqual({
      quietHours: { startHour: 23, endHour: 6 },
      frequency: 'reduced',
    });
  });

  it('ignores a value of the wrong shape rather than trusting it', async () => {
    const log = createTestLog();
    const user = { type: 'user' } as const;

    await log.append({
      type: 'system.settings_changed',
      actor: user,
      payload: { key: 'quiet_hours.start', value: '23:30' },
    });
    await log.append({
      type: 'system.settings_changed',
      actor: user,
      payload: { key: 'nudge.frequency', value: 'sometimes' },
    });

    expect(readNudgeSettings(log.entries())).toEqual(DEFAULT_NUDGE_SETTINGS);
  });
});
