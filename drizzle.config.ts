import { defineConfig } from 'drizzle-kit';

/**
 * One schema, two runtimes: the client's SQLite/WASM database and the server's
 * SQLite → Turso database. Migrating to Turso changes the outbound adapter and
 * nothing else (`07-infrastructure/stack.md`).
 */
export default defineConfig({
  dialect: 'sqlite',
  schema: './drizzle/schema.ts',
  out: './drizzle/migrations',
});
