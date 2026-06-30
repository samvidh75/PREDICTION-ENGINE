import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useResponsiveValue } from "../ui/responsive";
import { colors, typography, layout, radius, space, shadows } from "../design/tokens";
import { getShareSnapshot } from "../stockstory/share/ResearchShareService";
import type { SharedSnapshot } from "../stockstory/share/ResearchShareTypes";

export default function SharedResearchSnapshot() {
  const { shareId } = useParams<{ shareId: string }>();
  const [snapshot, setSnapshot] = useState<SharedSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const contentWidth = useResponsiveValue("100%", "680px");

  useEffect(() => {
    if (!shareId) {
      setError(true);
      setLoading(false);
      return;
    }
    getShareSnapshot(shareId).then((data) => {
      if (data) {
        setSnapshot(data);
      } else {
        setError(true);
      }
      setLoading(false);
    });
  }, [shareId]);

  if (loading) {
    return (
      <main style={{ maxWidth: contentWidth, margin: "0 auto", padding: layout.pagePaddingDesktop, color: colors.textPrimary }}>
        <p style={{ fontSize: typography.body.desktop.size, color: colors.textSecondary }}>Loading shared research...</p>
      </main>
    );
  }

  if (error || !snapshot) {
    return (
      <main style={{ maxWidth: contentWidth, margin: "0 auto", padding: layout.pagePaddingDesktop, color: colors.textPrimary }}>
        <h1 style={{ fontSize: typography.h2.desktop.size, fontWeight: 700, marginBottom: "12px" }}>Snapshot Not Found</h1>
        <p style={{ fontSize: typography.body.desktop.size, color: colors.textSecondary }}>
          This research snapshot may have expired or is no longer available.
        </p>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: contentWidth, margin: "0 auto", padding: layout.pagePaddingDesktop, color: colors.textPrimary }}>

      <section style={{ marginBottom: "36px" }}>
        <p style={{ fontSize: typography.caption.desktop.size, color: colors.textSecondary, marginBottom: "4px" }}>
          Shared Research Snapshot
        </p>
        <h1 style={{ fontSize: typography.h2.desktop.size, fontWeight: 700, marginBottom: "4px" }}>
          {snapshot.companyName}
        </h1>
        <p style={{ fontSize: "14px", color: colors.textSecondary }}>
          {snapshot.symbol} &middot; {new Date(snapshot.createdAt).toLocaleDateString("en-IN")}
        </p>
      </section>

      <section style={{ marginBottom: "36px" }}>
        <h2 style={{ fontSize: typography.h3.desktop.size, fontWeight: 600, marginBottom: "12px" }}>Thesis</h2>
        <p style={{ fontSize: typography.body.desktop.size, color: colors.textSecondary, lineHeight: 1.6 }}>
          {snapshot.thesis}
        </p>
      </section>

      {snapshot.scores && Object.keys(snapshot.scores).length > 0 && (
        <section style={{ marginBottom: "36px" }}>
          <h2 style={{ fontSize: typography.h3.desktop.size, fontWeight: 600, marginBottom: "12px" }}>Scores</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "12px" }}>
            {Object.entries(snapshot.scores).map(([key, value]) => (
              <div
                key={key}
                style={{
                  padding: "12px",
                  background: colors.card,
                  borderRadius: radius.md,
                  border: `1px solid ${colors.border}`,
                  boxShadow: shadows.card,
                }}
              >
                <p style={{ fontSize: "11px", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "4px" }}>
                  {key}
                </p>
                <p style={{ fontSize: "18px", fontWeight: 700, color: colors.primary }}>{value}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {snapshot.risks.length > 0 && (
        <section style={{ marginBottom: "36px" }}>
          <h2 style={{ fontSize: typography.h3.desktop.size, fontWeight: 600, marginBottom: "12px" }}>Key Risks</h2>
          <ul style={{ lineHeight: 1.8, color: colors.textSecondary }}>
            {snapshot.risks.map((risk) => (
              <li key={risk} style={{ fontSize: typography.body.desktop.size }}>{risk}</li>
            ))}
          </ul>
        </section>
      )}

      {snapshot.expiresAt && (
        <p style={{ fontSize: "12px", color: colors.textTertiary, marginBottom: "24px" }}>
          This snapshot expires on {new Date(snapshot.expiresAt).toLocaleDateString("en-IN")}.
        </p>
      )}

      <footer style={{ marginTop: "48px", paddingTop: "24px", borderTop: `1px solid ${colors.border}`, fontSize: "13px", color: colors.textSecondary }}>
        <p>Research analysis only. Not investment advice. Consult a SEBI-registered investment advisor before making investment decisions.</p>
      </footer>
    </main>
  );
}
