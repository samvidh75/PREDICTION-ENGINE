import { useParams, useNavigate } from "react-router-dom";
import { useResponsiveValue } from "../ui/responsive";
import { colors, typography, layout } from "../design/tokens";
import { getAllSectors, getSectorContent, getSectorInfo } from "../stockstory/content/sector/SectorContentService";

export default function SectorResearch() {
  const { sectorSlug } = useParams<{ sectorSlug: string }>();
  const navigate = useNavigate();
  const contentWidth = useResponsiveValue("100%", "720px");

  const sector = sectorSlug ? getSectorInfo(sectorSlug) : undefined;
  const sectorContent = sectorSlug ? getSectorContent(sectorSlug) : undefined;

  if (!sector || !sectorContent) {
    return (
      <main style={{ maxWidth: "1200px", margin: "0 auto", padding: layout.pagePaddingDesktop }}>
        <h1 style={{ fontSize: typography.h2.desktop.size, color: colors.textPrimary }}>Sector Not Found</h1>
        <p style={{ color: colors.textSecondary }}>The sector you're looking for isn't available.</p>
        <button
          onClick={() => navigate("/sectors")}
          style={{ marginTop: "16px", padding: "8px 16px", background: colors.primary, color: colors.onPrimary, border: "none", borderRadius: "6px", cursor: "pointer" }}
        >
          Browse all sectors
        </button>
      </main>
    );
  }

  return (
    <main className="raycast-slideUp" style={{ maxWidth: contentWidth, margin: "0 auto", padding: layout.pagePaddingDesktop, color: colors.textPrimary }}>

      <nav className="raycast-stagger-1" style={{ marginBottom: "24px", fontSize: "14px", color: colors.textSecondary }}>
        <span style={{ cursor: "pointer", color: colors.primary }} onClick={() => navigate("/sectors")}>
          Sectors
        </span>
        <span style={{ margin: "0 8px" }}>/</span>
        <span>{sector.name}</span>
      </nav>

      <section className="raycast-stagger-2" style={{ animationDelay: "0.1s", marginBottom: "48px" }}>
        <h1 style={{ fontSize: typography.h2.desktop.size, fontWeight: 700, marginBottom: "16px" }}>
          {sector.name} Sector — Research Analysis
        </h1>
        <p style={{ fontSize: typography.body.desktop.size, color: colors.textSecondary, lineHeight: 1.6 }}>
          {sectorContent.overview}
        </p>
      </section>

      {sectorContent.keyMetrics.length > 0 && (
        <section className="raycast-stagger-3" style={{ animationDelay: "0.2s", marginBottom: "36px" }}>
          <h2 style={{ fontSize: typography.h3.desktop.size, fontWeight: 600, marginBottom: "12px" }}>Key Metrics</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {sectorContent.keyMetrics.map((metric) => (
              <span key={metric} style={{ padding: "6px 12px", background: colors.fill, borderRadius: "6px", fontSize: "14px", color: colors.textSecondary }}>
                {metric}
              </span>
            ))}
          </div>
        </section>
      )}

      <section className="raycast-stagger-4" style={{ animationDelay: "0.3s", marginBottom: "36px" }}>
        <h2 style={{ fontSize: typography.h3.desktop.size, fontWeight: 600, marginBottom: "12px" }}>Risks</h2>
        <ul style={{ lineHeight: 1.8, color: colors.textSecondary }}>
          {sectorContent.risks.map((risk) => (
            <li key={risk}>{risk}</li>
          ))}
        </ul>
      </section>

      <section className="raycast-stagger-5" style={{ animationDelay: "0.4s", marginBottom: "36px" }}>
        <h2 style={{ fontSize: typography.h3.desktop.size, fontWeight: 600, marginBottom: "12px" }}>Opportunities</h2>
        <ul style={{ lineHeight: 1.8, color: colors.textSecondary }}>
          {sectorContent.opportunities.map((opp) => (
            <li key={opp}>{opp}</li>
          ))}
        </ul>
      </section>

      <footer className="raycast-stagger-6" style={{ animationDelay: "0.5s", marginTop: "48px", paddingTop: "24px", borderTop: `1px solid ${colors.border}`, fontSize: "13px", color: colors.textSecondary }}>
        <p>Research analysis only. Not investment advice. Consult a SEBI-registered investment advisor.</p>
      </footer>
    </main>
  );
}
