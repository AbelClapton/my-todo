import type { StorageReason, WorkerMethod, WorkerReply, WorkerRequest } from './sqlite-protocol';

/**
 * The main thread's side of the worker protocol: spawn, wait for `ready`, and
 * turn each query into one round trip.
 *
 * `ready` is raced against a **timeout**, and the timeout is not decoration. A
 * worker that loads but never answers — a bad URL under a bundler, a VFS that
 * blocks — leaves the log in `opening` for ever, which on screen is a disabled
 * capture field and no explanation. That is the failure I shipped once already;
 * a deadline turns it into a fallback instead.
 */

const READY_TIMEOUT_MS = 8000;

/**
 * A query deadline as well as a startup one.
 *
 * The startup deadline alone was not enough: a worker that opens and then dies —
 * or drops one reply — leaves that `append` pending for ever, and a promise that
 * never settles is a screen that never responds. The user's first capture simply
 * does not happen, with no error and a still-filled field.
 */
const CALL_TIMEOUT_MS = 10000;

export type WorkerClient = {
  readonly ready: Promise<{ readonly persistent: boolean; readonly reason: StorageReason }>;
  readonly call: (
    method: WorkerMethod,
    sql: string,
    params: readonly unknown[],
  ) => Promise<{ readonly rows: unknown[][] }>;
};

export function createWorkerClient(worker: Worker): WorkerClient {
  let nextId = 0;
  const pending = new Map<
    number,
    {
      readonly resolve: (result: { readonly rows: unknown[][] }) => void;
      readonly reject: (error: Error) => void;
    }
  >();

  let settleReady: (value: { readonly persistent: boolean; readonly reason: StorageReason }) => void =
    () => undefined;
  let failReady: (error: Error) => void = () => undefined;
  const ready = new Promise<{ readonly persistent: boolean; readonly reason: StorageReason }>(
    (resolve, reject) => {
      settleReady = resolve;
      failReady = reject;
    },
  );

  const timer = window.setTimeout(() => {
    failReady(new Error('The local log worker did not answer in time.'));
  }, READY_TIMEOUT_MS);

  worker.onerror = () => {
    window.clearTimeout(timer);
    failReady(new Error('The local log worker failed to load.'));
  };

  worker.onmessage = (event: MessageEvent<WorkerReply>) => {
    const reply = event.data;

    if (reply.kind === 'ready') {
      window.clearTimeout(timer);
      settleReady({ persistent: reply.persistent, reason: reply.reason });
      return;
    }

    if (reply.id === -1) {
      window.clearTimeout(timer);
      failReady(new Error(reply.kind === 'error' ? reply.message : 'The local log failed to open.'));
      return;
    }

    const entry = pending.get(reply.id);
    if (entry === undefined) {
      return;
    }
    pending.delete(reply.id);

    if (reply.kind === 'result') {
      entry.resolve({ rows: reply.rows });
    } else {
      entry.reject(new Error(reply.message));
    }
  };

  return {
    ready,
    call: (method, sql, params) =>
      new Promise((resolve, reject) => {
        const id = nextId++;
        const deadline = window.setTimeout(() => {
          pending.delete(id);
          reject(new Error(`The local log did not answer a ${method} in time.`));
        }, CALL_TIMEOUT_MS);

        pending.set(id, {
          resolve: (result) => {
            window.clearTimeout(deadline);
            resolve(result);
          },
          reject: (error) => {
            window.clearTimeout(deadline);
            reject(error);
          },
        });

        worker.postMessage({ id, method, sql, params } satisfies WorkerRequest);
      }),
  };
}
