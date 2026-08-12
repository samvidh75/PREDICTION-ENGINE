import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  ArrowUpRight, ArrowDownRight, Landmark, Factory, Building2,
  Home, Wrench, Mountain, type LucideIcon,
} from "lucide-react";

interface SectorPulse {
  sector: string;
  avgChangePercent: number;
  coverage: string;
  members: string[];
}

const SECTOR_META: Record<string, { label: string; icon: LucideIcon }> = {
  financials:   { label: "Financials",    icon: Landmark },
  industrial:   { label: "Industrial",    icon: Factory },
  holdingFirms: { label: "Holding Firms", icon: Building2 },
  property:     { label: "Property",      icon: Home },
  services:     { label: "Services",      icon: Wrench },
  miningAndOil: { label: "Mining & Oil",  icon: Mountain },
};

/** Glass tint scaled by magnitude — subtle at rest, richer at the extremes. */
function heatTint(pct: number): string {
  const clamped = Math.max(-3, Math.min(3, pct));
  const intensity = Math.abs(clamped) / 3;
  return pct >= 0
    ? `rgba(52, 199, 89, ${0.08 + intensity * 0.22})`
    : `rgba(255, 69, 58, ${0.08 + intensity * 0.22})`;
}

export function SectorHeatmap() {
  const navigate = useNavigate();
  const [sectors, setSectors] = useState<SectorPulse[] | null>(null);

  useEffect(() => {
    fetch("/api/market-pulse")
      .then((r) => r.json())
      .then((payload) => {
        if (payload.ok && Array.isArray(payload.sectors)) setSectors(payload.sectors);
      })
      .catch(() => {});
  }, []);

  if (!sectors || sectors.length === 0) return null;

  return (
    <section aria-label="PSE sector performance" style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "grid", gap: 3 }}>
          <span className="eyebrow" style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.10em", textTransform: "uppercase", color: "var(--accent)" }}>
            Sector performance
          </span>
          <span style={{ fontSize: 12.5, color: "var(--text-secondary)" }}>Today, across PSEi-30 members</span>
        </div>
        <button
          onClick={() => navigate("/sectors")}
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12.5, fontWeight: 500, color: "var(--accent)", display: "inline-flex", alignItems: "center", gap: 4 }}
        >
          See all sectors →
        </button>
      </div>
      {/* .stockex-stagger — CSS-driven entrance, immune to rAF throttling in a
          backgrounded tab (unlike Framer Motion's initial/animate, which is
          stepped by requestAnimationFrame and can freeze at opacity:0). */}
      <div className="stockex-stagger grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {sectors.map((s) => {
          const up = s.avgChangePercent >= 0;
          const meta = SECTOR_META[s.sector];
          const Icon = meta?.icon;
          const tint = up ? "var(--market-green)" : "var(--market-red)";
          return (
            <motion.button
              key={s.sector}
              whileHover={{ y: -3, transition: { duration: 0.18 } }}
              onClick={() => navigate("/sectors")}
              style={{
                padding: "18px 16px",
                minHeight: 96,
                borderRadius: 12,
                borderTop: `1px solid var(--glass-border)`,
                borderRight: `1px solid var(--glass-border)`,
                borderBottom: `1px solid var(--glass-border)`,
                borderLeft: `2px solid ${tint}55`,
                background: `linear-gradient(160deg, ${heatTint(s.avgChangePercent)}, var(--glass-bg))`,
                cursor: "pointer",
                display: "grid",
                gap: 7,
                textAlign: "left",
                transition: "border-color 200ms ease",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderTopColor = "var(--glass-border-top)"; e.currentTarget.style.borderRightColor = "var(--glass-border-top)"; e.currentTarget.style.borderBottomColor = "var(--glass-border-top)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderTopColor = "var(--glass-border)"; e.currentTarget.style.borderRightColor = "var(--glass-border)"; e.currentTarget.style.borderBottomColor = "var(--glass-border)"; }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                {Icon && <Icon size={14} color="var(--text-secondary)" strokeWidth={1.75} />}
                <span
                  style={{
                    fontFamily: "var(--font-mono)", fontSize: 12.5, fontWeight: 700,
                    color: tint,
                    display: "flex", alignItems: "center", gap: 2,
                  }}
                >
                  {up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                  {up ? "+" : ""}{s.avgChangePercent.toFixed(2)}%
                </span>
              </div>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-primary)" }}>
                {meta?.label ?? s.sector}
              </span>
              <span style={{ fontSize: 10, color: "var(--text-secondary)" }}>{s.coverage} reporting</span>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
}
