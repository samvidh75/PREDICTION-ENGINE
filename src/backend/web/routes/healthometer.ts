import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { apiError, apiSuccess } from "../../types/api";
import { MarketStateEngine } from "../../../services/market/marketStateEngine";
import { computeMarketState, confidenceFromMarketState, themeForMarketState } from "../../../services/intelligence/marketState";
import { buildNeuralMarketSynthesisEngine } from "../../../services/synthesis/neuralMarketSynthesisEngine";
import type { NeuralMarketSynthesisInputs } from "../../../services/synthesis/neuralMarketSynthesisTypes";
import { sanitizeNeuralMarketSynthesisStrings } from "../../../lib/compliance/sanitizeIntelligenceStrings";
import type { ConfidenceState, ConfidenceTheme } from "../../../components/intelligence/ConfidenceEngine";
import type { MarketInputs } from "../../../services/intelligence/marketState";
import type { MarketState as MarketStateInput } from "../../../types/MarketState";
import { getCacheEngine } from "../..//persistence/cache/cachePlugin";

type QueryShape = {
  // optional: if omitted we use safe defaults
  nifty?: unknown;
  sensex?: unknown;
  bankNifty?: unknown;
  vix?: unknown;
  breadthPct?: unknown;
  fiiDiiTone?: unknown;

  narrativeKey?: unknown;
  quality?: unknown; // low|balanced|high
};

function asNum(raw: unknown, fallback: number): number {
  const n = typeof raw === "string" ? Number(raw) : typeof raw === "number" ? raw : NaN;
  return Number.isFinite(n) ? n : fallback;
}

function asQuality(raw: unknown): "low" | "balanced" | "high" {
  if (typeof raw !== "string") return "balanced";
  if (raw === "low" || raw === "balanced" || raw === "high") return raw;
  return "balanced";
}

function labelForMarketState(state: ReturnType<typeof computeMarketState>): string {
  switch (state) {
    case "Stable Expansion":
      return "Stable Market Conditions";
    case "Selective Strength":
      return "Increased Sector Rotation";
    case "Broad Weakness":
      return "Broad Weakness";
    case "Elevated Volatility":
      return "Elevated Volatility";
    case "Defensive Rotation":
      return "Liquidity Strength Improving";
    case "Institutional Accumulation":
      return "Institutional Accumulation";
    case "Liquidity Compression":
      return "Liquidity Strength Improving";
    case "Momentum Fragmentation":
      return "Elevated Sector Drift";
  }
}

function safeCacheKey(parts: Record<string, unknown>): string {
  // stable-ish key: sort keys
  const keys = Object.keys(parts).sort();
  const ordered: Record<string, unknown> = {};
  for (const k of keys) ordered[k] = parts[k];
  return `healthometer:${JSON.stringify(ordered)}`;
}

export const healthometerRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.get("/api/healthometer/synthesis", async (req) => {
    const q = req.query as QueryShape;

    const nifty = asNum(q.nifty, 22400);
    const sensex = asNum(q.sensex, 73800);
    const bankNifty = asNum(q.bankNifty, 48900);
    const vix = asNum(q.vix, 12.4);
    const breadthPct = asNum(q.breadthPct, 52);
    const fiiDiiTone = asNum(q.fiiDiiTone, 0.4);

    const narrativeKeyNum = asNum(q.narrativeKey, 7);
    const narrativeKey = Math.max(0, Math.min(999999, Math.round(narrativeKeyNum)));

    const quality = asQuality(q.quality);

    const cacheKey = safeCacheKey({ nifty, sensex, bankNifty, vix, breadthPct, fiiDiiTone, narrativeKey, quality });

    const cacheEngine = getCacheEngine();
    if (cacheEngine) {
      const swr = { ttlMs: 120_000, staleTtlMs: 240_000 };
      const started = Date.now();
      const data = await cacheEngine.getOrFetchSWR(cacheKey, swr, async () => {
        // Build market inputs from raw market state (SEBI-safe normalization).
        const engine = new MarketStateEngine({ alpha: 0.18 });

        const marketState: MarketStateInput = {
          at: Date.now(),
          nifty,
          sensex,
          bankNifty,
          vix,
          breadthPct,
          fiiDiiTone,
        };

        const marketInputs: MarketInputs = engine.update(marketState);

        const derivedMarketState = computeMarketState(marketInputs);
        const derivedConfidence: ConfidenceState = confidenceFromMarketState(derivedMarketState);

        const themeSignals = themeForMarketState(derivedMarketState);
        const theme: ConfidenceTheme = {
          label: labelForMarketState(derivedMarketState),
          ...themeSignals,
        };

        const synthesisInputs: NeuralMarketSynthesisInputs = {
          market: {
            at: marketState.at,
            marketState,
            marketInputs,
            connectionStatus: "connected",
          },
          confidenceState: derivedConfidence,
          theme,
          narrativeKey,
          quality,
        };

        const synthesis = buildNeuralMarketSynthesisEngine(synthesisInputs);
        const sanitized = sanitizeNeuralMarketSynthesisStrings(synthesis, { level: "educational" });

        return sanitized;
      });

      return apiSuccess({
        cached: true,
        timingMs: Date.now() - started,
        synthesis: data,
      });
    }

    // Cache absent => compute once.
    const marketState: MarketStateInput = {
      at: Date.now(),
      nifty,
      sensex,
      bankNifty,
      vix,
      breadthPct,
      fiiDiiTone,
    };

    const engine = new MarketStateEngine({ alpha: 0.18 });
    const marketInputs: MarketInputs = engine.update(marketState);

    const derivedMarketState = computeMarketState(marketInputs);
    const derivedConfidence: ConfidenceState = confidenceFromMarketState(derivedMarketState);
    const themeSignals = themeForMarketState(derivedMarketState);
    const theme: ConfidenceTheme = {
      label: labelForMarketState(derivedMarketState),
      ...themeSignals,
    };

    const synthesisInputs: NeuralMarketSynthesisInputs = {
      market: {
        at: marketState.at,
        marketState,
        marketInputs,
        connectionStatus: "connected",
      },
      confidenceState: derivedConfidence,
      theme,
      narrativeKey,
      quality,
    };

    const synthesis = buildNeuralMarketSynthesisEngine(synthesisInputs);
    const sanitized = sanitizeNeuralMarketSynthesisStrings(synthesis, { level: "educational" });

    return apiSuccess({
      cached: false,
      synthesis: sanitized,
    });
  });

  app.get("/api/healthometer/state", async (req) => {
    // lightweight wrapper around /synthesis for UI convenience
    const q = req.query as QueryShape;

    const nifty = asNum(q.nifty, 22400);
    const sensex = asNum(q.sensex, 73800);
    const bankNifty = asNum(q.bankNifty, 48900);
    const vix = asNum(q.vix, 12.4);
    const breadthPct = asNum(q.breadthPct, 52);
    const fiiDiiTone = asNum(q.fiiDiiTone, 0.4);

    const narrativeKeyNum = asNum(q.narrativeKey, 7);
    const narrativeKey = Math.max(0, Math.min(999999, Math.round(narrativeKeyNum)));

    const quality = asQuality(q.quality);

    const engine = new MarketStateEngine({ alpha: 0.18 });

    const marketState: MarketStateInput = {
      at: Date.now(),
      nifty,
      sensex,
      bankNifty,
      vix,
      breadthPct,
      fiiDiiTone,
    };

    const marketInputs: MarketInputs = engine.update(marketState);

    const derivedMarketState = computeMarketState(marketInputs);
    const derivedConfidence: ConfidenceState = confidenceFromMarketState(derivedMarketState);

    const themeSignals = themeForMarketState(derivedMarketState);
    const theme: ConfidenceTheme = {
      label: labelForMarketState(derivedMarketState),
      ...themeSignals,
    };

    const synthesisInputs: NeuralMarketSynthesisInputs = {
      market: {
        at: marketState.at,
        marketState,
        marketInputs,
        connectionStatus: "connected",
      },
      confidenceState: derivedConfidence,
      theme,
      narrativeKey,
      quality,
    };

    const synthesis = buildNeuralMarketSynthesisEngine(synthesisInputs);
    const sanitized = sanitizeNeuralMarketSynthesisStrings(synthesis, { level: "educational" });

    return apiSuccess({
      state: sanitized.healthometer.state,
      rationale: sanitized.healthometer.rationale,
      confidenceMarginText: sanitized.healthometer.confidenceMarginText,
      confidenceEnvironmentLabel: sanitized.confidenceEnvironmentLabel,
    });
  });
};
