import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Brain, AlertTriangle, BarChart3, TrendingUp, Shield } from 'lucide-react';
import { fetchMarketBrainResearch } from '../../services/marketBrainResearch';
import { colors, typography, radius, space } from '../../design/tokens';
import { Panel } from '../../ui/Panel';
import { Badge } from '../../ui/Badge';
import { toMarketBrainPanelViewModel, type MarketBrainPanelViewModel } from './marketBrainViewModel';

/* ── Props ── */
export interface MarketBrainPanelProps {
  symbol: string;
  companyName: string;
}

/* ── Inline pill/badge helpers ── */
const severityColor: Record<string, string> = {
  Low: '#2e7d32',
  Medium: '#f57c00',
  High: '#d32f2f',
  'Needs review': '#757575',
};

function severityBadge(severity: string) {
  const bg = severityColor[severity] ?? '#757575';
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: '999px',
        fontSize: '11px',
        fontWeight: 600,
        color: '#fff',
        background: bg,
        whiteSpace: 'nowrap',
      }}
    >
      {severity}
    </span>
  );
}

const domainLabel: Record<string, string> = {
  price_action: 'Price Action',
  volume: 'Volume',
  delivery: 'Delivery',
  fundamentals: 'Fundamentals',
  news: 'News',
  management: 'Management',
  peer: 'Peer Comparison',
  macro: 'Macro',
  technicals: 'Technicals',
  sector: 'Sector',
};

function domainTag(domain: string) {
  const label = domainLabel[domain] ?? domain;
  return (
    <span
      key={domain}
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: '6px',
        fontSize: '11px',
        color: colors.textSecondary,
        background: colors.fill,
      }}
    >
      {label}
    </span>
  );
}

/* ── Sub-section components ── */

function SectionTitle({ children }: { children: string }) {
  return (
    <p style={{ fontSize: '13px', fontWeight: 600, color: colors.textPrimary, margin: 0 }}>{children}</p>
  );
}

function WhyDidThisMoveSection({ wdtm }: { wdtm: NonNullable<MarketBrainPanelViewModel['whyDidThisMove']> }) {
  const directionLabel: Record<string, string> = { up: 'Up', down: 'Down', sideways: 'Sideways', mixed: 'Mixed' };
  return (
    <div style={{ display: 'grid', gap: '8px' }}>
      <SectionTitle>Why Did This Move</SectionTitle>
      {wdtm.primaryDriver && (
        <p style={{ fontSize: '13px', color: colors.textSecondary, lineHeight: '1.5', margin: 0 }}>
          <strong>Driver:</strong> {wdtm.primaryDriver}
        </p>
      )}
      {wdtm.direction && (
        <p style={{ fontSize: '12px', color: colors.textSecondary, margin: 0 }}>
          Direction: {directionLabel[wdtm.direction] ?? wdtm.direction}
          {wdtm.confidence && ` · Confidence: ${wdtm.confidence}`}
          {wdtm.magnitudePct != null && ` · Magnitude: ${wdtm.magnitudePct.toFixed(1)}%`}
        </p>
      )}
      {wdtm.summary && (
        <p style={{ fontSize: '13px', color: colors.textSecondary, lineHeight: '1.5', margin: 0 }}>{wdtm.summary}</p>
      )}
      {wdtm.contributingFactors.length > 0 && (
        <div>
          <p style={{ fontSize: '12px', color: colors.textSecondary, margin: '0 0 4px' }}>Contributing factors</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {wdtm.contributingFactors.map((f, i) => (
              <span key={i} style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '6px', background: colors.fill, color: colors.textSecondary }}>{f}</span>
            ))}
          </div>
        </div>
      )}
      {wdtm.risksToThesis.length > 0 && (
        <div>
          <p style={{ fontSize: '12px', color: colors.danger, margin: '0 0 4px' }}>Risks to thesis</p>
          <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12px', color: colors.textSecondary, lineHeight: '1.5' }}>
            {wdtm.risksToThesis.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </div>
      )}
      {wdtm.keyLevels.length > 0 && (
        <p style={{ fontSize: '12px', color: colors.textSecondary, margin: 0 }}>
          Key levels: {wdtm.keyLevels.join(', ')}
        </p>
      )}
    </div>
  );
}

function EvidenceSection({ vm }: { vm: MarketBrainPanelViewModel }) {
  const { evidenceReview, anomalyReview, evidenceSummary } = vm;
  const hasGaps = evidenceReview?.needsReview;
  const hasEvidence = evidenceSummary.length > 0 || evidenceReview !== null || anomalyReview !== null;

  if (!hasEvidence) return null;

  return (
    <div style={{ display: 'grid', gap: '10px' }}>
      <SectionTitle>Evidence Review</SectionTitle>

      {evidenceSummary.length > 0 && (
        <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '13px', color: colors.textSecondary, lineHeight: '1.5' }}>
          {evidenceSummary.map((s, i) => <li key={i}>{s}</li>)}
        </ul>
      )}

      {evidenceReview && (
        <div style={{ display: 'grid', gap: '6px' }}>
          {evidenceReview.partial.length > 0 && (
            <div>
              <p style={{ fontSize: '12px', color: colors.warning, margin: '0 0 4px' }}>Partial domains</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {evidenceReview.partial.map((d) => domainTag(d))}
              </div>
            </div>
          )}
          {evidenceReview.missing.length > 0 && (
            <div>
              <p style={{ fontSize: '12px', color: colors.danger, margin: '0 0 4px' }}>Missing domains</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {evidenceReview.missing.map((d) => domainTag(d))}
              </div>
            </div>
          )}
          {hasGaps && (
            <p style={{ fontSize: '12px', color: colors.danger, margin: 0 }}>
              <AlertTriangle size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
              Evidence gaps detected — some claims lack full supporting data
            </p>
          )}
        </div>
      )}

      {anomalyReview && (
        <div style={{ display: 'grid', gap: '6px', padding: '8px', background: colors.fill, borderRadius: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={14} color={colors.textSecondary} />
            <span style={{ fontSize: '12px', color: colors.textSecondary }}>Anomaly: {anomalyReview.anomalyType}</span>
            {severityBadge(anomalyReview.severity)}
          </div>
          {anomalyReview.evidence.length > 0 && (
            <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12px', color: colors.textSecondary, lineHeight: '1.5' }}>
              {anomalyReview.evidence.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          )}
          {anomalyReview.summary && (
            <p style={{ fontSize: '12px', color: colors.textSecondary, margin: 0 }}>{anomalyReview.summary}</p>
          )}
        </div>
      )}
    </div>
  );
}

function FactorSection({ factorViews }: { factorViews: MarketBrainPanelViewModel['factorViews'] }) {
  if (factorViews.length === 0) return null;
  return (
    <div style={{ display: 'grid', gap: '8px' }}>
      <SectionTitle>Factor Breakdown</SectionTitle>
      {factorViews.map((fv) => (
        <div key={fv.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: colors.textPrimary, flex: 1 }}>{fv.label || fv.key}</span>
          <div style={{ width: '80px', height: '6px', background: colors.fill, borderRadius: '999px', overflow: 'hidden', flexShrink: 0 }}>
            <div style={{ width: `${Math.max(0, Math.min(100, fv.score))}%`, height: '100%', borderRadius: '999px', background: fv.score >= 70 ? colors.success : fv.score >= 40 ? colors.warning : colors.danger }} />
          </div>
          <span style={{ fontSize: '11px', color: colors.textSecondary, width: '28px', textAlign: 'right', flexShrink: 0 }}>{Math.round(fv.score)}</span>
        </div>
      ))}
    </div>
  );
}

function RisksSection({ risksToReview }: { risksToReview: string[] }) {
  if (risksToReview.length === 0) return null;
  return (
    <div style={{ display: 'grid', gap: '6px' }}>
      <SectionTitle>Risks to Review</SectionTitle>
      <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '13px', color: colors.danger, lineHeight: '1.5' }}>
        {risksToReview.map((r, i) => <li key={i}>{r}</li>)}
      </ul>
    </div>
  );
}

function WhatToWatchSection({ whatToWatch }: { whatToWatch: string[] }) {
  if (whatToWatch.length === 0) return null;
  return (
    <div style={{ display: 'grid', gap: '6px' }}>
      <SectionTitle>What to Watch</SectionTitle>
      <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '13px', color: colors.textSecondary, lineHeight: '1.5' }}>
        {whatToWatch.map((w, i) => <li key={i}>{w}</li>)}
      </ul>
    </div>
  );
}

/* ── Empty state ── */
function EmptyMarketBrain() {
  return (
    <Panel style={{ display: 'grid', gap: space[2] }}>
      <Panel.Header title="Market Research" icon={<Brain size={16} color={colors.primary} />} />
      <Panel.Content>
        <div style={{ textAlign: 'center' }}>
          <Brain size={24} color={colors.textSecondary} style={{ opacity: 0.4, marginBottom: '8px' }} />
          <p style={{ fontSize: '13px', color: colors.textSecondary, margin: 0 }}>Detailed research analysis will appear here as it becomes available.</p>
        </div>
      </Panel.Content>
    </Panel>
  );
}

/* ── Main component ── */
export function MarketBrainPanel({ symbol, companyName }: MarketBrainPanelProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['marketBrainResearch', symbol],
    queryFn: () => fetchMarketBrainResearch(symbol),
    enabled: !!symbol,
    staleTime: 30_000,
    retry: false,
  });

  const vm = useMemo<MarketBrainPanelViewModel | null>(() => {
    if (!data?.research) return null;
    return toMarketBrainPanelViewModel(data.research);
  }, [data]);

  if (isLoading) {
    return (
      <Panel style={{ display: 'grid', gap: space[2] }}>
        <Panel.Header title="Market Research" icon={<Brain size={16} color={colors.primary} />} />
        <Panel.Content>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="raycast-spinner" style={{ width: '14px', height: '14px', border: `2px solid ${colors.border}`, borderTopColor: colors.primary, borderRadius: '50%' }} />
            <span style={{ color: colors.textSecondary, fontSize: '13px' }}>Loading research analysis…</span>
          </div>
        </Panel.Content>
      </Panel>
    );
  }

  if (!vm) return <EmptyMarketBrain />;

  const hasContent = vm.thesis.length > 0 || vm.whyDidThisMove !== null || vm.evidenceSummary.length > 0 || vm.evidenceReview !== null || vm.anomalyReview !== null || vm.risksToReview.length > 0 || vm.whatToWatch.length > 0 || vm.factorViews.length > 0;

  if (!hasContent) return <EmptyMarketBrain />;

  return (
    <Panel className="market-brain-panel raycast-slideUp" style={{ animationDelay: '0.38s', animationFillMode: 'both' }}>
      <Panel.Header
        icon={<Brain size={16} color={colors.primary} />}
        title="Market Research"
        action={vm.state ? (
          <Badge value={vm.state === 'In Review' ? 30 : vm.state === 'Stable' ? 70 : vm.state === 'Needs Review' ? 40 : 50} label={vm.state} />
        ) : undefined}
      />
      <Panel.Content style={{ display: 'grid', gap: '16px' }}>
        {/* Headline */}
        {vm.headline && (
          <p style={{ fontSize: '15px', fontWeight: 600, color: colors.textPrimary, lineHeight: '1.5', margin: 0 }}>{vm.headline}</p>
        )}

        {/* Thesis points */}
        {vm.thesis.length > 0 && (
          <div style={{ display: 'grid', gap: '6px' }}>
            <SectionTitle>Research Narrative</SectionTitle>
            <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '13px', color: colors.textSecondary, lineHeight: '1.5' }}>
              {vm.thesis.map((t, i) => <li key={i}>{t}</li>)}
            </ul>
          </div>
        )}

        {/* Why Did This Move */}
        {vm.whyDidThisMove && <WhyDidThisMoveSection wdtm={vm.whyDidThisMove} />}

        {/* Evidence */}
        <EvidenceSection vm={vm} />

        {/* Risks */}
        <RisksSection risksToReview={vm.risksToReview} />

        {/* What to Watch */}
        <WhatToWatchSection whatToWatch={vm.whatToWatch} />

        {/* Factor breakdown */}
        <FactorSection factorViews={vm.factorViews} />

        {/* Method note */}
        {vm.methodNote && (
          <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-start', padding: '8px', background: colors.fill, borderRadius: '8px' }}>
            <Shield size={12} color={colors.textSecondary} style={{ marginTop: '2px', flexShrink: 0 }} />
            <p style={{ fontSize: '11px', color: colors.textSecondary, lineHeight: '1.4', margin: 0 }}>{vm.methodNote}</p>
          </div>
        )}
      </Panel.Content>
    </Panel>
  );
}
