import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardLabel } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { colors, typography, layout, space, radius } from '../design/tokens';

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

export default function AnalystWorkspace() {
  const [question, setQuestion] = useState('');
  const [symbol, setSymbol] = useState('');

  const { data: deepDives } = useQuery({
    queryKey: ['analyst-deep-dive', symbol],
    queryFn: () => fetchAnalyst<{ data: Record<string, unknown> }>(`/api/analyst/company/${symbol || 'TCS'}/deep-dive`),
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
    <main className="raycast-slideUp" style={{ maxWidth: "1200px", margin: "0 auto", padding: layout.pagePaddingDesktop, color: colors.textPrimary }}>

      <section className="raycast-stagger-1" style={{ marginBottom: "48px" }}>
        <h1 style={{ fontSize: typography.h2.desktop.size, fontWeight: 700, marginBottom: "8px" }}>
          Analyst Workspace
        </h1>
        <p style={{ fontSize: typography.body.desktop.size, color: colors.textSecondary, maxWidth: "600px", lineHeight: 1.6 }}>
          Research briefs, deep dives, and evidence-bound Q&amp;A. Not investment advice.
        </p>
      </section>

      <div className="raycast-stagger-2" style={{ animationDelay: "0.1s", display: "grid", gap: "24px" }}>
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
            <Button
              onClick={() => question.trim() && qaMutation.mutate(question.trim())}
              disabled={!question.trim() || qaMutation.isPending}
            >
              Ask
            </Button>
          </div>
          {answer && (
            <div style={{ marginTop: "16px", padding: "16px", background: colors.page, borderRadius: radius.md, fontSize: typography.body.desktop.size, lineHeight: 1.6 }}>
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
            </div>
          )}
        </Card>

        <Card>
          <CardLabel>Company deep dive</CardLabel>
          {deepDives?.data ? (
            <div style={{ marginTop: "12px", display: "grid", gap: "8px", fontSize: typography.body.desktop.size, lineHeight: 1.6 }}>
              <p style={{ margin: 0, color: colors.textPrimary }}>
                {String(deepDives.data.thesisSummary ?? deepDives.data.summary ?? 'Research available')}
              </p>
              {Array.isArray(deepDives.data.limitations) && deepDives.data.limitations.length > 0 && (
                <p style={{ margin: 0, color: colors.textSecondary, fontSize: "14px" }}>
                  {deepDives.data.limitations.join(' ')}
                </p>
              )}
            </div>
          ) : (
            <p style={{ marginTop: "12px", color: colors.textSecondary, fontSize: "14px" }}>
              No deep dive available yet. Enter a symbol to load research.
            </p>
          )}
        </Card>

        <Card>
          <CardLabel>Latest analyst briefs</CardLabel>
          <p style={{ marginTop: "12px", color: colors.textSecondary, fontSize: "14px" }}>
            Earnings notes, filing briefs, and sector briefs appear here when generated for your research universe.
          </p>
        </Card>
      </div>
    </main>
  );
}
