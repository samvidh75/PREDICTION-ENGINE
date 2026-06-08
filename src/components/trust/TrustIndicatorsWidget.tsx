import React, { useEffect, useState } from "react";

interface TrustIndicators {
  predictionsToday: number;
  symbolsCovered: number;
  outcomesValidated: number;
  lastPipelineRun: string;
  hitRate: string;
}

const DEFAULT_UNAVAILABLE: TrustIndicators = {
  predictionsToday: 0,
  symbolsCovered: 0,
  outcomesValidated: 0,
  lastPipelineRun: "",
  hitRate: "Unavailable",
};

export default function TrustIndicatorsWidget(): JSX.Element {
  const [data, setData] = useState<TrustIndicators>(DEFAULT_UNAVAILABLE);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/ops/health");
        if (res.ok) {
          const json = await res.json();
          setData({
            predictionsToday: json.metrics?.predictions_today ?? 0,
            symbolsCovered: json.metrics?.symbols_covered ?? 0,
            outcomesValidated: json.metrics?.outcomes_validated ?? 0,
            lastPipelineRun: json.metrics?.last_pipeline_run ?? "",
            hitRate: json.metrics?.hit_rate ? `${json.metrics.hit_rate}%` : "Unavailable",
          });
        }
      } catch {
        // Show unavailable state
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const items = [
    { label: "Predictions Today", value: data.predictionsToday.toLocaleString() },
    { label: "Stocks Covered", value: data.symbolsCovered.toLocaleString() },
    { label: "Outcomes Validated", value: data.outcomesValidated.toLocaleString() },
    { label: "Historical Hit Rate", value: data.hitRate },
  ];

  return (
    <div style={{
      display: "flex",
      gap: 16,
      flexWrap: "wrap",
      justifyContent: "center",
      padding: "16px 0",
    }}>
      {items.map((item) => (
        <div key={item.label} style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 12,
          padding: "14px 20px",
          textAlign: "center",
          minWidth: 140,
        }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#00D17A" }}>
            {item.value}
          </div>
          <div style={{ fontSize: 11, opacity: 0.5, marginTop: 4, textTransform: "uppercase", letterSpacing: "0.1em" }}>
            {item.label}
          </div>
        </div>
      ))}
    </div>
  );
}
