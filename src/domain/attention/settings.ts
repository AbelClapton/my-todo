import type { LogEntry } from '@/domain/events';

import type { NudgeFrequency } from './catalog';
import type { QuietHours } from './queue';

/**
 * The two settings the queue reads, from the log.
 *
 * `system.settings_changed` is the only place a setting lives
 * (`02-architecture/event-log.md` §The `SettingsKey` union), so a surface that
 * hard-coded 22:00–07:00 would ignore the user the first time they changed it. The
 * defaults here are the doc's, used only until a `settings_changed` entry says
 * otherwise.
 */
export type NudgeSettings = {
  readonly quietHours: QuietHours;
  readonly frequency: NudgeFrequency;
};

export const DEFAULT_NUDGE_SETTINGS: NudgeSettings = {
  quietHours: { startHour: 22, endHour: 7 },
  frequency: 'standard',
};

function hourOf(value: unknown): number | undefined {
  return typeof value === 'number' && value >= 0 && value <= 23 ? value : undefined;
}

export function readNudgeSettings(entries: readonly LogEntry[]): NudgeSettings {
  let quietHours = DEFAULT_NUDGE_SETTINGS.quietHours;
  let frequency = DEFAULT_NUDGE_SETTINGS.frequency;

  for (const entry of entries) {
    if (entry.type !== 'system.settings_changed') {
      continue;
    }
    const { key, value } = entry.payload;

    if (key === 'quiet_hours.start') {
      const hour = hourOf(value);
      quietHours = hour === undefined ? quietHours : { ...quietHours, startHour: hour };
    } else if (key === 'quiet_hours.end') {
      const hour = hourOf(value);
      quietHours = hour === undefined ? quietHours : { ...quietHours, endHour: hour };
    } else if (key === 'nudge.frequency') {
      frequency =
        value === 'standard' || value === 'reduced' || value === 'minimal' ? value : frequency;
    }
  }

  return { quietHours, frequency };
}
