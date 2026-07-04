/**
 * Command Palette / Quick Search
 * Raycast-style command interface for stock search and quick actions
 * Keyboard: Cmd+K to open, Esc to close, Arrow keys to navigate
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { colors } from '../design/tokens';

interface PaletteItem {
  id: string;
  label: string;
  description: string;
  icon: string;
  action: () => void;
  category: 'search' | 'action' | 'history';
}

interface CommandPaletteProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function CommandPalette({ isOpen = false, onClose }: CommandPaletteProps) {
  const [open, setOpen] = useState(isOpen);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [items, setItems] = useState<PaletteItem[]>([]);
  const [searchHistory, setSearchHistory] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('stockSearchHistory') || '[]');
    } catch {
      return [];
    }
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
      setSelectedIndex(0);
    }
  }, [open]);

  useEffect(() => {
    const newItems: PaletteItem[] = [];

    if (query.trim()) {
      newItems.push({
        id: 'search',
        label: `Search: ${query.toUpperCase()}`,
        description: 'Press Enter to search',
        icon: '🔍',
        action: () => {
          navigate(`/stock/${query.toUpperCase()}`);
          addToHistory(query.toUpperCase());
          setOpen(false);
        },
        category: 'search',
      });
    } else {
      newItems.push(
        {
          id: 'trending',
          label: 'Trending Stocks',
          description: 'View trending stocks today',
          icon: '📈',
          action: () => {
            navigate('/screener?filter=trending');
            setOpen(false);
          },
          category: 'action',
        },
        {
          id: 'gainers',
          label: 'Top Gainers',
          description: 'Best performing stocks',
          icon: '🟢',
          action: () => {
            navigate('/screener?filter=gainers');
            setOpen(false);
          },
          category: 'action',
        },
        {
          id: 'losers',
          label: 'Top Losers',
          description: 'Worst performing stocks',
          icon: '🔴',
          action: () => {
            navigate('/screener?filter=losers');
            setOpen(false);
          },
          category: 'action',
        }
      );

      if (searchHistory.length > 0) {
        newItems.push({
          id: 'divider-history',
          label: 'Recent Searches',
          description: '',
          icon: '⏱️',
          action: () => {},
          category: 'history',
        });

        searchHistory.slice(0, 5).forEach((symbol) => {
          newItems.push({
            id: `history-${symbol}`,
            label: symbol,
            description: 'View quote',
            icon: '📝',
            action: () => {
              navigate(`/stock/${symbol}`);
              setOpen(false);
            },
            category: 'history',
          });
        });
      }
    }

    setItems(newItems);
  }, [query, searchHistory, navigate]);

  const addToHistory = (symbol: string) => {
    const newHistory = [symbol, ...searchHistory.filter((s) => s !== symbol)].slice(0, 10);
    setSearchHistory(newHistory);
    try {
      localStorage.setItem('stockSearchHistory', JSON.stringify(newHistory));
    } catch {
      // localStorage error
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((i) => (i + 1) % items.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((i) => (i - 1 + items.length) % items.length);
        break;
      case 'Enter':
        e.preventDefault();
        items[selectedIndex]?.action();
        break;
    }
  };

  if (!open) return null;

  return (
    <>
      <div style={{position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 999}} onClick={() => setOpen(false)} />
      <div style={{position: 'fixed', top: '10%', left: '50%', transform: 'translateX(-50%)', width: 'min(600px, 90vw)', maxHeight: '70vh', backgroundColor: colors.surface, borderRadius: '12px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', zIndex: 1000, display: 'flex', flexDirection: 'column', overflow: 'hidden'}}>
        <div style={{padding: '16px', borderBottom: `1px solid ${colors.border}`}}>
          <input ref={inputRef} type="text" placeholder="Search stocks... (⌘K)" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={handleKeyDown} style={{width: '100%', backgroundColor: colors.canvas, color: colors.textPrimary, border: 'none', padding: '12px 16px', fontSize: '16px', fontFamily: 'monospace', borderRadius: '8px', outline: 'none'}} />
        </div>
        <div style={{flex: 1, overflowY: 'auto'}}>
          {items.length === 0 ? (
            <div style={{padding: '32px 16px', textAlign: 'center', color: colors.textSecondary}}>No results</div>
          ) : items.map((item, idx) => {
            const isSelected = idx === selectedIndex;
            if (item.id === 'divider-history') return <div key={item.id} style={{padding: '12px 16px 4px', fontSize: '12px', fontWeight: '600', color: colors.textTertiary, textTransform: 'uppercase'}}>{item.label}</div>;
            return <button key={item.id} onClick={() => item.action()} style={{width: '100%', padding: '12px 16px', backgroundColor: isSelected ? colors.primary : colors.surface, color: isSelected ? '#fff' : colors.textPrimary, border: 'none', textAlign: 'left', cursor: 'pointer', fontSize: '14px'}}><div style={{display: 'flex', gap: '12px'}}><span>{item.icon}</span><div><div>{item.label}</div><div style={{fontSize: '12px', opacity: 0.6}}>{item.description}</div></div></div></button>;
          })}
        </div>
      </div>
    </>
  );
}
