export interface ShortcutDefinition {
  id: string;
  description: string;
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  category: 'navigation' | 'actions' | 'views' | 'global';
}

export const KEYBOARD_SHORTCUTS: ShortcutDefinition[] = [
  // Global
  {
    id: 'command-palette',
    description: 'Open command palette',
    key: 'k',
    meta: true,
    category: 'global',
  },
  {
    id: 'new-task',
    description: 'Create new task',
    key: 'n',
    meta: true,
    category: 'actions',
  },
  {
    id: 'search',
    description: 'Focus search',
    key: 'f',
    meta: true,
    category: 'global',
  },
  
  // Navigation
  {
    id: 'view-list',
    description: 'Switch to list view',
    key: '1',
    meta: true,
    category: 'views',
  },
  {
    id: 'view-board',
    description: 'Switch to board view',
    key: '2',
    meta: true,
    category: 'views',
  },
  {
    id: 'view-calendar',
    description: 'Switch to calendar view',
    key: '3',
    meta: true,
    category: 'views',
  },
  
  // Actions
  {
    id: 'save',
    description: 'Save current changes',
    key: 's',
    meta: true,
    category: 'actions',
  },
  {
    id: 'cancel',
    description: 'Cancel/Close',
    key: 'Escape',
    category: 'actions',
  },
  {
    id: 'delete',
    description: 'Delete selected',
    key: 'Delete',
    category: 'actions',
  },
  {
    id: 'select-all',
    description: 'Select all tasks',
    key: 'a',
    meta: true,
    category: 'actions',
  },
];

export function getShortcutDisplay(shortcut: ShortcutDefinition | undefined): string {
  if (!shortcut) return '';
  
  const parts: string[] = [];
  
  if (shortcut.meta) {
    parts.push(navigator.platform.includes('Mac') ? '⌘' : 'Ctrl');
  }
  if (shortcut.ctrl && !shortcut.meta) {
    parts.push('Ctrl');
  }
  if (shortcut.shift) {
    parts.push('Shift');
  }
  if (shortcut.alt) {
    parts.push('Alt');
  }
  
  // Format the key
  let key = shortcut.key;
  if (key === ' ') key = 'Space';
  if (key.length === 1) key = key.toUpperCase();
  
  parts.push(key);
  
  return parts.join(' + ');
}

