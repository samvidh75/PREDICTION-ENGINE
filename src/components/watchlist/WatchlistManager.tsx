import React, { useState, useEffect, useCallback } from 'react';
import {
  getWatchlists,
  createWatchlist,
  renameWatchlist,
  archiveWatchlist,
  deleteWatchlist,
  addTickerToWatchlist,
  removeTickerFromWatchlist,
  toggleFavourite,
  subscribeWatchlist,
  CustomWatchlist,
} from '../../services/portfolio/watchlistStore';

interface WatchlistManagerProps {
  onSelectWatchlist?: (id: string) => void;
  selectedId?: string;
}

export function WatchlistManager({ onSelectWatchlist, selectedId }: WatchlistManagerProps) {
  const [watchlists, setWatchlists] = useState<CustomWatchlist[]>([]);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const refresh = useCallback(() => {
    setWatchlists(getWatchlists());
  }, []);

  useEffect(() => {
    refresh();
    return subscribeWatchlist(refresh);
  }, [refresh]);

  const handleCreate = () => {
    const name = newName.trim();
    if (!name) return;
    const list = createWatchlist(name);
    if (list) {
      setNewName('');
      onSelectWatchlist?.(list.id);
    }
  };

  const handleRename = (id: string) => {
    const name = editName.trim();
    if (!name) return;
    renameWatchlist(id, name);
    setEditingId(null);
  };

  return (
    <div className="watchlist-manager" data-testid="watchlist-manager">
      <div className="watchlist-header">
        <h3>Watchlists</h3>
      </div>

      <div className="watchlist-create">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          placeholder="New watchlist..."
          data-testid="new-watchlist-input"
        />
        <button onClick={handleCreate} data-testid="create-watchlist-btn">+</button>
      </div>

      <ul className="watchlist-list" data-testid="watchlist-list">
        {watchlists.map((wl) => (
          <li
            key={wl.id}
            className={`watchlist-item ${wl.id === selectedId ? 'selected' : ''} ${wl.isArchived ? 'archived' : ''}`}
            data-testid={`watchlist-${wl.id}`}
          >
            <div
              className="watchlist-name"
              onClick={() => onSelectWatchlist?.(wl.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && onSelectWatchlist?.(wl.id)}
            >
              {editingId === wl.id ? (
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={() => handleRename(wl.id)}
                  onKeyDown={(e) => e.key === 'Enter' && handleRename(wl.id)}
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <>
                  <span>{wl.name}</span>
                  <span className="watchlist-count">({wl.tickers.length})</span>
                  {wl.isFavourite && <span className="favourite-star" title="Favourite">★</span>}
                </>
              )}
            </div>

            <div className="watchlist-actions">
              <button
                onClick={() => toggleFavourite(wl.id)}
                title={wl.isFavourite ? 'Unmark favourite' : 'Mark favourite'}
                data-testid={`fav-${wl.id}`}
              >
                {wl.isFavourite ? '★' : '☆'}
              </button>
              <button
                onClick={() => { setEditingId(wl.id); setEditName(wl.name); }}
                title="Rename"
                data-testid={`rename-${wl.id}`}
              >
                ✎
              </button>
              <button
                onClick={() => archiveWatchlist(wl.id)}
                title={wl.isArchived ? 'Unarchive' : 'Archive'}
                data-testid={`archive-${wl.id}`}
              >
                {wl.isArchived ? '📂' : '📁'}
              </button>
              <button
                onClick={() => {
                  if (window.confirm(`Delete "${wl.name}"?`)) deleteWatchlist(wl.id);
                }}
                title="Delete"
                data-testid={`delete-${wl.id}`}
              >
                ✕
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className="watchlist-summary">
        <small>{watchlists.filter(w => !w.isArchived).length} active · {watchlists.reduce((s, w) => s + w.tickers.length, 0)} total tickers</small>
      </div>
    </div>
  );
}

export function WatchlistTickerList({
  watchlistId,
  onRemoveTicker,
}: {
  watchlistId: string;
  onRemoveTicker?: (ticker: string) => void;
}) {
  const [watchlist, setWatchlist] = useState<CustomWatchlist | null>(null);

  const refresh = useCallback(() => {
    const lists = getWatchlists();
    setWatchlist(lists.find((w) => w.id === watchlistId) ?? null);
  }, [watchlistId]);

  useEffect(() => {
    refresh();
    return subscribeWatchlist(refresh);
  }, [refresh]);

  if (!watchlist) return <div data-testid="watchlist-empty">Select a watchlist</div>;

  return (
    <div className="watchlist-tickers" data-testid="watchlist-tickers">
      <h4>{watchlist.name}</h4>
      {watchlist.tickers.length === 0 && (
        <p className="empty-state">No tickers yet. Add from the search bar.</p>
      )}
      <ul>
        {watchlist.tickers.map((ticker) => (
          <li key={ticker} data-testid={`ticker-${ticker}`}>
            <span>{ticker}</span>
            <button
              onClick={() => {
                removeTickerFromWatchlist(watchlistId, ticker);
                onRemoveTicker?.(ticker);
              }}
              data-testid={`remove-${ticker}`}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
