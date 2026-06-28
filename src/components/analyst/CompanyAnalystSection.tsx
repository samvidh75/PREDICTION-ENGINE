import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Card, CardLabel } from '../../ui/Card';
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
      <Card className="stock-panel-card">
        <CardLabel>Analyst brief</CardLabel>
        {briefSummary ? (
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            {String(briefSummary)}
          </p>
        ) : (
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            Analyst brief not yet available for this company.
          </p>
        )}
        {earningsHeadline ? (
          <p style={{ fontSize: '13px', marginTop: '8px', color: 'var(--text-secondary)' }}>
            Results note: {String(earningsHeadline)}
          </p>
        ) : null}
        <Link
          to={`/analyst`}
          style={{ display: 'inline-block', marginTop: '12px', fontSize: '14px' }}
        >
          Open company deep dive →
        </Link>
      </Card>

      <Card className="stock-panel-card">
        <CardLabel>Ask StockStory about this company</CardLabel>
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
