import { create } from 'zustand';
import type { ShortcutDefinition } from '@/constants/shortcuts';
import { KEYBOARD_SHORTCUTS } from '@/constants/shortcuts';

interface ShortcutState {
  shortcuts: ShortcutDefinition[];
  enabled: boolean;
  
  // Actions
  setEnabled: (enabled: boolean) => void;
  getShortcut: (id: string) => ShortcutDefinition | undefined;
  getShortcutsByCategory: (category: ShortcutDefinition['category']) => ShortcutDefinition[];
}

export const useShortcutStore = create<ShortcutState>()((set, get) => ({
  shortcuts: KEYBOARD_SHORTCUTS,
  enabled: true,

  setEnabled: (enabled: boolean) => {
    set({ enabled });
  },

  getShortcut: (id: string) => {
    return get().shortcuts.find((s) => s.id === id);
  },

  getShortcutsByCategory: (category: ShortcutDefinition['category']) => {
    return get().shortcuts.filter((s) => s.category === category);
  },
}));

