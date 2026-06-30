import { Card, CardLabel } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { colors, space, typography } from '../../design/tokens';
import {
  toResearchAlertViewModels,
  type ResearchAlertCategory,
  type ResearchAlertViewModel,
} from './researchAlertViewModel';

export interface ResearchAlertsPanelProps {
  alerts: unknown;
  onResearch?: (symbol: string) => void;
  onCompare?: (symbol: string) => void;
  onTrack?: (symbol: string) => void;
  onInvest?: (symbol: string) => void;
}

const CATEGORY_LABELS: Record<ResearchAlertCategory, string> = {
  thesis_changed: 'Thesis changed',
  risk_changed: 'Risk changed',
  needs_review: 'Needs review',
  valuation_changed: 'Valuation changed',
  momentum_changed: 'Momentum changed',
  important_move: 'Important move',
  peer_became_more_attractive: 'Peer context changed',
  watchlist_review: 'Watchlist review',
};

const CATEGORY_COLORS: Record<ResearchAlertCategory, string> = {
  thesis_changed: colors.primary,
  risk_changed: colors.danger,
  needs_review: colors.warning,
  valuation_changed: colors.accentBlue,
  momentum_changed: colors.accentGreen,
  important_move: colors.primary,
  peer_became_more_attractive: colors.accentBlue,
  watchlist_review: colors.textSecondary,
};

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

function ResearchAlertCard({
  alert,
  onResearch,
  onCompare,
  onTrack,
  onInvest,
}: {
  alert: ResearchAlertViewModel;
  onResearch?: (symbol: string) => void;
  onCompare?: (symbol: string) => void;
  onTrack?: (symbol: string) => void;
  onInvest?: (symbol: string) => void;
}) {
  const symbol = alert.symbol || alert.companyName;
  const hasActionTarget = Boolean(symbol);

  return (
    <Card variant="elevated" style={{ padding: 16 }}>
      <div style={{ display: 'grid', gap: space[3] }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: space[3], alignItems: 'flex-start' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ color: colors.textPrimary, fontSize: typography.h3.desktop.size, fontWeight: 700, lineHeight: 1.2 }}>
              {alert.companyName || alert.symbol}
            </div>
            {alert.symbol && alert.companyName && (
              <div style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>{alert.symbol}</div>
            )}
          </div>
          <span
            style={{
              flex: '0 0 auto',
              border: `1px solid ${CATEGORY_COLORS[alert.category]}`,
              color: CATEGORY_COLORS[alert.category],
              borderRadius: 999,
              padding: '4px 8px',
              fontSize: 11,
              fontWeight: 700,
              lineHeight: 1,
            }}
          >
            {CATEGORY_LABELS[alert.category]}
          </span>
        </div>

        {alert.headline && (
          <p style={{ margin: 0, color: colors.textPrimary, fontSize: 13, lineHeight: 1.5 }}>{alert.headline}</p>
        )}

        <DetailList title="Why it matters" items={alert.summary} />
        <DetailList title="Risks to review" items={alert.risksToReview} />
        <DetailList title="What to watch" items={alert.whatToWatch} />

        {hasActionTarget && (
          <div style={{ display: 'flex', gap: space[2], flexWrap: 'wrap', paddingTop: space[1] }}>
            {alert.actions.research && onResearch && (
              <Button size="sm" onClick={() => onResearch(symbol)}>Research</Button>
            )}
            {alert.actions.compare && onCompare && (
              <Button size="sm" variant="secondary" onClick={() => onCompare(symbol)}>Compare</Button>
            )}
            {alert.actions.track && onTrack && (
              <Button size="sm" variant="secondary" onClick={() => onTrack(symbol)}>Track</Button>
            )}
            {alert.actions.invest && onInvest && (
              <Button size="sm" variant="secondary" onClick={() => onInvest(symbol)}>Invest</Button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

export function ResearchAlertsPanel({ alerts, onResearch, onCompare, onTrack, onInvest }: ResearchAlertsPanelProps) {
  const panelAlerts = toResearchAlertViewModels(alerts).slice(0, 6);

  if (!panelAlerts.length) {
    return (
      <Card variant="elevated" style={{ padding: 18 }}>
        <CardLabel>Research alerts</CardLabel>
        <div style={{ display: 'grid', gap: space[1] }}>
          <h2 style={{ color: colors.textPrimary, fontSize: 16, fontWeight: 700, margin: 0 }}>No research alerts to review</h2>
          <p style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 1.55, margin: 0 }}>
            Important changes will appear here when there is safe research context to review.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <section style={{ display: 'grid', gap: space[3] }} aria-label="Research alerts">
      <div style={{ display: 'grid', gap: 4 }}>
        <CardLabel>Research alerts</CardLabel>
        <h2 style={{ color: colors.textPrimary, fontSize: 18, fontWeight: 700, margin: 0 }}>Important changes to review</h2>
        <p style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 1.55, margin: 0 }}>
          Review what changed, why it matters, and what to watch before taking the next step.
        </p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: space[3] }}>
        {panelAlerts.map((alert) => (
          <ResearchAlertCard
            key={`${alert.symbol}-${alert.companyName}-${alert.headline}`}
            alert={alert}
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
