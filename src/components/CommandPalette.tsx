import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, TrendingUp, Zap } from 'lucide-react';
import { colors, typography } from '../design/tokens';

interface CommandItem {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  action: () => void;
  category: 'stock' | 'page' | 'action';
}

export const CommandPalette: React.FC = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(!isOpen);
        setQuery('');
        setSelectedIndex(0);
      }

      if (isOpen && e.key === 'Escape') {
        setIsOpen(false);
      }

      if (isOpen && e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(i => (i + 1) % filteredItems.length);
      }

      if (isOpen && e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(i => (i - 1 + filteredItems.length) % filteredItems.length);
      }

      if (isOpen && e.key === 'Enter') {
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          filteredItems[selectedIndex].action();
          setIsOpen(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, query, selectedIndex]);

  const allItems: CommandItem[] = useMemo(() => [
    {
      id: 'scanner',
      title: 'Go to Scanner',
      description: 'View stock scanner with filters',
      icon: <Zap size={16} />,
      action: () => {
        navigate('/scanner');
        setIsOpen(false);
      },
      category: 'page',
    },
    {
      id: 'watchlist',
      title: 'Go to Watchlist',
      description: 'View your watchlist',
      icon: <TrendingUp size={16} />,
      action: () => {
        navigate('/watchlist');
        setIsOpen(false);
      },
      category: 'page',
    },
    {
      id: 'chat',
      title: 'Go to Chat',
      description: 'Open AI chat assistant',
      icon: <Search size={16} />,
      action: () => {
        navigate('/chat');
        setIsOpen(false);
      },
      category: 'page',
    },
  ], [navigate]);

  const filteredItems = useMemo(() => {
    if (!query) return allItems;
    const q = query.toLowerCase();
    const stockMatch: CommandItem[] = [];
    if (q.length > 0 && q.length <= 10 && /^[a-z0-9]+$/i.test(q)) {
      stockMatch.push({
        id: `stock-${q}`,
        title: `Search Stock: ${q.toUpperCase()}`,
        description: 'Jump to this stock',
        icon: <TrendingUp size={16} />,
        action: () => {
          navigate(`/stock/${q.toUpperCase()}`);
          setIsOpen(false);
        },
        category: 'stock',
      });
    }
    return [
      ...stockMatch,
      ...allItems.filter(item =>
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q)
      ),
    ];
  }, [query, allItems, navigate]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  if (!isOpen) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'center',
      paddingTop: '100px',
      zIndex: 10000,
    }}>
      <div style={{
        width: '100%',
        maxWidth: '600px',
        backgroundColor: colors.card,
        borderRadius: '12px',
        border: `1px solid ${colors.border}`,
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4)',
        overflow: 'hidden',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          padding: '16px',
          borderBottom: `1px solid ${colors.border}`,
          gap: '12px',
        }}>
          <Search size={20} color={colors.textSecondary} />
          <input
            autoFocus
            type="text"
            placeholder="Search stocks or commands..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              backgroundColor: 'transparent',
              color: colors.textPrimary,
              fontSize: typography.body.desktop.size,
              fontFamily: 'inherit',
            }}
          />
          <div style={{ color: colors.textSecondary, fontSize: '12px', opacity: 0.6 }}>
            ⌘K
          </div>
        </div>

        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {filteredItems.length === 0 ? (
            <div style={{
              padding: '32px 16px',
              textAlign: 'center',
              color: colors.textSecondary,
              fontSize: '14px',
            }}>
              No results found
            </div>
          ) : (
            filteredItems.map((item, index) => (
              <div
                key={item.id}
                onClick={() => {
                  item.action();
                  setIsOpen(false);
                }}
                onMouseEnter={() => setSelectedIndex(index)}
                style={{
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  cursor: 'pointer',
                  backgroundColor: index === selectedIndex ? `${colors.primary}20` : 'transparent',
                  borderLeft: index === selectedIndex ? `3px solid ${colors.primary}` : '3px solid transparent',
                }}
              >
                <div style={{ color: colors.primary, flexShrink: 0 }}>
                  {item.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    color: colors.textPrimary,
                    fontSize: '14px',
                    fontWeight: 500,
                  }}>
                    {item.title}
                  </div>
                  <div style={{
                    color: colors.textSecondary,
                    fontSize: '12px',
                    marginTop: '2px',
                  }}>
                    {item.description}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div style={{
          padding: '8px 16px',
          borderTop: `1px solid ${colors.border}`,
          fontSize: '11px',
          color: colors.textSecondary,
          display: 'flex',
          justifyContent: 'space-between',
          backgroundColor: `${colors.border}20`,
        }}>
          <div>Type stock symbol (e.g., TCS)</div>
          <div>ESC to close</div>
        </div>
      </div>
    </div>
  );
};
