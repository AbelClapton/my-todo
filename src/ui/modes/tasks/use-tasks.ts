import { useCallback, useMemo } from 'react';

import { DEFAULT_DAY_BOUNDARY_HOUR, dayAt } from '@/domain/day';
import type { DateString } from '@/domain/ids';
import { BUILT_IN_AREA_IDS, SEEDED_AREAS } from '@/domain/layers/area';
import { computeTaskList, type TaskListRow, type TaskScope } from '@/projections/task-list';

import { useLog } from '@/ui/data/use-log';

/**
 * What the Tasks mode **reads**.
 *
 * A read is a projection over the log and nothing else: the mode never keeps its
 * own copy of a task and never mutates one
 * (`02-architecture/projections.md`). The writes are in `use-task-writes.ts`, so
 * a screen that only reads does not have to hold them.
 */

export type UseTasksResult = {
  readonly rows: readonly TaskListRow[];
  /** The Day the list is read on. */
  readonly today: DateString;
};

export function useTasks(scope: TaskScope): UseTasksResult {
  const { entries } = useLog();

  /**
   * The Day, at the boundary that frames Days (ADR 0027).
   *
   * Until the `day_view` projection exists this reads the clock once, at mount,
   * with the shipping default boundary. That is a stand-in rather than a rule:
   * the real Day comes from `day.opened`, and it is stable for a whole session
   * because a Day does not turn over under an open app.
   */
  const today = useMemo<DateString>(() => {
    const now = new Date();
    return dayAt(now.toISOString(), -now.getTimezoneOffset(), DEFAULT_DAY_BOUNDARY_HOUR);
  }, []);

  const rows = useMemo(() => computeTaskList(entries, { scope, today }), [entries, scope, today]);

  return { rows, today };
}

/**
 * The built-in Areas' names, so a task in Inbox reads correctly **before**
 * onboarding has written `area.created` for anything. The five built-ins are
 * identified by id and created on first launch
 * (`05-modules/areas-and-goals.md`).
 */
const BUILT_IN_AREA_NAMES: ReadonlyMap<string, string> = new Map<string, string>([
  [BUILT_IN_AREA_IDS.inbox, 'Inbox'],
  ...SEEDED_AREAS.map((area): [string, string] => [area.id, area.name]),
]);

export function useAreaNames(): (areaId: string) => string {
  const { entries } = useLog();

  const names = useMemo<ReadonlyMap<string, string>>(() => {
    const map = new Map(BUILT_IN_AREA_NAMES);
    for (const entry of entries) {
      if (entry.type === 'area.created' || entry.type === 'area.renamed') {
        map.set(entry.payload.area_id, entry.payload.name);
      }
    }
    return map;
  }, [entries]);

  return useCallback((areaId: string): string => names.get(areaId) ?? 'Inbox', [names]);
}
