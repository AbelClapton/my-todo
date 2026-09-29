import { createContext } from 'react';

import type { StorageReason } from '@/db/sqlite-protocol';
import type { LogEntry } from '@/domain/events';
import type { Append } from '@/domain/log/append';

/**
 * The local log, shared through one context.
 *
 * `status` exists so a surface can tell "nothing here yet" apart from "nothing
 * can be stored here" — the two look identical in a list and only one of them
 * is a state the user should be told about.
 */
export type LogStatus = 'opening' | 'ready' | 'unavailable';

export type LogContextValue = {
  readonly status: LogStatus;
  /** Every entry, in the app's total order. */
  readonly entries: readonly LogEntry[];
  /**
   * `ok` when the log is durable, and otherwise **which** failure it was.
   *
   * A boolean was not enough: "this browser gave the app no storage" and "another
   * tab has it" are the same `persistent: false` and different sentences, and
   * only one of them sends the user somewhere useful. `ok` is also the state
   * while the log is still opening, which is why the UI can render this without
   * also having to ask whether the open has finished.
   */
  readonly storageReason: StorageReason;
  /**
   * The only path to state change. It throws when the log is not open, so a
   * caller cannot lose a write by ignoring a status.
   */
  readonly append: Append;
};

export const LogContext = createContext<LogContextValue | undefined>(undefined);
