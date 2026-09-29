import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { ordered, type LogEntry } from '@/domain/events';
import { createAppend, type Append, type PendingEntry } from '@/domain/log/append';

import type { StorageReason } from '@/db/sqlite-protocol';

import { readOrCreateDeviceId } from './device-id';
import { LogContext, type LogContextValue, type LogStatus } from './log-context';

type LogState = {
  readonly status: LogStatus;
  readonly entries: readonly LogEntry[];
  readonly storageReason: StorageReason;
};

/**
 * Opens the device's log and publishes it.
 *
 * The log is **local-first**: it opens in the browser and there is no server
 * copy to read from, so the first paint has no data and that is correct rather
 * than a loading state (`02-architecture/local-first.md`).
 */
export function LogProvider({ children }: { readonly children: ReactNode }) {
  const [state, setState] = useState<LogState>({
    status: 'opening',
    entries: [],
    // `ok` until the log has actually asked for storage, so nothing is claimed
    // during the WASM compile.
    storageReason: 'ok',
  });
  const appendRef = useRef<Append | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    let close: (() => void) | undefined;

    void (async () => {
      try {
        // Imported here rather than at module scope: SQLite/WASM and the
        // migration SQL are browser-only, and a static import would pull them
        // into the server render and into the first client chunk.
        const { openLocalLog } = await import('@/db/sqlite-wasm');
        const log = await openLocalLog();

        if (cancelled) {
          log.close();
          return;
        }
        close = log.close;

        const append = createAppend({
          store: log.store,
          deviceId: readOrCreateDeviceId(),
          now: () => new Date(),
        });

        // `readAll` validates each row through `parseLogEntry`, so what comes
        // back is an entry and not merely a row.
        const entries = await log.store.readAll();
        appendRef.current = append;
        setState({ status: 'ready', entries: ordered(entries), storageReason: log.reason });
      } catch {
        // No storage: the app still renders and every write is refused. Telling
        // the user is a repair banner, which is a later pass.
        setState({ status: 'unavailable', entries: [], storageReason: 'no_opfs' });
      }
    })();

    return () => {
      cancelled = true;
      close?.();
    };
  }, []);

  const append = useCallback(async (pending: PendingEntry): Promise<LogEntry> => {
    const open = appendRef.current;
    if (open === undefined) {
      throw new Error('The local log is not open, so this write was not made.');
    }

    const entry = await open(pending);
    setState((current) => ({ ...current, entries: ordered([...current.entries, entry]) }));
    return entry;
  }, []);

  const value = useMemo<LogContextValue>(
    () => ({
      status: state.status,
      entries: state.entries,
      storageReason: state.storageReason,
      append,
    }),
    [append, state.entries, state.storageReason, state.status],
  );

  return <LogContext.Provider value={value}>{children}</LogContext.Provider>;
}
