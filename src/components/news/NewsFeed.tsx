import { useEffect, useState } from "react";
import { ExternalLink, Newspaper } from "lucide-react";

interface NewsItem {
  title: string;
  source: string;
  date: string;
  link: string;
  snippet: string;
}

interface AdItem {
  title: string;
  snippet: string;
  sponsor: string;
}

const ADS: AdItem[] = [
  {
    title: "Top brokerages reveal targets for this sector",
    snippet: "Leading financial institutions have updated their outlook, citing strong fundamentals and growth trajectory.",
    sponsor: "Sponsored",
  },
  {
    title: "Institutional investors increase allocation to Indian equities",
    snippet: "Foreign portfolio investors are rotating capital into high-conviction Indian names amid global market shifts.",
    sponsor: "Sponsored",
  },
];

// Fallback news when API is unavailable
const FALLBACK_NEWS: NewsItem[] = [
  { title: "Markets open higher tracking global cues", source: "Economic Times", date: new Date().toISOString().split('T')[0], link: "#", snippet: "Benchmark indices opened in the green today." },
  { title: "Sector outlook remains positive for near term", source: "Business Standard", date: new Date().toISOString().split('T')[0], link: "#", snippet: "Analysts maintain positive outlook on the sector." },
  { title: "Company announces expansion plans", source: "Mint", date: new Date().toISOString().split('T')[0], link: "#", snippet: "The company is investing in new growth initiatives." },
];

export default function NewsFeed({ symbol }: { symbol: string }) {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchNews() {
      try {
        // Try backend proxy first
        const res = await fetch(`/api/news/${symbol}`, {
          signal: AbortSignal.timeout(5000),
        });
        if (!cancelled && res.ok) {
          const data = await res.json();
          setNews(data.articles || []);
          setLoading(false);
          return;
        }
      } catch {
        // Backend unavailable - use fallback
      }

      if (!cancelled) {
        setNews(FALLBACK_NEWS);
        setError(true);
        setLoading(false);
      }
    }

    fetchNews();
    return () => { cancelled = true; };
  }, [symbol]);

  // Interleave ads with news items
  const feedItems: ({ type: 'news'; item: NewsItem } | { type: 'ad'; item: AdItem })[] = [];

  news.forEach((item, i) => {
    feedItems.push({ type: 'news', item });
    // Insert ads at positions 2 and 5 (0-indexed)
    if (i === 1 && ADS.length > 0) {
      feedItems.push({ type: 'ad', item: ADS[0] });
    }
    if (i === 4 && ADS.length > 1) {
      feedItems.push({ type: 'ad', item: ADS[1] });
    }
  });

  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 16 }}>
        News & Updates
      </div>

      {loading ? (
        <div style={{ padding: "20px 0", textAlign: "center" }}>
          <div style={{ height: 12, width: "60%", background: "var(--elevated)", borderRadius: 6, margin: "0 auto 8px" }} />
          <div style={{ height: 12, width: "40%", background: "var(--elevated)", borderRadius: 6, margin: "0 auto" }} />
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {feedItems.map((entry, i) => {
            if (entry.type === 'ad') {
              const ad = entry.item;
              return (
                <a
                  key={`ad-${i}`}
                  href="#"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "block",
                    padding: "14px 16px",
                    marginBottom: 8,
                    borderRadius: 10,
                    border: "1px solid var(--border)",
                    background: "#FFFFFF",
                    textDecoration: "none",
                    boxShadow: "var(--shadow-sm)",
                    transition: "box-shadow 0.15s ease",
                  }}
                  className="hover:shadow-md"
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <span style={{
                      fontSize: 9,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      color: "var(--text-muted)",
                      background: "var(--elevated)",
                      padding: "1px 6px",
                      borderRadius: 3,
                    }}>
                      {ad.sponsor}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.4 }}>
                    {ad.title}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4, lineHeight: 1.5 }}>
                    {ad.snippet}
                  </div>
                </a>
              );
            }

            const newsItem = entry.item;
            return (
              <a
                key={`news-${i}`}
                href={newsItem.link}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "block",
                  padding: "14px 16px",
                  marginBottom: 8,
                  borderRadius: 10,
                  border: "1px solid var(--border)",
                  background: "#FFFFFF",
                  textDecoration: "none",
                  boxShadow: "var(--shadow-sm)",
                  transition: "box-shadow 0.15s ease",
                }}
                className="hover:shadow-md"
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <Newspaper size={12} style={{ color: "var(--text-muted)" }} />
                  <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 500 }}>
                    {newsItem.source}
                  </span>
                  <span style={{ fontSize: 10, color: "var(--text-muted)" }}>·</span>
                  <span style={{ fontSize: 10, color: "var(--text-muted)" }}>
                    {newsItem.date}
                  </span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.4 }}>
                  {newsItem.title}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4, lineHeight: 1.5 }}>
                  {newsItem.snippet}
                </div>
              </a>
            );
          })}

          {error && (
            <p style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "center", marginTop: 12 }}>
              Live news feed will appear once the backend news service is available.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
