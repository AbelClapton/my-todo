import js from '@eslint/js';
import tailwindcss from 'eslint-plugin-tailwindcss';
import tseslint from 'typescript-eslint';

/**
 * The rules that make the conventions executable
 * (`10-engineering/code-conventions.md`, `03-experience/design-tokens.md`).
 *
 * The two that carry the most weight:
 *
 * - `tailwindcss/no-arbitrary-value` — every visual value is a token, and an
 *   arbitrary value fails the build rather than the review.
 * - no classes — the codebase is functional, and the one historical exception
 *   (an error boundary) is solved with `react-error-boundary`.
 */
export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
      // The design labs are disposable evaluation artifacts, not the app.
      'design/**',
      'docs/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    plugins: { tailwindcss },
    rules: {
      'tailwindcss/no-arbitrary-value': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ClassDeclaration',
          message: 'No classes: functions and data only (10-engineering/code-conventions.md).',
        },
        {
          selector: 'ClassExpression',
          message: 'No classes: functions and data only (10-engineering/code-conventions.md).',
        },
        {
          selector: 'TSNonNullExpression',
          message: 'No non-null assertions outside tests (10-engineering/code-conventions.md).',
        },
      ],
    },
  },
  {
    // Tests are the one place a `!` is allowed, because a fixture's shape is
    // known to the test that wrote it. The class ban goes with it: a test file
    // has no reason to declare one either, and the override has to be all-or-
    // nothing to be unambiguous.
    files: ['**/*.test.ts'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      'no-restricted-syntax': 'off',
    },
  },
);
