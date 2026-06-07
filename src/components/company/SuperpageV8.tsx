/**
 * TRACK-48 AGENT A — Company Superpage V8
 * 
 * Telemetry-pattern company intelligence display.
 * Consumes: /api/stockstory/:symbol, ExplainabilityEngine, NarrativeEngine
 * 
 * Sections: Current Health | Future Health | Strengths | Risks | Narrative | Prediction Track Record | Transparency
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity, BarChart3, Brain, Calendar, CheckCircle2, Clock, Database,
  Flame, Gauge, Globe, Heart, History, Scale, Shield, Sparkles,
  TrendingDown, TrendingUp, Trophy, XCircle, Zap
} from 'lucide-react';

// ── Types ───────────────────────────────────────────────────────────────────

interface StockStoryResult {
  healthScore: number;
  classification: string;
  confidence: string;
  growth: number;
  quality: number;
  stability: number;
  valuation: number;
  momentum: number;
  risk: number;
  narrative: string;
  generatedAt: string;
  dataFreshness: 'Live' | 'Recent' | 'Stale' | 'Unavailable';
  engineDetails: {
    growth: { score: number; revenueGrowth: number; epsGrowth: number; fcfGrowth: number; profitGrowth: number; commentary: string };
    quality: { score: number; roe: number; roic: number; grossMargin: number; operatingMargin: number; efficiencyScore: number; commentary: string };
    stability: { score: number; debtScore: number; cashScore: number; volatilityScore: number; coverageScore: number; marketCapSizeScore: number; commentary: string };
    momentum: { score: number; momentumScore: number; trendScore: number; volatilityScore: number; commentary: string };
    valuation: { score: number; peScore: number; pbScore: number; evEbitdaScore: number; fcfYieldScore: number; dividendYieldScore: number; commentary: string };
    risk: { score: number; accountingAnomalyScore: number; debtStressScore: number; cashFlowStressScore: number; volatilityRiskScore: number; redFlagCount: number; commentary: string };
    confidence: { level: string; score: number; dataCompleteness: number; signalAgreement: number; riskConsistency: number; historicalStability: number; commentary: string };
  };
}

interface ExplainabilityData {
  strengths: string[];
  risks: string[];
  whatImproved: string[];
  whatDeteriorated: string[];
  whatMattersMost: string;
}

interface PredictionRecord {
  date: string;
  healthScore: number;
  classification: string;
  confidence: string;
  actual3m?: number | null;
  actual6m?: number | null;
}

interface SuperpageV8Props {
  ticker: string;
  companyName: string;
  sector: string;
  marketCap: string;
  price: string;
  change: string;
  changeColor: string;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function derivedExplainability(story: StockStoryResult): ExplainabilityData {
  const d = story.engineDetails;
  const allDrivers: { name: string; score: number }[] = [
    { name: 'Return on Equity (ROE)', score: Math.round(d.quality.roe * 100) },
    { name: 'Return on Invested Capital (ROIC)', score: Math.round(d.quality.roic * 100) },
    { name: 'Operating Margin', score: Math.round(d.quality.operatingMargin * 100) },
    { name: 'Revenue Growth', score: Math.round(d.growth.revenueGrowth * 100) },
    { name: 'Earnings Growth', score: Math.round(d.growth.epsGrowth * 100) },
    { name: 'Free Cash Flow Growth', score: Math.round(d.growth.fcfGrowth * 100) },
    { name: 'Debt Stability', score: d.stability.debtScore },
    { name: 'Cash Position', score: d.stability.cashScore },
    { name: 'Valuation Attractiveness', score: story.valuation },
    { name: 'Price Momentum', score: d.momentum.momentumScore },
    { name: 'Trend Strength', score: d.momentum.trendScore },
  ];

  const sorted = [...allDrivers].sort((a, b) => b.score - a.score);
  const strengths = sorted.slice(0, 4).map(s => s.name);
  const risks = [...sorted].sort((a, b) => a.score - b.score).slice(0, 4).map(s => s.name);
  const improved: string[] = [];
  const deteriorated: string[] = [];

  if (story.growth >= 60) improved.push('Growth trajectory is positive');
  else if (story.growth < 40) deteriorated.push('Growth indicators weakening');
  if (story.quality >= 65) improved.push('Business quality metrics are strong');
  else if (story.quality < 40) deteriorated.push('Quality fundamentals declining');
  if (story.momentum >= 60) improved.push('Price momentum is supportive');
  else if (story.momentum < 35) deteriorated.push('Momentum signals deteriorating');
  if (story.stability >= 60) improved.push('Financial stability is solid');
  else if (story.stability < 40) deteriorated.push('Stability concerns emerging');
  if (story.risk <= 35) improved.push('Risk profile is well-managed');
  else if (story.risk >= 65) deteriorated.push('Risk profile is elevated');

  return {
    strengths,
    risks,
    whatImproved: improved,
    whatDeteriorated: deteriorated,
    whatMattersMost: sorted[0].name,
  };
}

function healthGrade(score: number): { grade: string; color: string } {
  if (score >= 80) return { grade: 'A', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' };
  if (score >= 65) return { grade: 'B', color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30' };
  if (score >= 50) return { grade: 'C', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' };
  if (score >= 35) return { grade: 'D', color: 'text-orange-400 bg-orange-500/10 border-orange-500/30' };
  return { grade: 'F', color: 'text-rose-400 bg-rose-500/10 border-rose-500/30' };
}

function outlookLabel(score: number): { label: string; icon: JSX.Element; colorClass: string } {
  if (score >= 65) return { label: 'Improving', icon: <TrendingUp className="h-4 w-4" />, colorClass: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' };
  if (score >= 45) return { label: 'Stable', icon: <Gauge className="h-4 w-4" />, colorClass: 'text-amber-400 border-amber-500/30 bg-amber-500/10' };
  return { label: 'Weakening', icon: <TrendingDown className="h-4 w-4" />, colorClass: 'text-rose-400 border-rose-500/30 bg-rose-500/10' };
}

// ── Sub-components ──────────────────────────────────────────────────────────

function TelemetryStatCard({ icon, label, value, sub, colorClass = 'text-cyan-400' }: {
  icon: JSX.Element; label: string; value: string | number; sub?: string; colorClass?: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 backdrop-blur-sm hover:border-white/20 transition-colors">
      <div className="flex items-center gap-2 mb-2">
        <span className={colorClass}>{icon}</span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">{label}</span>
      </div>
      <div className={`text-2xl font-extrabold ${colorClass}`}>{value}</div>
      {sub && <div className="mt-1 text-[10px] text-white/30">{sub}</div>}
    </div>
  );
}

function SectionHeader({ icon, title, subtitle }: { icon: JSX.Element; title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-3 mb-4 pb-3 border-b border-white/5">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.03] border border-white/10">
        {icon}
      </div>
      <div>
        <h3 className="text-sm font-extrabold uppercase tracking-wider text-white">{title}</h3>
        {subtitle && <p className="text-[10px] text-white/35">{subtitle}</p>}
      </div>
    </div>
  );
}

function FactorBar({ label, score, maxScore = 100 }: { label: string; score: number; maxScore?: number }) {
  const pct = Math.min((score / maxScore) * 100, 100);
  const barColor =
    score >= 75 ? 'bg-gradient-to-r from-emerald-500 to-cyan-500' :
    score >= 55 ? 'bg-gradient-to-r from-cyan-500 to-blue-500' :
    score >= 35 ? 'bg-gradient-to-r from-amber-500 to-orange-500' :
    'bg-gradient-to-r from-rose-500 to-red-500';

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-[11px]">
        <span className="text-white/60 font-medium">{label}</span>
        <span className="font-mono font-bold text-white/80">{score}/{maxScore}</span>
      </div>
      <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ── Section 1: Current Health ───────────────────────────────────────────────

function CurrentHealthSection({ story, explainability }: { story: StockStoryResult; explainability: ExplainabilityData }) {
  const { grade, color } = healthGrade(story.healthScore);
  const confidenceLabel = story.engineDetails.confidence.level;
  const confColor =
    confidenceLabel === 'Very High' ? 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30' :
    confidenceLabel === 'High' ? 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30' :
    confidenceLabel === 'Medium' ? 'text-amber-400 bg-amber-500/10 border-amber-500/30' :
    'text-rose-400 bg-rose-500/10 border-rose-500/30';

  return (
    <section className="space-y-4">
      <SectionHeader icon={<Heart className="h-4 w-4 text-rose-400" />} title="Current Health" subtitle="Composite health assessment across all engines" />
      
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <TelemetryStatCard icon={<Heart className="h-4 w-4" />} label="Health Score" value={`${story.healthScore}/100`} sub={story.classification} colorClass="text-rose-400" />
        <TelemetryStatCard icon={<Shield className="h-4 w-4" />} label="Grade" value={grade} sub="A=Excellent F=Critical" colorClass={color} />
        <TelemetryStatCard icon={<Activity className="h-4 w-4" />} label="Trend" value={story.growth >= 55 ? 'Improving' : story.growth >= 40 ? 'Stable' : 'Weakening'} colorClass={story.growth >= 55 ? 'text-emerald-400' : story.growth >= 40 ? 'text-amber-400' : 'text-rose-400'} />
        <TelemetryStatCard icon={<Brain className="h-4 w-4" />} label="Confidence" value={confidenceLabel} sub={`${story.engineDetails.confidence.score}/100`} colorClass="text-indigo-400" />
      </div>

      <div className="rounded-xl border border-white/5 bg-white/[0.01] p-5">
        <div className="text-[10px] font-bold uppercase tracking-wider text-white/30 mb-3">Factor Composition</div>
        <div className="grid gap-3 sm:grid-cols-2">
          <FactorBar label="Business Quality" score={story.quality} />
          <FactorBar label="Growth Outlook" score={story.growth} />
          <FactorBar label="Financial Stability" score={story.stability} />
          <FactorBar label="Market Momentum" score={story.momentum} />
          <FactorBar label="Valuation" score={story.valuation} />
          <FactorBar label="Risk (Inverted)" score={100 - story.risk} />
        </div>
      </div>
    </section>
  );
}

// ── Section 2: Future Health ────────────────────────────────────────────────

function FutureHealthSection({ story }: { story: StockStoryResult }) {
  // Derive outlooks from engine scores — higher quality/growth = improving outlook
  const threeMonthOutlook = Math.round((story.growth * 0.4) + (story.momentum * 0.35) + (story.quality * 0.25));
  const sixMonthOutlook = Math.round((story.growth * 0.35) + (story.quality * 0.35) + (story.stability * 0.3));
  const twelveMonthOutlook = Math.round((story.quality * 0.4) + (story.stability * 0.35) + (story.growth * 0.25));

  const m3 = outlookLabel(threeMonthOutlook);
  const m6 = outlookLabel(sixMonthOutlook);
  const m12 = outlookLabel(twelveMonthOutlook);

  return (
    <section className="space-y-4">
      <SectionHeader icon={<Sparkles className="h-4 w-4 text-fuchsia-400" />} title="Future Health" subtitle="Projected health trajectory based on current signals" />

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { horizon: '3 Month', outlook: m3, score: threeMonthOutlook, desc: 'Near-term reflects momentum and growth signals' },
          { horizon: '6 Month', outlook: m6, score: sixMonthOutlook, desc: 'Medium-term balances growth and quality stability' },
          { horizon: '12 Month', outlook: m12, score: twelveMonthOutlook, desc: 'Long-term emphasises quality and financial resilience' },
        ].map(item => (
          <div key={item.horizon} className={`rounded-xl border p-4 backdrop-blur-sm ${item.outlook.colorClass}`}>
            <div className="flex items-center gap-2 mb-2">
              {item.outlook.icon}
              <span className="text-[10px] font-bold uppercase tracking-wider">{item.horizon} Outlook</span>
            </div>
            <div className="text-xl font-extrabold mb-1">{item.outlook.label}</div>
            <div className="text-xs opacity-70">{item.desc}</div>
            <div className="mt-3">
              <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-current transition-all duration-700"
                  style={{ width: `${item.score}%` }}
                />
              </div>
              <div className="mt-1 text-[10px] text-right opacity-50">Score: {item.score}/100</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Section 3: Key Strengths ────────────────────────────────────────────────

function KeyStrengthsSection({ explainability }: { explainability: ExplainabilityData }) {
  return (
    <section className="space-y-4">
      <SectionHeader icon={<Trophy className="h-4 w-4 text-emerald-400" />} title="Key Strengths" subtitle="Top-performing factors driving the health score" />

      <div className="grid gap-3 sm:grid-cols-2">
        {explainability.strengths.map((s, i) => (
          <div key={i} className="flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.03] p-4">
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-bold text-emerald-300">{s}</div>
              <div className="text-[11px] text-emerald-400/60 mt-0.5">Contributing positively to overall health assessment</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Section 4: Key Risks ────────────────────────────────────────────────────

function KeyRisksSection({ explainability, story }: { explainability: ExplainabilityData; story: StockStoryResult }) {
  return (
    <section className="space-y-4">
      <SectionHeader icon={<XCircle className="h-4 w-4 text-rose-400" />} title="Key Risks" subtitle="Factors that may negatively impact the health assessment" />

      <div className="grid gap-3 sm:grid-cols-2">
        {explainability.risks.map((r, i) => (
          <div key={i} className="flex items-start gap-3 rounded-xl border border-rose-500/20 bg-rose-500/[0.03] p-4">
            <XCircle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-bold text-rose-300">{r}</div>
              <div className="text-[11px] text-rose-400/60 mt-0.5">Weighing on composite health assessment</div>
            </div>
          </div>
        ))}
      </div>

      {story.engineDetails.risk.redFlagCount > 0 && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4">
          <div className="flex items-center gap-2 text-rose-400 font-bold text-sm mb-1">
            <Flame className="h-4 w-4" />
            {story.engineDetails.risk.redFlagCount} Red Flag{story.engineDetails.risk.redFlagCount > 1 ? 's' : ''} Detected
          </div>
          <p className="text-xs text-rose-300/80">{story.engineDetails.risk.commentary}</p>
        </div>
      )}
    </section>
  );
}

// ── Section 5: Narrative ────────────────────────────────────────────────────

function NarrativeSection({ story, explainability }: { story: StockStoryResult; explainability: ExplainabilityData }) {
  return (
    <section className="space-y-4">
      <SectionHeader icon={<Brain className="h-4 w-4 text-violet-400" />} title="Narrative" subtitle="What the data says about this company's trajectory" />

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.03] p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-emerald-400" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">What Improved</span>
          </div>
          {explainability.whatImproved.length > 0 ? (
            <ul className="space-y-2">
              {explainability.whatImproved.map((item, i) => (
                <li key={i} className="text-xs text-emerald-200/80 flex items-start gap-1.5">
                  <span className="text-emerald-400 mt-0.5">+</span> {item}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-white/30 italic">No significant improvements detected</p>
          )}
        </div>

        <div className="rounded-xl border border-rose-500/20 bg-rose-500/[0.03] p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="h-4 w-4 text-rose-400" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">What Deteriorated</span>
          </div>
          {explainability.whatDeteriorated.length > 0 ? (
            <ul className="space-y-2">
              {explainability.whatDeteriorated.map((item, i) => (
                <li key={i} className="text-xs text-rose-200/80 flex items-start gap-1.5">
                  <span className="text-rose-400 mt-0.5">-</span> {item}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-white/30 italic">No significant deterioration detected</p>
          )}
        </div>

        <div className="rounded-xl border border-violet-500/20 bg-violet-500/[0.03] p-4">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-4 w-4 text-violet-400" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-violet-400">What Matters Most</span>
          </div>
          <p className="text-sm font-bold text-violet-200 mb-2">{explainability.whatMattersMost}</p>
          <p className="text-xs text-violet-300/60">This factor has the highest influence on the current health assessment</p>
        </div>
      </div>

      <div className="rounded-xl border border-white/5 bg-white/[0.01] p-5">
        <p className="text-sm text-white/80 leading-relaxed">{story.narrative}</p>
      </div>
    </section>
  );
}

// ── Section 6: Prediction Track Record ──────────────────────────────────────

function PredictionTrackRecordSection({ ticker }: { ticker: string }) {
  const [predictions, setPredictions] = useState<PredictionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/stockstory/${encodeURIComponent(ticker)}/predictions`)
      .then(r => r.json())
      .then(data => {
        setPredictions(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [ticker]);

  const totalPredictions = predictions.length;
  const validatedPredictions = predictions.filter(p => p.actual3m !== null && p.actual3m !== undefined);
  const hitRate = validatedPredictions.length > 0
    ? Math.round((validatedPredictions.filter(p => (p.actual3m ?? 0) > 0).length / validatedPredictions.length) * 100)
    : null;

  return (
    <section className="space-y-4">
      <SectionHeader icon={<History className="h-4 w-4 text-amber-400" />} title="Prediction Track Record" subtitle="Historical prediction accuracy and outcomes" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <TelemetryStatCard icon={<BarChart3 className="h-4 w-4" />} label="Total Predictions" value={loading ? '...' : totalPredictions} colorClass="text-amber-400" />
        <TelemetryStatCard icon={<CheckCircle2 className="h-4 w-4" />} label="Hit Rate" value={hitRate !== null ? `${hitRate}%` : 'N/A'} sub="Directionally correct" colorClass="text-emerald-400" />
        <TelemetryStatCard icon={<Activity className="h-4 w-4" />} label="Avg Return" value={validatedPredictions.length > 0 ? `${(validatedPredictions.reduce((s, p) => s + (p.actual3m ?? 0), 0) / validatedPredictions.length * 100).toFixed(1)}%` : 'N/A'} sub="Post-prediction" colorClass="text-cyan-400" />
        <TelemetryStatCard icon={<Clock className="h-4 w-4" />} label="Since" value={predictions.length > 0 ? predictions[predictions.length - 1].date : '—'} sub="First recorded prediction" colorClass="text-white/60" />
      </div>

      {predictions.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-white/5 bg-white/[0.01]">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/5 text-white/40">
                <th className="p-3 text-left font-bold uppercase tracking-wider">Date</th>
                <th className="p-3 text-left font-bold uppercase tracking-wider">Health Score</th>
                <th className="p-3 text-left font-bold uppercase tracking-wider">Classification</th>
                <th className="p-3 text-left font-bold uppercase tracking-wider">Confidence</th>
                <th className="p-3 text-left font-bold uppercase tracking-wider">Actual (3m)</th>
              </tr>
            </thead>
            <tbody>
              {predictions.slice(0, 10).map((p, i) => (
                <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                  <td className="p-3 font-mono text-white/70">{p.date}</td>
                  <td className="p-3 font-mono font-bold text-white">{p.healthScore}/100</td>
                  <td className="p-3">
                    <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                      p.classification === 'Excellent' ? 'bg-emerald-500/10 text-emerald-400' :
                      p.classification === 'Healthy' ? 'bg-cyan-500/10 text-cyan-400' :
                      p.classification === 'Stable' ? 'bg-amber-500/10 text-amber-400' :
                      'bg-rose-500/10 text-rose-400'
                    }`}>{p.classification}</span>
                  </td>
                  <td className="p-3 text-white/60">{p.confidence}</td>
                  <td className={`p-3 font-mono font-bold ${(p.actual3m ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {p.actual3m !== null && p.actual3m !== undefined ? `${(p.actual3m * 100).toFixed(1)}%` : 'Pending'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

// ── Section 7: Transparency ─────────────────────────────────────────────────

function TransparencySection({ story }: { story: StockStoryResult }) {
  const lastUpdate = story.generatedAt ? new Date(story.generatedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : 'Unknown';

  return (
    <section className="space-y-4">
      <SectionHeader icon={<Globe className="h-4 w-4 text-blue-400" />} title="Transparency" subtitle="Data sources, methodology, and freshness" />

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <div className="flex items-center gap-2 mb-2">
            <Database className="h-4 w-4 text-blue-400" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-white/60">Data Sources</span>
          </div>
          <ul className="space-y-1.5 text-xs text-white/50">
            <li>• NSE/BSE market data (daily)</li>
            <li>• Financial statements (quarterly)</li>
            <li>• Factor snapshots (daily computed)</li>
            <li>• Shareholding patterns (quarterly)</li>
          </ul>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <div className="flex items-center gap-2 mb-2">
            <Scale className="h-4 w-4 text-blue-400" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-white/60">Methodology</span>
          </div>
          <ul className="space-y-1.5 text-xs text-white/50">
            <li>• 7-engine composite scoring</li>
            <li>• Growth, Quality, Stability, Value, Momentum, Risk, Confidence</li>
            <li>• Sector-normalized percentiles</li>
            <li>• SEBI-compliant analysis framework</li>
          </ul>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-blue-400" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-white/60">Last Update</span>
          </div>
          <div className="text-lg font-bold text-white mb-1">{lastUpdate}</div>
          <div className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold ${
            story.dataFreshness === 'Live' ? 'bg-emerald-500/10 text-emerald-400' :
            story.dataFreshness === 'Recent' ? 'bg-cyan-500/10 text-cyan-400' :
            story.dataFreshness === 'Stale' ? 'bg-amber-500/10 text-amber-400' :
            'bg-rose-500/10 text-rose-400'
          }`}>
            <div className={`h-1.5 w-1.5 rounded-full ${
              story.dataFreshness === 'Live' ? 'bg-emerald-400' :
              story.dataFreshness === 'Recent' ? 'bg-cyan-400' :
              'bg-amber-400'
            }`} />
            {story.dataFreshness}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Main SuperpageV8 ────────────────────────────────────────────────────────

export const SuperpageV8: React.FC<SuperpageV8Props> = ({
  ticker, companyName, sector, marketCap, price, change, changeColor,
}) => {
  const [story, setStory] = useState<StockStoryResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetch(`/api/stockstory/${encodeURIComponent(ticker)}`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })
      .then(async (res) => {
        const body = await res.json().catch(() => null);
        if (!res.ok) throw new Error(body?.code || 'UNAVAILABLE');
        return body as StockStoryResult;
      })
      .then(data => { setStory(data); setLoading(false); })
      .catch((err: Error) => {
        if (controller.signal.aborted) return;
        setError('Unable to load company intelligence at this time.');
        setLoading(false);
      });

    return () => controller.abort();
  }, [ticker]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent shadow-lg shadow-cyan-500/20" />
          <span className="text-sm font-semibold tracking-wider text-cyan-400 uppercase animate-pulse">Loading {ticker} Intelligence...</span>
        </div>
      </div>
    );
  }

  if (error || !story) {
    return (
      <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-8 text-center">
        <XCircle className="h-10 w-10 text-rose-400 mx-auto mb-3" />
        <p className="text-sm text-rose-300">{error || 'Company intelligence unavailable'}</p>
      </div>
    );
  }

  const explainability = useMemo(() => derivedExplainability(story), [story]);

  return (
    <div className="space-y-8">
      {/* ── Header Bar ──────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.015] p-6 backdrop-blur-md">
        <div className="absolute -left-20 -top-20 h-40 w-40 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute -right-20 -bottom-20 h-40 w-40 rounded-full bg-violet-500/10 blur-3xl" />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-1">{ticker} · {sector}</div>
            <h2 className="text-2xl font-extrabold text-white">{companyName}</h2>
            <div className="mt-1 text-xs text-white/40">{marketCap}</div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-2xl font-mono font-bold text-white">{price}</div>
              <div className={`text-sm font-mono font-bold ${changeColor}`}>{change}</div>
            </div>
            <div className={`rounded-full px-3 py-1.5 text-xs font-bold ${
              story.classification === 'Excellent' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' :
              story.classification === 'Healthy' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30' :
              story.classification === 'Stable' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' :
              'bg-rose-500/10 text-rose-400 border border-rose-500/30'
            }`}>
              {story.classification}
            </div>
          </div>
        </div>
      </div>

      {/* ── SECTIONS ────────────────────────────────────────────────── */}
      <CurrentHealthSection story={story} explainability={explainability} />
      <FutureHealthSection story={story} />
      <KeyStrengthsSection explainability={explainability} />
      <KeyRisksSection explainability={explainability} story={story} />
      <NarrativeSection story={story} explainability={explainability} />
      <PredictionTrackRecordSection ticker={ticker} />
      <TransparencySection story={story} />

      {/* ── Disclaimer ──────────────────────────────────────────────── */}
      <div className="rounded-xl border border-white/5 bg-white/[0.01] p-4 text-[11px] leading-relaxed text-white/40">
        StockStory India provides research intelligence and health assessments based on quantitative factor analysis.
        It does not provide personalised investment advice, recommendations, or buy/sell signals.
        All assessments are based on publicly available data and proprietary scoring engines.
        Past assessments do not guarantee future outcomes.
      </div>
    </div>
  );
};

export default SuperpageV8;
