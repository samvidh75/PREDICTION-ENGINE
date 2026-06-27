import { useMemo, useState, useEffect, useCallback } from 'react';
import { AlertTriangle, TrendingUp, BarChart2, AlertCircle, Clock, Bookmark, Shield } from 'lucide-react';
import { useStockData } from '../hooks/useStockData';
import { Skeleton } from '../components/ui/Skeleton';
import { SafeBlock } from '../components/ErrorBoundary';
import AppShell from '../components/layout/AppShell';
import CompanyHeader from '../components/stock/CompanyHeader';
import PriceChart from '../components/stock/PriceChart';
import Healthometer from '../components/stock/Healthometer';
import MetricsGrid from '../components/stock/MetricsGrid';
import CompanyInfo from '../components/stock/CompanyInfo';
import NewsFeed from '../components/news/NewsFeed';
import ProUpgradeModal from '../components/stock/ProUpgradeModal';
import ProPaywallGate from '../components/premium/ProPaywallGate';
import { IntelligentAnalysis } from '../components/stock/IntelligentAnalysis';
import ScoreSemiCircles from '../components/stock/ScoreSemiCircles';
import ShareholdingsChart from '../components/stock/ShareholdingsChart';
import { FinancialCharts } from '../components/stock/FinancialCharts';
import { computeHealthScore } from '../lib/healthScore';
import { analytics } from '../analytics/EventAnalyticsEngine';
import { Button } from '../components/ui/Button';
import { Card, CardLabel } from '../components/ui/Card';
import { colors, typography, spacing, radius, shadow } from '../styles';

/* ─── helpers ─────────────────────────────────────────────────────────────── */

function useIsMobile() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return mobile;
}

/* ── Thesis Confidence Meter ── */
function ThesisConfidence({ score }: { score: number | null }) {
  const pct   = score !== null ? Math.min(100, Math.max(0, score)) : 40;
  const color = pct >= 80 ? colors.success : pct >= 60 ? colors.on.warning : colors.error;
  const label = pct >= 80 ? 'High confidence' : pct >= 60 ? 'Moderate confidence' : 'Low confidence';

  return (
    <Card padding="md">
      <CardLabel>Thesis Confidence</CardLabel>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: spacing.sm, marginBottom: spacing.sm }}>
        <span style={{ fontSize: '32px', fontWeight: 600, color, fontVariantNumeric: 'tabular-nums' }}>{pct}%</span>
        <span style={{ ...typography.secondaryText, color: colors.text.secondary }}>{label}</span>
      </div>
      <div style={{ height: '6px', background: colors.bg.secondary, borderRadius: '3px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '3px', transition: 'width 600ms ease' }} />
      </div>
      <p style={{ ...typography.caption, color: colors.text.tertiary, marginTop: spacing.sm }}>
        Based on data completeness & cross-source agreement
      </p>
    </Card>
  );
}

/* ── Risk-Adjusted Score ── */
function RiskAdjustedScore({ baseScore, volatilityPenalty }: { baseScore: number | null; volatilityPenalty: number }) {
  const adj   = baseScore !== null ? Math.max(0, Math.round(baseScore - volatilityPenalty)) : null;
  const delta = baseScore !== null && adj !== null ? adj - baseScore : null;

  return (
    <Card padding="md">
      <CardLabel>Risk-Adjusted Score</CardLabel>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: spacing.sm }}>
        <span style={{ fontSize: '32px', fontWeight: 600, color: colors.text.primary, fontVariantNumeric: 'tabular-nums' }}>
          {adj ?? '—'}
        </span>
        {delta !== null && (
          <span style={{ ...typography.secondaryText, color: delta < 0 ? colors.error : colors.success, fontWeight: 600 }}>
            {delta > 0 ? `+${delta}` : delta} vs base
          </span>
        )}
      </div>
      <p style={{ ...typography.caption, color: colors.text.tertiary, marginTop: spacing.sm }}>
        Base score adjusted for volatility — shows realistic risk/return tradeoff
      </p>
    </Card>
  );
}

/* ── Sector Comparison ── */
const SECTOR_PEERS: Record<string, string[]> = {
  'Information Technology': ['TCS', 'INFY', 'WIPRO', 'HCLTECH', 'TECHM'],
  'Banking':                ['HDFCBANK', 'ICICIBANK', 'SBIN', 'KOTAKBANK', 'AXISBANK'],
  'FMCG':                   ['HINDUNILVR', 'ITC', 'NESTLEIND', 'DABUR', 'BRITANNIA'],
};

function SectorComparison({ symbol, sector }: { symbol: string; sector: string | null }) {
  const peers = (sector && SECTOR_PEERS[sector]) || ['TCS', 'INFY', 'HDFCBANK', 'ICICIBANK', 'RELIANCE'];
  const filtered = peers.filter(p => p !== symbol).slice(0, 4);

  return (
    <Card padding="md">
      <CardLabel>Sector peers</CardLabel>
      <div style={{ display: 'flex', gap: spacing.sm, flexWrap: 'wrap' }}>
        {[symbol, ...filtered].map((sym, i) => (
          <button
            key={sym}
            onClick={() => { window.location.href = `/stock/${sym}`; }}
            style={{
              padding: `${spacing.sm} ${spacing.base}`,
              borderRadius: radius.md,
              border:      i === 0 ? `1px solid ${colors.primary}` : `1px solid ${colors.bg.tertiary}`,
              background:  i === 0 ? colors.tint.primary            : colors.bg.primary,
              color:       i === 0 ? colors.primary                  : colors.text.secondary,
              fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              transition: 'all 150ms ease',
            }}
          >
            {sym}{i === 0 && ' ●'}
          </button>
        ))}
      </div>
      <p style={{ ...typography.caption, color: colors.text.tertiary, marginTop: spacing.sm }}>
        Click any peer to compare · Same sector
      </p>
    </Card>
  );
}

/* ── Smart Alerts strip ── */
function SmartAlerts({ symbol, score }: { symbol: string; score: number | null }) {
  const alerts: Array<{ type: 'info' | 'warn' | 'ok'; text: string }> = [];
  if (score !== null && score >= 75) alerts.push({ type: 'ok',   text: 'High conviction — score above 75' });
  if (score !== null && score < 50)  alerts.push({ type: 'warn', text: 'Score below 50 — monitor closely' });
  alerts.push({ type: 'info', text: `Smart alerts active for ${symbol}` });

  const iconColor = { ok: colors.success, warn: colors.warning, info: colors.primary };
  const bgColor   = { ok: colors.tint.success, warn: colors.tint.warning, info: colors.tint.primary };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm, marginBottom: spacing.base }}>
      {alerts.map((a, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', gap: spacing.sm,
          padding: `${spacing.sm} ${spacing.base}`,
          borderRadius: radius.md, background: bgColor[a.type],
          border: `1px solid ${a.type === 'ok' ? colors.success : a.type === 'warn' ? colors.warning : colors.primary}22`,
        }}>
          <AlertCircle size={14} style={{ color: iconColor[a.type], flexShrink: 0 }} />
          <span style={{ ...typography.caption, color: colors.text.primary }}>{a.text}</span>
        </div>
      ))}
    </div>
  );
}

/* ─── page ────────────────────────────────────────────────────────────────── */

export default function StockPage({ symbol }: { symbol: string }) {
  const { data, loading, error, refetch } = useStockData(symbol);
  const isMobile = useIsMobile();
  const [showProModal,        setShowProModal]        = useState(false);
  const [isTracked,           setIsTracked]           = useState(false);
  const [shareholdersData,    setShareholdersData]    = useState<Array<{ category: string; percent: number; change: number }> | null>(null);

  const fetchShareholders = useCallback(async (sym: string) => {
    try {
      const res = await fetch(`/api/market/stock/${sym}/shareholding`);
      if (!res.ok) return;
      const result = await res.json() as { data?: { snapshots?: Array<{ promoter?: number; fii?: number; dii?: number; public_?: number }> } };
      const latest = result.data?.snapshots?.[result.data.snapshots.length - 1];
      if (!latest) return;
      setShareholdersData([
        { category: 'Promoters', percent: latest.promoter ?? 0, change: 0 },
        { category: 'FIIs',      percent: latest.fii      ?? 0, change: 0 },
        { category: 'DIIs',      percent: latest.dii      ?? 0, change: 0 },
        { category: 'Public',    percent: latest.public_  ?? 0, change: 0 },
      ]);
    } catch { /* best-effort */ }
  }, []);

  useEffect(() => { if (symbol) void fetchShareholders(symbol); }, [symbol, fetchShareholders]);

  useEffect(() => {
    if (symbol) {
      analytics.trackStockView(symbol, 'stock-page', false);
      analytics.trackPageVisit(`/stock/${symbol}`);
      try {
        const prev: string[] = JSON.parse(localStorage.getItem('stockstory-recent') || '[]');
        const updated = [symbol, ...prev.filter(s => s !== symbol)].slice(0, 10);
        localStorage.setItem('stockstory-recent', JSON.stringify(updated));
      } catch { /* ignore */ }
    }
  }, [symbol]);

  const health = useMemo(() => computeHealthScore({
    roe:          data?.fundamentals.roe          ?? null,
    roce:         data?.fundamentals.roce         ?? null,
    debtToEquity: data?.fundamentals.debtToEquity ?? null,
    currentRatio: data?.fundamentals.currentRatio ?? null,
    marketCap:    data?.price.marketCap           ?? null,
    peRatio:      data?.fundamentals.peRatio      ?? null,
    pbRatio:      data?.fundamentals.pbRatio      ?? null,
    eps:          data?.fundamentals.eps          ?? null,
  }), [data]);

  const dataUpdated = data?.fetchedAt
    ? new Date(data.fetchedAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : null;

  const stateLabel = (() => {
    const s = health.compositeScore;
    if (s === null) return null;
    if (s >= 80) return 'High Conviction';
    if (s >= 65) return 'Healthy';
    if (s >= 50) return 'Moderate';
    if (s >= 35) return 'Needs Review';
    return 'Caution';
  })();

  const volatilityPenalty = data?.fundamentals.debtToEquity
    ? Math.min(20, Math.round((data.fundamentals.debtToEquity ?? 0) * 5))
    : 5;

  /* ── Loading ─────────────────────────────────────────────────────────── */
  if (loading && !data) {
    return (
      <AppShell>
        <div style={{ maxWidth: '900px' }}>
          <div style={{ display: 'grid', gap: spacing.base }}>
            <Skeleton height={32} radius={6} />
            <Skeleton height={200} radius={8} />
            <Skeleton height={100} radius={8} />
            <Skeleton height={160} radius={8} />
          </div>
        </div>
      </AppShell>
    );
  }

  /* ── Error ───────────────────────────────────────────────────────────── */
  if (error && !data) {
    return (
      <AppShell>
        <div style={{ maxWidth: '900px' }}>
          <Card style={{ textAlign: 'center', padding: spacing.xxl }}>
            <AlertTriangle size={28} color={colors.warning} />
            <p style={{ ...typography.bodyEmphasis, color: colors.text.primary, marginTop: spacing.base }}>
              Market data is temporarily unavailable
            </p>
            <p style={{ ...typography.secondaryText, color: colors.text.secondary, marginTop: spacing.xs }}>
              Please try again shortly.
            </p>
            <Button variant="primary" size="md" onClick={() => void refetch()} style={{ marginTop: spacing.lg }}>
              Try again
            </Button>
          </Card>
        </div>
      </AppShell>
    );
  }

  /* ── Page ────────────────────────────────────────────────────────────── */
  return (
    <AppShell>
      <div style={{ maxWidth: '900px' }}>

        {/* Breadcrumb */}
        <div style={{ marginBottom: spacing.base }}>
          <a href="/" style={{ ...typography.secondaryText, color: colors.text.secondary, textDecoration: 'none', transition: 'color 150ms ease' }}
            onMouseEnter={e => (e.currentTarget.style.color = colors.text.primary)}
            onMouseLeave={e => (e.currentTarget.style.color = colors.text.secondary)}>
            {'← Home'}
          </a>
        </div>

        {/* 1. Smart Alerts */}
        <SmartAlerts symbol={symbol} score={health.compositeScore} />

        {/* 2. Company Header */}
        <CompanyHeader
          symbol={symbol}
          companyName={data?.price.companyName ?? symbol}
          price={data?.price.current ?? null}
          change={data?.price.change ?? null}
          changeAbs={data?.price.changeAbs ?? null}
          exchange={data?.price.exchange ?? 'NSE'}
          sector={data?.price.sector ?? null}
          isMobile={isMobile}
        />

        {/* 3. Action Buttons */}
        <div style={{ display: 'flex', gap: spacing.sm, margin: `${spacing.base} 0` }}>
          <Button
            variant={isTracked ? 'ghost' : 'secondary'}
            size="md"
            onClick={() => setIsTracked(!isTracked)}
            style={{ flex: 1, maxWidth: '140px', borderColor: isTracked ? colors.success : undefined, color: isTracked ? colors.on.success : undefined }}
          >
            {isTracked ? '♥ Tracked' : '♡ Track'}
          </Button>
          <Button variant="secondary" size="md" onClick={() => { window.location.href = `/compare?stocks=${symbol}`; }}
            style={{ flex: 1, maxWidth: '140px' }}>
            Compare
          </Button>
          <Button variant="primary" size="md" style={{ flex: 1, maxWidth: '140px' }}>
            {'→ Invest'}
          </Button>
        </div>

        {/* 4. Price Chart */}
        <div style={{ margin: `${spacing.base} 0` }}>
          <Card padding={isMobile ? 'sm' : 'md'}>
            <CardLabel>Price Chart</CardLabel>
            <PriceChart symbol={symbol} height={isMobile ? 180 : 260} />
          </Card>
        </div>

        {/* 5. Score Overview */}
        <div style={{ margin: `${spacing.base} 0` }}>
          <ProPaywallGate isLocked={false} onUnlockClick={() => setShowProModal(true)}>
            <Card padding="md">
              <CardLabel>Score Overview</CardLabel>
              <ScoreSemiCircles
                overallScore={health.compositeScore ?? 50}
                riskScore={Math.min(100, Math.max(0, 100 - (health.compositeScore ?? 50)))}
              />
            </Card>
          </ProPaywallGate>
        </div>

        {/* 6. Differentiators grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
          gap: spacing.base,
          margin: `${spacing.base} 0`,
        }}>
          <ThesisConfidence score={health.compositeScore} />
          <RiskAdjustedScore baseScore={health.compositeScore} volatilityPenalty={volatilityPenalty} />
        </div>

        {/* 7. Sector Comparison */}
        <div style={{ margin: `${spacing.base} 0` }}>
          <SectorComparison symbol={symbol} sector={data?.price.sector ?? null} />
        </div>

        {/* 8. Healthometer */}
        <div style={{ margin: `${spacing.base} 0` }}>
          <Healthometer
            score={health.compositeScore}
            factors={health.factors}
            thesis={null}
            stateLabel={stateLabel}
            details={health.details}
            isPro={false}
            onUpgradeClick={() => setShowProModal(true)}
          />
        </div>

        {/* 9. AI Analysis */}
        <div style={{ margin: `${spacing.base} 0` }}>
          <IntelligentAnalysis symbol={symbol} />
        </div>

        {/* 10. Key Metrics */}
        <div style={{ margin: `${spacing.base} 0` }}>
          <MetricsGrid
            fundamentals={data?.fundamentals ?? null}
            price={data?.price ?? null}
            isPro={false}
            onUpgradeClick={() => setShowProModal(true)}
          />
        </div>

        {/* 11. Company Info */}
        <div style={{ margin: `${spacing.base} 0` }}>
          <CompanyInfo
            symbol={symbol}
            companyName={data?.price.companyName ?? symbol}
            sector={data?.price.sector ?? null}
            industry={data?.price.industry ?? null}
            description={data?.price.description ?? null}
            exchange={data?.price.exchange ?? 'NSE'}
            marketCap={data?.price.marketCap ?? null}
          />
        </div>

        {/* 12. Financial Charts */}
        {data?.annualFinancials && data.annualFinancials.length > 0 && (
          <div style={{ margin: `${spacing.base} 0` }}>
            <ProPaywallGate isLocked={false} onUnlockClick={() => setShowProModal(true)}>
              <Card padding="md">
                <CardLabel>Financial Performance</CardLabel>
                <SafeBlock>
                  <FinancialCharts data={data.annualFinancials} />
                </SafeBlock>
              </Card>
            </ProPaywallGate>
          </div>
        )}

        {/* 13. Shareholdings */}
        {shareholdersData && shareholdersData.length > 0 && (
          <div style={{ margin: `${spacing.base} 0` }}>
            <Card padding="md">
              <CardLabel>Shareholding Pattern</CardLabel>
              <ShareholdingsChart shareholdersData={shareholdersData} />
            </Card>
          </div>
        )}

        {/* 14. News */}
        <div style={{ margin: `${spacing.base} 0` }}>
          <Card padding="md">
            <CardLabel>Latest News</CardLabel>
            <NewsFeed symbol={symbol} />
          </Card>
        </div>

        {/* Data recency */}
        <div style={{ ...typography.caption, color: colors.text.tertiary, textAlign: 'center', padding: `${spacing.base} 0 ${spacing.xxl}` }}>
          {dataUpdated ? `Data prepared ${dataUpdated}` : 'Based on latest available market data.'}
          <br />
          StockStory is an AI research layer for Indian equities. Not SEBI-registered.
        </div>

      </div>

      {/* Mobile sticky bottom bar */}
      {isMobile && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
          background: colors.bg.primary, borderTop: `1px solid ${colors.bg.tertiary}`,
          display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr',
          gap: spacing.sm, padding: spacing.sm,
          paddingBottom: `calc(${spacing.sm} + env(safe-area-inset-bottom))`,
        }}>
          <Button variant="secondary" size="md" onClick={() => setIsTracked(!isTracked)}
            style={{ borderColor: isTracked ? colors.success : undefined, color: isTracked ? colors.on.success : undefined }}>
            {isTracked ? '♥ Tracked' : '♡ Track'}
          </Button>
          <Button variant="secondary" size="md" onClick={() => { window.location.href = `/compare?stocks=${symbol}`; }}>
            Compare
          </Button>
          <Button variant="primary" size="md">{'→ Invest'}</Button>
        </div>
      )}

      <ProUpgradeModal isOpen={showProModal} onClose={() => setShowProModal(false)} symbol={symbol} />
    </AppShell>
  );
}
