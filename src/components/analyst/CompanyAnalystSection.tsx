import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Card, CardLabel } from '../../ui/Card';
import { colors, typography, space } from '../../design/tokens';
import { AnalystQABox } from './AnalystBriefCard';

interface CompanyAnalystSectionProps {
  symbol: string;
}

export function CompanyAnalystSection({ symbol }: CompanyAnalystSectionProps) {
  const [qaAnswer, setQaAnswer] = useState<string>();
  const [qaLimitations, setQaLimitations] = useState<string[]>();
  const [qaLoading, setQaLoading] = useState(false);

  const { data: deepDive } = useQuery({
    queryKey: ['analyst-deep-dive', symbol],
    queryFn: async () => {
      const res = await fetch(`/api/analyst/company/${symbol}/deep-dive`);
      if (!res.ok) return null;
      return res.json() as Promise<{ data?: Record<string, unknown> }>;
    },
  });

  const { data: earningsNote } = useQuery({
    queryKey: ['analyst-earnings', symbol],
    queryFn: async () => {
      const res = await fetch(`/api/analyst/company/${symbol}/earnings-note`);
      if (!res.ok) return null;
      return res.json() as Promise<{ data?: Record<string, unknown> }>;
    },
  });

  const handleAsk = async (question: string) => {
    setQaLoading(true);
    try {
      const res = await fetch('/api/analyst/qa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, symbol }),
      });
      const body = await res.json();
      setQaAnswer(String(body?.data?.answer ?? 'Research unavailable.'));
      setQaLimitations(body?.data?.limitations);
    } catch {
      setQaAnswer('Research unavailable.');
    } finally {
      setQaLoading(false);
    }
  };

  const briefSummary = deepDive?.data?.thesisSummary ?? deepDive?.data?.summary;
  const earningsHeadline = earningsNote?.data?.headline;

  return (
    <>
      <Card>
        <CardLabel>Analyst brief</CardLabel>
        {briefSummary ? (
          <p style={{ fontSize: typography.body.desktop.size, color: colors.textSecondary, lineHeight: typography.body.desktop.line }}>
            {String(briefSummary)}
          </p>
        ) : (
          <p style={{ fontSize: typography.body.desktop.size, color: colors.textSecondary }}>
            Analyst brief not yet available for this company.
          </p>
        )}
        {earningsHeadline ? (
          <p style={{ fontSize: typography.caption.desktop.size, marginTop: space[2], color: colors.textSecondary }}>
            Results note: {String(earningsHeadline)}
          </p>
        ) : null}
        <Link
          to={`/analyst`}
          style={{ display: 'inline-block', marginTop: space[3], fontSize: typography.body.desktop.size, color: colors.primary }}
        >
          Open company deep dive →
        </Link>
      </Card>

      <Card>
        <CardLabel>Ask Lensory about this company</CardLabel>
        <AnalystQABox
          symbol={symbol}
          onAsk={handleAsk}
          answer={qaAnswer}
          loading={qaLoading}
          limitations={qaLimitations}
        />
      </Card>
    </>
  );
}
