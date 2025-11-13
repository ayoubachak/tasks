import { useEffect } from 'react';
import { useShortcutStore } from '@/stores/shortcutStore';
import { useViewStore } from '@/stores/viewStore';
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcut';

interface KeyboardShortcutsProps {
  onNewTask?: () => void;
  onOpenCommandPalette?: () => void;
  onFocusSearch?: () => void;
}

export function KeyboardShortcuts({
  onNewTask,
  onOpenCommandPalette,
  onFocusSearch,
}: KeyboardShortcutsProps) {
  const { enabled } = useShortcutStore();
  const { setView } = useViewStore();

  // Command Palette (Cmd/Ctrl + K)
  useKeyboardShortcut(
    {
      key: 'k',
      meta: true,
      preventDefault: true,
      stopPropagation: true,
    },
    (event) => {
      if (enabled && onOpenCommandPalette) {
        event.preventDefault();
        event.stopPropagation();
        onOpenCommandPalette();
      }
    }
  );

  // New Task (Cmd/Ctrl + N)
  useKeyboardShortcut(
    {
      key: 'n',
      meta: true,
      preventDefault: true,
      stopPropagation: true,
    },
    (event) => {
      if (enabled && onNewTask) {
        event.preventDefault();
        event.stopPropagation();
        onNewTask();
      }
    }
  );

  // Focus Search (Cmd/Ctrl + F)
  useKeyboardShortcut(
    {
      key: 'f',
      meta: true,
      preventDefault: true,
      stopPropagation: true,
    },
    (event) => {
      if (enabled && onFocusSearch) {
        event.preventDefault();
        event.stopPropagation();
        onFocusSearch();
      }
    }
  );

  // View Switching
  useKeyboardShortcut(
    {
      key: '1',
      meta: true,
      preventDefault: true,
      stopPropagation: true,
    },
    (event) => {
      if (enabled) {
        event.preventDefault();
        event.stopPropagation();
        setView('list');
      }
    }
  );

  useKeyboardShortcut(
    {
      key: '2',
      meta: true,
      preventDefault: true,
      stopPropagation: true,
    },
    (event) => {
      if (enabled) {
        event.preventDefault();
        event.stopPropagation();
        setView('board');
      }
    }
  );

  useKeyboardShortcut(
    {
      key: '3',
      meta: true,
      preventDefault: true,
      stopPropagation: true,
    },
    (event) => {
      if (enabled) {
        event.preventDefault();
        event.stopPropagation();
        setView('calendar');
      }
    }
  );

  // Prevent browser default behaviors for shortcuts (capture phase - runs first)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!enabled) return;

      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable ||
        target.closest('[contenteditable="true"]') ||
        target.closest('input') ||
        target.closest('textarea');

      // Prevent browser defaults for our shortcuts
      // Cmd/Ctrl + K (Command Palette) - always prevent
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return;
      }
      
      // Cmd/Ctrl + N (New Task) - always prevent (browser new window)
      if ((e.metaKey || e.ctrlKey) && (e.key === 'n' || e.key === 'N')) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return;
      }
      
      // Cmd/Ctrl + F (Focus Search) - prevent if not in input
      if ((e.metaKey || e.ctrlKey) && (e.key === 'f' || e.key === 'F') && !isInput) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return;
      }
      
      // Cmd/Ctrl + 1/2/3 (View Switching) - always prevent
      if ((e.metaKey || e.ctrlKey) && ['1', '2', '3'].includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return;
      }
    };

    // Use capture phase with high priority to catch events before browser
    window.addEventListener('keydown', handleKeyDown, { capture: true, passive: false });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [enabled]);

  return null; // This component doesn't render anything
}

