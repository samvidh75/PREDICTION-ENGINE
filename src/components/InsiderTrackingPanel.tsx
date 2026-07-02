/**
 * InsiderTrackingPanel — SEBI Insider Disclosure Radar Widget.
 *
 * Fetches corporate insider filings from the backend API and renders them
 * in the Raycast design system (dark theme, monospace, hairline borders).
 *
 * Spec ref: Phase 52 — Corporate Actions Vectorizer & Insider Tracking
 */

import { useEffect, useState } from "react";
import { colors } from "../design/tokens";

// ── Type Contracts ──────────────────────────────────────────────────

interface InsiderFiling {
  disclosure_type: string;
  insider_name: string;
  shares_quantity: number;
  transaction_value_inr: number;
  filing_date: string;
  raw_announcement_text: string;
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
    fontFamily: "monospace",
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
    fontFamily: "monospace",
    color: "#64748b",
    textAlign: "center" as const,
    padding: "16px",
  },
  empty: {
    fontSize: "11px",
    fontFamily: "monospace",
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
        Parsing qualitative SEBI filings cache...
      </div>
    );
  }

  if (filings.length === 0) {
    return (
      <div style={s.empty}>
        No recent insider accumulation filings registered for this asset.
      </div>
    );
  }

  return (
    <div style={s.wrapper}>
      <div style={s.header}>
        <h3 style={s.title}>🚨 SEBI INSIDER DISCLOSURE RADAR</h3>
        <p style={s.subtitle}>
          Authoritative regulatory share trace logs &bull; 100% Free
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {filings.map((f, idx) => (
          <div key={idx} style={s.card}>
            <div style={s.cardHeader}>
              <span style={s.typeLabel}>
                {f.disclosure_type.replace(/_/g, " ")}
              </span>
              <span style={s.dateLabel}>
                Filing Date: {f.filing_date.split("T")[0]}
              </span>
            </div>

            <p style={s.insiderName}>{f.insider_name}</p>

            <p style={s.details}>
              Volume:{" "}
              <strong style={s.valueGreen}>
                {f.shares_quantity.toLocaleString("en-IN")} shares
              </strong>
              {" "}&bull;{" "}
              Value:{" "}
              <strong>
                ₹{Number(f.transaction_value_inr).toLocaleString("en-IN")}
              </strong>
            </p>

            <p style={s.quote}>
              &ldquo;{f.raw_announcement_text}&rdquo;
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
