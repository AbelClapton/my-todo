import { createContext } from 'react';

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
   * False when the browser gave no OPFS, so the log lives only until a reload.
   * Surfaced rather than swallowed: a log that empties on reload is not the
   * local-first promise, and the user is the only one who can tell the
   * difference from the outside.
   */
  readonly isPersistent: boolean;
  /**
   * The only path to state change. It throws when the log is not open, so a
   * caller cannot lose a write by ignoring a status.
   */
  readonly append: Append;
};

export const LogContext = createContext<LogContextValue | undefined>(undefined);
