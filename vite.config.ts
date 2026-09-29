import { resolve } from 'node:path';

import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/**
 * Vite via TanStack Start. The route loaders can read the local log during a
 * hard load, which is the property the framework was chosen for
 * (`07-infrastructure/stack.md`).
 */
export default defineConfig({
  plugins: [tanstackStart(), react()],
  resolve: {
    alias: {
      '@': resolve(import.meta.dirname, 'src'),
      '@drizzle': resolve(import.meta.dirname, 'drizzle'),
    },
  },
  server: { port: 3000 },
});
