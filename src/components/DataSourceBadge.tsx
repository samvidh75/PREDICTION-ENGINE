// src/components/DataSourceBadge.tsx
// Shows whether data came from cache or live fetch, with response time.

import { colors, radius, space } from "../design/tokens";

interface DataSourceBadgeProps {
  cacheHit: boolean;
  responseTimeMs: number;
  provider?: string;
}

export default function DataSourceBadge({
  cacheHit,
  responseTimeMs,
  provider,
}: DataSourceBadgeProps) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: space[2],
        padding: `${space[1]} ${space[3]}`,
        borderRadius: radius.full,
        fontSize: 10,
        fontFamily: "monospace",
        background: cacheHit ? "rgba(52, 211, 153, 0.1)" : "rgba(96, 165, 250, 0.1)",
        border: `1px solid ${cacheHit ? "rgba(52, 211, 153, 0.2)" : "rgba(96, 165, 250, 0.2)"}`,
        color: cacheHit ? colors.marketGreen : "#60a5fa",
      }}
    >
      <span>{cacheHit ? "\uD83D\uDCE6" : "\uD83D\uDD04"}</span>
      <span>{cacheHit ? "Cached" : "Live"}</span>
      <span style={{ opacity: 0.6 }}>{responseTimeMs}ms</span>
      {provider && <span style={{ opacity: 0.4 }}>{provider}</span>}
    </div>
  );
}
