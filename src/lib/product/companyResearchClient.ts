import type { ProductIdentity, ProductActionResult } from "./productRuntime";
import type { PredictionViewState } from "./predictionEngine/predictionViewModel";
import type { HealthometerViewState, HealthometerDimension } from "./predictionEngine/healthometerViewModel";
import { buildCompanyResearch, buildFinancialSnapshotView, type ResearchState } from "./companyResearchRuntime";
import { api, type CompanyResearchData, type StockStoryData } from "../../services/api/client";
import { healthometerLabelFromScore, normalizeHealthometerLabel, normalizeResearchStance } from "./publicLabels";

export interface UnifiedResearchResult {
  identity: ProductIdentity;
  state: ResearchState;
  message: string;
  prediction: PredictionViewState;
  healthometer: HealthometerViewState;
  healthometerLabel: string | null;
  analysis: {
    companyHealth: string | null;
    convictionState: string | null;
    summary: string | null;
    thesis: string | null;
    bullCase: string | null;
    bearCase: string | null;
    keyDrivers: string[];
    riskFlags: string[];
    watchNext: string[];
    investmentChecklist: string[];
  } | null;
  financialSnapshot: ReturnType<typeof buildFinancialSnapshotView>;
  valuationContext: { peContext: string | null; pbContext: string | null; overall: string | null };
  riskContext: { debtWarning: string | null; volatilityNote: string | null; overall: string | null };
  actions: ProductActionResult;
  methodologyNote: string;
  priceHistory: Array<{ date: string; close: number; high: number | null; low: number | null; volume: number | null }>;
}

function buildHealthometerFromBackend(data: CompanyResearchData, story?: StockStoryData | null): { healthometer: HealthometerViewState; label: string | null } {
  const ic = data?.investContext;
  const thesis = data?.thesis;
  const strengths = thesis?.topStrengths ?? ic?.keyStrengths ?? [];
  const risks = thesis?.topRisks ?? ic?.keyRisks ?? [];
  const conviction = ic?.conviction ?? thesis?.status ?? null;
  const score = ic?.score ?? story?.healthometer?.overallScore ?? story?.healthScore ?? null;

  const dims: HealthometerDimension[] = [];
  const knownDims = [
    { id: 'quality', label: 'Business quality' },
    { id: 'financial_strength', label: 'Financial strength' },
    { id: 'valuation', label: 'Valuation context' },
    { id: 'growth', label: 'Growth' },
    { id: 'stability', label: 'Stability' },
    { id: 'risk', label: 'Risk context' },
    { id: 'momentum', label: 'Momentum' },
  ];

  const factorScores = data?.factorScores ?? [];
  const scoreMap: Record<string, number | null> = {};
  if (Array.isArray(factorScores)) {
    factorScores.forEach((fs: any) => {
      scoreMap[fs.name?.toLowerCase().replace(/\s+/g, '_') ?? ''] = fs.score;
    });
  }

  knownDims.forEach((dim) => {
    const storyDimension = story?.healthometer?.dimensions.find((candidate) => candidate.id === dim.id);
    const storyScores: Record<string, number | null | undefined> = {
      quality: story?.quality, valuation: story?.valuation, growth: story?.growth,
      risk: story?.risk, momentum: story?.momentum,
    };
    const s = scoreMap[dim.id] ?? storyDimension?.score ?? storyScores[dim.id] ?? null;
    dims.push({ id: dim.id, label: dim.label, score: s, status: s !== null ? 'verified' : 'insufficient', color: '#64748B' });
  });

  const backendLabel = story?.healthometer?.label ?? conviction;
  const label = backendLabel ? normalizeHealthometerLabel(backendLabel) : healthometerLabelFromScore(score);
  const dimScores = dims.map(d => d.score).filter((s): s is number => s !== null);
  const overallScore = score ?? (dimScores.length > 0 ? Math.round(dimScores.reduce((a, b) => a + b, 0) / dimScores.length) : null);

  return {
    healthometer: {
      overallScore,
      overallStatus: dimScores.length >= 7 ? 'Complete' : dimScores.length > 0 ? 'Partial research context' : 'Not enough information for this view yet',
      dimensions: dims,
    },
    label,
  };
}

export async function fetchUnifiedResearch(
  symbol: string,
  companyName: string | null | undefined,
  sector: string | null | undefined,
  rawMetrics: Record<string, unknown> | null | undefined,
  isTracked: boolean,
  signal?: AbortSignal,
): Promise<UnifiedResearchResult> {
  const fallback = (): UnifiedResearchResult => {
    const r = buildCompanyResearch(symbol, companyName, sector, rawMetrics, isTracked);
    return { ...r, healthometerLabel: null, analysis: null, priceHistory: [] };
  };

  if (!symbol) return fallback();

  const [researchResult, storyResult] = await Promise.allSettled([
    api.getCompanyResearch(symbol, { signal }),
    api.getStockStory(symbol, 30, { signal }),
  ]);
  const data = researchResult.status === "fulfilled" ? researchResult.value?.data : null;
  const story = storyResult.status === "fulfilled" ? storyResult.value?.data : null;
  if (!data && !story) return fallback();

  try {
    const researchData: CompanyResearchData = data ?? {
      symbol, companyName: companyName || symbol, sector: sector || null, industry: null,
      quote: null, fundamentals: null, candles: [], factorScores: [], thesis: null,
      risk: null, history: [], investContext: null,
    };
    const ic = researchData.investContext;
    const thesis = researchData.thesis;
    const hasBackendData = Boolean(ic?.conviction || (thesis?.status && thesis.status !== 'Research signals pending') || story?.rankingScore !== null);

    if (!hasBackendData) return fallback();

    const { healthometer, label } = buildHealthometerFromBackend(researchData, story);

    const rawDrivers = [...(ic?.keyStrengths ?? []), ...(thesis?.topStrengths ?? [])];
    const rawRisks = [...(ic?.keyRisks ?? []), ...(thesis?.topRisks ?? [])];

    const analysis = {
      companyHealth: ic?.conviction ?? thesis?.status ?? story?.classification ?? null,
      convictionState: ic?.conviction ?? story?.classification ?? null,
      summary: ic?.thesis ?? story?.narrative ?? null,
      thesis: ic?.thesis ?? thesis?.thesis ?? null,
      bullCase: thesis?.bullCase ?? null,
      bearCase: thesis?.bearCase ?? null,
      keyDrivers: rawDrivers,
      riskFlags: rawRisks,
      watchNext: ic?.whatToWatch ?? [],
      investmentChecklist: [],
    };

    const dedupeChips = (arr: string[]) => Array.from(new Set(arr.filter(Boolean)));
    const filterForbidden = (arr: string[]) => arr.filter(c => !/\b(Unhealthy|Very Unhealthy|Buy|Sell|Hold|Strong Buy|Buy now|target price|price target|stop-loss|guaranteed return)\b/i.test(c));

    const old = buildCompanyResearch(symbol, companyName, sector, rawMetrics, isTracked);

    const prediction: PredictionViewState = {
      ...old.prediction,
      readiness: 'ready',
      overallScore: ic?.score ?? story?.rankingScore ?? old.prediction.overallScore,
      confidence: ic?.conviction || story?.confidenceScore ? 'high' : old.prediction.confidence,
      activeFactorCount: healthometer.dimensions.filter(d => d.score !== null).length || old.prediction.activeFactorCount,
      publicResearchStance: normalizeResearchStance(ic?.conviction ?? story?.classification ?? old.prediction.publicResearchStance),
      topPositiveDrivers: dedupeChips(filterForbidden(analysis.keyDrivers.slice(0, 3).length > 0 ? analysis.keyDrivers.slice(0, 3) : old.prediction.topPositiveDrivers)),
      topRiskDrivers: dedupeChips(filterForbidden(analysis.riskFlags.slice(0, 3).length > 0 ? analysis.riskFlags.slice(0, 3) : old.prediction.topRiskDrivers)),
    };

    return {
      ...old,
      state: data ? 'ready' : 'partial',
      message: '',
      prediction,
      healthometer,
      healthometerLabel: label,
      analysis,
      priceHistory: (() => {
        const direct = Array.isArray(researchData.candles) ? researchData.candles : [];
        const nested = (researchData as CompanyResearchData & { history?: { priceHistory?: CompanyResearchData["candles"] } }).history?.priceHistory;
        const source = direct.length > 0 ? direct : Array.isArray(nested) ? nested : [];
        return source
          .filter((point) => typeof point.close === "number" && Number.isFinite(point.close) && point.close > 0)
          .map((point) => ({ date: point.date, close: point.close, high: point.high ?? null, low: point.low ?? null, volume: point.volume ?? null }));
      })(),
    };
  } catch {
    return fallback();
  }
}
