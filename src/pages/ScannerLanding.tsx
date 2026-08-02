import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { useResponsiveValue } from "../ui/responsive";
import { colors, typography, layout } from "../design/tokens";
import { SCANNER_PRESETS, getScannerPreset } from "../frontend/scanner/scannerLandingConfig";

// ── Shared motion presets (mirrors ScannerPage/StockPage's animation vocabulary) ──
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};
const pageTransition = { duration: 0.32, ease: [0.22, 1, 0.36, 1] as const };

export default function ScannerLanding() {
  const { preset } = useParams<{ preset: string }>();
  const navigate = useNavigate();
  const contentWidth = useResponsiveValue("100%", "720px");

  const presetConfig = preset ? getScannerPreset(preset) : undefined;

  if (preset && !presetConfig) {
    return (
      <motion.main
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={pageTransition}
        style={{ maxWidth: "1200px", margin: "0 auto", padding: layout.pagePaddingDesktop }}
      >
        <h1 style={{ fontSize: typography.h2.desktop.size, color: colors.textPrimary }}>Scanner Preset Not Found</h1>
        <p style={{ color: colors.textSecondary }}>This scanner preset doesn't exist. Try one of our standard presets.</p>
        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }} style={{ display: "inline-block", marginTop: "16px" }}>
          <Button onClick={() => navigate("/scanner")}>
            Open Scanner
          </Button>
        </motion.div>
      </motion.main>
    );
  }

  if (presetConfig) {
    return (
      <motion.main
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.07 } } }}
        style={{ maxWidth: contentWidth, margin: "0 auto", padding: layout.pagePaddingDesktop, color: colors.textPrimary }}
      >

        <motion.nav variants={fadeUp} transition={pageTransition} style={{ marginBottom: "24px", fontSize: "14px", color: colors.textSecondary }}>
          <span style={{ cursor: "pointer", color: colors.primary }} onClick={() => navigate("/scanner")}>
            Scanner
          </span>
          <span style={{ margin: "0 8px" }}>/</span>
          <span>{presetConfig.label}</span>
        </motion.nav>

        <motion.section variants={fadeUp} transition={pageTransition} style={{ marginBottom: "36px" }}>
          <h1 style={{ fontSize: typography.h2.desktop.size, fontWeight: 700, marginBottom: "16px" }}>
            {presetConfig.label}
          </h1>
          <p style={{ fontSize: typography.body.desktop.size, color: colors.textSecondary, lineHeight: 1.6, marginBottom: "24px" }}>
            {presetConfig.description}
          </p>
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }} style={{ display: "inline-block" }}>
            <Button onClick={() => navigate(`/scanner?preset=${presetConfig.id}`)}>
              View {presetConfig.label} in Scanner
            </Button>
          </motion.div>
        </motion.section>

        <motion.footer variants={fadeUp} transition={pageTransition} style={{ marginTop: "48px", paddingTop: "24px", borderTop: `1px solid ${colors.border}`, fontSize: "13px", color: colors.textSecondary }}>
          <p>Research analysis only. Not investment advice.</p>
        </motion.footer>
      </motion.main>
    );
  }

  return (
    <motion.main
      initial="hidden"
      animate="visible"
      variants={{ visible: { transition: { staggerChildren: 0.07 } } }}
      style={{ maxWidth: "1200px", margin: "0 auto", padding: layout.pagePaddingDesktop, color: colors.textPrimary }}
    >

      <motion.section variants={fadeUp} transition={pageTransition} style={{ marginBottom: "48px" }}>
        <h1 style={{ fontSize: typography.h2.desktop.size, fontWeight: 700, marginBottom: "8px" }}>Research Scanner Presets</h1>
        <p style={{ fontSize: typography.body.desktop.size, color: colors.textSecondary, maxWidth: "600px", lineHeight: 1.6 }}>
          Choose a research preset to screen companies by specific criteria. Not investment advice.
        </p>
      </motion.section>

      <motion.section variants={fadeUp} transition={pageTransition}>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(280px, 1fr))`, gap: "20px" }}>
          {SCANNER_PRESETS.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...pageTransition, delay: Math.min(i, 12) * 0.04 }}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <Card
                style={{ padding: "24px", cursor: "pointer" }}
                onClick={() => navigate(`/scanner/${p.id}`)}
              >
                <h3 style={{ fontSize: typography.h3.desktop.size, fontWeight: 600, marginBottom: "8px", color: colors.textPrimary }}>
                  {p.label}
                </h3>
                <p style={{ fontSize: "14px", color: colors.textSecondary, lineHeight: 1.5 }}>
                  {p.description}
                </p>
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.section>
    </motion.main>
  );
}
