'use client';

import { useEffect } from 'react';

/**
 * A11y baseline for modals: close on Escape while `active`.
 * (Full focus traps are out of scope; semantics come from
 * role="dialog" + aria-modal on the container.)
 */
export function useEscapeToClose(active: boolean, onClose: () => void) {
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, onClose]);
}
