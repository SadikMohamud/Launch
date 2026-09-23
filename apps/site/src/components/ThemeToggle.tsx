import React from 'react';
import { useTheme } from '../theme/ThemeContext.tsx';
import { Sun, Moon } from 'lucide-react';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '', showLabel = false }) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      type="button"
      className={`inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl border-2 transition-all duration-200 cursor-pointer select-none font-mono text-xs font-extrabold ${
        isDark
          ? 'bg-[#1e1a18] text-accent-yellow border-white/20 hover:border-accent-yellow hover:bg-[#282320] shadow-sm'
          : 'bg-white text-ink-900 border-ink-900 hover:bg-surface hover:border-accent-pink shadow-sm'
      } ${className}`}
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    >
      {isDark ? (
        <>
          <Sun className="w-4 h-4 text-accent-yellow animate-spin-slow" />
          {showLabel && <span>Light Mode</span>}
        </>
      ) : (
        <>
          <Moon className="w-4 h-4 text-ink-900 fill-ink-900/10" />
          {showLabel && <span>Dark Mode</span>}
        </>
      )}
    </button>
  );
};
