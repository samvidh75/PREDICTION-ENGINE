import { useEffect, useState } from "react";
import { ExternalLink, Newspaper } from "lucide-react";

interface NewsItem {
  title: string;
  source: string;
  date: string;
  link: string;
  snippet: string;
}

export default function NewsFeed({ symbol }: { symbol: string }) {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [noSource, setNoSource] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchNews() {
      try {
        const res = await fetch(`/api/news/${symbol}`, {
          signal: AbortSignal.timeout(5000),
        });
        if (!cancelled && res.ok) {
          const data = await res.json();
          const items = (data.items || []).map((item: any) => ({
            title: item.headline || "",
            source: item.publisher || "News",
            date: item.publishedAt ? new Date(item.publishedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "",
            link: item.url || "",
            snippet: item.summary || "",
          })).filter((item: NewsItem) => item.title && item.link);

          if (!cancelled) {
            setNews(items);
            setLoading(false);
            return;
          }
        }
      } catch {
        // News source unavailable
      }

      if (!cancelled) {
        setNews([]);
        setNoSource(true);
        setLoading(false);
      }
    }

    fetchNews();
    return () => { cancelled = true; };
  }, [symbol]);

  if (loading) {
    return (
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 16 }}>
          Recent news
        </div>
        <div style={{ padding: "20px 0", textAlign: "center" }}>
          <div style={{ height: 12, width: "60%", background: "var(--elevated)", borderRadius: 6, margin: "0 auto 8px" }} />
          <div style={{ height: 12, width: "40%", background: "var(--elevated)", borderRadius: 6, margin: "0 auto" }} />
        </div>
      </div>
    );
  }

  if (news.length === 0) {
    return (
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 16 }}>
          Recent news
        </div>
        <div style={{ textAlign: "center", padding: "24px 0" }}>
          <Newspaper size={20} style={{ color: "var(--text-muted)", margin: "0 auto 8px", display: "block" }} />
          <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0 }}>
            Recent news is not available yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 16 }}>
        Recent news
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {news.slice(0, 10).map((item, i) => (
          <a
            key={`news-${i}`}
            href={item.link}
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
                {item.source}
              </span>
              {item.date && (
                <>
                  <span style={{ fontSize: 10, color: "var(--text-muted)" }}>·</span>
                  <span style={{ fontSize: 10, color: "var(--text-muted)" }}>
                    {item.date}
                  </span>
                </>
              )}
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.4 }}>
              {item.title}
            </div>
            {item.snippet && (
              <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4, lineHeight: 1.5 }}>
                {item.snippet}
              </div>
            )}
          </a>
        ))}
      </div>
    </div>
  );
}
