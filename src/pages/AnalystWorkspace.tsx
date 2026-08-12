import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Card, CardLabel } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { colors, typography, layout, space, radius } from '../design/tokens';
import { MetricsSkeleton } from '../components/SkeletonLoader';

// ── Shared motion vocabulary (mirrors ScannerPage/StockPage) ──
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};
const pageTransition = { duration: 0.32, ease: [0.22, 1, 0.36, 1] as const };
const staggerParent = { visible: { transition: { staggerChildren: 0.06 } } };

const API_BASE = import.meta.env.VITE_API_URL ?? '';

async function fetchAnalyst<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, init);
  if (!res.ok) throw new Error('Research unavailable');
  return res.json() as Promise<T>;
}

const inputStyle: React.CSSProperties = {
  minHeight: "44px",
  border: `1px solid ${colors.border}`,
  borderRadius: radius.md,
  padding: "0 16px",
  fontSize: typography.body.desktop.size,
  color: colors.textPrimary,
  background: colors.card,
  outline: "none",
  fontFamily: "inherit",
  flex: 1,
};

function DeepDiveError({ onRetry }: { onRetry: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={pageTransition}
      style={{
        marginTop: "12px", padding: "20px", textAlign: "center",
        border: `1px solid ${colors.border}`, borderRadius: radius.md, background: colors.page,
        display: "grid", gap: "8px", justifyItems: "center",
      }}
    >
      <div style={{
        width: "36px", height: "36px", borderRadius: radius.full, background: `${colors.warning}14`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <AlertCircle size={18} color={colors.warning} />
      </div>
      <p style={{ color: colors.textSecondary, fontSize: "13px", margin: 0 }}>
        Couldn't load the deep dive for this symbol.
      </p>
      <motion.button
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.96 }}
        onClick={onRetry}
        style={{
          marginTop: "4px", display: "inline-flex", alignItems: "center", gap: "6px",
          padding: "6px 14px", borderRadius: radius.full, border: `1px solid ${colors.border}`,
          background: colors.fill, color: colors.textPrimary, fontSize: "12.5px", fontWeight: 500, cursor: "pointer",
        }}
      >
        <RefreshCw size={13} /> Retry
      </motion.button>
    </motion.div>
  );
}

export default function AnalystWorkspace() {
  const [question, setQuestion] = useState('');
  const [symbol, setSymbol] = useState('');

  const { data: deepDives, isLoading, isError, refetch } = useQuery({
    queryKey: ['analyst-deep-dive', symbol],
    queryFn: () => fetchAnalyst<{ data: Record<string, unknown> }>(`/api/analyst/company/${symbol || 'BDO'}/deep-dive`),
    enabled: Boolean(symbol || true),
  });

  const qaMutation = useMutation({
    mutationFn: (q: string) =>
      fetchAnalyst<{ data: { answer: string; limitations?: string[]; confidence?: string } }>(
        '/api/analyst/qa',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: q, symbol: symbol || undefined }),
        }
      ),
  });

  const answer = qaMutation.data?.data;

  return (
    <motion.main
      initial="hidden"
      animate="visible"
      variants={staggerParent}
      style={{ maxWidth: "1200px", margin: "0 auto", padding: layout.pagePaddingDesktop, color: colors.textPrimary }}
    >
      <motion.section variants={fadeUp} transition={pageTransition} style={{ marginBottom: "48px" }}>
        <h1 style={{ fontSize: typography.h2.desktop.size, fontWeight: 700, marginBottom: "8px" }}>
          Analyst Workspace
        </h1>
        <p style={{ fontSize: typography.body.desktop.size, color: colors.textSecondary, maxWidth: "600px", lineHeight: 1.6 }}>
          Research briefs, deep dives, and evidence-bound Q&amp;A. Not investment advice.
        </p>
      </motion.section>

      <motion.div variants={staggerParent} style={{ display: "grid", gap: "24px" }}>
        <motion.div variants={fadeUp} transition={pageTransition}>
          <Card>
            <CardLabel>Ask a research question</CardLabel>
            <div style={{ display: "flex", flexDirection: "row", gap: "12px", marginTop: "16px", flexWrap: "wrap" }}>
              <input
                type="text"
                placeholder="Symbol (optional)"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                style={{ ...inputStyle, maxWidth: "160px" }}
              />
              <input
                type="text"
                placeholder="e.g. Why is risk elevated?"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                style={inputStyle}
                onKeyDown={(e) => e.key === 'Enter' && question.trim() && qaMutation.mutate(question.trim())}
              />
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                <Button
                  onClick={() => question.trim() && qaMutation.mutate(question.trim())}
                  disabled={!question.trim() || qaMutation.isPending}
                >
                  Ask
                </Button>
              </motion.div>
            </div>
            {qaMutation.isPending && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={pageTransition} style={{ marginTop: "16px" }}>
                <MetricsSkeleton />
              </motion.div>
            )}
            {qaMutation.isError && !qaMutation.isPending && (
              <DeepDiveError onRetry={() => question.trim() && qaMutation.mutate(question.trim())} />
            )}
            {answer && !qaMutation.isPending && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={pageTransition}
                style={{ marginTop: "16px", padding: "16px", background: colors.page, borderRadius: radius.md, fontSize: typography.body.desktop.size, lineHeight: 1.6 }}
              >
                <p style={{ margin: 0 }}>{answer.answer}</p>
                <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "12px" }}>
                  {answer.confidence && (
                    <Badge value={answer.confidence} />
                  )}
                  {answer.limitations && answer.limitations.length > 0 && (
                    <span style={{ fontSize: "13px", color: colors.textSecondary }}>{answer.limitations.join(' ')}</span>
                  )}
                </div>
                <p style={{ marginTop: "12px", fontSize: "12px", color: colors.textSecondary }}>Research only. Not investment advice.</p>
              </motion.div>
            )}
          </Card>
        </motion.div>

        <motion.div variants={fadeUp} transition={pageTransition}>
          <Card>
            <CardLabel>Company deep dive</CardLabel>
            {isLoading ? (
              <div style={{ marginTop: "12px" }}>
                <MetricsSkeleton />
              </div>
            ) : isError ? (
              <DeepDiveError onRetry={() => refetch()} />
            ) : deepDives?.data ? (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={pageTransition}
                style={{ marginTop: "12px", display: "grid", gap: "8px", fontSize: typography.body.desktop.size, lineHeight: 1.6 }}
              >
                <p style={{ margin: 0, color: colors.textPrimary }}>
                  {String(deepDives.data.thesisSummary ?? deepDives.data.summary ?? 'Research available')}
                </p>
                {Array.isArray(deepDives.data.limitations) && deepDives.data.limitations.length > 0 && (
                  <p style={{ margin: 0, color: colors.textSecondary, fontSize: "14px" }}>
                    {deepDives.data.limitations.join(' ')}
                  </p>
                )}
              </motion.div>
            ) : (
              <p style={{ marginTop: "12px", color: colors.textSecondary, fontSize: "14px" }}>
                No deep dive available yet. Enter a symbol to load research.
              </p>
            )}
          </Card>
        </motion.div>

        <motion.div variants={fadeUp} transition={pageTransition}>
          <Card>
            <CardLabel>Latest analyst briefs</CardLabel>
            <p style={{ marginTop: "12px", color: colors.textSecondary, fontSize: "14px" }}>
              Earnings notes, filing briefs, and sector briefs appear here when generated for your research universe.
            </p>
          </Card>
        </motion.div>
      </motion.div>
    </motion.main>
  );
}
