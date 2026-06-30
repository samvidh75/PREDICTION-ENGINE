import { Card, CardLabel } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { colors, space, typography } from '../../design/tokens';
import {
  toThesisChangeCardViewModel,
  type ThesisChangeCardViewModel,
  type ThesisChangeState,
} from './thesisChangeViewModel';

export interface ThesisChangeResearchPanelProps {
  items: unknown;
  onResearch?: (symbol: string) => void;
  onCompare?: (symbol: string) => void;
  onTrack?: (symbol: string) => void;
  onInvest?: (symbol: string) => void;
}

const STATE_LABELS: Record<ThesisChangeState, string> = {
  needs_review: 'Needs review',
  thesis_improving: 'Thesis improving',
  risk_rising: 'Risk rising',
  unchanged: 'No major thesis change',
  tracking_only: 'Tracking only',
};

const STATE_COLORS: Record<ThesisChangeState, string> = {
  needs_review: colors.warning,
  thesis_improving: colors.success,
  risk_rising: colors.danger,
  unchanged: colors.textSecondary,
  tracking_only: colors.textTertiary,
};

function toPanelItems(input: unknown): ThesisChangeCardViewModel[] {
  if (!Array.isArray(input)) return [];
  return input
    .map(toThesisChangeCardViewModel)
    .filter((item): item is ThesisChangeCardViewModel => item !== null)
    .slice(0, 6);
}

function DetailList({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;

  return (
    <div style={{ display: 'grid', gap: space[1] }}>
      <div style={{ color: colors.textSecondary, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3 }}>
        {title}
      </div>
      <ul style={{ display: 'grid', gap: 4, margin: 0, paddingLeft: 16, color: colors.textSecondary, fontSize: 12, lineHeight: 1.55 }}>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function ThesisChangeCard({
  item,
  onResearch,
  onCompare,
  onTrack,
  onInvest,
}: {
  item: ThesisChangeCardViewModel;
  onResearch?: (symbol: string) => void;
  onCompare?: (symbol: string) => void;
  onTrack?: (symbol: string) => void;
  onInvest?: (symbol: string) => void;
}) {
  const symbol = item.symbol || item.companyName;
  const hasActionTarget = Boolean(symbol);

  return (
    <Card variant="elevated" style={{ padding: 16 }}>
      <div style={{ display: 'grid', gap: space[3] }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: space[3], alignItems: 'flex-start' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ color: colors.textPrimary, fontSize: typography.h3.desktop.size, fontWeight: 700, lineHeight: 1.2 }}>
              {item.companyName || item.symbol}
            </div>
            {item.symbol && item.companyName && (
              <div style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>{item.symbol}</div>
            )}
          </div>
          <span
            style={{
              flex: '0 0 auto',
              border: `1px solid ${STATE_COLORS[item.state]}`,
              color: STATE_COLORS[item.state],
              borderRadius: 999,
              padding: '4px 8px',
              fontSize: 11,
              fontWeight: 700,
              lineHeight: 1,
            }}
          >
            {STATE_LABELS[item.state]}
          </span>
        </div>

        {item.headline && (
          <p style={{ margin: 0, color: colors.textPrimary, fontSize: 13, lineHeight: 1.5 }}>{item.headline}</p>
        )}

        <DetailList title="Thesis summary" items={item.summary} />
        <DetailList title="Risks to review" items={item.risksToReview} />
        <DetailList title="What to watch" items={item.whatToWatch} />

        {hasActionTarget && (
          <div style={{ display: 'flex', gap: space[2], flexWrap: 'wrap', paddingTop: space[1] }}>
            {item.actions.research && onResearch && (
              <Button size="sm" onClick={() => onResearch(symbol)}>Research</Button>
            )}
            {item.actions.compare && onCompare && (
              <Button size="sm" variant="secondary" onClick={() => onCompare(symbol)}>Compare</Button>
            )}
            {item.actions.track && onTrack && (
              <Button size="sm" variant="secondary" onClick={() => onTrack(symbol)}>Track</Button>
            )}
            {item.actions.invest && onInvest && (
              <Button size="sm" variant="secondary" onClick={() => onInvest(symbol)}>Invest</Button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

export function ThesisChangeResearchPanel({ items, onResearch, onCompare, onTrack, onInvest }: ThesisChangeResearchPanelProps) {
  const panelItems = toPanelItems(items);

  if (!panelItems.length) {
    return (
      <Card variant="elevated" style={{ padding: 18 }}>
        <CardLabel>Thesis change</CardLabel>
        <div style={{ display: 'grid', gap: space[1] }}>
          <h2 style={{ color: colors.textPrimary, fontSize: 16, fontWeight: 700, margin: 0 }}>Track thesis changes</h2>
          <p style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 1.55, margin: 0 }}>
            Research changes will appear here when there is safe evidence to review.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <section style={{ display: 'grid', gap: space[3] }} aria-label="Thesis change research">
      <div style={{ display: 'grid', gap: 4 }}>
        <CardLabel>Thesis change</CardLabel>
        <h2 style={{ color: colors.textPrimary, fontSize: 18, fontWeight: 700, margin: 0 }}>Watchlist research changes</h2>
        <p style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 1.55, margin: 0 }}>
          Review thesis changes, risks, and what to watch before taking the next step.
        </p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: space[3] }}>
        {panelItems.map((item) => (
          <ThesisChangeCard
            key={`${item.symbol}-${item.companyName}-${item.headline}`}
            item={item}
            onResearch={onResearch}
            onCompare={onCompare}
            onTrack={onTrack}
            onInvest={onInvest}
          />
        ))}
      </div>
    </section>
  );
}
