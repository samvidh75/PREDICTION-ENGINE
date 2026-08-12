import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { AlertCircle, RefreshCw } from "lucide-react";
import { useResponsiveValue } from "../ui/responsive";
import { colors, typography, layout, radius, space, shadows } from "../design/tokens";
import { getShareSnapshot } from "../stockstory/share/ResearchShareService";
import type { SharedSnapshot } from "../stockstory/share/ResearchShareTypes";
import { PriceSkeleton, MetricsSkeleton, NewsSkeleton } from "../components/SkeletonLoader";

// ── Shared motion vocabulary (mirrors ScannerPage/StockPage) ──
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};
const pageTransition = { duration: 0.32, ease: [0.22, 1, 0.36, 1] as const };
const staggerParent = { visible: { transition: { staggerChildren: 0.06 } } };

function SnapshotSkeleton({ contentWidth }: { contentWidth: string }) {
  return (
    <motion.main
      initial="hidden"
      animate="visible"
      variants={staggerParent}
      style={{ maxWidth: contentWidth, margin: "0 auto", padding: layout.pagePaddingDesktop, display: "grid", gap: "24px" }}
    >
      <motion.div variants={fadeUp} transition={pageTransition}>
        <PriceSkeleton />
      </motion.div>
      <motion.div variants={fadeUp} transition={pageTransition}>
        <NewsSkeleton />
      </motion.div>
      <motion.div variants={fadeUp} transition={pageTransition}>
        <MetricsSkeleton />
      </motion.div>
    </motion.main>
  );
}

function SnapshotError({ onRetry }: { onRetry: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={pageTransition}
      style={{
        maxWidth: 480, margin: "80px auto", padding: "32px", textAlign: "center",
        border: `1px solid ${colors.border}`, borderRadius: radius.lg, background: colors.card,
        display: "grid", gap: "12px", justifyItems: "center",
      }}
    >
      <div style={{
        width: "44px", height: "44px", borderRadius: radius.full, background: `${colors.warning}14`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <AlertCircle size={22} color={colors.warning} />
      </div>
      <div style={{ color: colors.textPrimary, fontSize: "15px", fontWeight: 600 }}>Snapshot Not Found</div>
      <p style={{ color: colors.textSecondary, fontSize: "13px", lineHeight: "1.5", margin: 0 }}>
        This research snapshot may have expired or is no longer available.
      </p>
      <motion.button
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.96 }}
        onClick={onRetry}
        style={{
          marginTop: "8px", display: "inline-flex", alignItems: "center", gap: "6px",
          padding: "8px 16px", borderRadius: radius.full, border: `1px solid ${colors.border}`,
          background: colors.fill, color: colors.textPrimary, fontSize: "13px", fontWeight: 500, cursor: "pointer",
        }}
      >
        <RefreshCw size={14} /> Try again
      </motion.button>
    </motion.div>
  );
}

export default function SharedResearchSnapshot() {
  const { shareId } = useParams<{ shareId: string }>();
  const [snapshot, setSnapshot] = useState<SharedSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const contentWidth = useResponsiveValue("100%", "680px");

  const refetch = useCallback(() => setRetryKey((k) => k + 1), []);

  useEffect(() => {
    if (!shareId) {
      setError(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(false);
    getShareSnapshot(shareId).then((data) => {
      if (data) {
        setSnapshot(data);
      } else {
        setError(true);
      }
      setLoading(false);
    });
  }, [shareId, retryKey]);

  if (loading) {
    return <SnapshotSkeleton contentWidth={contentWidth} />;
  }

  if (error || !snapshot) {
    return <SnapshotError onRetry={refetch} />;
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
          Shared Research Snapshot
        </p>
        <h1 style={{ fontSize: typography.h2.desktop.size, fontWeight: 700, marginBottom: "4px" }}>
          {snapshot.companyName}
        </h1>
        <p style={{ fontSize: "14px", color: colors.textSecondary }}>
          {snapshot.symbol} &middot; {new Date(snapshot.createdAt).toLocaleDateString("en-PH")}
        </p>
      </motion.section>

      <motion.section variants={fadeUp} transition={pageTransition} style={{ marginBottom: "36px" }}>
        <h2 style={{ fontSize: typography.h3.desktop.size, fontWeight: 600, marginBottom: "12px" }}>Thesis</h2>
        <p style={{ fontSize: typography.body.desktop.size, color: colors.textSecondary, lineHeight: 1.6 }}>
          {snapshot.thesis}
        </p>
      </motion.section>

      {snapshot.scores && Object.keys(snapshot.scores).length > 0 && (
        <motion.section variants={fadeUp} transition={pageTransition} style={{ marginBottom: "36px" }}>
          <h2 style={{ fontSize: typography.h3.desktop.size, fontWeight: 600, marginBottom: "12px" }}>Scores</h2>
          <motion.div variants={staggerParent} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "12px" }}>
            {Object.entries(snapshot.scores).map(([key, value]) => (
              <motion.div
                key={key}
                variants={fadeUp}
                transition={pageTransition}
                whileHover={{ scale: 1.03 }}
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
              </motion.div>
            ))}
          </motion.div>
        </motion.section>
      )}

      {snapshot.risks.length > 0 && (
        <motion.section variants={fadeUp} transition={pageTransition} style={{ marginBottom: "36px" }}>
          <h2 style={{ fontSize: typography.h3.desktop.size, fontWeight: 600, marginBottom: "12px" }}>Key Risks</h2>
          <ul style={{ lineHeight: 1.8, color: colors.textSecondary }}>
            {snapshot.risks.map((risk) => (
              <li key={risk} style={{ fontSize: typography.body.desktop.size }}>{risk}</li>
            ))}
          </ul>
        </motion.section>
      )}

      {snapshot.expiresAt && (
        <motion.p variants={fadeUp} transition={pageTransition} style={{ fontSize: "12px", color: colors.textTertiary, marginBottom: "24px" }}>
          This snapshot expires on {new Date(snapshot.expiresAt).toLocaleDateString("en-PH")}.
        </motion.p>
      )}

      <motion.footer
        variants={fadeUp}
        transition={pageTransition}
        style={{ marginTop: "48px", paddingTop: "24px", borderTop: `1px solid ${colors.border}`, fontSize: "13px", color: colors.textSecondary }}
      >
        <p>Research analysis only. Not investment advice. Consult a PSE-listed investment advisor before making investment decisions.</p>
      </motion.footer>
    </motion.main>
  );
}
