/**
 * News Section Component
 * - Displays auto-synced news for a stock
 * - Shows broker sentiments
 * - Integrates sponsored content naturally
 */

import { useEffect, useState } from 'react';
import { newsService, NewsItem } from '../services/news/NewsService';
import { colors } from '../design/tokens';

interface NewsSectionProps {
  symbol: string;
}

export default function NewsSection({ symbol }: NewsSectionProps) {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    loadNews();

    // Auto-update on mount
    newsService.initialize().catch(console.error);
  }, []);

  useEffect(() => {
    // Reload news when symbol changes
    loadNews();
  }, [symbol]);

  const loadNews = async () => {
    setLoading(true);
    try {
      const newsItems = await newsService.getNewsForStock(symbol);
      setNews(newsItems);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error loading news:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      background: colors.surface,
      border: `1px solid ${colors.border}`,
      borderRadius: '8px',
      padding: '16px',
      marginTop: '16px'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px'
      }}>
        <h3 style={{ margin: '0', fontSize: '14px', fontWeight: '600' }}>
          📰 Latest News & Sentiment
        </h3>
        <button
          onClick={loadNews}
          disabled={loading}
          style={{
            background: 'none',
            border: 'none',
            color: colors.textSecondary,
            fontSize: '12px',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.5 : 1
          }}
        >
          {loading ? 'Updating...' : 'Refresh'}
        </button>
      </div>

      {/* Last updated */}
      {lastUpdated && (
        <div style={{
          fontSize: '11px',
          color: colors.textSecondary,
          marginBottom: '12px'
        }}>
          Updated: {lastUpdated.toLocaleTimeString()} • Next sync in 2 hours
        </div>
      )}

      {/* News List */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        maxHeight: '500px',
        overflowY: 'auto'
      }}>
        {news.length === 0 ? (
          <div style={{
            textAlign: 'center',
            color: colors.textSecondary,
            padding: '20px 0',
            fontSize: '13px'
          }}>
            Loading news...
          </div>
        ) : (
          news.map((item) => (
            <NewsCard key={item.id} item={item} />
          ))
        )}
      </div>
    </div>
  );
}

function NewsCard({ item }: { item: NewsItem }) {
  const sentimentColor = item.sentiment === 'positive' ? '#22c55e' :
    item.sentiment === 'negative' ? '#ef4444' : colors.textSecondary;

  const sentimentEmoji = item.sentiment === 'positive' ? '📈' :
    item.sentiment === 'negative' ? '📉' : '📊';

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'block',
        background: colors.canvas,
        border: `1px solid ${colors.border}`,
        borderRadius: '6px',
        padding: '12px',
        textDecoration: 'none',
        cursor: 'pointer',
        transition: 'all 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = colors.primary || '#3b82f6';
        e.currentTarget.style.background = `${colors.primary || '#3b82f6'}10`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = colors.border;
        e.currentTarget.style.background = colors.canvas;
      }}
    >
      {/* Title with sentiment */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '8px',
        marginBottom: '6px'
      }}>
        {item.isSponsored ? (
          <span style={{ color: '#ffc533', fontSize: '14px' }}>💰</span>
        ) : (
          <span style={{ color: sentimentColor, fontSize: '14px' }}>
            {sentimentEmoji}
          </span>
        )}
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: '13px',
            fontWeight: '600',
            color: colors.textPrimary,
            marginBottom: '2px',
            lineHeight: '1.3'
          }}>
            {item.title}
          </div>
          <div style={{
            fontSize: '12px',
            color: colors.textSecondary,
            lineHeight: '1.4'
          }}>
            {item.description}
          </div>
        </div>
      </div>

      {/* Footer: Source + Time */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '11px',
        color: colors.textSecondary
      }}>
        <span style={{ fontWeight: '500' }}>
          {item.isSponsored ? `🤝 ${item.source}` : item.source}
        </span>
        <span>{formatTimeAgo(item.publishedAt)}</span>
      </div>

      {/* Sponsored badge */}
      {item.isSponsored && (
        <div style={{
          marginTop: '8px',
          paddingTop: '8px',
          borderTop: `1px solid ${colors.border}`,
          fontSize: '10px',
          color: '#ffc533',
          fontWeight: '500'
        }}>
          💡 Sponsored: Click to learn more (affiliate link)
        </div>
      )}
    </a>
  );
}

function formatTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}
