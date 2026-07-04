/**
 * News Panel Component
 * Displays latest market news and sentiment
 */

import { useEffect, useState } from 'react';
import { newsService, type NewsContext } from '../../utils/newsService';

interface NewsPanelProps {
  tickers: string[];
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export default function NewsPanel({ tickers, autoRefresh = true, refreshInterval = 300000 }: NewsPanelProps) {
  const [newsContexts, setNewsContexts] = useState<NewsContext[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const loadNews = async () => {
      if (tickers.length === 0) return;

      setLoading(true);
      try {
        const contexts = await Promise.all(tickers.map((ticker) => newsService.getNewsForTicker(ticker)));
        setNewsContexts(contexts);
      } catch (error) {
        console.error('Failed to load news:', error);
      } finally {
        setLoading(false);
      }
    };

    loadNews();

    if (autoRefresh) {
      const interval = setInterval(loadNews, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [tickers, autoRefresh, refreshInterval]);

  const bullishStocks = newsContexts.filter((n) => n.sentiment === 'bullish');
  const bearishStocks = newsContexts.filter((n) => n.sentiment === 'bearish');
  const neutralStocks = newsContexts.filter((n) => n.sentiment === 'neutral');

  if (tickers.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        padding: '12px',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        backgroundColor: '#fafafa',
        marginBottom: '16px',
      }}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0',
          border: 'none',
          backgroundColor: 'transparent',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: 'bold',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>📰 Market News</span>
          {loading && <span style={{ fontSize: '12px' }}>⏳</span>}
        </div>
        <span style={{ fontSize: '16px' }}>{expanded ? '▼' : '▶'}</span>
      </button>

      {/* Quick Stats */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '8px',
          marginTop: '8px',
          fontSize: '12px',
        }}
      >
        {bullishStocks.length > 0 && (
          <div
            style={{
              padding: '6px',
              backgroundColor: '#dffce7',
              border: '1px solid #34a853',
              borderRadius: '4px',
              color: '#0d6e0d',
              fontWeight: 'bold',
              textAlign: 'center',
            }}
          >
            🟢 {bullishStocks.length} Bullish
          </div>
        )}
        {neutralStocks.length > 0 && (
          <div
            style={{
              padding: '6px',
              backgroundColor: '#f9f9f9',
              border: '1px solid #999',
              borderRadius: '4px',
              color: '#666',
              fontWeight: 'bold',
              textAlign: 'center',
            }}
          >
            ⚪ {neutralStocks.length} Neutral
          </div>
        )}
        {bearishStocks.length > 0 && (
          <div
            style={{
              padding: '6px',
              backgroundColor: '#fce8e6',
              border: '1px solid #ea4335',
              borderRadius: '4px',
              color: '#9c0000',
              fontWeight: 'bold',
              textAlign: 'center',
            }}
          >
            🔴 {bearishStocks.length} Bearish
          </div>
        )}
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div style={{ marginTop: '12px', maxHeight: '400px', overflowY: 'auto' }}>
          {/* Bullish News */}
          {bullishStocks.length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#34a853', marginBottom: '6px' }}>📈 Bullish News</div>
              {bullishStocks.map((context) => (
                <div
                  key={context.ticker}
                  style={{
                    padding: '8px',
                    backgroundColor: 'white',
                    border: '1px solid #dffce7',
                    borderRadius: '4px',
                    marginBottom: '6px',
                  }}
                >
                  <div style={{ fontWeight: 'bold', fontSize: '12px', marginBottom: '4px' }}>{context.ticker}</div>
                  {context.recentNews.slice(0, 1).map((article) => (
                    <div key={article.id} style={{ fontSize: '11px', color: '#666', lineHeight: '1.4' }}>
                      <div>📰 {article.title}</div>
                      <div style={{ fontSize: '10px', color: '#999', marginTop: '2px' }}>{article.source}</div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* Bearish News */}
          {bearishStocks.length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#ea4335', marginBottom: '6px' }}>📉 Bearish News</div>
              {bearishStocks.map((context) => (
                <div
                  key={context.ticker}
                  style={{
                    padding: '8px',
                    backgroundColor: 'white',
                    border: '1px solid #fce8e6',
                    borderRadius: '4px',
                    marginBottom: '6px',
                  }}
                >
                  <div style={{ fontWeight: 'bold', fontSize: '12px', marginBottom: '4px' }}>{context.ticker}</div>
                  {context.recentNews.slice(0, 1).map((article) => (
                    <div key={article.id} style={{ fontSize: '11px', color: '#666', lineHeight: '1.4' }}>
                      <div>📰 {article.title}</div>
                      <div style={{ fontSize: '10px', color: '#999', marginTop: '2px' }}>{article.source}</div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* Neutral News */}
          {neutralStocks.length > 0 && (
            <div>
              <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#999', marginBottom: '6px' }}>⚪ Neutral News</div>
              {neutralStocks.map((context) => (
                <div
                  key={context.ticker}
                  style={{
                    padding: '8px',
                    backgroundColor: 'white',
                    border: '1px solid #e0e0e0',
                    borderRadius: '4px',
                    marginBottom: '6px',
                  }}
                >
                  <div style={{ fontWeight: 'bold', fontSize: '12px', marginBottom: '4px' }}>{context.ticker}</div>
                  {context.recentNews.slice(0, 1).map((article) => (
                    <div key={article.id} style={{ fontSize: '11px', color: '#666', lineHeight: '1.4' }}>
                      <div>📰 {article.title}</div>
                      <div style={{ fontSize: '10px', color: '#999', marginTop: '2px' }}>{article.source}</div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* No News */}
          {newsContexts.length === 0 && !loading && (
            <div style={{ textAlign: 'center', padding: '20px', color: '#999', fontSize: '12px' }}>
              No recent news available
            </div>
          )}
        </div>
      )}
    </div>
  );
}
