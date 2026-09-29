import { defineConfig } from '@playwright/test';

/**
 * Visual regression at the four widths the docs name, plus dark mode.
 * `03-experience/design-tokens.md` and `10-engineering/testing.md` both require
 * the dark check; screenshots are the only way to catch a token that resolves to
 * nothing.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env['CI']),
  retries: process.env['CI'] === undefined ? 0 : 2,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'phone-390', use: { viewport: { width: 390, height: 844 } } },
    { name: 'tablet-768', use: { viewport: { width: 768, height: 1024 } } },
    { name: 'desktop-1440', use: { viewport: { width: 1440, height: 900 } } },
    {
      name: 'phone-390-dark',
      use: {
        viewport: { width: 390, height: 844 },
        colorScheme: 'dark',
      },
    },
  ],
});
