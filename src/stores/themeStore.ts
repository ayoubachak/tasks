import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeColors {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  border: string;
  input: string;
  ring: string;
  radius: string;
}

export interface Theme {
  id: string;
  name: string;
  mode: ThemeMode;
  colors: ThemeColors;
  isCustom?: boolean;
}

interface ThemeState {
  currentTheme: string; // theme ID
  themes: Theme[];
  mode: ThemeMode;
  
  setMode: (mode: ThemeMode) => void;
  setTheme: (themeId: string) => void;
  addTheme: (theme: Theme) => void;
  updateTheme: (themeId: string, updates: Partial<Theme>) => void;
  deleteTheme: (themeId: string) => void;
  getCurrentTheme: () => Theme | undefined;
  applyTheme: (theme: Theme) => void;
}

// Predefined themes
const defaultThemes: Theme[] = [
  {
    id: 'light',
    name: 'Light',
    mode: 'light',
    colors: {
      background: 'oklch(1 0 0)',
      foreground: 'oklch(0.13 0.028 261.692)',
      card: 'oklch(1 0 0)',
      cardForeground: 'oklch(0.13 0.028 261.692)',
      popover: 'oklch(1 0 0)',
      popoverForeground: 'oklch(0.13 0.028 261.692)',
      primary: 'oklch(0.21 0.034 264.665)',
      primaryForeground: 'oklch(0.985 0.002 247.839)',
      secondary: 'oklch(0.967 0.003 264.542)',
      secondaryForeground: 'oklch(0.21 0.034 264.665)',
      muted: 'oklch(0.967 0.003 264.542)',
      mutedForeground: 'oklch(0.551 0.027 264.364)',
      accent: 'oklch(0.967 0.003 264.542)',
      accentForeground: 'oklch(0.21 0.034 264.665)',
      destructive: 'oklch(0.577 0.245 27.325)',
      border: 'oklch(0.928 0.006 264.531)',
      input: 'oklch(0.928 0.006 264.531)',
      ring: 'oklch(0.707 0.022 261.325)',
      radius: '0.625rem',
    },
  },
  {
    id: 'dark',
    name: 'Dark',
    mode: 'dark',
    colors: {
      background: 'oklch(0.13 0.028 261.692)',
      foreground: 'oklch(0.985 0.002 247.839)',
      card: 'oklch(0.21 0.034 264.665)',
      cardForeground: 'oklch(0.985 0.002 247.839)',
      popover: 'oklch(0.21 0.034 264.665)',
      popoverForeground: 'oklch(0.985 0.002 247.839)',
      primary: 'oklch(0.928 0.006 264.531)',
      primaryForeground: 'oklch(0.21 0.034 264.665)',
      secondary: 'oklch(0.278 0.033 256.848)',
      secondaryForeground: 'oklch(0.985 0.002 247.839)',
      muted: 'oklch(0.278 0.033 256.848)',
      mutedForeground: 'oklch(0.707 0.022 261.325)',
      accent: 'oklch(0.278 0.033 256.848)',
      accentForeground: 'oklch(0.985 0.002 247.839)',
      destructive: 'oklch(0.704 0.191 22.216)',
      border: 'oklch(1 0 0 / 10%)',
      input: 'oklch(1 0 0 / 15%)',
      ring: 'oklch(0.551 0.027 264.364)',
      radius: '0.625rem',
    },
  },
  {
    id: 'blue',
    name: 'Blue',
    mode: 'dark',
    colors: {
      background: 'oklch(0.15 0.02 250)',
      foreground: 'oklch(0.98 0.002 250)',
      card: 'oklch(0.22 0.03 250)',
      cardForeground: 'oklch(0.98 0.002 250)',
      popover: 'oklch(0.22 0.03 250)',
      popoverForeground: 'oklch(0.98 0.002 250)',
      primary: 'oklch(0.55 0.2 250)',
      primaryForeground: 'oklch(0.98 0.002 250)',
      secondary: 'oklch(0.28 0.03 250)',
      secondaryForeground: 'oklch(0.98 0.002 250)',
      muted: 'oklch(0.28 0.03 250)',
      mutedForeground: 'oklch(0.7 0.02 250)',
      accent: 'oklch(0.35 0.1 250)',
      accentForeground: 'oklch(0.98 0.002 250)',
      destructive: 'oklch(0.7 0.19 22)',
      border: 'oklch(0.3 0.05 250 / 30%)',
      input: 'oklch(0.3 0.05 250 / 40%)',
      ring: 'oklch(0.55 0.2 250)',
      radius: '0.625rem',
    },
  },
  {
    id: 'green',
    name: 'Green',
    mode: 'dark',
    colors: {
      background: 'oklch(0.15 0.02 150)',
      foreground: 'oklch(0.98 0.002 150)',
      card: 'oklch(0.22 0.03 150)',
      cardForeground: 'oklch(0.98 0.002 150)',
      popover: 'oklch(0.22 0.03 150)',
      popoverForeground: 'oklch(0.98 0.002 150)',
      primary: 'oklch(0.55 0.2 150)',
      primaryForeground: 'oklch(0.98 0.002 150)',
      secondary: 'oklch(0.28 0.03 150)',
      secondaryForeground: 'oklch(0.98 0.002 150)',
      muted: 'oklch(0.28 0.03 150)',
      mutedForeground: 'oklch(0.7 0.02 150)',
      accent: 'oklch(0.35 0.1 150)',
      accentForeground: 'oklch(0.98 0.002 150)',
      destructive: 'oklch(0.7 0.19 22)',
      border: 'oklch(0.3 0.05 150 / 30%)',
      input: 'oklch(0.3 0.05 150 / 40%)',
      ring: 'oklch(0.55 0.2 150)',
      radius: '0.625rem',
    },
  },
  {
    id: 'purple',
    name: 'Purple',
    mode: 'dark',
    colors: {
      background: 'oklch(0.15 0.02 300)',
      foreground: 'oklch(0.98 0.002 300)',
      card: 'oklch(0.22 0.03 300)',
      cardForeground: 'oklch(0.98 0.002 300)',
      popover: 'oklch(0.22 0.03 300)',
      popoverForeground: 'oklch(0.98 0.002 300)',
      primary: 'oklch(0.55 0.2 300)',
      primaryForeground: 'oklch(0.98 0.002 300)',
      secondary: 'oklch(0.28 0.03 300)',
      secondaryForeground: 'oklch(0.98 0.002 300)',
      muted: 'oklch(0.28 0.03 300)',
      mutedForeground: 'oklch(0.7 0.02 300)',
      accent: 'oklch(0.35 0.1 300)',
      accentForeground: 'oklch(0.98 0.002 300)',
      destructive: 'oklch(0.7 0.19 22)',
      border: 'oklch(0.3 0.05 300 / 30%)',
      input: 'oklch(0.3 0.05 300 / 40%)',
      ring: 'oklch(0.55 0.2 300)',
      radius: '0.625rem',
    },
  },
];

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      currentTheme: 'dark',
      themes: defaultThemes,
      mode: 'system',

      setMode: (mode: ThemeMode) => {
        set({ mode });
        const theme = get().getCurrentTheme();
        if (theme) {
          get().applyTheme(theme);
        }
      },

      setTheme: (themeId: string) => {
        set({ currentTheme: themeId });
        const theme = get().themes.find((t) => t.id === themeId);
        if (theme) {
          get().applyTheme(theme);
        }
      },

      addTheme: (theme: Theme) => {
        set((state) => ({
          themes: [...state.themes, theme],
        }));
      },

      updateTheme: (themeId: string, updates: Partial<Theme>) => {
        set((state) => ({
          themes: state.themes.map((theme) =>
            theme.id === themeId ? { ...theme, ...updates } : theme
          ),
        }));
        const theme = get().themes.find((t) => t.id === themeId);
        if (theme && themeId === get().currentTheme) {
          get().applyTheme({ ...theme, ...updates } as Theme);
        }
      },

      deleteTheme: (themeId: string) => {
        set((state) => ({
          themes: state.themes.filter((theme) => theme.id !== themeId),
          currentTheme: state.currentTheme === themeId ? 'dark' : state.currentTheme,
        }));
      },

      getCurrentTheme: () => {
        const state = get();
        return state.themes.find((t) => t.id === state.currentTheme);
      },

      applyTheme: (theme: Theme) => {
        const root = document.documentElement;
        const colors = theme.colors;

        // Apply CSS variables
        root.style.setProperty('--radius', colors.radius);
        root.style.setProperty('--background', colors.background);
        root.style.setProperty('--foreground', colors.foreground);
        root.style.setProperty('--card', colors.card);
        root.style.setProperty('--card-foreground', colors.cardForeground);
        root.style.setProperty('--popover', colors.popover);
        root.style.setProperty('--popover-foreground', colors.popoverForeground);
        root.style.setProperty('--primary', colors.primary);
        root.style.setProperty('--primary-foreground', colors.primaryForeground);
        root.style.setProperty('--secondary', colors.secondary);
        root.style.setProperty('--secondary-foreground', colors.secondaryForeground);
        root.style.setProperty('--muted', colors.muted);
        root.style.setProperty('--muted-foreground', colors.mutedForeground);
        root.style.setProperty('--accent', colors.accent);
        root.style.setProperty('--accent-foreground', colors.accentForeground);
        root.style.setProperty('--destructive', colors.destructive);
        root.style.setProperty('--border', colors.border);
        root.style.setProperty('--input', colors.input);
        root.style.setProperty('--ring', colors.ring);

        // Apply dark/light class based on theme mode
        const { mode } = get();
        const effectiveMode = mode === 'system' 
          ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
          : mode;

        if (effectiveMode === 'dark') {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }
      },
    }),
    {
      name: 'theme-storage',
      partialize: (state) => ({
        currentTheme: state.currentTheme,
        themes: state.themes.filter((t) => t.isCustom),
        mode: state.mode,
      }),
      onRehydrateStorage: (state) => {
        // Merge custom themes with defaults after rehydration
        if (state) {
          const customThemes = state.themes.filter((t) => t.isCustom);
          state.themes = [...defaultThemes, ...customThemes];
          
          // Apply theme after rehydration
          const theme = state.getCurrentTheme();
          if (theme) {
            state.applyTheme(theme);
          }
        }
      },
    }
  )
);

