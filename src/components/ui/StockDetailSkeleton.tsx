import { Skeleton } from "./Skeleton"

export default function StockDetailSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, paddingTop: 16 }}>
      {/* Header skeleton */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ flex: 1 }}>
          <Skeleton width={120} height={14} radius={4} />
          <div style={{ marginTop: 8 }}><Skeleton width={260} height={28} radius={6} /></div>
          <div style={{ marginTop: 8 }}><Skeleton width={180} height={18} radius={4} /></div>
        </div>
        <Skeleton width={52} height={52} radius={26} />
      </div>

      {/* Price chart skeleton */}
      <div style={{ padding: "1.25rem 1.5rem", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)" }}>
        <Skeleton width="100%" height={200} radius={8} />
      </div>

      {/* Healthometer skeleton */}
      <div style={{ padding: "1.25rem 1.5rem", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)" }}>
        <Skeleton width={120} height={18} radius={4} />
        <div style={{ marginTop: 16, display: "flex", gap: 24 }}>
          <Skeleton width={80} height={80} radius={40} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
            {[1,2,3,4,5].map(i => <Skeleton key={i} width="100%" height={12} radius={4} />)}
          </div>
        </div>
      </div>

      {/* Metrics grid skeleton */}
      <div style={{ padding: "1.25rem 1.5rem", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)" }}>
        <Skeleton width={100} height={18} radius={4} />
        <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {[1,2,3,4,5,6].map(i => (
            <div key={i}>
              <Skeleton width={80} height={12} radius={4} />
              <div style={{ marginTop: 4 }}><Skeleton width={120} height={20} radius={4} /></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
