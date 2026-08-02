import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useResponsiveValue } from "../ui/responsive";
import { colors, typography, layout, radius, shadows } from "../design/tokens";
import { buildResearchReport } from "../stockstory/reports/CompanyResearchReportBuilder";
import type { CompanyReportSection } from "../stockstory/reports/CompanyResearchReportTypes";

// ── Shared motion vocabulary (mirrors ScannerPage/StockPage) ──
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};
const pageTransition = { duration: 0.32, ease: [0.22, 1, 0.36, 1] as const };
const staggerParent = { visible: { transition: { staggerChildren: 0.06 } } };

function getSampleSections(): CompanyReportSection[] {
  return [
    { title: "Business Overview", content: "Company overview and business model description would appear here based on available data.", type: "text" },
    { title: "Financial Health", content: "Revenue trends, margin analysis, and key financial metrics for the company.", type: "score" },
    { title: "Competitive Position", content: "Market position, moat analysis, and competitive advantages relative to peers.", type: "text" },
    { title: "Risk Assessment", content: "Key business and market risks that could impact the company's performance.", type: "risk" },
    { title: "Investment Thesis", content: "Bull and bear case scenarios for the company based on available data.", type: "thesis" },
  ];
}

export default function CompanyResearchReport() {
  const { symbol } = useParams<{ symbol: string }>();
  const contentWidth = useResponsiveValue("100%", "740px");
  const companyName = symbol?.toUpperCase() || "Unknown";

  const report = buildResearchReport(
    symbol || "UNKNOWN",
    companyName,
    "N/A",
    getSampleSections(),
  );

  if (!symbol) {
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
        <h1 style={{ fontSize: typography.h2.desktop.size, color: colors.textPrimary, margin: 0 }}>Report Not Found</h1>
        <p style={{ color: colors.textSecondary, margin: 0 }}>No symbol specified for the research report.</p>
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
      <motion.section variants={fadeUp} transition={pageTransition} style={{ marginBottom: "36px" }}>
        <p style={{ fontSize: typography.caption.desktop.size, color: colors.textSecondary, marginBottom: "4px" }}>
          Research Report
        </p>
        <h1 style={{ fontSize: typography.h2.desktop.size, fontWeight: 700, marginBottom: "4px" }}>
          {report.companyName} ({report.symbol})
        </h1>
        <p style={{ fontSize: "14px", color: colors.textSecondary }}>
          Sector: {report.sector} &middot; Generated: {new Date(report.generatedAt).toLocaleDateString("en-PH")}
        </p>
      </motion.section>

      {report.sections.map((section, index) => (
        <motion.article key={index} variants={fadeUp} transition={pageTransition} style={{ marginBottom: "32px" }}>
          <h2 style={{ fontSize: typography.h3.desktop.size, fontWeight: 600, marginBottom: "12px", color: colors.textPrimary }}>
            {section.title}
          </h2>
          <motion.div
            whileHover={{ scale: 1.005 }}
            style={{
              padding: "16px",
              background: colors.card,
              backdropFilter: "blur(20px) saturate(160%)",
              WebkitBackdropFilter: "blur(20px) saturate(160%)",
              borderRadius: radius.md,
              border: `1px solid ${colors.border}`,
              boxShadow: shadows.card,
            }}
          >
            <p style={{ fontSize: typography.body.desktop.size, color: colors.textSecondary, lineHeight: 1.6 }}>
              {section.content}
            </p>
          </motion.div>
        </motion.article>
      ))}

      <motion.footer
        variants={fadeUp}
        transition={pageTransition}
        style={{ marginTop: "48px", paddingTop: "24px", borderTop: `1px solid ${colors.border}`, fontSize: "13px", color: colors.textSecondary }}
      >
        <p>{report.disclaimer}</p>
      </motion.footer>
    </motion.main>
  );
}
