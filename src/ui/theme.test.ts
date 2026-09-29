import { describe, expect, it } from 'vitest';

import { COLOR_TOKENS, tokenStyleSheet } from './theme';

/**
 * The stylesheet is generated from `tokens.ts`, so the thing worth testing is
 * that it is **total**: every colour token, in both modes. A token that reaches
 * the Tailwind theme but not the variables resolves to `var(--color-x)` with
 * nothing behind it — the same silent failure `design/README.md` records for a
 * lab whose `<html>` was missing a palette attribute, where every measurement
 * in the page read `1.0:1` and looked like a real result.
 */
describe('the token stylesheet', () => {
  const css = tokenStyleSheet();

  it('declares every colour token, in both modes', () => {
    for (const token of COLOR_TOKENS) {
      const declarations = css.split(`--color-${token}:`).length - 1;
      expect(declarations, `${token} should be declared twice`).toBe(2);
    }
  });

  it('reads the doc’s own values', () => {
    expect(css).toContain('--color-bg-base: #FFFDF9');
    expect(css).toContain('--color-bg-base: #09090B');
  });

  it('does not lighten the accent in dark mode', () => {
    // White on blue-500 is 3.68:1 and fails, so the accent is the same in both
    // modes rather than a brighter step in one.
    expect(css.split('--color-accent-default: #0F766E').length - 1).toBe(2);
  });
});
