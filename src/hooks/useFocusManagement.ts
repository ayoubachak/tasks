import { useEffect, useRef } from 'react';

/**
 * Hook to manage focus for modals and dialogs
 * Automatically focuses the first focusable element when opened
 */
export function useFocusManagement(open: boolean, options?: {
  focusFirst?: boolean;
  focusSelector?: string;
  delay?: number;
}) {
  const containerRef = useRef<HTMLElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) {
      // Restore focus when closing
      if (previousActiveElement.current) {
        previousActiveElement.current.focus();
        previousActiveElement.current = null;
      }
      return;
    }

    // Store the currently focused element
    previousActiveElement.current = document.activeElement as HTMLElement;

    const focusElement = () => {
      if (!containerRef.current) return;

      const selector = options?.focusSelector || [
        'input:not([disabled])',
        'textarea:not([disabled])',
        'button:not([disabled])',
        'a[href]',
        '[tabindex]:not([tabindex="-1"])',
      ].join(', ');

      const focusableElements = Array.from(
        containerRef.current.querySelectorAll<HTMLElement>(selector)
      );

      if (focusableElements.length > 0 && options?.focusFirst !== false) {
        focusableElements[0].focus();
      }
    };

    const delay = options?.delay ?? 0;
    if (delay > 0) {
      setTimeout(focusElement, delay);
    } else {
      focusElement();
    }
  }, [open, options?.focusFirst, options?.focusSelector, options?.delay]);

  return containerRef;
}

