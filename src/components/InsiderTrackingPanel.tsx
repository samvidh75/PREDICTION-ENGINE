/**
 * InsiderTrackingPanel — Insider Disclosure Radar Widget.
 *
 * Fetches real form 17-7 (Statement of Changes in Beneficial Ownership of
 * Securities) filings scraped from PSE Edge — see
 * src/services/scrapers/PSEInsiderFilingsData.ts. There is no share
 * quantity or transaction value/price here: that data isn't reliably
 * present in this filing type's PSE Edge rendering (verified against real
 * filings), so it's left out entirely rather than shown as a guess — this
 * previously rendered fabricated numbers (a stale `transaction_value_inr`
 * field, which had been silently undefined since a 2026 migration renamed
 * the real column to `transaction_value_php` — moot now, both the mock
 * data and that field are gone).
 */

import { useEffect, useState } from "react";
import { colors, typography } from "../design/tokens";

// ── Type Contracts ──────────────────────────────────────────────────

interface InsiderFiling {
  reportingPerson: string | null;
  relationship: string | null;
  description: string | null;
  filingDate: string;
  sourceUrl: string;
}

interface InsiderApiResponse {
  success: boolean;
  ticker: string;
  filings: InsiderFiling[];
}

// ── Styles ──────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  wrapper: {
    backgroundColor: "#0D0D0D",
    border: "1px solid #1A1A1A",
    padding: "20px",
    borderRadius: "12px",
    textAlign: "left",
    fontFamily: typography.fontFamily,
    color: "#f4f4f5",
  },
  header: {
    borderBottom: "1px solid #1A1A1A",
    paddingBottom: "12px",
    marginBottom: "16px",
  },
  title: {
    fontSize: "12px",
    fontWeight: 900,
    color: "#a78bfa",
    textTransform: "uppercase" as const,
    margin: 0,
  },
  subtitle: {
    fontSize: "9px",
    color: "#64748b",
    margin: "2px 0 0 0",
  },
  card: {
    backgroundColor: "#000000",
    padding: "12px",
    borderRadius: "8px",
    border: "1px solid #1A1A1A",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    borderBottom: "1px solid #1A1A1A",
    paddingBottom: "6px",
    marginBottom: "8px",
    fontSize: "10px",
  },
  typeLabel: {
    color: "#a78bfa",
    fontWeight: "bold",
  },
  dateLabel: {
    color: "#64748b",
  },
  insiderName: {
    fontSize: "12px",
    fontWeight: "bold",
    margin: "0 0 4px 0",
    color: "#ffffff",
  },
  details: {
    fontSize: "11px",
    color: "#e2e8f0",
    margin: "0 0 8px 0",
  },
  valueGreen: {
    color: "#34d399",
  },
  quote: {
    fontSize: "10px",
    color: "#94a3b8",
    margin: 0,
    fontStyle: "italic",
    backgroundColor: "#0D0D0D",
    padding: "8px",
    borderRadius: "4px",
    border: "1px solid #1A1A1A",
  },
  loading: {
    fontSize: "11px",
    fontFamily: typography.fontFamily,
    color: "#64748b",
    textAlign: "center" as const,
    padding: "16px",
  },
  empty: {
    fontSize: "11px",
    fontFamily: typography.fontFamily,
    color: "#4b5563",
    textAlign: "center" as const,
    padding: "16px",
  },
};

// ── Component ───────────────────────────────────────────────────────

export default function InsiderTrackingPanel({ ticker }: { ticker: string }) {
  const [filings, setFilings] = useState<InsiderFiling[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetch(`/api/v1/corporate/insiders/${encodeURIComponent(ticker)}`)
      .then((res) => res.json())
      .then((data: InsiderApiResponse) => {
        if (!cancelled) {
          if (data.success) setFilings(data.filings ?? []);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [ticker]);

  if (loading) {
    return (
      <div style={s.loading}>
        Loading insider filings...
      </div>
    );
  }

  if (filings.length === 0) {
    return (
      <div style={s.empty}>
        No recent insider filings available for this asset.
      </div>
    );
  }

  return (
    <div style={s.wrapper}>
      <div style={s.header}>
        <h3 style={s.title}>Insider filings</h3>
        <p style={s.subtitle}>
          Regulatory filings snapshot
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {filings.map((f, idx) => (
          <div key={idx} style={s.card}>
            <div style={s.cardHeader}>
              <span style={s.typeLabel}>
                {f.relationship ?? "Beneficial Ownership Change"}
              </span>
              <span style={s.dateLabel}>
                {f.filingDate}
              </span>
            </div>

            <p style={s.insiderName}>{f.reportingPerson ?? "Unnamed reporting person"}</p>

            {f.description && (
              <p style={s.quote}>
                &ldquo;{f.description}&rdquo;
              </p>
            )}

            <a href={f.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: "10px", color: colors.textSecondary, textDecoration: "none" }}>
              View real filing on PSE Edge →
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
