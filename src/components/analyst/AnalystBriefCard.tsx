import { Link } from 'react-router-dom';
import { Card, CardLabel } from '../../ui/Card';
import { colors, typography, space, radius } from '../../design/tokens';

interface AnalystBriefCardProps {
  title: string;
  summary: string;
  confidence?: string;
  symbol?: string;
  limitations?: string[];
}

export function AnalystBriefCard({ title, summary, confidence, symbol, limitations }: AnalystBriefCardProps) {
  return (
    <Card>
      <CardLabel>{title}</CardLabel>
      <p style={{ marginTop: space[2], fontSize: typography.body.desktop.size, color: colors.textPrimary, lineHeight: typography.body.desktop.line }}>{summary}</p>
      {confidence && <p style={{ marginTop: space[1], fontSize: typography.caption.desktop.size, color: colors.textSecondary }}>{confidence}</p>}
      {limitations && limitations.length > 0 && (
        <p style={{ marginTop: space[1], fontSize: typography.caption.desktop.size, color: colors.textTertiary }}>{limitations.join(' ')}</p>
      )}
      {symbol && (
        <Link to={`/stock/${symbol}`} style={{ marginTop: space[2], display: 'inline-block', fontSize: typography.body.desktop.size, color: colors.primary, textDecoration: 'underline', textDecorationColor: colors.primary }} onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.8'; }} onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}>
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: space[3] }}>
      <p style={{ fontSize: typography.body.desktop.size, color: colors.textSecondary }}>
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
          style={{
            width: '100%',
            borderRadius: radius.md,
            border: `1px solid ${colors.border}`,
            padding: `${space[2]} ${space[3]}`,
            fontSize: typography.body.desktop.size,
            fontFamily: typography.fontFamily,
            boxSizing: 'border-box',
            outline: 'none',
          }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{
            marginTop: space[2],
            borderRadius: radius.md,
            background: colors.textPrimary,
            padding: `${space[2]} ${space[4]}`,
            fontSize: typography.body.desktop.size,
            color: '#FFFFFF',
            border: 'none',
            cursor: loading ? 'default' : 'pointer',
            opacity: loading ? 0.5 : 1,
            fontWeight: 600,
            fontFamily: typography.fontFamily,
          }}
        >
          {loading ? 'Researching…' : 'Ask'}
        </button>
      </form>
      {answer && (
        <div style={{
          borderRadius: radius.md,
          background: colors.fill,
          padding: space[3],
          fontSize: typography.body.desktop.size,
        }}>
          <p style={{ margin: 0 }}>{answer}</p>
          {limitations && limitations.length > 0 && (
            <p style={{ marginTop: space[1], fontSize: typography.caption.desktop.size, color: colors.textSecondary }}>{limitations.join(' ')}</p>
          )}
        </div>
      )}
    </div>
  );
}
