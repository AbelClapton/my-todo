import { colors, cssVariablesFor, type Mode } from '@/ui/tokens';

/**
 * The token custom properties, **emitted from `tokens.ts` rather than copied
 * into a stylesheet**.
 *
 * That is the whole point of this file. `03-experience/design-tokens.md` says
 * tokens are defined once and consumed everywhere; a hand-written CSS block
 * would be a second definition that drifts the first time a colour changes.
 * `design/lab.css` and `design/tokens.css` are the labs' copy of the same
 * values, and the doc wins any disagreement with either.
 *
 * Light is paper; dark is ink. They are the same token set with two value sets,
 * which is what the doc requires — not two token sets.
 */

export const THEME_STYLE_ID = 'sw-theme';

function variablesFor(mode: Mode): string {
  return Object.entries(cssVariablesFor(mode))
    .map(([name, value]) => `  ${name}: ${value};`)
    .join('\n');
}

function block(selector: string, mode: Mode): string {
  return `${selector} {\n${variablesFor(mode)}\n}`;
}

/**
 * `:root` carries light, `.dark` overrides it. `tailwind.config.ts` sets
 * `darkMode: ['class', '.dark']`, so the `dark:` variants and these variables
 * switch together — a mode where they disagreed would be a mode where half the
 * app changed.
 */
export function tokenStyleSheet(): string {
  return [block(':root', 'light'), block('.dark', 'dark')].join('\n\n');
}

/** True when every colour token is declared in both blocks. A test asserts it. */
export const COLOR_TOKENS: readonly string[] = Object.keys(colors.light);
