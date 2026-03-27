import { useEffect } from 'react';

export interface KeyboardShortcut {
  key: string; // e.g., 'k', 'Enter', 'Escape'
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  handler: (e: KeyboardEvent) => void;
}

/**
 * Hook for handling keyboard shortcuts
 * Example: useKeyboardShortcuts([
 *   { key: 'k', ctrl: true, handler: () => openSearch() }
 * ])
 */
export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        const keyMatches = e.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatches = shortcut.ctrl ? e.ctrlKey || e.metaKey : !e.ctrlKey && !e.metaKey;
        const shiftMatches = shortcut.shift ? e.shiftKey : !e.shiftKey;
        const altMatches = shortcut.alt ? e.altKey : !e.altKey;

        if (keyMatches && ctrlMatches && shiftMatches && altMatches) {
          e.preventDefault();
          shortcut.handler(e);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}

/**
 * Common keyboard shortcuts for FamilyHub
 */
export const COMMON_SHORTCUTS = {
  SEARCH: { key: 'k', ctrl: true },
  ESCAPE: { key: 'Escape' },
  ENTER: { key: 'Enter' },
  TAB: { key: 'Tab' },
  NEW_MESSAGE: { key: 'n', ctrl: true },
  NEW_POST: { key: 'p', ctrl: true },
  HELP: { key: '?' },
} as const;
