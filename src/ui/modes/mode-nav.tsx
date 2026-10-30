import { Calendar, SquareCheck } from 'lucide-react';
import { Link } from '@tanstack/react-router';

import { FOCUS_RING } from '@/ui/components/focus-ring';
import { iconSize } from '@/ui/tokens';

/**
 * The mode navigation (`03-experience/app-shell.md` §The mode navigation).
 *
 * **Two modes, not four.** The doc names Calendar, Tasks, Habits and Notes, and
 * Phase 1 has built two of them. A dock that renders two dead icons would be four
 * modes on paper and two in fact; it renders what exists, and the other two
 * arrive with their modules.
 *
 * The dock is fixed at the bottom edge on every width, and the indicator is a 2px
 * underline beneath the icon — the doc's own form for the dock, drawn literally as
 * a leading-edge bar it *"detaches from its icon and floats at the far edge"*. The
 * rail is the Phase 8+ shape, when a desktop layout exists to hold it.
 */

const MODES = [
  { to: '/', label: 'Calendar', Icon: Calendar },
  { to: '/tasks', label: 'Tasks', Icon: SquareCheck },
] as const;

const ICON_SIZE = iconSize['icon-md'];

export function ModeNav() {
  return (
    <nav
      aria-label="Modes"
      className="fixed inset-x-space-0 bottom-space-0 z-30 flex justify-center border-t border-border-subtle bg-bg-raised"
    >
      <ul className="flex w-full max-w-2xl items-stretch justify-around">
        {MODES.map(({ to, label, Icon }) => (
          <li key={to} className="flex-1">
            <Link
              to={to}
              activeOptions={{ exact: true }}
              className={`flex min-h-touch-comfortable flex-col items-center justify-center gap-space-1 text-text-secondary ${FOCUS_RING}`}
              activeProps={{ className: 'text-accent-text' }}
            >
              {({ isActive }) => (
                <>
                  <Icon size={ICON_SIZE} aria-hidden />
                  <span className="text-type-footnote">{label}</span>
                  <span
                    aria-current={isActive ? 'page' : undefined}
                    className={
                      isActive
                        ? 'h-space-1 w-space-8 rounded-full bg-accent-default'
                        : 'h-space-1 w-space-8'
                    }
                  />
                </>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
