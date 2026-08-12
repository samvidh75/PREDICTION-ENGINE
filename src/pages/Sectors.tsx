import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Card } from "../ui/Card";
import { useResponsiveValue } from "../ui/responsive";
import { colors, typography, layout } from "../design/tokens";
import { SECTORS } from "../stockstory/content/sector/SectorTypes";

// ── Shared motion vocabulary (mirrors ScannerPage/StockPage). Uses direct
// initial/animate objects (not parent-driven variants) — this page mounts
// inside PublicLayout's route-level AnimatePresence, and nested variant
// propagation through a stagger parent can get stuck mid-transition there.
const pageTransition = { duration: 0.32, ease: [0.22, 1, 0.36, 1] as const };
const entrance = (i: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { ...pageTransition, delay: Math.min(i, 8) * 0.06 },
});

function nameToSlug(name: string): string {
  return name.toLowerCase().replace(/[&\s]+/g, "-").replace(/[^a-z0-9-]/g, "");
}

export default function Sectors() {
  const navigate = useNavigate();
  const cardWidth = useResponsiveValue("100%", "280px");
  const gap = useResponsiveValue("12px", "20px");

  return (
    <main style={{ color: colors.textPrimary }}>
      <motion.section {...entrance(0)} style={{ marginBottom: "48px" }}>
        <h1 style={{ fontSize: typography.h2.desktop.size, fontWeight: 700, marginBottom: "8px", color: colors.textPrimary }}>
          Sector Research
        </h1>
        <p style={{ fontSize: typography.body.desktop.size, color: colors.textSecondary, maxWidth: "600px", lineHeight: 1.6 }}>
          Research-driven sector analysis. Compare company scorecards, trends, and peer performance across sectors. Not investment advice.
        </p>
      </motion.section>

      <section>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${cardWidth}, 1fr))`, gap }}>
          {SECTORS.map((sector, i) => {
            const slug = nameToSlug(sector.name);
            return (
              <motion.div
                key={sector.slug}
                {...entrance(i + 1)}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                style={{ cursor: "pointer" }}
                onClick={() => navigate(`/sectors/${slug}`)}
              >
                <Card style={{ padding: "24px", height: "100%" }}>
                  <h3 style={{ fontSize: typography.h3.desktop.size, fontWeight: 600, marginBottom: "8px", color: colors.textPrimary }}>
                    {sector.name}
                  </h3>
                  <p style={{ fontSize: "14px", color: colors.textSecondary, lineHeight: 1.5, marginBottom: "12px" }}>
                    {sector.description}
                  </p>
                  <span style={{ fontSize: "13px", color: colors.primary }}>
                    {sector.companyCount} {sector.companyCount === 1 ? "company" : "companies"} in the PSEi-30
                  </span>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </section>

      <motion.footer
        {...entrance(SECTORS.length + 1)}
        style={{ marginTop: "64px", paddingTop: "24px", borderTop: `1px solid ${colors.border}`, fontSize: "13px", color: colors.textSecondary }}
      >
        <p>StockEX provides research analysis only. Not investment advice. Consult a PSE-listed investment advisor.</p>
      </motion.footer>
    </main>
  );
}
