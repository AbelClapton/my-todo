import type { Config } from 'tailwindcss';

import {
  colorVarReferences,
  controlHeight,
  duration,
  easing,
  elevation,
  fontFamily,
  fontSize,
  iconSize,
  radius,
  rowHeight,
  spacing,
  timelineCrop,
  touchTarget,
} from './src/ui/tokens';

/**
 * Tailwind exposes **only tokens** (`03-experience/design-tokens.md`).
 *
 * Two rules this file enforces structurally:
 *
 * 1. **No raw values.** Every entry below comes from `src/ui/tokens.ts`, so a
 *    value cannot enter the theme without entering the doc's token set first.
 * 2. **No arbitrary values.** `eslint-plugin-tailwindcss`'s `no-arbitrary-value`
 *    fails the build on `p-[17px]`, `text-[15.5px]`, `bg-[#f3f3f3]`.
 *
 * **Tailwind 3 is pinned deliberately.** This file is a `tailwind.config.ts`
 * with `theme.extend` and `corePlugins`, which is v3's shape; v4 is CSS-first
 * (`@theme`) and moves the token definitions into a stylesheet. The doc
 * specifies this shape, so the doc picks the major — do not upgrade it without
 * changing `03-experience/design-tokens.md` first.
 *
 * Colours resolve to CSS custom properties so light and dark are the same token
 * set with two value sets, which is what the doc requires — not two token sets.
 */

const px = (value: number): string => `${value}px`;

const spacingScale = Object.fromEntries(
  Object.entries(spacing).map(([name, value]) => [name, px(value)]),
);

type TypeToken = {
  readonly lineHeight: string;
  readonly letterSpacing: string;
  readonly fontWeight: string;
};

const typeScale = Object.fromEntries(
  Object.entries(fontSize).map(([name, token]): [string, [string, TypeToken]] => [
    name,
    [
      px(token.size),
      {
        lineHeight: px(token.lineHeight),
        letterSpacing: token.tracking,
        fontWeight: String(token.weight),
      },
    ],
  ]),
);

/**
 * Radius keys drop the `radius-` prefix, so the class is `rounded-md` — which is
 * how `03-experience/design-tokens.md`'s own example writes it. That is the one
 * place the doc's example does not keep the full token name: it writes
 * `px-space-5` and `text-text-inverse` (prefix kept) but `rounded-md` (prefix
 * dropped). Radius follows the example, and every other scale keeps the prefix,
 * so a class always contains its token name verbatim.
 */
const radiusScale = Object.fromEntries(
  Object.entries(radius).map(([name, value]) => [
    name.replace(/^radius-/, ''),
    value === 9999 ? '9999px' : px(value),
  ]),
);

/**
 * Heights and widths, keyed by token **name**, so `h-control-md`,
 * `min-h-row-rich`, `w-icon-xs` and `min-h-touch-min` all resolve. Five token
 * scales feed this — spacing, control heights, row heights, icon sizes and touch
 * targets — and none of them is a raw number.
 */
const sizeScale = Object.fromEntries(
  Object.entries({
    ...spacing,
    ...controlHeight,
    ...rowHeight,
    ...timelineCrop,
    ...iconSize,
    ...touchTarget,
  }).map(([name, value]) => [name, px(value)]),
);

export default {
  content: ['./src/**/*.{ts,tsx,html}'],
  // `.dark` is also the selector `src/ui/theme.ts` writes the dark variables
  // behind, so a `dark:` variant and a token switch together.
  darkMode: 'class',
  theme: {
    // Closed sets: nothing outside these keys is a valid class.
    spacing: spacingScale,
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      ...colorVarReferences(),
    },
    borderRadius: radiusScale,
    boxShadow: elevation,
    fontFamily: {
      sans: [...fontFamily.sans],
      mono: [...fontFamily.mono],
    },
    fontSize: typeScale,
    transitionDuration: duration,
    transitionTimingFunction: easing,
    extend: {
      // Heights are width/height utilities whose values are the token scales.
      height: sizeScale,
      minHeight: sizeScale,
      width: sizeScale,
      minWidth: sizeScale,
    },
  },
  corePlugins: {
    // Nothing here allows a raw value; arbitrary values are a lint failure.
    preflight: true,
  },
  plugins: [],
} satisfies Config;
