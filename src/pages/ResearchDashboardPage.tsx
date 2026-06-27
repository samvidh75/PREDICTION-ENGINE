import { useState, useEffect } from "react";
import { BarChart3, TrendingUp, Target, Shield, BookOpen, ArrowRight } from "lucide-react";
import SpatialFrame from "../designSystem/SpatialFrame";
import SpatialHierarchyEngine from "../designSystem/SpatialHierarchyEngine";
import { spacing } from "../styles";

function useIsMobile() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return mobile;
}

const SECTIONS = [
  { icon: BarChart3, label: "Quality", score: 78, color: "#13C23E" },
  { icon: TrendingUp, label: "Momentum", score: 62, color: "#0070F3" },
  { icon: Target, label: "Valuation", score: 45, color: "#FAAD14" },
  { icon: Shield, label: "Risk", score: 81, color: "#13C23E" },
];

export default function ResearchDashboardPage() {
  const isMobile = useIsMobile();

  return (
    <SpatialFrame variant="private" isMobile={isMobile}>
      <SpatialHierarchyEngine
        split="hero"
        align="start"
        gap="xl"
        debugLabel="research-dashboard"
        primary={
          <section style={{ display: "flex", flexDirection: "column", gap: spacing.xl }}>
            <header>
              <h1 style={{ fontSize: "32px", fontWeight: 600, letterSpacing: "-0.01em", margin: 0 }}>
                Research Dashboard
              </h1>
              <p style={{ color: "#666", marginTop: spacing.sm, marginBottom: 0 }}>
                Factor scores, conviction levels, and actionable intelligence
              </p>
            </header>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${isMobile ? 2 : 4}, 1fr)`,
                gap: spacing.base,
              }}
            >
              {SECTIONS.map((s) => (
                <div
                  key={s.label}
                  style={{
                    padding: spacing.lg,
                    borderRadius: "8px",
                    border: "1px solid #E5E5E5",
                    background: "#fff",
                  }}
                >
                  <s.icon size={20} color={s.color} />
                  <p style={{ fontSize: "14px", color: "#666", marginTop: spacing.sm, marginBottom: spacing.xs }}>
                    {s.label}
                  </p>
                  <p style={{ fontSize: "28px", fontWeight: 600, margin: 0 }}>{s.score}</p>
                </div>
              ))}
            </div>

            <div
              style={{
                padding: spacing.lg,
                borderRadius: "8px",
                border: "1px solid #E5E5E5",
                background: "#fff",
              }}
            >
              <h3 style={{ fontSize: "16px", fontWeight: 600, margin: 0 }}>Thesis Overview</h3>
              <p style={{ fontSize: "14px", color: "#666", marginTop: spacing.sm, marginBottom: 0, lineHeight: 1.6 }}>
                Strong quality and risk profiles support a favorable risk-reward
                ratio. Valuation remains a concern — monitor entry levels.
              </p>
            </div>
          </section>
        }
        secondary={
          <section style={{ display: "flex", flexDirection: "column", gap: spacing.base }}>
            <div
              style={{
                padding: spacing.lg,
                borderRadius: "8px",
                border: "1px solid #E5E5E5",
                background: "#fff",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: spacing.sm, marginBottom: spacing.base }}>
                <BookOpen size={16} color="#666" />
                <span style={{ fontSize: "14px", fontWeight: 600 }}>Conviction</span>
              </div>
              <p style={{ fontSize: "32px", fontWeight: 600, margin: 0 }}>High</p>
              <p style={{ fontSize: "13px", color: "#999", marginTop: spacing.xs, marginBottom: 0 }}>
                Based on 6/6 factor alignment
              </p>
            </div>

            <div
              style={{
                padding: spacing.lg,
                borderRadius: "8px",
                border: "1px solid #E5E5E5",
                background: "#fff",
              }}
            >
              <p style={{ fontSize: "14px", fontWeight: 600, margin: 0 }}>Key Metrics</p>
              <ul style={{ fontSize: "13px", color: "#666", marginTop: spacing.sm, paddingLeft: spacing.base, lineHeight: 2 }}>
                <li>ROE: 18.4%</li>
                <li>Debt/Equity: 0.12</li>
                <li>P/E: 32.5x</li>
                <li>Revenue Growth: 14% YoY</li>
              </ul>
            </div>

            <button
              style={{
                padding: `${spacing.md} ${spacing.xl}`,
                background: "#0070F3",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                fontWeight: 600,
                fontSize: "14px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: spacing.sm,
                minHeight: "44px",
              }}
            >
              Full Report <ArrowRight size={16} />
            </button>
          </section>
        }
        supporting={
          <div
            style={{
              marginTop: spacing.xl,
              padding: spacing.lg,
              background: "#F5F5F5",
              borderRadius: "8px",
              textAlign: "center",
            }}
          >
            <p style={{ fontSize: "13px", color: "#666", margin: 0 }}>
              Intelligence updates daily at 05:00 IST. Last refreshed: today
            </p>
          </div>
        }
      />
    </SpatialFrame>
  );
}
