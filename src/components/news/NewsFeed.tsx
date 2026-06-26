import { useEffect, useState } from "react";
import { ExternalLink, Newspaper } from "lucide-react";

interface NewsItem {
  title: string;
  source: string;
  date: string;
  link: string;
  snippet: string;
}

const BROKER_ADS = [
  {
    title: "Invest in stocks with Zerodha",
    body: "Open a free Demat account in minutes. Flat ₹20 per trade.",
    link: "https://zerodha.com/open-account",
    sponsor: "Zerodha",
  },
  {
    title: "Groww — India's fastest growing investment app",
    body: "Start SIP in mutual funds and stocks. Zero commission.",
    link: "https://groww.in",
    sponsor: "Groww",
  },
  {
    title: "Angel One — Smart trading platform",
    body: "Get 3-in-1 account (Demat + Trading + Banking). ₹0 brokerage for first 30 days.",
    link: "https://angelone.in",
    sponsor: "Angel One",
  },
  {
    title: "Upstox — Trade smarter with Rs 0 brokerage",
    body: "Free Demat account. Advanced charting and analytics tools.",
    link: "https://upstox.com",
    sponsor: "Upstox",
  },
  {
    title: "5Paisa — Low-cost investing for everyone",
    body: "Open Demat account with ₹0 AMC charges. Flat ₹10 per trade.",
    link: "https://www.5paisa.com",
    sponsor: "5Paisa",
  },
  {
    title: "ICICI Direct — India's No. 1 trading platform",
    body: "Integrated banking and trading. Research reports from ICICI Securities.",
    link: "https://www.icicidirect.com",
    sponsor: "ICICI Direct",
  },
  {
    title: "HDFC Sky — Trade from HDFC Bank",
    body: "Seamless integration with HDFC Bank. Expert recommendations.",
    link: "https://sky.hdfc.com",
    sponsor: "HDFC Sky",
  },
  {
    title: "Motilal Oswal — Research-backed investing",
    body: "Get expert stock recommendations and Portfolio Manager services.",
    link: "https://www.motilaloswal.com",
    sponsor: "Motilal Oswal",
  },
  {
    title: "Kotak Securities — Trusted since decades",
    body: "Open Demat account online. Get research reports and trading calls.",
    link: "https://www.kotaksecurities.com",
    sponsor: "Kotak Securities",
  },
  {
    title: "Sharekhan — Invest with confidence",
    body: "Free Demat + Trading account. 15+ years of brokerage expertise.",
    link: "https://www.sharekhan.com",
    sponsor: "Sharekhan",
  },
];

function getDeterministicAdIndex(periodHours = 12): number {
  return Math.floor(Date.now() / (periodHours * 60 * 60 * 1000)) % BROKER_ADS.length;
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
        <div style={{ fontSize: "var(--sz-xs)", fontWeight: 700, color: "var(--text-300)",
          textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>
          Recent news
        </div>
        <div style={{ padding: "20px 0", textAlign: "center" }}>
          <div className="skeleton" style={{ height: 12, width: "60%", margin: "0 auto 8px" }} />
          <div className="skeleton" style={{ height: 12, width: "40%", margin: "0 auto" }} />
        </div>
      </div>
    );
  }

  if (news.length === 0 && noSource) {
    return (
      <div>
        <div style={{ fontSize: "var(--sz-xs)", fontWeight: 700, color: "var(--text-300)",
          textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>
          Recent news
        </div>
        <div style={{ textAlign: "center", padding: "24px 0" }}>
          <Newspaper size={20} style={{ color: "var(--text-300)", margin: "0 auto 8px", display: "block" }} />
          <p style={{ fontSize: 13, color: "var(--text-500)", margin: 0 }}>
            Recent news is not available yet.
          </p>
        </div>
      </div>
    );
  }

  const adIndex = getDeterministicAdIndex();
  const adPositions = [3, 7];
  const itemsWithSlots = [...news.slice(0, 10)];

  const finalItems: Array<{ type: "news"; item: NewsItem } | { type: "ad"; ad: typeof BROKER_ADS[0] }> = [];

  itemsWithSlots.forEach((item, i) => {
    finalItems.push({ type: "news", item });
    if (adPositions.includes(i + 1)) {
      const adIdx = (adIndex + Math.floor(i / 3)) % BROKER_ADS.length;
      finalItems.push({ type: "ad", ad: BROKER_ADS[adIdx] });
    }
  });

  return (
    <div>
      <div style={{ fontSize: "var(--sz-xs)", fontWeight: 700, color: "var(--text-300)",
        textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>
        Recent news
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {finalItems.map((entry, i) => {
          if (entry.type === "ad") {
            const ad = entry.ad;
            return (
              <a
                key={`ad-${i}`}
                href={ad.link}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "block",
                  padding: "14px 16px",
                  marginBottom: 8,
                  borderRadius: "var(--r-md)",
                  border: "1px solid var(--brand-tint)",
                  background: "linear-gradient(145deg, var(--brand-tint) 0%, #FFFFFF 100%)",
                  textDecoration: "none",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <span style={{
                    fontSize: 8, fontWeight: 800, color: "var(--brand-text)",
                    background: "var(--brand-tint)", padding: "1px 6px",
                    borderRadius: "var(--r-xs)", letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}>
                    SPONSORED
                  </span>
                  <span style={{ fontSize: 10, color: "var(--text-300)", fontWeight: 500 }}>
                    {ad.sponsor}
                  </span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-900)", lineHeight: 1.4 }}>
                  {ad.title}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-500)", marginTop: 4, lineHeight: 1.5 }}>
                  {ad.body}
                </div>
              </a>
            );
          }

          const item = entry.item;
          return (
            <a
              key={`news-${i}`}
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "block",
                padding: "14px 16px",
                marginBottom: 8,
                borderRadius: "var(--r-md)",
                border: "1px solid var(--border)",
                background: "var(--surface)",
                textDecoration: "none",
                transition: "border-color var(--t-fast)",
              }}
              onMouseOver={e => { e.currentTarget.style.borderColor = "var(--border-strong)"; }}
              onMouseOut={e => { e.currentTarget.style.borderColor = "var(--border)"; }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <Newspaper size={12} style={{ color: "var(--text-300)" }} />
                <span style={{ fontSize: 10, color: "var(--text-300)", fontWeight: 500 }}>
                  {item.source}
                </span>
                {item.date && (
                  <>
                    <span style={{ fontSize: 10, color: "var(--text-300)" }}>\u00B7</span>
                    <span style={{ fontSize: 10, color: "var(--text-300)" }}>
                      {item.date}
                    </span>
                  </>
                )}
              </div>
              <div style={{ fontSize: "var(--sz-sm)", fontWeight: 600, color: "var(--text-900)", lineHeight: 1.4 }}>
                {item.title}
              </div>
              {item.snippet && (
                <div style={{ fontSize: 'var(--sz-sm)', color: "var(--text-500)", marginTop: 4, lineHeight: 1.5 }}>
                  {item.snippet}
                </div>
              )}
            </a>
          );
        })}
      </div>
    </div>
  );
}
