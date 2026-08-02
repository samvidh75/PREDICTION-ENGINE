import { colors, typography, radius } from "../design/tokens";

interface DepthLevel {
  price: number;
  size: number;
  total: number;
}

interface MarketDepthData {
  symbol: string;
  bidLevels: DepthLevel[];
  askLevels: DepthLevel[];
  spread: number;
  spreadBps: number;
  midPrice: number;
  imbalance: number;
}

function DepthBar({ size, maxSize, side }: { size: number; maxSize: number; side: 'bid' | 'ask' }) {
  const widthPct = maxSize > 0 ? (size / maxSize) * 100 : 0;
  return (
    <div style={{
      position: "absolute",
      [side === 'bid' ? 'right' : 'left']: 0,
      top: 0,
      height: "100%",
      width: `${Math.min(widthPct, 100)}%`,
      background: side === 'bid' ? colors.marketGreenSoft : colors.marketRedSoft,
      borderRadius: radius.sm,
      transition: "width 0.2s ease",
    }} />
  );
}

export function MarketDepthPanel({ depth }: { depth: MarketDepthData }) {
  const maxBidSize = Math.max(...depth.bidLevels.map(l => l.size), 1);
  const maxAskSize = Math.max(...depth.askLevels.map(l => l.size), 1);
  const maxTotal = Math.max(maxBidSize, maxAskSize);

  return (
    <div style={{
      background: colors.surface,
      borderRadius: radius.xl,
      padding: "20px",
      border: `1px solid ${colors.hairline}`,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <span style={{ fontSize: typography.body.size, fontWeight: 600, color: colors.ink }}>Order Book • {depth.symbol}</span>
        <div style={{ display: "flex", gap: "16px", fontSize: typography.captionSm.size }}>
          <span style={{ color: colors.mute }}>Spread: <span style={{ color: colors.body }}>{depth.spreadBps.toFixed(1)} bps</span></span>
          <span style={{ color: colors.mute }}>Imbalance: <span style={{
            color: depth.imbalance > 0 ? colors.marketGreen : depth.imbalance < 0 ? colors.marketRed : colors.mute,
          }}>{depth.imbalance > 0 ? "+" : ""}{depth.imbalance.toFixed(3)}</span></span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 1fr", gap: "0", fontSize: typography.captionSm.size }}>
        <div style={{ textAlign: "right", color: colors.marketRed, fontWeight: 600, marginBottom: "8px", paddingRight: "12px" }}>
          Bids ({depth.bidLevels.length})
        </div>
        <div style={{ textAlign: "center", color: colors.ink, fontWeight: 700, fontSize: typography.body.size }}>
          {depth.midPrice.toFixed(2)}
        </div>
        <div style={{ textAlign: "left", color: colors.marketGreen, fontWeight: 600, marginBottom: "8px", paddingLeft: "12px" }}>
          Asks ({depth.askLevels.length})
        </div>

        {Array.from({ length: Math.max(depth.bidLevels.length, depth.askLevels.length) }, (_, i) => (
          <>
            <div style={{ position: "relative", padding: "3px 12px 3px 0", textAlign: "right" }}>
              {i < depth.bidLevels.length && (
                <>
                  <DepthBar size={depth.bidLevels[i].size} maxSize={maxTotal} side="bid" />
                  <span style={{ position: "relative", zIndex: 1, color: colors.body }}>
                    {depth.bidLevels[i].size.toLocaleString()}
                  </span>
                </>
              )}
            </div>
            <div style={{ textAlign: "center", padding: "3px 0" }}>
              {i < depth.bidLevels.length && i < depth.askLevels.length && (
                <span style={{ color: colors.mute }}>{
                  ((depth.askLevels[i].price + depth.bidLevels[i].price) / 2).toFixed(2)
                }</span>
              )}
            </div>
            <div style={{ position: "relative", padding: "3px 0 3px 12px", textAlign: "left" }}>
              {i < depth.askLevels.length && (
                <>
                  <DepthBar size={depth.askLevels[i].size} maxSize={maxTotal} side="ask" />
                  <span style={{ position: "relative", zIndex: 1, color: colors.body }}>
                    {depth.askLevels[i].size.toLocaleString()}
                  </span>
                </>
              )}
            </div>
          </>
        ))}
      </div>
    </div>
  );
}
