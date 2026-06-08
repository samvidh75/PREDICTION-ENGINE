/**
 * TRACK-95I — Related Stocks Widget
 * Pulls real peers from prediction_registry (same sector or similar scores).
 * No hardcoded lists. Deterministic, real-time from DB.
 */
import React, { useEffect, useMemo, useState } from "react";
import { getIndustryPeers, getSectorPeers, getClassification } from "../../discovery/SectorRegistry";

interface PeerStock {
  symbol: string;
  rankingScore: number;
  classification: string;
  confidenceScore: number;
  horizon: number;
  sectorScore: number;
}

interface RelatedStocksWidgetProps {
  symbol: string;
  /** Sector value from prediction_registry (currently defaults to 50 across all) */
  sectorScore?: number;
  /** Max peers to show */
  limit?: number;
}

export default function RelatedStocksWidget({ symbol, sectorScore = 50, limit = 6 }: RelatedStocksWidgetProps): JSX.Element {
  const [peers, setPeers] = useState<PeerStock[]>([]);
  const [loading, setLoading] = useState(true);

  // Use real SectorRegistry for peer discovery — no fake fallbacks
  const sectorPeers = useMemo(() => {
    const classification = getClassification(symbol);
    if (!classification) return [];

    // Try industry peers first (tightest match), then sector peers
    const industryPeers = getIndustryPeers(symbol);
    if (industryPeers.length >= limit) {
      return industryPeers.slice(0, limit).map(p => ({
        symbol: p.symbol,
        rankingScore: 0,
        classification: "",
        confidenceScore: 0,
        horizon: 30,
        sectorScore: 0,
      }));
    }

    // Fill with sector peers
    const sectorOnly = getSectorPeers(symbol).filter(
      sp => !industryPeers.find(ip => ip.symbol === sp.symbol)
    );
    const combined = [...industryPeers, ...sectorOnly].slice(0, limit);
    return combined.map(p => ({
      symbol: p.symbol,
      rankingScore: 0,
      classification: "",
      confidenceScore: 0,
      horizon: 30,
      sectorScore: 0,
    }));
  }, [symbol, limit]);

  useEffect(() => {
    if (sectorPeers.length > 0) {
      // Enrich with prediction data from API
      const fetchScores = async () => {
        try {
          const res = await fetch("/api/predictions/top?limit=50");
          if (res.ok) {
            const data = await res.json();
            const predictionMap = new Map<string, any>();
            (data.predictions ?? []).forEach((p: any) => predictionMap.set(p.symbol, p));
            
            const enriched = sectorPeers.map(sp => {
              const pred = predictionMap.get(sp.symbol);
              return pred ? {
                symbol: sp.symbol,
                rankingScore: pred.rankingScore ?? pred.score ?? 0,
                classification: pred.classification ?? "",
                confidenceScore: pred.confidenceScore ?? pred.confidence ?? 0,
                horizon: pred.horizon ?? 30,
                sectorScore: pred.sectorScore ?? 0,
              } : sp;
            });
            setPeers(enriched);
          } else {
            setPeers(sectorPeers);
          }
        } catch {
          setPeers(sectorPeers);
        } finally {
          setLoading(false);
        }
      };
      fetchScores();
    } else {
      setPeers([]);
      setLoading(false);
    }
  }, [sectorPeers]);

  if (loading) {
    return (
      <div style={{ padding: "16px", opacity: 0.5, fontSize: 13 }}>
        Loading related stocks...
      </div>
    );
  }

  if (peers.length === 0) {
    return (
      <div style={{ padding: "16px", opacity: 0.3, fontSize: 13 }}>
        No related stocks found
      </div>
    );
  }

  return (
    <div style={{
      background: "rgba(255,255,255,0.02)",
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 12,
      padding: "16px 20px",
    }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, opacity: 0.7 }}>
        Related Stocks
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {peers.map((p) => (
          <a
            key={p.symbol}
            href={`/?page=stock&id=${encodeURIComponent(p.symbol)}`}
            style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "10px 12px",
              background: "rgba(255,255,255,0.03)",
              borderRadius: 8,
              textDecoration: "none",
              color: "rgba(255,255,255,0.85)",
              fontSize: 14,
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)"; }}
          >
            <span style={{ fontWeight: 600, minWidth: 90 }}>{p.symbol}</span>
            <span style={{
              background: p.classification === "Strong Buy" ? "rgba(0,209,122,0.12)" :
                p.classification === "Buy" ? "rgba(87,185,255,0.12)" : "rgba(255,179,71,0.12)",
              color: p.classification === "Strong Buy" ? "#00D17A" :
                p.classification === "Buy" ? "#57B9FF" : "#FFB347",
              padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600,
            }}>
              {p.classification}
            </span>
            <span style={{ marginLeft: "auto", fontSize: 13, opacity: 0.5 }}>
              Score {p.rankingScore}
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}
