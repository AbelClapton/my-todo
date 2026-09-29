/**
 * The token source of truth (`03-experience/design-tokens.md`).
 *
 * The doc wins any disagreement with this file, and with `design/tokens.css`.
 * The token set is **closed**: adding one requires an ADR, and removing one
 * requires migrating every reference.
 *
 * Two values are carried here **as the doc states them**, with known defects the
 * doc records and this pass does not fix:
 *
 * - `text-muted` is 2.56:1, which is why the doc no longer claims every pairing
 *   meets AA — the claim was wrong, not the value. The floors are 4.5:1 for
 *   meaningful text and 3:1 for placeholder and disabled text.
 * - `warning-subtle` measures 1.02–1.04:1 against `bg-base`, so the amber chip
 *   has no visible ground on the page, against a stated 1.15:1 floor for a
 *   `*-subtle` background.
 *
 * Dark mode is **not** a gap: every table below carries both columns, and the
 * accent deliberately does not lighten.
 */

export const spacing = {
  'space-0': 0,
  'space-1': 2,
  'space-2': 4,
  'space-3': 8,
  'space-4': 12,
  'space-5': 16,
  'space-6': 20,
  'space-7': 24,
  'space-8': 32,
  'space-9': 48,
  'space-10': 64,
} as const;

/** Screen edge inset is always `space-5`. Section gap is always `space-7`. */
export const SCREEN_EDGE_INSET = 'space-5';
export const SECTION_GAP = 'space-7';

export const fontSize = {
  'type-display': { size: 32, lineHeight: 40, weight: 600, tracking: '-0.02em' },
  'type-title-1': { size: 24, lineHeight: 32, weight: 600, tracking: '-0.01em' },
  'type-title-2': { size: 20, lineHeight: 28, weight: 600, tracking: '0' },
  'type-title-3': { size: 17, lineHeight: 24, weight: 600, tracking: '0' },
  'type-body': { size: 16, lineHeight: 24, weight: 400, tracking: '0' },
  'type-body-emphasis': { size: 16, lineHeight: 24, weight: 500, tracking: '0' },
  'type-callout': { size: 15, lineHeight: 20, weight: 400, tracking: '0' },
  'type-subhead': { size: 14, lineHeight: 20, weight: 500, tracking: '0.01em' },
  'type-footnote': { size: 13, lineHeight: 18, weight: 400, tracking: '0.01em' },
  'type-caption': { size: 12, lineHeight: 16, weight: 400, tracking: '0.02em' },
  'type-mono': { size: 14, lineHeight: 20, weight: 400, tracking: '0' },
} as const;

/** Long-form text (notes, reports) caps at 68 characters. */
export const PARAGRAPH_MEASURE_CH = 68;

export const fontFamily = {
  sans: [
    '-apple-system',
    'BlinkMacSystemFont',
    'Segoe UI',
    'Roboto',
    'Helvetica Neue',
    'Arial',
    'sans-serif',
  ],
  mono: ['ui-monospace', 'SFMono-Regular', 'SF Mono', 'Menlo', 'monospace'],
} as const;

/**
 * Light is paper (warm neutral); dark is ink (cool neutral). They are not a
 * matched pair and are not expected to be.
 */
export const colors = {
  light: {
    'bg-base': '#FFFDF9',
    'bg-raised': '#FAF7F1',
    'bg-sunken': '#F4F1EA',
    'bg-overlay': 'rgba(0,0,0,0.4)',

    'surface-1': '#FFFDF9',
    'surface-2': '#F4F1EA',
    'surface-3': '#E8E3D9',

    'border-subtle': '#F4F1EA',
    'border-default': '#E8E3D9',
    'border-strong': '#D8D1C4',
    'border-focus': '#1F1B16',

    'text-primary': '#1F1B16',
    'text-secondary': '#57514A',
    'text-muted': '#948C81',
    'text-inverse': '#FDFBF7',
    'text-disabled': '#D8D1C4',
    'on-fill': '#FFFFFF',

    'accent-default': '#0F766E',
    'accent-hover': '#115E59',
    'accent-active': '#134E4A',
    'accent-subtle': '#99F6E4',
    'accent-text': '#115E59',

    'danger-default': '#DC2626',
    'danger-subtle': '#FECACA',
    'danger-text': '#991B1B',
    'success-default': '#16A34A',
    'success-subtle': '#BBF7D0',
    'success-text': '#166534',
    'warning-default': '#D97706',
    'warning-subtle': '#FDE68A',
    'warning-text': '#92400E',

    'stale-bg': '#F4F1EA',
    'stale-text': '#6E675E',
  },
  dark: {
    'bg-base': '#09090B',
    'bg-raised': '#18181B',
    'bg-sunken': '#27272A',
    'bg-overlay': 'rgba(0,0,0,0.6)',

    'surface-1': '#18181B',
    'surface-2': '#27272A',
    'surface-3': '#3F3F46',

    'border-subtle': '#27272A',
    'border-default': '#3F3F46',
    'border-strong': '#52525B',
    'border-focus': '#FAFAFA',

    'text-primary': '#FAFAFA',
    'text-secondary': '#A1A1AA',
    'text-muted': '#71717A',
    'text-inverse': '#18181B',
    'text-disabled': '#52525B',
    'on-fill': '#FFFFFF',

    // The accent does not lighten in dark mode: blue-500 under white text is
    // 3.68:1 and fails, and #0F766E is 3.64:1 on the dark ground.
    'accent-default': '#0F766E',
    'accent-hover': '#14B8A6',
    'accent-active': '#115E59',
    'accent-subtle': '#042F2E',
    'accent-text': '#99F6E4',

    'danger-default': '#DC2626',
    'danger-subtle': '#450A0A',
    'danger-text': '#FCA5A5',
    'success-default': '#22C55E',
    'success-subtle': '#052E16',
    'success-text': '#86EFAC',
    'warning-default': '#F59E0B',
    'warning-subtle': '#451A03',
    'warning-text': '#FCD34D',

    'stale-bg': '#27272A',
    'stale-text': '#A1A1AA',
  },
} as const;

export const radius = {
  'radius-none': 0,
  'radius-xs': 2,
  'radius-sm': 4,
  'radius-md': 8,
  'radius-lg': 12,
  'radius-xl': 16,
  'radius-full': 9999,
} as const;

export const elevation = {
  'elevation-0': 'none',
  'elevation-1': '0 1px 2px rgba(0,0,0,0.05)',
  'elevation-2': '0 4px 12px rgba(0,0,0,0.08)',
  'elevation-3': '0 8px 24px rgba(0,0,0,0.12)',
  'elevation-4': '0 12px 32px rgba(0,0,0,0.16)',
} as const;

export const iconSize = {
  'icon-xs': 12,
  'icon-sm': 16,
  'icon-md': 20,
  'icon-lg': 24,
  /** Unused: no surface claims it. */
  'icon-xl': 32,
} as const;

export const touchTarget = {
  'touch-min': 44,
  'touch-comfortable': 48,
} as const;

export const controlHeight = {
  'control-xs': 24,
  'control-sm': 32,
  'control-md': 40,
  'control-lg': 48,
} as const;

/**
 * **A row's token is its minimum height, not its height** (ADR 0031). A row
 * declares one of these four and draws at it unless its content is taller.
 */
export const rowHeight = {
  'row-compact': 44,
  'row-default': 56,
  'row-rich': 72,
  'row-hero': 96,
} as const;

export const duration = {
  'duration-instant': '100ms',
  'duration-fast': '150ms',
  'duration-default': '200ms',
  'duration-slow': '250ms',
  'duration-deliberate': '400ms',
  'duration-longpress': '400ms',
} as const;

export const easing = {
  'ease-standard': 'cubic-bezier(0.2, 0, 0, 1)',
  'ease-exit': 'cubic-bezier(0.4, 0, 1, 1)',
} as const;

export type Mode = keyof typeof colors;
export type ColorToken = keyof (typeof colors)['light'];

const cssVarName = (token: ColorToken): string => `--color-${token}`;

/**
 * The colour tokens as CSS custom properties for one mode.
 *
 * Tailwind's colour entries point at these variables, so switching mode is a
 * class/attribute change rather than a second class per element — one token
 * set with two value sets, which is what the doc requires.
 */
export function cssVariablesFor(mode: Mode): Record<string, string> {
  const entries = Object.entries(colors[mode]) as [ColorToken, string][];
  return Object.fromEntries(entries.map(([token, value]) => [cssVarName(token), value]));
}

/** `color-token: var(--color-token)`, for the Tailwind theme. */
export function colorVarReferences(): Record<ColorToken, string> {
  const tokens = Object.keys(colors.light) as ColorToken[];
  return Object.fromEntries(tokens.map((token) => [token, `var(${cssVarName(token)})`])) as Record<
    ColorToken,
    string
  >;
}

/**
 * A focus ring is two-part and has no offset: `border-strong` at 2px outside
 * `border-focus` at 1px. It appears on `:focus-visible` only, so a mouse click
 * draws no ring.
 */
export const FOCUS_RING = {
  outer: { color: 'border-strong', width: 2 },
  inner: { color: 'border-focus', width: 1 },
  offset: 0,
} as const;
