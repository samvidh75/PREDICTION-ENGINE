/**
 * Command Palette — Part 5 of StockStory Master Prompt
 *
 * Cmd+K / Ctrl+K fuzzy-finder for pages, presets, and actions.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ScanPresetDefinition } from '../services/scanner/presets';

/* ─── Types ─────────────────────────────────────────────────────────── */

export interface PaletteAction {
  id: string;
  label: string;
  description?: string;
  icon?: string;
  category: 'page' | 'preset' | 'action' | 'viewport';
  action: () => void;
}

interface CommandPaletteProps {
  presets?: (Pick<ScanPresetDefinition, 'id' | 'label' | 'description'> & { icon?: string })[];
  open: boolean;
  onClose: () => void;
}

/* ─── Fuzzy match helper ────────────────────────────────────────────── */

function fuzzyScore(query: string, label: string, description = ''): number {
  const haystack = (label + ' ' + description).toLowerCase();
  const q = query.toLowerCase();
  if (haystack.includes(q)) return q.length * 2;       // substring = high
  let qi = 0;
  for (let i = 0; i < haystack.length && qi < q.length; i++) {
    if (haystack[i] === q[qi]) qi++;
  }
  if (qi === q.length) return q.length;                 // fuzzy = medium
  return 0;                                             // no match
}

/* ─── Component ──────────────────────────────────────────────────────── */

export function CommandPalette({ presets = [], open, onClose }: CommandPaletteProps) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);

  // Build action list
  const actions: PaletteAction[] = useMemo(() => {
    const result: PaletteAction[] = [];

    // Pages
    result.push(
      { id: 'page-home', label: 'Home', icon: '🏠', category: 'page', action: () => navigate('/') },
      { id: 'page-scanner', label: 'Scanner', icon: '🔍', category: 'page', action: () => navigate('/scanner') },
      { id: 'page-watchlist', label: 'Watchlist', icon: '⭐', category: 'page', action: () => navigate('/watchlist') },
      { id: 'page-sectors', label: 'Sectors', icon: '📊', category: 'page', action: () => navigate('/sectors') },
    );

    // Presets
    if (presets.length) {
      for (const p of presets) {
        result.push({
          id: `preset-${p.id}`,
          label: p.label,
          description: p.description,
          icon: p.icon ?? '📋',
          category: 'preset',
          action: () => navigate(`/scanner?preset=${p.id}`),
        });
      }
    }

    // Viewport
    result.push(
      { id: 'vp-desktop', label: 'Desktop View', icon: '🖥️', category: 'viewport', action: () => window.dispatchEvent(new CustomEvent('st-viewport', { detail: 'desktop' })) },
      { id: 'vp-mobile', label: 'Mobile View', icon: '📱', category: 'viewport', action: () => window.dispatchEvent(new CustomEvent('st-viewport', { detail: 'mobile' })) },
      { id: 'vp-compact', label: 'Compact View', icon: '📄', category: 'viewport', action: () => window.dispatchEvent(new CustomEvent('st-viewport', { detail: 'compact' })) },
    );

    return result;
  }, [presets, navigate]);

  // Filtered results
  const results = useMemo(() => {
    if (!query.trim()) return actions;
    const scored = actions
      .map((act) => ({ act, score: fuzzyScore(query, act.label, act.description) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score || a.act.label.localeCompare(b.act.label));
    return scored.map((x) => x.act);
  }, [query, actions]);

  // Reset index on new results
  useEffect(() => setSelectedIdx(0), [results.length]);

  // Focus input on open
  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Keyboard
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx((i) => Math.min(i + 1, results.length - 1)); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx((i) => Math.max(i - 1, 0)); return; }
      if (e.key === 'Enter' && results[selectedIdx]) {
        e.preventDefault();
        results[selectedIdx].action();
        onClose();
      }
    },
    [onClose, results, selectedIdx],
  );

  // Click handler
  const handleClick = useCallback(
    (action: PaletteAction) => {
      action.action();
      onClose();
    },
    [onClose],
  );

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9998,
        background: 'rgba(0,0,0,0.35)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: '12vh',
        backdropFilter: 'blur(4px)',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 16,
          width: '90%', maxWidth: 520,
          boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
          overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          maxHeight: '60vh',
        }}
      >
        {/* ── Input ── */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e5ea' }}>
          <input
            ref={inputRef}
            autoFocus
            placeholder="Search pages, presets, viewport…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{
              width: '100%', border: 'none', outline: 'none',
              fontSize: 16, background: 'transparent',
              color: '#1c1c1e', fontFamily: 'inherit',
            }}
          />
        </div>

        {/* ── Results ── */}
        <div ref={listRef} style={{ overflowY: 'auto', padding: '6px 0', flex: 1 }}>
          {results.length === 0 && (
            <p style={{ padding: '20px 16px', color: '#8e8e93', fontSize: 14, textAlign: 'center' }}>
              No results for "{query}"
            </p>
          )}

          {/* Group by category */}
          {(['page', 'preset', 'viewport'] as const).map((cat) => {
            const items = results.filter((r) => r.category === cat);
            if (!items.length) return null;
            return (
              <div key={cat}>
                <p
                  style={{
                    fontSize: 11, fontWeight: 600, color: '#8e8e93',
                    textTransform: 'uppercase', letterSpacing: '0.05em',
                    padding: '8px 16px 4px', margin: 0,
                  }}
                >
                  {cat === 'page' ? 'Pages' : cat === 'preset' ? 'Scanner Presets' : 'Viewport'}
                </p>
                {items.map((item, i) => {
                  const globalIdx = results.indexOf(item);
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleClick(item)}
                      onMouseEnter={() => setSelectedIdx(globalIdx)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        width: '100%', padding: '8px 16px',
                        border: 'none', background: selectedIdx === globalIdx ? '#f2f2f7' : 'transparent',
                        cursor: 'pointer', textAlign: 'left', fontSize: 14,
                        color: '#1c1c1e', fontFamily: 'inherit',
                        transition: 'background 0.1s',
                      }}
                    >
                      <span style={{ fontSize: 18 }}>{item.icon}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontWeight: 500, display: 'block' }}>{item.label}</span>
                        {item.description && (
                          <span style={{ fontSize: 12, color: '#8e8e93', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {item.description}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* ── Footer ── */}
        <div
          style={{
            padding: '8px 16px', borderTop: '1px solid #e5e5ea',
            display: 'flex', gap: 16, fontSize: 12, color: '#8e8e93',
          }}
        >
          <span>↑↓ Navigate</span>
          <span>↵ Open</span>
          <span>Esc Close</span>
        </div>
      </div>
    </div>
  );
}
