import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { ConfidenceState, ConfidenceTheme } from "../../intelligence/ConfidenceEngine";
import type { DiscoveryResult } from "../../../services/discovery/discoveryTypes";
import { useMasterMotion } from "../../../components/motion/MasterMotionEngine";
import { addTickerToWatchlist, isTickerInWatchlist, getWatchlists } from "../../../services/portfolio/watchlistStore";
import IntelligenceMiniChart from "../../search/IntelligenceMiniChart";
import { applyComplianceCopyFilter } from "../../../lib/compliance/complianceCopyFilter";
import {
  CardActions,
  CardBody,
  CardFooter,
  CardHeader,
  CardTelemetryRow,
} from "../../../shared/ui/components/IntelligenceCardAnatomy";
import { getCompanySectorMapping } from "../../companyUniverse/getCompanySectorMapping";
import { resolveExchangeAndTicker } from "../../../services/market/exchangeResolver";
import { getCompanyNameFromTicker } from "../../../services/company/companyNameFromTicker";
import { getSyntheticChartSeries } from "../../charts/chartData";
import { navigateToStock } from "../../../architecture/navigation/routeCoordinator";

type Props = {
  result: DiscoveryResult;
  state: ConfidenceState;
  theme: ConfidenceTheme;
  narrativeKey: number;

  isActive: boolean;
  delaySeconds: number;

  onOpenEntity: (r: DiscoveryResult) => void;
};

function formatKind(kind: DiscoveryResult["kind"]): string {
  return kind.replaceAll("_", " ");
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function formatPrice(v: number): string {
  if (!Number.isFinite(v)) return "—";
  if (Math.abs(v) >= 1000) return v.toFixed(0);
  if (Math.abs(v) >= 100) return v.toFixed(2);
  return v.toFixed(2);
}

function healthFromConfidence(conf: ConfidenceState, theme: ConfidenceTheme): { label: string; percent: number; glow: string; summary: string } {
  switch (conf) {
    case "CONFIDENCE_RISING":
      return { label: "Very Healthy", percent: 78, glow: theme.cyanGlow, summary: "Strong overall performance." };
    case "STABLE_CONVICTION":
      return { label: "Healthy", percent: 62, glow: theme.cyanGlow, summary: "Good fundamentals with stable momentum." };
    case "NEUTRAL_ENVIRONMENT":
      return { label: "Stable", percent: 55, glow: theme.deepBlueGlow, summary: "Steady posture with balanced interpretation." };
    case "MOMENTUM_WEAKENING":
      return { label: "Weakening", percent: 45, glow: theme.magentaGlow, summary: "Signals are softening—momentum is fading." };
    case "ELEVATED_RISK":
    default:
      return { label: "Unhealthy", percent: 25, glow: theme.warningGlow, summary: "Under pressure—performance is deteriorating." };
  }
}

function miniTrendConfidenceFromChangePct(changePct: number): ConfidenceState {
  return changePct >= 0 ? "CONFIDENCE_RISING" : "ELEVATED_RISK";
}

export default function CommandResultCard({
  result,
  state,
  theme,
  narrativeKey,
  isActive,
  delaySeconds,
  onOpenEntity,
}: Props): JSX.Element {
  const prefersReducedMotion = useReducedMotion();
  const { signals } = useMasterMotion();

  const durationSec = prefersReducedMotion ? 0.001 : 0.35 * signals.transitionDurationScale;

  const glowMain = state === "ELEVATED_RISK" ? theme.warningGlow : theme.cyanGlow;

  const borderActive = "rgba(255,255,255,0.18)";
  const borderIdle = "rgba(255,255,255,0.10)";

  const title = result.title.trim();

  const explicitTicker = result.ticker ? result.ticker.toUpperCase().trim() : "";
  const tickerGuess =
    title.length > 0 &&
    title.length <= 10 &&
    title === title.toUpperCase() &&
    /^[A-Z0-9.\-]+$/.test(title)
      ? title
      : "";

  const ticker = explicitTicker || tickerGuess;
  const miniChartSeed = (result.miniChartSeed ?? ticker ?? result.title).trim();

  const isStockResult = result.kind === "stock" && !!ticker;

  const [watchlistVersion, setWatchlistVersion] = React.useState(0);
  const watchlistHasTicker = ticker ? isTickerInWatchlist(ticker) : false;

  const {
    label: healthLabel,
    percent: healthPercent,
    glow: healthGlow,
    summary: healthSummaryText,
  } = healthFromConfidence(state, theme);

  const exchangeLabel = React.useMemo(() => {
    if (!ticker) return "—";
    const resolved = resolveExchangeAndTicker({ ticker, exchangeParam: null });
    return resolved.exchange === "UNKNOWN" ? "—" : resolved.exchange;
  }, [ticker]);

  const sectorLabel = React.useMemo(() => {
    if (!ticker) return "—";
    return getCompanySectorMapping(ticker).label;
  }, [ticker]);

  const priceSeries = React.useMemo(() => {
    if (!ticker) return null;
    const timeframe = "1M" as const;
    // Must match IntelligenceMiniChart’s internal seed scheme.
    const series = getSyntheticChartSeries(`${miniChartSeed}_${timeframe}_mini`, timeframe);
    return series.candles;
  }, [ticker, miniChartSeed]);

  const liveQuote = React.useMemo(() => {
    if (!priceSeries || priceSeries.length < 2) {
      return { price: NaN, changePct: 0, rising: true };
    }
    const last = priceSeries[priceSeries.length - 1];
    const prev = priceSeries[priceSeries.length - 2] ?? last;
    const price = last.c;
    const prevC = prev.c || 1;
    const changePct = ((price - prevC) / prevC) * 100;
    const rising = changePct >= 0;
    return { price, changePct, rising };
  }, [priceSeries]);

  const changePctClamped = clamp(liveQuote.changePct, -99.9, 99.9);
  const rising = liveQuote.rising;

  const miniTrendState = miniTrendConfidenceFromChangePct(changePctClamped);

  const safeCompanyName = isStockResult
    ? (result.companyName && result.companyName.trim().length > 0 ? result.companyName.trim() : getCompanyNameFromTicker(ticker))
    : "";

  const safeNarrativeSummary =
    applyComplianceCopyFilter(result.narrativeSummary, "educational").trim() || "Context summary";

  return (
    <motion.div
      role="button"
      tabIndex={0}
      onClick={() => onOpenEntity(result)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpenEntity(result);
        }
      }}
      initial={{ opacity: 0, y: 6, filter: "blur(8px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      exit={{ opacity: 0, y: 6, filter: "blur(8px)" }}
      transition={{ duration: durationSec, delay: delaySeconds }}
      className="block w-full text-left rounded-[16px] border bg-black/25 px-4 py-3 hover:bg-black/35 transition"
      style={{
        borderColor: isActive ? borderActive : borderIdle,
        boxShadow: isActive ? `0 0 48px ${glowMain}` : "none",
      }}
      aria-current={isActive ? "true" : undefined}
    >
      <CardHeader>
        {isStockResult ? (
          <div className="min-w-0 w-full">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[13px] text-white/92 truncate">{safeCompanyName}</div>
                <div className="mt-1 flex items-center gap-2">
                  <div className="ss-ty-micro-label" style={{ ["--ss-ty-micro-label-color" as never]: "rgba(255,255,255,0.55)" }}>
                    {ticker}
                  </div>
                  <div
                    className="h-[6px] w-[6px] rounded-full"
                    style={{
                      background: rising ? theme.cyanGlow : theme.warningGlow,
                      boxShadow: `0 0 14px ${rising ? theme.cyanGlow : theme.warningGlow}`,
                    }}
                    aria-hidden="true"
                  />
                  <div className="ss-ty-nav-label" style={{ ["--ss-ty-nav-label-color" as never]: "rgba(255,255,255,0.55)" }}>
                    {exchangeLabel}
                  </div>
                </div>
              </div>

              <div className="shrink-0 text-right">
                <div className="text-[14px] font-semibold text-white/92">{formatPrice(liveQuote.price)}</div>
                <div
                  className="mt-1 text-[12px] ss-telemetry-numeric ss-ty-metric-subvalue"
                  style={{
                    color: rising ? "rgba(0,255,210,0.95)" : "rgba(255,120,120,0.95)",
                  }}
                >
                  {changePctClamped >= 0 ? "+" : ""}
                  {changePctClamped.toFixed(2)}%
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <IntelligenceMiniChart
                  tickerSeed={miniChartSeed}
                  confidenceState={miniTrendState}
                  widthPx={132}
                  heightPx={52}
                  timeframe="1M"
                />
              </div>

              <div className="min-w-0 text-right">
                <div className="flex items-center justify-end gap-2">
                  <div
                    className="h-[10px] w-[10px] rounded-full"
                    style={{ background: healthGlow, boxShadow: `0 0 18px ${healthGlow}` }}
                    aria-hidden="true"
                  />
                  <div className="ss-ty-card-label" style={{ ["--ss-ty-card-label-color" as never]: "rgba(255,255,255,0.65)" }}>
                    {healthLabel}
                  </div>
                </div>
                <div className="mt-1 text-[12px] text-white/75">{sectorLabel}</div>
              </div>
            </div>

            <div className="mt-3 text-[12px] leading-[1.6] text-white/78">{healthSummaryText}</div>
          </div>
        ) : (
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <div className="text-[13px] text-white/92 truncate">{result.title}</div>
              <div
                className="h-[18px] rounded-full px-[10px] flex items-center"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div className="text-[10px] uppercase tracking-[0.18em] text-white/60">{formatKind(result.kind)}</div>
              </div>
            </div>

            <div className="mt-2 text-[12px] leading-[1.6] text-white/78">{safeNarrativeSummary}</div>
          </div>
        )}
      </CardHeader>

      <CardBody className={isStockResult ? "mt-0" : "mt-0"}>
        {!isStockResult ? (
          <>
            <CardTelemetryRow className="mt-3">
              <div className="min-w-[120px]">
                <div className="flex items-center justify-between">
                  <div className="ss-ty-metric-label">Healthometer</div>
                  <div className="ss-telemetry-numeric ss-ty-metric-subvalue" aria-label="Healthometer score">
                    {Math.round((state === "ELEVATED_RISK" ? 0.25 : state === "MOMENTUM_WEAKENING" ? 0.45 : state === "NEUTRAL_ENVIRONMENT" ? 0.62 : 0.78) * 100)}%
                  </div>
                </div>
                <div className="mt-1 h-[6px] rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
                  <div
                    className="h-[6px] rounded-full"
                    style={{
                      width: `${Math.round((state === "ELEVATED_RISK" ? 0.25 : state === "MOMENTUM_WEAKENING" ? 0.45 : state === "NEUTRAL_ENVIRONMENT" ? 0.62 : 0.78) * 100)}%`,
                      background: glowMain,
                      boxShadow: `0 0 14px ${glowMain}`,
                    }}
                  />
                </div>
              </div>

              <div className="min-w-[120px]">
                <div className="flex items-center justify-between">
                  <div className="ss-ty-metric-label">Volatility</div>
                  <div className="ss-telemetry-numeric ss-ty-metric-subvalue" aria-label="Volatility score">
                    {Math.round((state === "ELEVATED_RISK" ? 0.82 : state === "MOMENTUM_WEAKENING" ? 0.58 : state === "NEUTRAL_ENVIRONMENT" ? 0.44 : 0.26) * 100)}%
                  </div>
                </div>
                <div className="mt-1 h-[6px] rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
                  <div
                    className="h-[6px] rounded-full"
                    style={{
                      width: `${Math.round((state === "ELEVATED_RISK" ? 0.82 : state === "MOMENTUM_WEAKENING" ? 0.58 : state === "NEUTRAL_ENVIRONMENT" ? 0.44 : 0.26) * 100)}%`,
                      background: state === "ELEVATED_RISK" ? theme.warningGlow : theme.magentaGlow,
                    }}
                  />
                </div>
              </div>

              <div className="shrink-0">
                <IntelligenceMiniChart tickerSeed={miniChartSeed} confidenceState={state} widthPx={160} heightPx={64} />
              </div>
            </CardTelemetryRow>

            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="ss-ty-metric-label truncate">
                Env: {safeNarrativeSummary}
              </div>
              <div className="ss-telemetry-numeric ss-ty-metric-subvalue">Signal</div>
            </div>

            <CardActions>
              {ticker && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    navigateToStock({ ticker, mode: "push" });
                  }}
                  className="ss-pill-btn ss-focus-outline"
                >
                  Open charts
                </button>
              )}

              {ticker && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const listId = getWatchlists()[0]?.id || "1";
                    addTickerToWatchlist(listId, ticker);
                  }}
                  className="ss-pill-btn ss-focus-outline"
                >
                  {watchlistHasTicker ? "In watchlist" : "Add to watchlist"}
                </button>
              )}

              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const url = new URL(window.location.href);
                  url.searchParams.set("page", "assistant");
                  window.location.href = url.toString();
                }}
                className="ss-pill-btn ss-focus-outline"
              >
                Company analysis
              </button>
            </CardActions>
          </>
        ) : null}
      </CardBody>

      {!isStockResult && (
        <CardFooter>
          <div className="flex items-center justify-between">
            <div className="ss-ty-metric-label">Market confidence</div>
            <div className="ss-telemetry-numeric ss-ty-metric-subvalue" aria-label="Market confidence score">
              {Math.round((state === "ELEVATED_RISK" ? 0.40 : state === "MOMENTUM_WEAKENING" ? 0.54 : state === "NEUTRAL_ENVIRONMENT" ? 0.66 : 0.80) * 100)}%
            </div>
          </div>
          <div className="mt-1 h-[6px] rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
            <div
              className="h-[6px] rounded-full"
              style={{
                width: `${Math.round((state === "ELEVATED_RISK" ? 0.40 : state === "MOMENTUM_WEAKENING" ? 0.54 : state === "NEUTRAL_ENVIRONMENT" ? 0.66 : 0.80) * 100)}%`,
                background: state === "ELEVATED_RISK" ? theme.deepBlueGlow : glowMain,
                boxShadow: `0 0 14px ${glowMain}`,
              }}
            />
          </div>
        </CardFooter>
      )}
    </motion.div>
  );
}
