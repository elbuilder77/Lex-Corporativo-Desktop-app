import { useEffect, useRef } from 'react';

const FOCUSABLE_ELEMENTS = 'a[href], button, textarea, input[type="text"], input[type="radio"], input[type="checkbox"], select, [tabindex]:not([tabindex="-1"])';

/**
 * Traps keyboard focus within the referenced element.
 * Handles Tab, Shift+Tab cycling through focusable elements.
 * Returns a ref to attach to the container.
 */
export function useFocusTrap<T extends HTMLElement>(active: boolean) {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!active || !ref.current) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !ref.current) return;

      const focusableElements = Array.from(
        ref.current.querySelectorAll<HTMLElement>(FOCUSABLE_ELEMENTS)
      ).filter(el => !el.hasAttribute('disabled'));

      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    // Initial focus
    const focusable = ref.current.querySelectorAll<HTMLElement>(FOCUSABLE_ELEMENTS);
    if (focusable.length > 0) {
      focusable[0].focus();
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [active]);

  return ref;
}
