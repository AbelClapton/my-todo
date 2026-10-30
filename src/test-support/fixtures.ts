import { z } from 'zod';

import { ActorSchema, EVENT_TYPES } from '@/domain/events';

import emptyFixture from '@/projections/__fixtures__/empty.json';
import lifecycleFixture from '@/projections/__fixtures__/task-lifecycle.json';

import { createTestLog, type TestLog } from './log';

/**
 * The projection fixtures (`10-engineering/testing.md` §Fixtures).
 *
 * A fixture is a list of **pending** entries in log order — the thing `append`
 * takes — rather than finished entries. That keeps the deterministic test clock
 * and id generator the only source of identity, so a fixture cannot carry a
 * timestamp that makes an ordering assertion flaky, and cannot carry a `seq` a
 * later step would contradict.
 *
 * **`compensation_for_step` is fixture-only syntax** and has no counterpart in
 * `PendingEntry`: an entry's id is assigned at append time, so a compensation
 * names its target **by position**. It is validated here rather than trusted,
 * which is what stops the JSON drifting into a shape the log would reject.
 *
 * `testing.md` lists five fixtures; `habit-compliance`, `protocol-full` and
 * `conflict-concurrent` arrive with the phases that make those atoms real. The
 * two here are the ones Phase 0 has a projection for.
 */

const FixtureEntrySchema = z.object({
  type: z.enum(EVENT_TYPES),
  payload: z.unknown(),
  actor: ActorSchema.optional(),
  compensation_for_step: z.number().int().nonnegative().optional(),
});

const FixtureSchema = z.array(FixtureEntrySchema);

export type FixtureEntry = z.infer<typeof FixtureEntrySchema>;

export const FIXTURES = {
  empty: FixtureSchema.parse(emptyFixture),
  'task-lifecycle': FixtureSchema.parse(lifecycleFixture),
} satisfies Readonly<Record<string, readonly FixtureEntry[]>>;

/** Appended in order, with a compensation resolved to the id of its step. */
export async function logFromFixture(entries: readonly FixtureEntry[]): Promise<TestLog> {
  const log = createTestLog();
  const ids: string[] = [];

  for (const entry of entries) {
    let compensationFor: string | undefined;
    if (entry.compensation_for_step !== undefined) {
      compensationFor = ids[entry.compensation_for_step];
      if (compensationFor === undefined) {
        throw new Error(
          `fixture compensates step ${entry.compensation_for_step}, which has not been appended`,
        );
      }
    }
    const appended = await log.append({
      type: entry.type,
      payload: entry.payload,
      actor: entry.actor ?? { type: 'user' },
      ...(compensationFor === undefined ? {} : { compensation_for: compensationFor }),
    });
    ids.push(appended.id);
  }

  return log;
}

/** The scope names every projection's agreement test iterates. */
export const SCOPES = ['today', 'next', 'someday', 'all'] as const;
