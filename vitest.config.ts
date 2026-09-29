import { defineConfig } from 'vitest/config';

import { resolve } from 'node:path';

export default defineConfig({
  test: {
    // The domain and the projections are pure, so they need no DOM.
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': resolve(import.meta.dirname, 'src'),
    },
  },
});
