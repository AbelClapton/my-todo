import { HeadContent, Outlet, Scripts, createRootRoute } from '@tanstack/react-router';
import { useEffect, type ReactNode } from 'react';

import '@/ui/app.css';
import { LogProvider } from '@/ui/data/log-provider';
import { THEME_STYLE_ID, tokenStyleSheet } from '@/ui/theme';

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1, viewport-fit=cover',
      },
      { title: 'Small Wins' },
    ],
  }),
  component: RootComponent,
});

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  );
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  /**
   * Dark mode follows the platform until the `theme` setting is wired
   * (`system.settings_changed { key: 'theme' }`), which flips exactly this
   * class. It is applied in an effect rather than during render so the server
   * and the first client paint agree.
   */
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      document.documentElement.classList.toggle('dark', media.matches);
    };
    apply();
    media.addEventListener('change', apply);
    return () => {
      media.removeEventListener('change', apply);
    };
  }, []);

  return (
    <html lang="en">
      <head>
        {/* The token variables, generated from `tokens.ts` — see `ui/theme.ts`. */}
        <style id={THEME_STYLE_ID}>{tokenStyleSheet()}</style>
        <HeadContent />
      </head>
      <body className="bg-base font-sans text-text-primary text-type-body">
        <LogProvider>{children}</LogProvider>
        <Scripts />
      </body>
    </html>
  );
}
