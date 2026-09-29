import type { LogEntry } from '@/domain/events';
import { createAppend, type Append } from '@/domain/log/append';
import { createInMemoryLogStore, type InMemoryLogStore } from '@/domain/log/store';

/**
 * A deterministic log for tests.
 *
 * The clock and the ids are injected rather than real, because a fixture that
 * called `Date.now()` would make an ordering assertion flaky — and because
 * projections are required to be pure, so a test that let them read a clock
 * would stop testing that.
 */

/** Crockford-safe and exactly 26 characters, which `UlidSchema` checks. */
export const TEST_DEVICE_ID = `01J0DEVC${'0'.repeat(18)}`;

export type TestLog = {
  readonly store: InMemoryLogStore;
  readonly append: Append;
  /** Everything written, in write order, typed as the entry union. */
  readonly entries: () => readonly LogEntry[];
};

export type TestLogOptions = {
  readonly deviceId?: string;
  /** Where the injected clock starts. Every append advances it by one second. */
  readonly startAt?: string;
};

export function createTestLog(options: TestLogOptions = {}): TestLog {
  const store = createInMemoryLogStore();
  const origin = Date.parse(options.startAt ?? '2026-09-28T09:00:00.000Z');
  let ticks = 0;
  let ids = 0;

  const append = createAppend({
    store,
    deviceId: options.deviceId ?? TEST_DEVICE_ID,
    now: () => new Date(origin + ticks++ * 1000),
    newId: () => `01J0ENTRY${'0'.repeat(9)}${String(ids++).padStart(8, '0')}`,
  });

  return {
    store,
    append,
    // The store keeps BaseEntry; every entry here was written through `append`,
    // so the payload is validated and the narrowing is sound.
    entries: () => store.snapshot() as readonly LogEntry[],
  };
}

/** A ULID-shaped task id for a fixture, without depending on a real clock. */
export function taskIdFor(n: number): string {
  return `01J0TASK0${'0'.repeat(9)}${String(n).padStart(8, '0')}`;
}
