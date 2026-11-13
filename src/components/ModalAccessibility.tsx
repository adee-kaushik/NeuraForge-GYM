'use client';
import { useEffect } from 'react';
/** Match Escape to the same dismissal as clicking a modal backdrop; contain keyboard focus. */
export function ModalAccessibility() {
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' && event.key !== 'Tab') return;
      const dialogs = Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"][aria-modal="true"]')).filter(el => el.getClientRects().length > 0);
      dialogs.sort((a,b) => (Number(getComputedStyle(a).zIndex)||0) - (Number(getComputedStyle(b).zIndex)||0));
      const dialog = dialogs.at(-1);
      if (!dialog) return;
      if (event.key === 'Escape') { event.preventDefault(); dialog.click(); return; }
      const controls = Array.from(dialog.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]')).filter(el=>el.getClientRects().length>0);
      const first=controls[0],last=controls.at(-1);
      if (!first || !last) return;
      if (!dialog.contains(document.activeElement) || (event.shiftKey && document.activeElement===first) || (!event.shiftKey && document.activeElement===last)) {
        event.preventDefault(); (event.shiftKey?last:first).focus();
      }
    };
    document.addEventListener('keydown',keydown);
    return () => document.removeEventListener('keydown',keydown);
  },[]);
  return null;
}
