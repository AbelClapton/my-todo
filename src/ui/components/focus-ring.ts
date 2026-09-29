/**
 * **Focus is visible on the element, never only on its label**
 * (`03-experience/design-tokens.md`).
 *
 * The ring is two-part and has **no offset**: `border-strong` at 2px on the
 * outside and `border-focus` at 1px on the inside. The token table defines the
 * inner part as a *border*, which is why every focusable element in this app
 * carries a 1px border — transparent when it has no other job.
 *
 * It appears on `:focus-visible`, so a mouse click draws no ring, and it appears
 * in `duration-instant`. Keyboard navigation is required on every interactive
 * surface, and this is how a keyboard user knows where they are.
 */
export const FOCUS_RING =
  'outline-none focus-visible:border-border-focus focus-visible:ring-2 focus-visible:ring-border-strong transition-colors duration-duration-instant';
