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
      // Handle special keys
      let keyMatches = false;
      if (key === '/') {
        // '/' can be typed as '/' or '?' (with Shift)
        keyMatches = eventKey === '/' || eventKey === '?' || event.code === 'Slash';
      } else if (key.length === 1) {
        // Single character keys
        keyMatches = eventKey === key || event.code === `Key${key.toUpperCase()}`;
      } else {
        // Special keys like 'Escape', 'Enter', etc.
        keyMatches = eventKey === key || event.code === key;
      }

      if (!keyMatches) {
        return;
      }

      // Check modifiers
      // If a modifier is specified, it must match; if not specified, it should not be pressed
      // Exception: meta and ctrl are mutually exclusive - if one is set, the other should not be pressed
      const ctrlMatch = opts.ctrl !== undefined 
        ? (opts.ctrl ? event.ctrlKey : !event.ctrlKey)
        : true; // If not specified, don't check
      const shiftMatch = opts.shift !== undefined
        ? (opts.shift ? event.shiftKey : !event.shiftKey)
        : true; // If not specified, don't check
      const altMatch = opts.alt !== undefined
        ? (opts.alt ? event.altKey : !event.altKey)
        : true; // If not specified, don't check
      const metaMatch = opts.meta !== undefined
        ? (opts.meta ? event.metaKey : !event.metaKey)
        : true; // If not specified, don't check

      // If ctrl is required, meta should not be pressed (and vice versa)
      const modifierExclusive = opts.ctrl 
        ? !event.metaKey 
        : opts.meta 
          ? !event.ctrlKey 
          : true;

      if (!ctrlMatch || !shiftMatch || !altMatch || !metaMatch || !modifierExclusive) {
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

