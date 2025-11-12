import { useEffect, useRef } from 'react';

export interface KeyboardShortcutOptions {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  preventDefault?: boolean;
  stopPropagation?: boolean;
}

export function useKeyboardShortcut(
  options: KeyboardShortcutOptions,
  callback: (event: KeyboardEvent) => void
) {
  const callbackRef = useRef(callback);
  const optionsRef = useRef(options);

  // Keep refs up to date
  useEffect(() => {
    callbackRef.current = callback;
    optionsRef.current = options;
  }, [callback, options]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const opts = optionsRef.current;
      const key = opts.key.toLowerCase();
      const eventKey = event.key.toLowerCase();

      // Check if the key matches
      if (eventKey !== key && event.code !== `Key${key.toUpperCase()}`) {
        return;
      }

      // Check modifiers
      const ctrlMatch = opts.ctrl ? event.ctrlKey : !event.ctrlKey;
      const shiftMatch = opts.shift ? event.shiftKey : !event.shiftKey;
      const altMatch = opts.alt ? event.altKey : !event.altKey;
      const metaMatch = opts.meta ? event.metaKey : !event.metaKey;

      if (!ctrlMatch || !shiftMatch || !altMatch || !metaMatch) {
        return;
      }

      // Always prevent default and stop propagation for our shortcuts
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      callbackRef.current(event);
    };

    // Use capture phase to ensure we catch events early
    window.addEventListener('keydown', handleKeyDown, { capture: true, passive: false });
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, []);
}

