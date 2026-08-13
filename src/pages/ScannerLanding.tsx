import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "../ui/Button";
import { colors, typography, space } from "../design/tokens";
import { SCANNER_PRESETS, getScannerPreset } from "../frontend/scanner/scannerLandingConfig";
import {
  ArrowRight,
  AlertCircle,
  TrendingUp,
  DollarSign,
  Target,
  BarChart3,
  Activity,
  Home,
  Filter,
} from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
};
const pageTransition = { duration: 0.28, ease: [0.22, 1, 0.36, 1] as const };

const presetIcons: Record<string, React.ReactNode> = {
  quality: <TrendingUp size={18} strokeWidth={1.5} />,
  value: <DollarSign size={18} strokeWidth={1.5} />,
  momentum: <Activity size={18} strokeWidth={1.5} />,
  stable: <BarChart3 size={18} strokeWidth={1.5} />,
  growth: <TrendingUp size={18} strokeWidth={1.5} />,
  "high-risk": <AlertCircle size={18} strokeWidth={1.5} />,
  dividend: <DollarSign size={18} strokeWidth={1.5} />,
  turnaround: <Target size={18} strokeWidth={1.5} />,
};

export default function ScannerLanding() {
  const { preset } = useParams<{ preset: string }>();
  const navigate = useNavigate();

  const presetConfig = preset ? getScannerPreset(preset) : undefined;

  // Error state: preset not found
  if (preset && !presetConfig) {
    return (
      <motion.main
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={pageTransition}
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: `${space.md} ${space.lg}`,
          backgroundColor: colors.canvas,
          color: colors.ink,
          minHeight: "100vh",
        }}
      >
        <div style={{ paddingTop: space.lg, paddingBottom: space.lg }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: space.sm,
              marginBottom: space.md,
            }}
          >
            <AlertCircle size={20} strokeWidth={1.5} color={colors.marketRed} />
            <h1
              style={{
                fontSize: typography.headingMd.size,
                fontWeight: 600,
                color: colors.ink,
              }}
            >
              Preset Not Found
            </h1>
          </div>
          <p
            style={{
              fontSize: typography.bodySm.size,
              color: colors.body,
              marginBottom: space.md,
              lineHeight: 1.5,
            }}
          >
            This scanner preset doesn't exist. Try one of our standard presets.
          </p>
          <Button onClick={() => navigate("/scanner")}>
            <Home size={16} style={{ marginRight: space.xs }} />
            Return to Scanner
          </Button>
        </div>
      </motion.main>
    );
  }

  // Preset detail view
  if (presetConfig) {
    return (
      <motion.main
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: `${space.md} ${space.lg}`,
          backgroundColor: colors.canvas,
          color: colors.ink,
          minHeight: "100vh",
        }}
      >
        {/* Breadcrumb Navigation */}
        <motion.nav
          variants={fadeUp}
          transition={pageTransition}
          style={{
            marginBottom: space.lg,
            fontSize: typography.bodySm.size,
            color: colors.body,
            paddingTop: space.md,
            display: "flex",
            alignItems: "center",
            gap: space.sm,
          }}
        >
          <button
            onClick={() => navigate("/scanner")}
            style={{
              background: "none",
              border: "none",
              color: colors.primary,
              cursor: "pointer",
              fontSize: typography.bodySm.size,
              fontWeight: 500,
              padding: 0,
              display: "flex",
              alignItems: "center",
              gap: space.xs,
            }}
          >
            <Home size={14} strokeWidth={2} />
            Scanner
          </button>
          <span style={{ opacity: 0.5 }}>/</span>
          <span>{presetConfig.label}</span>
        </motion.nav>

        {/* Header Section */}
        <motion.section
          variants={fadeUp}
          transition={pageTransition}
          style={{
            marginBottom: space.xl,
            paddingBottom: space.lg,
            borderBottom: `1px solid ${colors.hairlineSoft}`,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: space.md,
              marginBottom: space.md,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "40px",
                height: "40px",
                borderRadius: "6px",
                backgroundColor: colors.accentBlueSoft,
                color: colors.primary,
                flexShrink: 0,
              }}
            >
              {presetIcons[presetConfig.id] || <Filter size={18} strokeWidth={1.5} />}
            </div>
            <div style={{ flex: 1 }}>
              <h1
                style={{
                  fontSize: typography.headingMd.size,
                  fontWeight: 700,
                  color: colors.ink,
                  marginBottom: space.sm,
                }}
              >
                {presetConfig.label}
              </h1>
              <p
                style={{
                  fontSize: typography.bodySm.size,
                  color: colors.body,
                  lineHeight: 1.6,
                  maxWidth: "600px",
                  marginBottom: space.md,
                }}
              >
                {presetConfig.description}
              </p>
              <Button onClick={() => navigate(`/scanner?preset=${presetConfig.id}`)}>
                <Filter size={14} style={{ marginRight: space.xs }} />
                Open Scanner
                <ArrowRight size={14} style={{ marginLeft: space.xs }} />
              </Button>
            </div>
          </div>
        </motion.section>

        {/* Disclaimer Footer */}
        <motion.footer
          variants={fadeUp}
          transition={pageTransition}
          style={{
            marginTop: space.xl,
            paddingTop: space.lg,
            fontSize: typography.captionSm.size,
            color: colors.mute,
            borderTop: `1px solid ${colors.hairlineSoft}`,
            display: "flex",
            alignItems: "center",
            gap: space.xs,
          }}
        >
          <AlertCircle size={12} strokeWidth={2} />
          <span>Research analysis only. Not investment advice.</span>
        </motion.footer>
      </motion.main>
    );
  }

  // Main landing: Preset grid
  return (
    <motion.main
      initial="hidden"
      animate="visible"
      variants={{ visible: { transition: { staggerChildren: 0.04 } } }}
      style={{
        maxWidth: "1400px",
        margin: "0 auto",
        padding: `${space.md} ${space.lg}`,
        backgroundColor: colors.canvas,
        color: colors.ink,
        minHeight: "100vh",
      }}
    >
      {/* Hero Header */}
      <motion.section
        variants={fadeUp}
        transition={pageTransition}
        style={{
          marginBottom: space.xl,
          paddingTop: space.md,
        }}
      >
        <h1
          style={{
            fontSize: typography.headingLg.size,
            fontWeight: 700,
            color: colors.ink,
            marginBottom: space.sm,
          }}
        >
          Research Scanner
        </h1>
        <p
          style={{
            fontSize: typography.bodySm.size,
            color: colors.body,
            maxWidth: "700px",
            lineHeight: 1.6,
          }}
        >
          Screen PSE companies by research criteria. Select a preset to analyze fundamentals, technicals, and risk metrics. Research analysis only—not investment advice.
        </p>
      </motion.section>

      {/* Preset Cards Grid – Borderless Table Layout */}
      <motion.section variants={fadeUp} transition={pageTransition}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: space.md,
            width: "100%",
          }}
        >
          {SCANNER_PRESETS.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...pageTransition, delay: Math.min(i, 12) * 0.03 }}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate(`/scanner/${p.id}`)}
              style={{
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  padding: space.md,
                  borderRadius: "6px",
                  border: `1px solid ${colors.hairlineSoft}`,
                  backgroundColor: colors.surface,
                  transition:
                    "border-color 0.2s ease, background-color 0.2s ease",
                  display: "flex",
                  flexDirection: "column",
                  gap: space.sm,
                  height: "100%",
                } as React.CSSProperties}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor =
                    colors.hairlineStrong;
                  (e.currentTarget as HTMLElement).style.backgroundColor =
                    colors.surfaceElevated;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor =
                    colors.hairlineSoft;
                  (e.currentTarget as HTMLElement).style.backgroundColor =
                    colors.surface;
                }}
              >
                {/* Icon + Title */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: space.sm,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "32px",
                      height: "32px",
                      borderRadius: "4px",
                      backgroundColor: colors.accentBlueSoft,
                      color: colors.primary,
                      flexShrink: 0,
                    }}
                  >
                    {presetIcons[p.id] || <Filter size={16} strokeWidth={1.5} />}
                  </div>
                  <h3
                    style={{
                      fontSize: typography.bodySm.size,
                      fontWeight: 600,
                      color: colors.ink,
                      margin: 0,
                      flex: 1,
                    }}
                  >
                    {p.label}
                  </h3>
                </div>

                {/* Description */}
                <p
                  style={{
                    fontSize: typography.captionSm.size,
                    color: colors.body,
                    lineHeight: 1.5,
                    margin: 0,
                    flex: 1,
                  }}
                >
                  {p.description}
                </p>

                {/* Action Indicator */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: space.xs,
                    color: colors.primary,
                    fontSize: typography.captionSm.size,
                    fontWeight: 500,
                    marginTop: space.xs,
                  }}
                >
                  <span>View Scanner</span>
                  <ArrowRight size={14} strokeWidth={2} />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* Footer Disclaimer */}
      <motion.footer
        variants={fadeUp}
        transition={pageTransition}
        style={{
          marginTop: space.xl,
          paddingTop: space.lg,
          borderTop: `1px solid ${colors.hairlineSoft}`,
          fontSize: typography.captionSm.size,
          color: colors.mute,
          display: "flex",
          alignItems: "center",
          gap: space.xs,
        }}
      >
        <AlertCircle size={12} strokeWidth={2} />
        <span>
          Research analysis only. Not investment advice. Past performance does
          not guarantee future results.
        </span>
      </motion.footer>
    </motion.main>
  );
}
