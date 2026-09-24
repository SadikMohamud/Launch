// Theme toggle.
//
// The icon shows the theme you would switch to, and the accessible name says
// so explicitly, because an icon alone is ambiguous about whether it
// describes the current state or the action.

import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../theme/ThemeContext.tsx';

export const ThemeToggle: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { theme, toggleTheme } = useTheme();
  const goingToLight = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={goingToLight ? 'Switch to the light theme' : 'Switch to the dark theme'}
      className={[
        'inline-flex items-center justify-center border border-line p-2 text-muted',
        'transition-colors duration-signal ease-signal hover:text-ink',
        className,
      ].join(' ')}
    >
      {goingToLight ? (
        <Sun aria-hidden="true" className="h-4 w-4" />
      ) : (
        <Moon aria-hidden="true" className="h-4 w-4" />
      )}
    </button>
  );
};
