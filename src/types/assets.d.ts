/**
 * Vite's `?raw` suffix, for reading a migration's SQL as a string.
 * Declared so `tsc --noEmit` agrees with the bundler.
 */
declare module '*?raw' {
  const content: string;
  export default content;
}
