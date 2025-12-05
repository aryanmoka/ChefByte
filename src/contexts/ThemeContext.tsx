import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

interface ThemeContextType {
  isDark: boolean;
  toggleTheme: () => void;
}

/**
 * NOTE:
 * - This provider is safe to include in apps that perform SSR because it avoids touching
 *   window/localStorage during render. The real theme is applied on mount.
 * - To avoid a flash of wrong theme, you can also add a small inline script in the HTML
 *   that applies the preferred theme before React hydrates (optional).
 */

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: React.ReactNode;
  /** Optional: prefer system on first load if no saved preference */
  preferSystem?: boolean;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children, preferSystem = true }) => {
  // Start with a neutral default (false). We will reconcile on mount.
  const [isDark, setIsDark] = useState<boolean>(false);
  const [mounted, setMounted] = useState(false);

  // Safe helpers for localStorage
  const safeGet = (key: string) => {
    try {
      if (typeof window === 'undefined') return null;
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  };
  const safeSet = (key: string, value: string) => {
    try {
      if (typeof window === 'undefined') return;
      localStorage.setItem(key, value);
    } catch {
      return;
    }
  };

  // Apply/remove the `dark` class on <html>
  const applyDarkClass = useCallback((enable: boolean) => {
    try {
      if (typeof document === 'undefined') return;
      if (enable) document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    // Run only on client
    if (typeof window === 'undefined') return;

    // Determine initial theme:
    // 1. saved theme in localStorage
    // 2. if none and preferSystem true => system preference
    // 3. fallback to light
    const saved = safeGet('theme');
    const systemPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

    const initialIsDark =
      saved === 'dark' ? true : saved === 'light' ? false : preferSystem ? Boolean(systemPrefersDark) : false;

    setIsDark(initialIsDark);
    applyDarkClass(initialIsDark);

    // Listen for system theme changes so the app can follow when user changes OS setting
    let mql: MediaQueryList | null = null;
    const handleChange = (e: MediaQueryListEvent) => {
      // only respond if user hasn't explicitly saved a preference
      const currentSaved = safeGet('theme');
      if (currentSaved) return;
      setIsDark(e.matches);
      applyDarkClass(e.matches);
    };

    if (window.matchMedia) {
      mql = window.matchMedia('(prefers-color-scheme: dark)');
      try {
        // modern
        if (mql.addEventListener) mql.addEventListener('change', handleChange);
        else mql.addListener(handleChange);
      } catch {
        // ignore
      }
    }

    setMounted(true);
    return () => {
      if (mql) {
        try {
          if (mql.removeEventListener) mql.removeEventListener('change', handleChange);
          else mql.removeListener(handleChange);
        } catch {
          // ignore
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applyDarkClass, preferSystem]);

  const toggleTheme = useCallback(() => {
    const next = !isDark;
    setIsDark(next);
    applyDarkClass(next);
    safeSet('theme', next ? 'dark' : 'light');
  }, [isDark, applyDarkClass]);

  const value = useMemo(() => ({ isDark, toggleTheme }), [isDark, toggleTheme]);

  // Optionally, you can return null or a loader while the provider is reconciling on mount.
  // Here we render children immediately but have already applied theme in the mount effect.
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export default ThemeProvider;
