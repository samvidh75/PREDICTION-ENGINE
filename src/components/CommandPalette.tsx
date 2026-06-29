/**
 * Command Palette — Full Raycast Design Spec
 *
 * Cmd+K global search: stocks, commands, live market data, AI questions.
 * Keyboard-first navigation with staggered spring animations.
 *
 * Design spec: PART 1-10 of COMMAND PALETTE DESIGN document
 * Background: #0D0D0D, border: #2A2A2A, radius: 12px
 * Scale animation: 0.95→1 on open, 1→0.95 on close (0.3s spring)
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ScanPresetDefinition } from '../services/scanner/presets';
import { colors, typography, radius, animation } from '../design/tokens';

/* ─── Types ─────────────────────────────────────────────────────────── */

export interface PaletteAction {
  id: string;
  label: string;
  description?: string;
  icon?: string;
  category: 'page' | 'preset' | 'command' | 'market' | 'ai' | 'recent';
  action: () => void;
  metadata?: string;     // shortcut hint or "live" label
  subtitle?: string;     // secondary text below title
}

interface CommandPaletteProps {
  presets?: (Pick<ScanPresetDefinition, 'id' | 'label' | 'description'> & { icon?: string })[];
  open: boolean;
  onClose: () => void;
}

interface MarketData {
  nifty: { value: number; change: number; changePct: string };
  topGainer: { symbol: string; change: string };
  sentiment: { bullish: number; bearish: number; neutral: number };
}

/* ─── Helpers ────────────────────────────────────────────────────────── */

const RECENT_KEY = 'stockstory_recent_searches';
const MAX_RECENT = 8;

function getRecent(): { label: string; id: string }[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
  } catch { return []; }
}

function saveRecent(item: { label: string; id: string }) {
  const recent = getRecent().filter((r) => r.id !== item.id);
  recent.unshift(item);
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
}

function fuzzyScore(query: string, label: string, description = ''): number {
  const haystack = (label + ' ' + description).toLowerCase();
  const q = query.toLowerCase();
  if (haystack.includes(q)) return q.length * 2;
  let qi = 0;
  for (let i = 0; i < haystack.length && qi < q.length; i++) {
    if (haystack[i] === q[qi]) qi++;
  }
  return qi === q.length ? q.length : 0;
}

const QUESTION_WORDS = ['what', 'which', 'is', 'are', 'best', 'top', 'how', 'why', 'should', 'can', 'tell', 'show', 'find', 'search', 'compare', 'vs', 'versus', 'better', 'good', 'bad', 'undervalued', 'overvalued', 'buy', 'sell', 'hold'];

function isAIQuery(q: string): boolean {
  const words = q.trim().split(/\s+/);
  if (words.length >= 4) return true;
  const lower = q.toLowerCase();
  return QUESTION_WORDS.some((w) => lower.includes(w)) && words.length >= 2;
}

/* ─── Mock Market Data (replace with real API) ──────────────────────── */

const MOCK_MARKET: MarketData = {
  nifty: { value: 25432.50, change: 308.75, changePct: '+1.23%' },
  topGainer: { symbol: 'INFY', change: '+5.2%' },
  sentiment: { bullish: 67, bearish: 18, neutral: 15 },
};

/* ─── Component ──────────────────────────────────────────────────────── */

export function CommandPalette({ presets = [], open, onClose }: CommandPaletteProps) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [visible, setVisible] = useState(false);          // controls scale animation
  const [closing, setClosing] = useState(false);          // triggers close animation
  const [market, setMarket] = useState<MarketData>(MOCK_MARKET);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);

  /* ── Open/close animation ── */
  useEffect(() => {
    if (open) {
      setVisible(true);
      setClosing(false);
      setQuery('');
      setSelectedIdx(0);
      setAiResponse(null);
      setAiLoading(false);
      // Focus with a micro-delay so the DOM is painted
      requestAnimationFrame(() => inputRef.current?.focus());
    } else {
      setVisible(false);
    }
  }, [open]);

  const triggerClose = useCallback(() => {
    setClosing(true);
    setTimeout(() => onClose(), 200);
  }, [onClose]);

  /* ── Simulated live market updates ── */
  useEffect(() => {
    if (!open) return;
    const interval = setInterval(() => {
      setMarket((prev) => ({
        ...prev,
        nifty: {
          ...prev.nifty,
          value: prev.nifty.value + (Math.random() - 0.5) * 20,
          changePct: (prev.nifty.change > 0 ? '+' : '') + (Math.random() * 2 - 0.5).toFixed(2) + '%',
        },
        topGainer: {
          symbol: ['INFY', 'TCS', 'RELIANCE', 'HDFCBANK'][Math.floor(Math.random() * 4)],
          change: (Math.random() > 0.3 ? '+' : '-') + (Math.random() * 8).toFixed(1) + '%',
        },
      }));
    }, 30000);
    return () => clearInterval(interval);
  }, [open]);

  /* ── Build action list ── */
  const actions: PaletteAction[] = useMemo(() => {
    const result: PaletteAction[] = [];

    // Recent searches
    for (const r of getRecent()) {
      result.push({
        id: `recent-${r.id}`,
        label: r.label,
        icon: '🕐',
        category: 'recent',
        action: () => { navigate(`/stock/${r.id}`); saveRecent(r); },
        metadata: 'cmd',
      });
    }

    // Commands
    result.push(
      { id: 'cmd-new', label: 'New Research', icon: '🔬', category: 'command', action: () => navigate('/scanner'), metadata: '⌘N', subtitle: 'Open stock scanner' },
      { id: 'cmd-compare', label: 'Compare Stocks', icon: '⚖️', category: 'command', action: () => navigate('/compare'), metadata: '⌘C', subtitle: 'Side-by-side analysis' },
      { id: 'cmd-tracker', label: 'View Tracker', icon: '📈', category: 'command', action: () => navigate('/watchlist'), metadata: '⌘T', subtitle: 'Your portfolio insights' },
      { id: 'cmd-export', label: 'Export Data', icon: '📤', category: 'command', action: () => {}, metadata: '⌘E', subtitle: 'CSV, PDF, or share' },
    );

    // Scanner presets
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

    // Pages
    result.push(
      { id: 'page-scanner', label: 'Scanner', icon: '🔍', category: 'page', action: () => navigate('/scanner'), metadata: 'G S' },
      { id: 'page-watchlist', label: 'Watchlist', icon: '⭐', category: 'page', action: () => navigate('/watchlist'), metadata: 'G W' },
      { id: 'page-sectors', label: 'Sectors', icon: '📊', category: 'page', action: () => navigate('/sectors'), metadata: 'G E' },
      { id: 'page-methodology', label: 'Methodology', icon: '📖', category: 'page', action: () => navigate('/methodology') },
      { id: 'page-trust', label: 'Trust & Safety', icon: '🛡️', category: 'page', action: () => navigate('/trust') },
    );

    return result;
  }, [presets, navigate]);

  /* ── Market data items ── */
  const marketItems: PaletteAction[] = useMemo(() => [
    {
      id: 'market-nifty',
      label: `Nifty 50: ${market.nifty.value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`,
      description: `${market.nifty.change > 0 ? '↑' : '↓'} ${market.nifty.changePct}`,
      icon: '📊',
      category: 'market',
      action: () => {},
      metadata: 'live',
    },
    {
      id: 'market-gainer',
      label: `Top Gainer: ${market.topGainer.symbol}`,
      description: `${market.topGainer.change}`,
      icon: '🚀',
      category: 'market',
      action: () => {},
      metadata: 'live',
    },
    {
      id: 'market-sentiment',
      label: `Market Sentiment: ${market.sentiment.bullish}% Bullish`,
      description: `${market.sentiment.bearish}% Bearish · ${market.sentiment.neutral}% Neutral`,
      icon: '📉',
      category: 'market',
      action: () => {},
      metadata: 'live',
    },
  ], [market]);

  /* ── AI suggestion ── */
  const aiItem: PaletteAction | null = useMemo(() => {
    if (!query.trim() || !isAIQuery(query)) return null;
    return {
      id: 'ai-ask',
      label: `Ask AI: ${query.length > 60 ? query.slice(0, 57) + '...' : query}`,
      description: 'AI will analyze and answer',
      icon: '✨',
      category: 'ai',
      action: async () => {
        setAiLoading(true);
        setAiResponse(null);
        // Simulated AI response (replace with real Claude API)
        await new Promise((r) => setTimeout(r, 1200));
        setAiLoading(false);
        setAiResponse(`📊 **Market Analysis: "${query}"**\n\nBased on current data, here's what I found:\n\n• Nifty 50 is at ${market.nifty.value.toLocaleString('en-IN')} (${market.nifty.changePct})\n• Market sentiment is ${market.sentiment.bullish}% bullish\n• Top sectors: IT, Banking, Pharma\n\nFor more detailed analysis, try refining your question with specific stocks or sectors.`);
      },
      metadata: 'Ask AI',
    };
  }, [query, market]);

  /* ── Filtered results ── */
  const allItems = useMemo(() => {
    if (!query.trim()) return actions;
    const scored = actions
      .map((act) => ({ act, score: fuzzyScore(query, act.label, act.description ?? '') }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score || a.act.label.localeCompare(b.act.label));
    return scored.map((x) => x.act);
  }, [query, actions]);

  /* ── Reset index on results change ── */
  useEffect(() => setSelectedIdx(0), [allItems.length]);

  const resultsWithAI = useMemo(() => {
    const r = [...allItems];
    if (aiItem) r.push(aiItem);
    return r;
  }, [allItems, aiItem]);

  /* ── Keyboard ── */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') { triggerClose(); return; }
      if (e.key === 'ArrowDown' || (e.key === 'Tab' && !e.shiftKey)) {
        e.preventDefault();
        setSelectedIdx((i) => Math.min(i + 1, resultsWithAI.length - 1));
        return;
      }
      if (e.key === 'ArrowUp' || (e.key === 'Tab' && e.shiftKey)) {
        e.preventDefault();
        setSelectedIdx((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === 'Enter' && resultsWithAI[selectedIdx]) {
        e.preventDefault();
        const item = resultsWithAI[selectedIdx];
        if (item.category === 'recent' || item.id.startsWith('recent-')) {
          saveRecent({ label: item.label, id: item.id.replace('recent-', '') });
        }
        item.action();
        if (item.category !== 'ai') triggerClose();
      }
    },
    [triggerClose, resultsWithAI, selectedIdx],
  );

  /* ── Click handler ── */
  const handleClick = useCallback(
    (item: PaletteAction) => {
      if (item.category === 'recent' || item.id.startsWith('recent-')) {
        saveRecent({ label: item.label, id: item.id.replace('recent-', '') });
      }
      item.action();
      if (item.category !== 'ai') triggerClose();
    },
    [triggerClose],
  );

  /* ── Category grouping for display ── */
  const categoryOrder = ['recent', 'command', 'preset', 'page', 'market', 'ai'] as const;
  const categoryLabels: Record<string, string> = {
    recent: 'Recent Searches',
    command: 'Commands',
    preset: 'Scanner Presets',
    page: 'Pages',
    market: 'Markets',
    ai: 'AI',
  };

  /* ── Separated display: normal results + market always visible ── */
  const groupedSections = useMemo(() => {
    const sections: { cat: string; label: string; items: PaletteAction[] }[] = [];
    for (const cat of categoryOrder) {
      let items: PaletteAction[];
      if (cat === 'market') {
        items = marketItems; // always show market
      } else if (cat === 'ai') {
        items = aiItem ? [aiItem] : [];
      } else {
        items = resultsWithAI.filter((r) => r.category === cat);
      }
      if (items.length) {
        sections.push({ cat, label: categoryLabels[cat] ?? cat, items });
      }
    }
    return sections;
  }, [resultsWithAI, marketItems, aiItem]);

  // Don't render at all when not open and not animating
  if (!open && !closing) return null;

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9998,
        background: closing ? 'rgba(0,0,0,0)' : 'rgba(0,0,0,0.4)',
        backdropFilter: closing ? 'blur(0px)' : 'blur(10px)',
        WebkitBackdropFilter: closing ? 'blur(0px)' : 'blur(10px)',
        display: 'flex', alignItems: isMobile ? 'flex-end' : 'flex-start',
        justifyContent: 'center',
        paddingTop: isMobile ? 0 : '12vh',
        paddingBottom: isMobile ? '16px' : 0,
        transition: `background ${animation.slow}, backdrop-filter ${animation.slow}`,
      }}
      onClick={triggerClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#0D0D0D',
          borderRadius: isMobile ? '12px 12px 0 0' : '12px',
          width: isMobile ? 'calc(100vw - 16px)' : 'min(90vw, 600px)',
          maxWidth: 600,
          border: '1px solid #2A2A2A',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          maxHeight: isMobile ? '80vh' : 'min(70vh, 640px)',
          fontFamily: typography.fontFamily,
          transform: visible && !closing ? 'scale(1)' : 'scale(0.95)',
          opacity: visible && !closing ? 1 : 0,
          transition: `transform ${animation.slow}, opacity 0.2s ease`,
        }}
      >
        {/* ── Zone 1: Search Input ── */}
        <div style={{
          height: 48, display: 'flex', alignItems: 'center',
          padding: '0 16px', gap: 12,
          borderBottom: '1px solid #2A2A2A',
          background: '#000000',
        }}>
          <span style={{ fontSize: 16, color: '#B0B0B0', flexShrink: 0 }}>🔍</span>
          <input
            ref={inputRef}
            placeholder="Search stocks, commands, insights…"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setAiResponse(null); }}
            onKeyDown={handleKeyDown}
            style={{
              flex: 1, border: 'none', outline: 'none',
              fontSize: isMobile ? 16 : 15, fontWeight: 400,
              background: 'transparent', color: '#FFFFFF',
              fontFamily: typography.fontFamily,
              minWidth: 0,
            }}
          />
          {aiItem && (
            <span style={{
              fontSize: 13, fontWeight: 400, color: '#808080',
              whiteSpace: 'nowrap', flexShrink: 0,
            }}>
              Ask AI <kbd style={{
                background: '#1A1A1A', border: '1px solid #333',
                borderRadius: 4, padding: '1px 5px', fontSize: 11,
                fontFamily: 'inherit', color: '#808080',
              }}>Tab</kbd>
            </span>
          )}
        </div>

        {/* ── Zone 2: Suggestions ── */}
        <div ref={listRef} style={{ overflowY: 'auto', flex: 1, padding: '8px 0' }}>
          {/* AI Response */}
          {aiResponse && (
            <div style={{
              margin: '0 12px 8px', padding: 12,
              background: '#141414', borderRadius: 8,
              fontSize: 13, lineHeight: '1.6', color: '#C0C0C0',
              border: '1px solid #1A1A1A',
              whiteSpace: 'pre-wrap',
            }}>
              {aiResponse}
            </div>
          )}

          {/* AI Loading */}
          {aiLoading && (
            <div style={{
              margin: '0 12px 8px', padding: 12,
              background: '#141414', borderRadius: 8,
              display: 'flex', alignItems: 'center', gap: 10,
              fontSize: 13, color: '#A0A0A0',
            }}>
              <span className="raycast-spinner" style={{
                display: 'inline-block', width: 14, height: 14,
                border: '2px solid #333', borderTopColor: '#FF6363',
                borderRadius: '50%',
              }} />
              Analyzing your question…
            </div>
          )}

          {/* Empty state */}
          {groupedSections.length === 0 && !aiLoading && !aiResponse && (
            <div style={{ padding: '24px 16px', textAlign: 'center' }}>
              <p style={{ fontSize: 14, color: '#707070', margin: '0 0 16px' }}>
                {query.trim() ? `No matching results for "${query}"` : 'Type to search or ask a question'}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { label: 'Popular: Top movers today', q: 'top movers today' },
                  { label: 'Popular: High conviction stocks', q: 'high conviction stocks' },
                  { label: 'Popular: Best dividend stocks', q: 'best dividend stocks' },
                ].map((suggestion) => (
                  <button
                    key={suggestion.q}
                    onClick={() => {
                      setQuery(suggestion.q);
                      inputRef.current?.focus();
                    }}
                    style={{
                      background: '#141414', border: '1px solid #1A1A1A',
                      borderRadius: 8, padding: '8px 12px',
                      color: '#A0A0A0', fontSize: 13,
                      cursor: 'pointer', textAlign: 'left',
                      fontFamily: typography.fontFamily,
                      transition: `background 0.15s ease`,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#1A1A1A')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = '#141414')}
                  >
                    {suggestion.label}
                  </button>
                ))}
                {!isAIQuery(query) && query.trim() && (
                  <button
                    onClick={() => {
                      setQuery(`What stocks ${query.trim()}?`);
                      inputRef.current?.focus();
                    }}
                    style={{
                      background: 'transparent', border: '1px dashed #333',
                      borderRadius: 8, padding: '8px 12px',
                      color: '#FF6363', fontSize: 13,
                      cursor: 'pointer', textAlign: 'left',
                      fontFamily: typography.fontFamily,
                    }}
                  >
                    ✨ Ask AI: "What stocks {query.trim()}?"
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Sections */}
          {groupedSections.map((section, sectionIdx) => (
            <div key={section.cat}>
              {/* Section header */}
              <p style={{
                fontSize: 11, fontWeight: 600, color: '#606060',
                textTransform: 'uppercase', letterSpacing: '0.05em',
                padding: '12px 16px 4px', margin: 0,
              }}>
                {section.label}
              </p>

              {section.items.map((item, itemIdx) => {
                // Find global index for selection tracking
                const globalIdx = resultsWithAI.indexOf(item);
                const isSelected = selectedIdx === globalIdx;

                return (
                  <button
                    key={item.id}
                    onClick={() => handleClick(item)}
                    onMouseEnter={() => setSelectedIdx(globalIdx)}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 12,
                      width: '100%', padding: isMobile ? '10px 16px' : '8px 16px',
                      minHeight: isMobile ? 56 : 48,
                      border: 'none',
                      background: isSelected ? '#1A1A1A' : 'transparent',
                      cursor: 'pointer', textAlign: 'left',
                      color: colors.textPrimary,
                      fontFamily: typography.fontFamily,
                      transition: `background 0.1s ease`,
                      outline: isSelected ? '2px solid #FF6363' : 'none',
                      outlineOffset: '-2px',
                      animation: visible && !closing ? `fadeIn 0.3s var(--ease-raycast) forwards` : 'none',
                      animationDelay: `${sectionIdx * 0.03 + itemIdx * 0.02}s`,
                      opacity: 0,
                    }}
                  >
                    {/* Icon */}
                    <span style={{
                      fontSize: 16, width: 24, textAlign: 'center',
                      flexShrink: 0, marginTop: 2,
                      color: item.category === 'command' ? '#0A84FF'
                           : item.category === 'market' ? '#34C759'
                           : item.category === 'ai' ? '#FF6363'
                           : item.category === 'recent' ? '#808080'
                           : '#A0A0A0',
                    }}>
                      {item.icon}
                    </span>

                    {/* Title + subtitle */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{
                        fontWeight: 400, fontSize: 15, display: 'block',
                        color: '#FFFFFF', lineHeight: '1.4',
                      }}>
                        {item.label}
                      </span>
                      {(item.description || item.subtitle) && (
                        <span style={{
                          fontSize: 13, color: '#808080',
                          display: 'block', whiteSpace: 'nowrap',
                          overflow: 'hidden', textOverflow: 'ellipsis',
                          lineHeight: '1.3',
                        }}>
                          {item.description || item.subtitle}
                        </span>
                      )}
                    </div>

                    {/* Right: metadata + arrow */}
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      flexShrink: 0, marginTop: 2,
                    }}>
                      {item.metadata && (
                        <span style={{
                          fontSize: 12, color:
                            item.metadata === 'live' ? '#34C759'
                            : item.metadata === 'Ask AI' ? '#FF6363'
                            : '#808080',
                          display: 'flex', alignItems: 'center', gap: 4,
                        }}>
                          {item.metadata === 'live' && (
                            <span style={{
                              display: 'inline-block', width: 5, height: 5,
                              borderRadius: '50%', background: '#34C759',
                              animation: 'badgePulse 2s infinite',
                            }} />
                          )}
                          {item.metadata}
                        </span>
                      )}
                      <span style={{
                        fontSize: 14, color: isSelected ? '#FFFFFF' : '#808080',
                        opacity: isSelected ? 1 : 0,
                        transition: 'opacity 0.15s ease',
                      }}>
                        →
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* ── Zone 3: Footer ── */}
        {!isMobile && (
          <div style={{
            display: 'flex', gap: 8, padding: '12px 16px',
            borderTop: '1px solid #2A2A2A',
            background: '#000000',
          }}>
            {[
              { label: 'Open', hint: '↵', action: () => { resultsWithAI[selectedIdx]?.action(); triggerClose(); } },
              { label: 'Actions', hint: '⌘K', action: () => {} },
              { label: 'Help', hint: '?', action: () => window.dispatchEvent(new KeyboardEvent('keydown', { key: '?' })) },
            ].map((btn) => (
              <button
                key={btn.label}
                onClick={btn.action}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: 8, height: 36,
                  background: '#FFFFFF', border: 'none',
                  borderRadius: 6, padding: '8px 16px',
                  fontSize: 14, fontWeight: 500, fontFamily: typography.fontFamily,
                  color: '#000000', cursor: 'pointer',
                  transition: `background 0.15s ease, transform 0.1s ease`,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#F5F5F5')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#FFFFFF')}
                onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.98)')}
                onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              >
                {btn.label}
                <span style={{ fontSize: 11, color: '#707070', fontWeight: 400 }}>{btn.hint}</span>
              </button>
            ))}
          </div>
        )}

        {/* Mobile footer: vertical stack */}
        {isMobile && (
          <div style={{
            display: 'flex', flexDirection: 'column', gap: 8,
            padding: '12px 16px',
            borderTop: '1px solid #2A2A2A',
            background: '#000000',
          }}>
            <button
              onClick={() => { resultsWithAI[selectedIdx]?.action(); triggerClose(); }}
              style={{
                width: '100%', height: 48,
                background: '#FFFFFF', border: 'none',
                borderRadius: 8, fontSize: 16, fontWeight: 500,
                fontFamily: typography.fontFamily,
                color: '#000000', cursor: 'pointer',
              }}
            >
              Open
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
