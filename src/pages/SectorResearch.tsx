import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useResponsiveValue } from "../ui/responsive";
import { colors, typography, layout, radius } from "../design/tokens";
import { getAllSectors, getSectorContent, getSectorInfo } from "../stockstory/content/sector/SectorContentService";

// ── Shared motion vocabulary (mirrors ScannerPage/StockPage) ──
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};
const pageTransition = { duration: 0.32, ease: [0.22, 1, 0.36, 1] as const };
const staggerParent = { visible: { transition: { staggerChildren: 0.06 } } };

export default function SectorResearch() {
  const { sectorSlug } = useParams<{ sectorSlug: string }>();
  const navigate = useNavigate();
  const contentWidth = useResponsiveValue("100%", "720px");

  const sector = sectorSlug ? getSectorInfo(sectorSlug) : undefined;
  const sectorContent = sectorSlug ? getSectorContent(sectorSlug) : undefined;

  if (!sector || !sectorContent) {
    return (
      <motion.main
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={pageTransition}
        style={{
          maxWidth: 480, margin: "80px auto", padding: "32px", textAlign: "center",
          border: `1px solid ${colors.border}`, borderRadius: radius.lg, background: colors.card,
          display: "grid", gap: "12px", justifyItems: "center",
        }}
      >
        <h1 style={{ fontSize: typography.h2.desktop.size, color: colors.textPrimary, margin: 0 }}>Sector Not Found</h1>
        <p style={{ color: colors.textSecondary, margin: 0 }}>The sector you're looking for isn't available.</p>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => navigate("/sectors")}
          style={{ marginTop: "8px", padding: "8px 16px", background: colors.primary, color: colors.onPrimary, border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "13px", fontWeight: 500 }}
        >
          Browse all sectors
        </motion.button>
      </motion.main>
    );
  }

  return (
    <motion.main
      initial="hidden"
      animate="visible"
      variants={staggerParent}
      style={{ maxWidth: contentWidth, margin: "0 auto", padding: layout.pagePaddingDesktop, color: colors.textPrimary }}
    >
      <motion.nav variants={fadeUp} transition={pageTransition} style={{ marginBottom: "24px", fontSize: "14px", color: colors.textSecondary }}>
        <span style={{ cursor: "pointer", color: colors.primary }} onClick={() => navigate("/sectors")}>
          Sectors
        </span>
        <span style={{ margin: "0 8px" }}>/</span>
        <span>{sector.name}</span>
      </motion.nav>

      <motion.section variants={fadeUp} transition={pageTransition} style={{ marginBottom: "48px" }}>
        <h1 style={{ fontSize: typography.h2.desktop.size, fontWeight: 700, marginBottom: "16px" }}>
          {sector.name} Sector — Research Analysis
        </h1>
        <p style={{ fontSize: typography.body.desktop.size, color: colors.textSecondary, lineHeight: 1.6 }}>
          {sectorContent.overview}
        </p>
      </motion.section>

      {sectorContent.keyMetrics.length > 0 && (
        <motion.section variants={fadeUp} transition={pageTransition} style={{ marginBottom: "36px" }}>
          <h2 style={{ fontSize: typography.h3.desktop.size, fontWeight: 600, marginBottom: "12px" }}>Key Metrics</h2>
          <motion.div variants={staggerParent} style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {sectorContent.keyMetrics.map((metric) => (
              <motion.span
                key={metric}
                variants={fadeUp}
                transition={pageTransition}
                whileHover={{ scale: 1.05 }}
                style={{ padding: "6px 12px", background: colors.fill, borderRadius: "6px", fontSize: "14px", color: colors.textSecondary }}
              >
                {metric}
              </motion.span>
            ))}
          </motion.div>
        </motion.section>
      )}

      <motion.section variants={fadeUp} transition={pageTransition} style={{ marginBottom: "36px" }}>
        <h2 style={{ fontSize: typography.h3.desktop.size, fontWeight: 600, marginBottom: "12px" }}>Risks</h2>
        <ul style={{ lineHeight: 1.8, color: colors.textSecondary }}>
          {sectorContent.risks.map((risk) => (
            <li key={risk}>{risk}</li>
          ))}
        </ul>
      </motion.section>

      <motion.section variants={fadeUp} transition={pageTransition} style={{ marginBottom: "36px" }}>
        <h2 style={{ fontSize: typography.h3.desktop.size, fontWeight: 600, marginBottom: "12px" }}>Opportunities</h2>
        <ul style={{ lineHeight: 1.8, color: colors.textSecondary }}>
          {sectorContent.opportunities.map((opp) => (
            <li key={opp}>{opp}</li>
          ))}
        </ul>
      </motion.section>

      <motion.footer
        variants={fadeUp}
        transition={pageTransition}
        style={{ marginTop: "48px", paddingTop: "24px", borderTop: `1px solid ${colors.border}`, fontSize: "13px", color: colors.textSecondary }}
      >
        <p>Research analysis only. Not investment advice. Consult a PSE-listed investment advisor.</p>
      </motion.footer>
    </motion.main>
  );
}
