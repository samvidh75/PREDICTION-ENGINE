import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardLabel } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { SEBIComplianceBanner } from '../components/SEBICompliance';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

async function fetchAnalyst<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, init);
  if (!res.ok) throw new Error('Research unavailable');
  return res.json() as Promise<T>;
}

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
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold text-gray-900">Analyst Workspace</h1>
        <p className="mt-1 text-sm text-gray-600">
          Research briefs, deep dives, and evidence-bound Q&amp;A. Not investment advice.
        </p>
      </header>

      <SEBIComplianceBanner />

      <Card>
        <CardLabel>Ask a research question</CardLabel>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            placeholder="Symbol (optional)"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            className="rounded border px-3 py-2 text-sm"
          />
          <input
            type="text"
            placeholder="e.g. Why is risk elevated?"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="flex-1 rounded border px-3 py-2 text-sm"
          />
          <Button
            onClick={() => question.trim() && qaMutation.mutate(question.trim())}
            disabled={!question.trim() || qaMutation.isPending}
          >
            Ask
          </Button>
        </div>
        {answer && (
          <div className="mt-4 rounded bg-gray-50 p-4 text-sm">
            <p>{answer.answer}</p>
            {answer.confidence && (
              <Badge value={answer.confidence} />
            )}
            {answer.limitations && answer.limitations.length > 0 && (
              <p className="mt-2 text-gray-500">{answer.limitations.join(' ')}</p>
            )}
            <p className="mt-2 text-xs text-gray-400">Research only. Not investment advice.</p>
          </div>
        )}
      </Card>

      <Card>
        <CardLabel>Company deep dive</CardLabel>
        {deepDives?.data ? (
          <div className="mt-3 space-y-2 text-sm">
            <p>{String(deepDives.data.thesisSummary ?? deepDives.data.summary ?? 'Research available')}</p>
            {Array.isArray(deepDives.data.limitations) && deepDives.data.limitations.length > 0 && (
              <p className="text-gray-500">{deepDives.data.limitations.join(' ')}</p>
            )}
          </div>
        ) : (
          <p className="mt-3 text-sm text-gray-500">No deep dive available yet. Enter a symbol to load research.</p>
        )}
      </Card>

      <Card>
        <CardLabel>Latest analyst briefs</CardLabel>
        <p className="mt-3 text-sm text-gray-500">
          Earnings notes, filing briefs, and sector briefs appear here when generated for your research universe.
        </p>
      </Card>
    </div>
  );
}
