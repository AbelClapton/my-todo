import { resolve } from 'node:path';

import { nitroV2Plugin } from '@tanstack/nitro-v2-vite-plugin';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/**
 * Vite via TanStack Start. The route loaders can read the local log during a
 * hard load, which is the property the framework was chosen for
 * (`07-infrastructure/stack.md`).
 *
 * **Nitro is added only in the `deploy` mode**, because Start emits a `{ fetch }`
 * handler and no `index.html`: there is nothing static to upload, so the host has
 * to run the handler, and Vercel's shape for that is its Build Output API
 * directory. `--mode deploy` is a build mode rather than an environment variable
 * so the command is the same on every platform.
 *
 * **The default build is untouched**, which is what keeps `vite preview` — and
 * therefore the Playwright suite — working: `vercel deploy --prebuilt` takes the
 * directory Nitro writes, and nothing else does.
 */
export default defineConfig(({ mode }) => ({
  plugins: [
    tanstackStart(),
    react(),
    ...(mode === 'deploy'
      ? [nitroV2Plugin({ preset: 'vercel', compatibilityDate: '2026-10-30' })]
      : []),
  ],
  resolve: {
    alias: {
      '@': resolve(import.meta.dirname, 'src'),
      '@drizzle': resolve(import.meta.dirname, 'drizzle'),
    },
  },
  server: { port: 3000 },
}));
