// Theme.
//
// The design is dark first, so dark is the default and light is the opt-in.
// That inverts the previous logic, which added a "dark" class to a light
// page; the stylesheet now defines its tokens on :root and overrides them
// under html.light.
//
// The stored choice always wins over the system preference, because someone
// who has pressed the toggle has told us what they want.

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'launch-theme';

interface ThemeValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeValue>({ theme: 'dark', toggleTheme: () => {} });

/** Read the stored choice, falling back to the system preference. */
function initialTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';

  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
  } catch {
    // Storage can be unavailable in private mode. The system preference
    // still gives a sensible answer.
  }

  // Dark is not a preference here, it is the design. A visitor whose
  // machine prefers light still gets the graded dark page unless they press
  // the toggle themselves, because the light theme is the fallback rather
  // than the intent.
  return 'dark';
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(initialTheme);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('light', theme === 'light');

    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // A failed write only means the choice will not survive a reload.
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'));
  }, []);

  const value = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export function useTheme(): ThemeValue {
  return useContext(ThemeContext);
}
