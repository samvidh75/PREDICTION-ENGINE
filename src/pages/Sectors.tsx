import { useNavigate } from "react-router-dom";
import { Card } from "../ui/Card";
import { useResponsiveValue } from "../ui/responsive";
import { colors, typography, layout } from "../design/tokens";
import { SECTORS } from "../stockstory/content/sector/SectorTypes";

function nameToSlug(name: string): string {
  return name.toLowerCase().replace(/[&\s]+/g, "-").replace(/[^a-z0-9-]/g, "");
}

export default function Sectors() {
  const navigate = useNavigate();
  const cardWidth = useResponsiveValue("100%", "280px");
  const gap = useResponsiveValue("12px", "20px");

  return (
    <main style={{ maxWidth: "1200px", margin: "0 auto", padding: layout.pagePaddingDesktop, color: colors.textPrimary }}>

      <section style={{ marginBottom: "48px" }}>
        <h1 style={{ fontSize: typography.h2.desktop.size, fontWeight: 700, marginBottom: "8px", color: colors.textPrimary }}>
          Sector Research
        </h1>
        <p style={{ fontSize: typography.body.desktop.size, color: colors.textSecondary, maxWidth: "600px", lineHeight: 1.6 }}>
          Research-driven sector analysis. Compare company scorecards, trends, and peer performance across sectors. Not investment advice.
        </p>
      </section>

      <section>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${cardWidth}, 1fr))`, gap }}>
          {SECTORS.map((sector) => {
            const slug = nameToSlug(sector.name);
            return (
              <Card
                key={sector.slug}
                style={{ padding: "24px" }}
                onClick={() => navigate(`/sectors/${slug}`)}
              >
                <h3 style={{ fontSize: typography.h3.desktop.size, fontWeight: 600, marginBottom: "8px", color: colors.textPrimary }}>
                  {sector.name}
                </h3>
                <p style={{ fontSize: "14px", color: colors.textSecondary, lineHeight: 1.5, marginBottom: "12px" }}>
                  {sector.description}
                </p>
                <span style={{ fontSize: "13px", color: colors.primary }}>
                  {sector.companyCount} companies
                </span>
              </Card>
            );
          })}
        </div>
      </section>

      <footer style={{ marginTop: "64px", paddingTop: "24px", borderTop: `1px solid ${colors.border}`, fontSize: "13px", color: colors.textSecondary }}>
        <p>StockStory India provides research analysis only. Not investment advice. Consult a SEBI-registered investment advisor.</p>
      </footer>
    </main>
  );
}
