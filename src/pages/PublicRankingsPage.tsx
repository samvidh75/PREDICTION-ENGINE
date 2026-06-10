import React, { useEffect, useState } from "react";

interface RankingEntry {
  symbol: string;
  ranking_score?: number;
  classification?: string;
  sector?: string;
}

export default function PublicRankingsPage(): JSX.Element {
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch("/api/intelligence/leaderboard?limit=10", { headers: { Accept: "application/json" } })
      .then(async (response) => {
        if (!response.ok) throw new Error("LEADERBOARD_UNAVAILABLE");
        const body = await response.json();
        return Array.isArray(body) ? body : [];
      })
      .then((body) => {
        if (!active) return;
        setRankings(body);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setRankings([]);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <main style={{
      minHeight: "100vh",
      background: "#020304",
      color: "rgba(255,255,255,0.9)",
      fontFamily: "'Inter', 'Satoshi', system-ui, sans-serif",
      padding: "40px 24px",
      maxWidth: 900,
      margin: "0 auto",
    }}>
      <header style={{ marginBottom: 48 }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, margin: "0 0 8px", letterSpacing: "-0.03em" }}>
          Stock Rankings
        </h1>
        <p style={{ fontSize: 15, opacity: 0.7, margin: 0 }}>
          Sorted by StockStory Engine composite score. Updated daily at 06:00 IST.
        </p>
      </header>

      {loading ? (
        <div style={{ opacity: 0.6, fontSize: 14 }}>Loading rankings...</div>
      ) : rankings.length === 0 ? (
        <div style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 12,
          padding: 24,
          fontSize: 14,
          color: "rgba(255,255,255,0.65)",
        }}>
          Rankings are unavailable from the prediction registry right now. No sample rankings are shown.
        </div>
      ) : (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {rankings.map((r, index) => (
          <a
            key={r.symbol}
            href={`/?page=stock&symbol=${r.symbol}`}
            onClick={(e) => {
              e.preventDefault();
              window.history.pushState({}, "", `/?page=stock&symbol=${r.symbol}`);
              window.dispatchEvent(new Event("urlchange"));
            }}
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 12,
              padding: "14px 20px",
              display: "flex",
              alignItems: "center",
              gap: 20,
              textDecoration: "none",
              color: "inherit",
              cursor: "pointer",
              transition: "background 150ms, border-color 150ms",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.06)";
              (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(255,255,255,0.16)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.03)";
              (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(255,255,255,0.08)";
            }}
          >
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: "rgba(255,255,255,0.06)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 700, fontSize: 14,
            }}>
              #{index + 1}
            </div>
            <div style={{ fontWeight: 700, fontSize: 16, minWidth: 110 }}>
              {r.symbol}
            </div>
            <div style={{ fontSize: 13, opacity: 0.5, minWidth: 90 }}>
              {r.sector ?? "Unavailable"}
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#00D17A" }}>
              {typeof r.ranking_score === "number" ? r.ranking_score : "Unavailable"}
            </div>
          </a>
        ))}
      </div>
      )}

      <div style={{ marginTop: 48, textAlign: "center" }}>
        <a
          href="/?page=signup"
          style={{
            display: "inline-block",
            padding: "12px 32px",
            background: "#00D17A",
            color: "#020304",
            borderRadius: 8,
            fontWeight: 700,
            fontSize: 15,
            textDecoration: "none",
          }}
        >
          Create Account to Compare & Track →
        </a>
      </div>
    </main>
  );
}
