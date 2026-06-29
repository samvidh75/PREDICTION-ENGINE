/**
 * Global keyboard shortcut hook — Part 4 of StockStory Master Prompt
 *
 * Shortcuts:
 *   ↑ ↓       → Navigate search/palette results
 *   Enter     → Go to selected stock / page action
 *   C         → Compare stocks
 *   T         → Track / add to watchlist
 *   /         → Focus search
 *   ?         → Show keyboard help overlay
 *   Escape    → Close overlay / palette / modal
 *   G then N  → Go to Scanner ("G" + "S" for scanner, "G" + "H" for home, etc.)
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export interface ShortcutMap {
  'go-home': () => void;
  'go-scanner': () => void;
  'go-watchlist': () => void;
  'go-sectors': () => void;
  'focus-search': () => void;
  'toggle-help': () => void;
  'toggle-compare': () => void;
  'toggle-track': () => void;
  'escape': () => void;
  'nav-up': () => void;
  'nav-down': () => void;
  'nav-enter': () => void;
  'open-palette': () => void;
}

export interface RegisteredShortcut {
  key: string;
  description: string;
  category: 'navigation' | 'actions' | 'search';
}

// ── Display Catalog ────────────────────────────────────────────────────

export const SHORTCUT_CATALOG: RegisteredShortcut[] = [
  // Navigation
  { key: 'G → H', description: 'Go to Home', category: 'navigation' },
  { key: 'G → S', description: 'Go to Scanner', category: 'navigation' },
  { key: 'G → W', description: 'Go to Watchlist', category: 'navigation' },
  { key: 'G → E', description: 'Go to Sectors', category: 'navigation' },
  // Actions
  { key: '⌘N', description: 'New research / scanner', category: 'actions' },
  { key: '⌘T', description: 'Track / toggle watchlist', category: 'actions' },
  { key: '⌘C', description: 'Compare stocks', category: 'actions' },
  { key: 'C', description: 'Compare selected stock', category: 'actions' },
  { key: 'T', description: 'Track / toggle watchlist', category: 'actions' },
  { key: '/', description: 'Focus global search', category: 'search' },
  { key: '?', description: 'Toggle keyboard help', category: 'search' },
  { key: '⌘K', description: 'Open command palette', category: 'search' },
  { key: 'Esc', description: 'Close overlay / modal', category: 'search' },
];

// ── Hook ───────────────────────────────────────────────────────────────

interface UseKeyboardShortcutsOptions {
  handlers: Partial<ShortcutMap>;
  enabled?: boolean;
}

export function useKeyboardShortcuts({ handlers, enabled = true }: UseKeyboardShortcutsOptions) {
  const navigate = useNavigate();
  const [gKeyPressed, setGKeyPressed] = useState(false);
  const gTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handler = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Don't capture inside inputs unless it's Escape or ?
      const target = event.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      if (isInput && event.key !== 'Escape' && event.key !== '?' && event.key !== '/') return;

      const key = event.key;

      // G-prefix navigation: press G then a second key
      if (key === 'g' || key === 'G') {
        if (gKeyPressed) {
          setGKeyPressed(false);
          return;
        }
        setGKeyPressed(true);
        if (gTimerRef.current) clearTimeout(gTimerRef.current);
        gTimerRef.current = setTimeout(() => setGKeyPressed(false), 500);
        return;
      }

      if (gKeyPressed) {
        setGKeyPressed(false);
        if (gTimerRef.current) clearTimeout(gTimerRef.current);

        switch (key.toLowerCase()) {
          case 'h': navigate('/'); return;
          case 's': navigate('/scanner'); return;
          case 'w': navigate('/watchlist'); return;
          case 'e': navigate('/sectors'); return;
        }
        return;
      }

      // Cmd+ shortcuts (macOS) / Ctrl+ shortcuts (Windows)
      if ((event.metaKey || event.ctrlKey) && event.key === 'n') {
        event.preventDefault();
        navigate('/scanner');
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key === 't') {
        event.preventDefault();
        handlers['toggle-track']?.();
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key === 'c') {
        event.preventDefault();
        handlers['toggle-compare']?.();
        return;
      }

      switch (key.toLowerCase()) {
        case '?':
          event.preventDefault();
          handlers['toggle-help']?.();
          break;
        case 'c':
          if (!isInput) { event.preventDefault(); handlers['toggle-compare']?.(); }
          break;
        case 't':
          if (!isInput) { event.preventDefault(); handlers['toggle-track']?.(); }
          break;
        case '/':
          if (isInput && event.key === '/') break; // let / type in inputs
          event.preventDefault();
          handlers['focus-search']?.();
          break;
        case 'escape':
          handlers['escape']?.();
          break;
        case 'arrowup':
          event.preventDefault();
          handlers['nav-up']?.();
          break;
        case 'arrowdown':
          event.preventDefault();
          handlers['nav-down']?.();
          break;
        case 'enter':
          handlers['nav-enter']?.();
          break;
      }
    },
    [enabled, handlers, navigate, gKeyPressed],
  );

  useEffect(() => {
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handler]);
}

// ── Help Overlay Component ─────────────────────────────────────────────

interface KeyboardHelpOverlayProps {
  open: boolean;
  onClose: () => void;
}

export function KeyboardHelpOverlay({ open, onClose }: KeyboardHelpOverlayProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const categories = ['navigation', 'actions', 'search'] as const;
  const labels: Record<string, string> = {
    navigation: 'Navigation',
    actions: 'Actions',
    search: 'Search & Help',
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(4px)',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#0A0A0A', borderRadius: 16,
          padding: '28px 32px', maxWidth: 480, width: '90%',
          border: '1px solid #1A1A1A',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#ffffff' }}>Keyboard Shortcuts</h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', padding: 4, color: '#707070' }}
          >
            ✕
          </button>
        </div>

        {categories.map((cat) => (
          <div key={cat} style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#707070', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px' }}>
              {labels[cat]}
            </p>
            <div style={{ display: 'grid', gap: 6 }}>
              {SHORTCUT_CATALOG.filter((s) => s.category === cat).map((s) => (
                <div key={s.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 14, color: '#A0A0A0' }}>{s.description}</span>
                  <kbd
                    style={{
                      background: '#1A1A1A', border: '1px solid #333',
                      borderRadius: 6, padding: '2px 8px',
                      fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
                      color: '#A0A0A0',
                    }}
                  >
                    {s.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        ))}

        <p style={{ fontSize: 12, color: '#707070', margin: '12px 0 0', textAlign: 'center' }}>
          Press <kbd style={{ background: '#1A1A1A', border: '1px solid #333', borderRadius: 4, padding: '1px 6px', fontSize: 11, fontWeight: 600, fontFamily: 'inherit', color: '#A0A0A0' }}>?</kbd> anytime to reopen
        </p>
      </div>
    </div>
  );
}
