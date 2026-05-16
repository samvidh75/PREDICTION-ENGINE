import React from "react";
import { motion } from "framer-motion";
import type { ConfidenceState, ConfidenceTheme } from "../../intelligence/ConfidenceEngine";
import type { DiscoveryResult } from "../../../services/discovery/discoveryTypes";
import { addTickerToWatchlist, isTickerInWatchlist } from "../../../services/portfolio/watchlistStore";
import IntelligenceMiniChart from "../../search/IntelligenceMiniChart";

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

function relationshipPreview(tags: string[]): string {
  return tags.slice(0, 2).join(" • ");
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
  const healthScore = state === "ELEVATED_RISK" ? 0.25 : state === "MOMENTUM_WEAKENING" ? 0.45 : state === "NEUTRAL_ENVIRONMENT" ? 0.62 : 0.78;
  const volatilityScore = state === "ELEVATED_RISK" ? 0.82 : state === "MOMENTUM_WEAKENING" ? 0.58 : state === "NEUTRAL_ENVIRONMENT" ? 0.44 : 0.26;
  const institutionalScore = state === "ELEVATED_RISK" ? 0.40 : state === "MOMENTUM_WEAKENING" ? 0.54 : state === "NEUTRAL_ENVIRONMENT" ? 0.66 : 0.80;

  const priceSignal = 120 + ((narrativeKey * 13 + result.title.length * 7) % 420);
  const changeSignal = ((result.id.length + narrativeKey) % 9) - 4;
  const changePct = Math.max(-9, Math.min(9, Math.round((changeSignal / priceSignal) * 1000) / 10));

  const glowMain = state === "ELEVATED_RISK" ? theme.warningGlow : theme.cyanGlow;

  const barBg = "rgba(255,255,255,0.08)";
  const borderActive = "rgba(255,255,255,0.18)";
  const borderIdle = "rgba(255,255,255,0.10)";

  const title = result.title.trim();

  const explicitTicker = result.ticker ? result.ticker.toUpperCase().trim() : "";
  const tickerGuess =
    title.length > 0 &&
    title.length <= 6 &&
    title === title.toUpperCase() &&
    /^[A-Z0-9.\-]+$/.test(title)
      ? title
      : "";

  const ticker = explicitTicker || tickerGuess;
  const miniChartSeed = (result.miniChartSeed ?? ticker ?? result.title).trim();

  const [watchlistVersion, setWatchlistVersion] = React.useState<number>(0);
  const watchlistHasTicker = ticker ? isTickerInWatchlist(ticker) : false;

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
      transition={{ duration: 0.35, delay: delaySeconds }}
      className="block w-full text-left rounded-[16px] border bg-black/25 px-4 py-3 hover:bg-black/35 transition"
      style={{
        borderColor: isActive ? borderActive : borderIdle,
        boxShadow: isActive ? `0 0 48px ${glowMain}` : "none",
      }}
      aria-current={isActive ? "true" : undefined}
    >
      <div className="flex items-start justify-between gap-4">
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

          <div className="mt-2 text-[12px] leading-[1.6] text-white/78">{result.narrativeSummary}</div>

          <div className="mt-3 flex items-center gap-3">
            <div className="min-w-[120px]">
              <div className="flex items-center justify-between">
                <div className="text-[10px] uppercase tracking-[0.18em] text-white/45">Healthometer</div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-white/55">{Math.round(healthScore * 100)}%</div>
              </div>
              <div className="mt-1 h-[6px] rounded-full" style={{ background: barBg }}>
                <div
                  className="h-[6px] rounded-full"
                  style={{
                    width: `${Math.round(healthScore * 100)}%`,
                    background: glowMain,
                    boxShadow: `0 0 14px ${glowMain}`,
                  }}
                />
              </div>
            </div>

            <div className="min-w-[120px]">
              <div className="flex items-center justify-between">
                <div className="text-[10px] uppercase tracking-[0.18em] text-white/45">Volatility</div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-white/55">{Math.round(volatilityScore * 100)}%</div>
              </div>
              <div className="mt-1 h-[6px] rounded-full" style={{ background: barBg }}>
                <div
                  className="h-[6px] rounded-full"
                  style={{
                    width: `${Math.round(volatilityScore * 100)}%`,
                    background: state === "ELEVATED_RISK" ? theme.warningGlow : theme.magentaGlow,
                  }}
                />
              </div>
            </div>

            <div className="shrink-0">
              <IntelligenceMiniChart tickerSeed={miniChartSeed} confidenceState={state} widthPx={160} heightPx={64} />
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/45 truncate">
              Env: {result.confidenceEnvironment} • {relationshipPreview(result.relationshipIndicators)}
            </div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/55">
              Signal: ₹{priceSignal} ({changePct >= 0 ? "+" : ""}{changePct}%)
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {ticker && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const url = new URL(window.location.href);
                  url.searchParams.set("page", "stock");
                  url.searchParams.set("ticker", ticker);
                  window.location.href = url.toString();
                }}
                className="h-[30px] rounded-full border border-white/10 bg-black/20 px-[12px] text-[10px] uppercase tracking-[0.18em] text-white/60 hover:text-white/85 transition"
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
                  addTickerToWatchlist(ticker);
                  setWatchlistVersion((v) => v + 1);
                }}
                className="h-[30px] rounded-full border border-white/10 bg-black/20 px-[12px] text-[10px] uppercase tracking-[0.18em] text-white/60 hover:text-white/85 transition"
              >
                {watchlistHasTicker ? "In watchlist" : "Add to watchlist"}
              </button>
            )}

            {result.kind === "sector" && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const url = new URL(window.location.href);
                  url.searchParams.set("page", "explore");
                  url.searchParams.set("kind", "sector");
                  url.searchParams.set("id", result.id);
                  window.location.href = url.toString();
                }}
                className="h-[30px] rounded-full border border-white/10 bg-black/20 px-[12px] text-[10px] uppercase tracking-[0.18em] text-white/60 hover:text-white/85 transition"
              >
                Compare sector
              </button>
            )}

            {ticker && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const url = new URL(window.location.href);
                  url.searchParams.set("page", "company");
                  url.searchParams.set("ticker", ticker);
                  url.searchParams.set("broker", "1");
                  window.location.href = url.toString();
                }}
                className="h-[30px] rounded-full border border-white/10 bg-black/20 px-[12px] text-[10px] uppercase tracking-[0.18em] text-white/60 hover:text-white/85 transition"
              >
                Continue via Broker
              </button>
            )}

            {ticker && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const url = new URL(window.location.href);
                  url.searchParams.set("page", "company");
                  url.searchParams.set("ticker", ticker);
                  window.location.href = url.toString();
                }}
                className="h-[30px] rounded-full border border-white/10 bg-black/20 px-[12px] text-[10px] uppercase tracking-[0.18em] text-white/60 hover:text-white/85 transition"
              >
                View news
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
              className="h-[30px] rounded-full border border-white/10 bg-black/20 px-[12px] text-[10px] uppercase tracking-[0.18em] text-white/60 hover:text-white/85 transition"
            >
              AI analysis
            </button>

            {ticker && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const url = new URL(window.location.href);
                  url.searchParams.set("page", "company");
                  url.searchParams.set("ticker", ticker);
                  window.location.href = url.toString();
                }}
                className="h-[30px] rounded-full border border-white/10 bg-black/20 px-[12px] text-[10px] uppercase tracking-[0.18em] text-white/60 hover:text-white/85 transition"
              >
                Healthometer
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between">
          <div className="text-[10px] uppercase tracking-[0.18em] text-white/45">Institutional confidence</div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-white/55">{Math.round(institutionalScore * 100)}%</div>
        </div>
        <div className="mt-1 h-[6px] rounded-full" style={{ background: barBg }}>
          <div
            className="h-[6px] rounded-full"
            style={{
              width: `${Math.round(institutionalScore * 100)}%`,
              background: state === "ELEVATED_RISK" ? theme.deepBlueGlow : glowMain,
              boxShadow: `0 0 14px ${glowMain}`,
            }}
          />
        </div>
      </div>
    </motion.div>
  );
}
