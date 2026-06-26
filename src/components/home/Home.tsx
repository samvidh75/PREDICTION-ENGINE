import { useState } from 'react';
import { useSmartQuery } from '@/hooks/useSmartQuery';
import styles from './Home.module.css';
import { SearchBar } from './SearchBar';

export function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const { processQuery, loading, result, method } = useSmartQuery();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      await processQuery(searchQuery);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.logo}>StockStory</h1>
          <nav className={styles.nav}>
            <a href="/">Home</a>
            <a href="/scanner">Scanner</a>
            <a href="/track">Tracked</a>
            <a href="/admin/metrics">Metrics</a>
          </nav>
        </div>
      </header>

      <main className={styles.main}>
        <section className={styles.hero}>
          <div className={styles.heroContent}>
            <h2 className={styles.heroTitle}>
              Search Stocks Like Never Before
            </h2>
            <p className={styles.heroSubtitle}>
              Natural language queries powered by AI
            </p>

            <form onSubmit={handleSearch} className={styles.searchForm}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Find stocks with P/E under 15 and ROE over 20%..."
                className={styles.searchInput}
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading}
                className={styles.searchButton}
              >
                {loading ? 'Searching...' : 'Search'}
              </button>
            </form>

            <div className={styles.quickSearch}>
              <SearchBar />
            </div>

            {result && (
              <div className={styles.resultBox}>
                <div className={styles.resultMethod}>
                  <span className={styles.badge}>
                    {method === 'regex' && 'Regex (Instant)'}
                    {method === 'transformers' && 'Browser AI (Fast)'}
                    {method === 'groq' && 'API (Fallback)'}
                  </span>
                </div>
                <pre className={styles.resultJSON}>
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </section>

        <section className={styles.quickActions}>
          <h3 className={styles.sectionTitle}>Quick Actions</h3>
          <div className={styles.actionGrid}>
            <ActionCard
              icon="search"
              title="Scanner"
              description="Find stocks matching your criteria"
              link="/scanner"
            />
            <ActionCard
              icon="compare"
              title="Compare"
              description="Compare 2-4 stocks side by side"
              link="/compare"
            />
            <ActionCard
              icon="track"
              title="Track"
              description="Monitor your watchlist"
              link="/track"
            />
            <ActionCard
              icon="research"
              title="Research"
              description="Deep dive analysis"
              link="/stock/TCS"
            />
          </div>
        </section>

        <section className={styles.recentSearches}>
          <h3 className={styles.sectionTitle}>Recent Searches</h3>
          <div className={styles.searchList}>
            <p>No recent searches yet. Start searching!</p>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <p>&copy; 2026 StockStory India. 100% Free.</p>
        <p className={styles.costInfo}>Cost: Rs 0/month (All free tiers)</p>
      </footer>
    </div>
  );
}

function ActionCard({ icon, title, description, link }: { icon: string; title: string; description: string; link: string }) {
  const icons: Record<string, string> = {
    search: '\uD83D\uDD0D',
    compare: '\u2696\uFE0F',
    track: '\uD83D\uDCCC',
    research: '\uD83D\uDCCA',
  };

  return (
    <a href={link} className={styles.actionCard}>
      <div className={styles.actionIcon}>{icons[icon] || '\uD83D\uDCC8'}</div>
      <h4 className={styles.actionTitle}>{title}</h4>
      <p className={styles.actionDescription}>{description}</p>
    </a>
  );
}
