/**
 * Optional means absent, not empty.
 *
 * `exactOptionalPropertyTypes` makes `{ due?: DateString }` reject a `due` key
 * set to `undefined`, which is the compiler enforcing
 * `10-engineering/code-conventions.md`'s rule: an absent key is one state, and
 * `undefined` must not become a second one.
 *
 * Payloads therefore express "clear this field" by **omitting the key**, and
 * every fold has to delete rather than assign. `withOptional` is that
 * operation, in one place, so no fold gets it subtly wrong.
 */
export function withOptional<T extends object>(
  /**
   * `T[K] | undefined`, not `T[K]?`: with `exactOptionalPropertyTypes` a patch
   * that names a key and passes `undefined` is not assignable to an optional
   * property, which is exactly the shape every fold wants to write.
   */
  target: T,
  patch: Partial<{ [K in keyof T]: T[K] | undefined }>,
): T {
  // TS cannot verify a rebuild through a string-keyed record, and it cannot be
  // asked to: the patch's keys are known only as `string` once enumerated.
  const next = { ...target } as Record<string, unknown>;
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) {
      delete next[key];
    } else {
      next[key] = value;
    }
  }
  return next as T;
}
