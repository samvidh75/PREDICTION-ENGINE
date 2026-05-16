import React from "react";
import { useConfidenceEngine, type ConfidenceState } from "../intelligence/ConfidenceEngine";
import { useHolographicTelemetryModel } from "./useHolographicTelemetryModel";
import HolographicTelemetryCanvas from "./HolographicTelemetryCanvas";
import type { TelemetryReadout } from "./telemetryTypes";

function labelForConfidenceState(state: ConfidenceState): string {
  switch (state) {
    case "CONFIDENCE_RISING":
      return "Confidence Rising";
    case "STABLE_CONVICTION":
      return "Stable Conviction";
    case "NEUTRAL_ENVIRONMENT":
      return "Balanced Environment";
    case "MOMENTUM_WEAKENING":
      return "Momentum Weakening";
    case "ELEVATED_RISK":
      return "Elevated Risk";
  }
}

function confidenceToneLabel(readout: TelemetryReadout): string {
  return readout.kind.replaceAll("_", " ").toUpperCase();
}

export default function HolographicTelemetryEngine({
  title = "Market Signal Engine",
  compact = false,
  heightPx = 420,
  showHeader = true,
}: {
  title?: string;
  compact?: boolean;
  heightPx?: number;
  showHeader?: boolean;
}): JSX.Element {
  const model = useHolographicTelemetryModel();
  const { state } = useConfidenceEngine();

  const headerToneShadow = state === "ELEVATED_RISK" ? model.theme.warningGlow : model.theme.cyanGlow;

  const visibleReadouts = model.quality === "low" ? model.readouts.slice(0, 3) : model.readouts;

  return (
    <section className="relative">
      {showHeader && (
        <div className="mb-4 flex items-end justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[12px] uppercase tracking-[0.18em] text-white/70">{title}</div>
            <div className="mt-2 text-[22px] font-medium text-white/92 leading-[1.15]">
              Structured market signals
            </div>
          </div>

          <div
            className="shrink-0 rounded-full border border-white/10 bg-black/25 backdrop-blur-2xl px-[14px] py-[10px] inline-flex items-center gap-2"
            style={{ boxShadow: `0 0 22px ${headerToneShadow}` }}
          >
            <div className="h-[8px] w-[8px] rounded-full" style={{ background: headerToneShadow }} />
            <div className="text-[12px] uppercase tracking-[0.18em] text-white/70">{labelForConfidenceState(state)}</div>
          </div>
        </div>
      )}

      <div
        className={[
          "relative rounded-[24px] border border-white/10 bg-black/20 backdrop-blur-[18px] overflow-hidden",
          compact ? "shadow-[0_0_40px_rgba(0,0,0,0.35)]" : "shadow-[0_0_60px_rgba(0,0,0,0.40)]",
        ].join(" ")}
        style={{ height: compact ? Math.round(heightPx * 0.72) : heightPx }}
      >
        <div className="absolute inset-0 z-[1] pointer-events-none" style={{ background: "rgba(0,0,0,0.14)" }} />
        <div className="absolute inset-0 z-[2]">
          <HolographicTelemetryCanvas model={model} />
        </div>

        {/* Readouts (DOM clarity layer) */}
        <div className="absolute inset-0 z-[3] pointer-events-none">
          {visibleReadouts.map((r) => {
            const glow =
              r.tone === "warning"
                ? model.theme.warningGlow
                : r.tone === "magenta"
                  ? model.theme.magentaGlow
                  : r.tone === "deepBlue"
                    ? model.theme.deepBlueGlow
                    : model.theme.cyanGlow;

            const cardW = Math.min(r.maxWidthPx, compact ? 210 : 280);

            return (
              <div
                key={r.id}
                className="absolute -translate-x-1/2 -translate-y-1/2 rounded-[18px] border border-white/10 bg-black/35 backdrop-blur-[18px] p-4"
                style={{
                  left: `${r.x * 100}%`,
                  top: `${r.y * 100}%`,
                  width: cardW,
                  boxShadow: `0 0 50px rgba(0,0,0,0.25), 0 0 70px ${glow}`,
                  opacity: 0.98,
                }}
              >
                <div className="text-[10px] uppercase tracking-[0.18em] text-white/60">{confidenceToneLabel(r)}</div>
                <div className="mt-2 text-[13px] leading-[1.55] text-white/90">{r.valueLabel}</div>

                {!compact && (
                  <div className="mt-3 h-[1px]" style={{ background: "rgba(255,255,255,0.08)" }} />
                )}

                {!compact && (
                  <div className="mt-3 text-[11px] uppercase tracking-[0.18em] text-white/45">
                    rail-phase: {(r.id.length + r.x * 10 + r.y * 10).toFixed(0)}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Minimal footer trust line */}
        <div className="absolute left-4 bottom-3 z-[4] pointer-events-none">
          <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">
            Educational signal context • calm and clear
          </div>
        </div>
      </div>
    </section>
  );
}
