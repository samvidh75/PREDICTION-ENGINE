import type { ProductIdentity, ProductActionResult } from "./productRuntime";
import type { PredictionViewState } from "./predictionEngine/predictionViewModel";
import type { HealthometerViewState, HealthometerDimension } from "./predictionEngine/healthometerViewModel";
import { buildCompanyResearch, buildFinancialSnapshotView, type ResearchState } from "./companyResearchRuntime";
import { api } from "../../services/api/client";
import { normalizeHealthometerLabel } from "./publicLabels";

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
}

function buildHealthometerFromBackend(data: any): { healthometer: HealthometerViewState; label: string | null } {
  const ic = data?.investContext;
  const thesis = data?.thesis;
  const strengths = thesis?.topStrengths ?? ic?.keyStrengths ?? [];
  const risks = thesis?.topRisks ?? ic?.keyRisks ?? [];
  const conviction = ic?.conviction ?? thesis?.status ?? null;
  const score = ic?.score ?? null;

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
    const s = scoreMap[dim.id] ?? null;
    dims.push({ id: dim.id, label: dim.label, score: s, status: s !== null ? 'verified' : 'insufficient', color: '#64748B' });
  });

  const label = normalizeHealthometerLabel(conviction);
  const dimScores = dims.map(d => d.score).filter((s): s is number => s !== null);
  const overallScore = score ?? (dimScores.length > 0 ? Math.round(dimScores.reduce((a, b) => a + b, 0) / dimScores.length) : null);

  return {
    healthometer: {
      overallScore,
      overallStatus: dimScores.length >= 7 ? 'Complete' : dimScores.length > 0 ? 'Partial research context' : 'Not enough information for this view yet',
      dimensions: dims,
      backendLabel: conviction,
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
    return { ...r, healthometerLabel: null, analysis: null };
  };

  if (!symbol) return fallback();

  try {
    const res = await api.getCompanyResearch(symbol, { signal });
    const data = res?.data;

    if (!data) return fallback();

    const ic = data.investContext;
    const thesis = data.thesis;
    const hasBackendData = ic?.conviction || (thesis?.status && thesis.status !== 'Research signals pending');

    if (!hasBackendData) return fallback();

    const { healthometer, label } = buildHealthometerFromBackend(data);

    const analysis = {
      companyHealth: ic?.conviction ?? thesis?.status ?? null,
      convictionState: ic?.conviction ?? null,
      summary: ic?.thesis ?? null,
      thesis: ic?.thesis ?? thesis?.thesis ?? null,
      bullCase: thesis?.bullCase ?? null,
      bearCase: thesis?.bearCase ?? null,
      keyDrivers: ic?.keyStrengths ?? thesis?.topStrengths ?? [],
      riskFlags: ic?.keyRisks ?? thesis?.topRisks ?? [],
      watchNext: ic?.whatToWatch ?? [],
      investmentChecklist: [],
    };

    const old = buildCompanyResearch(symbol, companyName, sector, rawMetrics, isTracked);

    const prediction: PredictionViewState = {
      ...old.prediction,
      overallScore: ic?.score ?? old.prediction.overallScore,
      activeFactorCount: healthometer.dimensions.filter(d => d.score !== null).length || old.prediction.activeFactorCount,
      publicResearchStance: ic?.conviction ?? old.prediction.publicResearchStance,
      topPositiveDrivers: analysis.keyDrivers.slice(0, 3).length > 0 ? analysis.keyDrivers.slice(0, 3) : old.prediction.topPositiveDrivers,
      topRiskDrivers: analysis.riskFlags.slice(0, 3).length > 0 ? analysis.riskFlags.slice(0, 3) : old.prediction.topRiskDrivers,
    };

    return {
      ...old,
      state: 'ready',
      message: '',
      prediction,
      healthometer,
      healthometerLabel: label,
      analysis,
    };
  } catch {
    return fallback();
  }
}
