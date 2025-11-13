import { useEffect } from 'react';
import { useThemeStore } from '@/stores/themeStore';

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const { getCurrentTheme, applyTheme, mode } = useThemeStore();

  useEffect(() => {
    // Apply theme on mount
    const theme = getCurrentTheme();
    if (theme) {
      applyTheme(theme);
    }
  }, []); // Only run on mount

  useEffect(() => {
    // Re-apply theme when mode changes
    const theme = getCurrentTheme();
    if (theme) {
      applyTheme(theme);
    }

    // Listen for system theme changes
    if (mode === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => {
        const theme = getCurrentTheme();
        if (theme) {
          applyTheme(theme);
        }
      };

      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [mode, getCurrentTheme, applyTheme]);

  return <>{children}</>;
}

