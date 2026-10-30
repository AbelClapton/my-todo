import { defineConfig } from '@playwright/test';

/**
 * Visual regression at the widths and modes `10-engineering/testing.md` names —
 * *"390px, 768px, 1440px, dark mode at all three widths"* — because the point of
 * the token set is consistency, and the only way to verify consistency is to
 * compare.
 *
 * **The suite runs against the build that ships**, not the dev server: *"E2E
 * tests run against the exact build that will ship."* `webServer` builds and
 * previews it, so a broken build fails here rather than after a deploy, and
 * `reuseExistingServer` keeps a local run from paying for the build twice.
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
  // Animations are disabled for a screenshot, because a capture taken
  // mid-transition is a capture of a moment rather than of a screen.
  expect: {
    toHaveScreenshot: { animations: 'disabled', maxDiffPixelRatio: 0.01 },
  },
  webServer: {
    command: 'pnpm build && pnpm preview --port 3000 --strictPort',
    url: 'http://localhost:3000',
    reuseExistingServer: process.env['CI'] === undefined,
    timeout: 120_000,
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
    {
      name: 'tablet-768-dark',
      use: {
        viewport: { width: 768, height: 1024 },
        colorScheme: 'dark',
      },
    },
    {
      name: 'desktop-1440-dark',
      use: {
        viewport: { width: 1440, height: 900 },
        colorScheme: 'dark',
      },
    },
  ],
});
