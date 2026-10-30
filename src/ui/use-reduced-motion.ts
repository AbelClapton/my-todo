import { useEffect, useState } from 'react';

/**
 * `prefers-reduced-motion: reduce` (`03-experience/motion-vocabulary.md`).
 *
 * The doc is specific about what changes: every duration becomes
 * `duration-instant`, transitions become opacity-only or no-op, and the
 * completion animation becomes a simple fade. So a surface asks this question
 * and then *shortens*, rather than skipping the state change — the row still
 * leaves, the sheet still opens.
 *
 * It reads `false` on the server and on the first paint, then corrects itself,
 * because the media query does not exist outside a browser and guessing either
 * way would make the hydration mismatch.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReduced(media.matches);
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, []);

  return reduced;
}
