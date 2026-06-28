import { Link } from 'react-router-dom';
import { Card, CardLabel } from '../../ui/Card';

interface AnalystBriefCardProps {
  title: string;
  summary: string;
  confidence?: string;
  symbol?: string;
  limitations?: string[];
}

export function AnalystBriefCard({ title, summary, confidence, symbol, limitations }: AnalystBriefCardProps) {
  return (
    <Card className="p-4">
      <CardLabel>{title}</CardLabel>
      <p className="mt-2 text-sm text-gray-700">{summary}</p>
      {confidence && <p className="mt-1 text-xs text-gray-500">{confidence}</p>}
      {limitations && limitations.length > 0 && (
        <p className="mt-1 text-xs text-gray-400">{limitations.join(' ')}</p>
      )}
      {symbol && (
        <Link to={`/stock/${symbol}`} className="mt-2 inline-block text-sm text-blue-600 hover:underline">
          View company research
        </Link>
      )}
    </Card>
  );
}

interface AnalystQABoxProps {
  symbol?: string;
  onAsk: (question: string) => void;
  answer?: string;
  loading?: boolean;
  limitations?: string[];
}

export function AnalystQABox({ symbol, onAsk, answer, loading, limitations }: AnalystQABoxProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">
        Ask StockStory about {symbol ?? 'this company'}. Research only — not investment advice.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const q = String(fd.get('question') ?? '').trim();
          if (q) onAsk(q);
        }}
      >
        <input
          name="question"
          placeholder="What changed in the latest result?"
          className="w-full rounded border px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={loading}
          className="mt-2 rounded bg-gray-900 px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          {loading ? 'Researching…' : 'Ask'}
        </button>
      </form>
      {answer && (
        <div className="rounded bg-gray-50 p-3 text-sm">
          <p>{answer}</p>
          {limitations && limitations.length > 0 && (
            <p className="mt-1 text-xs text-gray-500">{limitations.join(' ')}</p>
          )}
        </div>
      )}
    </div>
  );
}
