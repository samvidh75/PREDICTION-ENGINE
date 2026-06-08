import React, { useMemo } from "react";
import type {
  MarketComposite,
  MarketConnectionStatus,
} from "../../services/market/marketService";
import type {
  ConfidenceState,
  ConfidenceTheme,
} from "../intelligence/ConfidenceEngine";

import PremiumCard from "../../shared/ui/components/PremiumCard";
import {
  CardBody,
  MicroLabel,
} from "../../shared/ui/components/TypographyIntelligence";
import {
  CardHeader,
  CardBody as CardBodyRegion,
} from "../../shared/ui/components/IntelligenceCardAnatomy";

type Props = {
  marketSnapshot: MarketComposite;
  connectionStatus: MarketConnectionStatus;
  confidenceState: ConfidenceState;
  theme: ConfidenceTheme;
  beginner?: boolean;
};

type StripItem = {
  id: string;
  label: string;
  valueText: string;
  interpret: string;
  glowKey: "cyan" | "magenta" | "warning" | "deep";
};

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function simpleMarketTone(conf: ConfidenceState): string {
  switch (conf) {
    case "ELEVATED_RISK":
      return "Market pressure remains elevated.";

    case "MOMENTUM_WEAKENING":
      return "Momentum has slowed across broader markets.";

    case "CONFIDENCE_RISING":
      return "Market confidence continues improving.";

    case "NEUTRAL_ENVIRONMENT":
    case "STABLE_CONVICTION":
    default:
      return "Market conditions remain stable overall.";
  }
}

export default function MarketOverviewStripCard({
  marketSnapshot,
  connectionStatus,
  confidenceState,
  theme,
  beginner = false,
}: Props): JSX.Element {
  const { marketState } = marketSnapshot;

  const items = useMemo<StripItem[]>(() => {
    const nifty = clamp(marketState.nifty, 15000, 40000);
    const sensex = clamp(marketState.sensex, 50000, 120000);
    const bankNifty = clamp(marketState.bankNifty, 25000, 80000);
    const breadthPct = clamp(marketState.breadthPct, 25, 85);

    const glowKey: StripItem["glowKey"] =
      confidenceState === "ELEVATED_RISK"
        ? "warning"
        : confidenceState === "MOMENTUM_WEAKENING"
          ? "magenta"
          : confidenceState === "CONFIDENCE_RISING"
            ? "cyan"
            : "deep";

    return [
      {
        id: "strip_nifty",
        label: "Nifty 50",
        valueText: nifty.toLocaleString(undefined, {
          maximumFractionDigits: 0,
        }),
        interpret: simpleMarketTone(confidenceState),
        glowKey,
      },
      {
        id: "strip_sensex",
        label: "Sensex",
        valueText: sensex.toLocaleString(undefined, {
          maximumFractionDigits: 0,
        }),
        interpret: "Large-cap market movement remains stable.",
        glowKey,
      },
      {
        id: "strip_bank",
        label: "Bank Nifty",
        valueText: bankNifty.toLocaleString(undefined, {
          maximumFractionDigits: 0,
        }),
        interpret: "Banking sector momentum remains constructive.",
        glowKey,
      },
      {
        id: "strip_breadth",
        label: "Market Breadth",
        valueText: `${Math.round(breadthPct)}%`,
        interpret: "Broader participation remains supportive overall.",
        glowKey,
      },
    ];
  }, [marketState, confidenceState]);

  const toneGlow = (key: StripItem["glowKey"]): string => {
    switch (key) {
      case "warning":
        return theme.warningGlow;

      case "magenta":
        return theme.magentaGlow;

      case "cyan":
        return theme.cyanGlow;

      case "deep":
      default:
        return theme.deepBlueGlow;
    }
  };

  const topLabel =
    connectionStatus === "connecting" ||
    connectionStatus === "reconnecting"
      ? "Updating market overview"
      : connectionStatus === "disconnected"
        ? "Market offline"
        : beginner
          ? "Simplified market overview"
          : "Live market overview";

  return (
    <PremiumCard variant="glass" className="p-5 sm:p-6">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <MicroLabel>Market Overview</MicroLabel>

          <div className="mt-2 text-[20px] font-semibold leading-[1.2] text-white/92">
            {topLabel}
          </div>
        </div>

        <div className="whitespace-nowrap text-[11px] uppercase tracking-[0.18em] text-white/42">
          Cleaner market tracking
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((it) => (
          <PremiumCard
            key={it.id}
            variant="glass2"
            className="p-5"
            glow={toneGlow(it.glowKey)}
          >
            <CardHeader>
              <div className="flex w-full items-start justify-between gap-3">
                <div>
                  <MicroLabel>{it.label}</MicroLabel>

                  <div className="mt-3 text-[28px] font-semibold tracking-tight text-white">
                    {it.valueText}
                  </div>
                </div>

                <div
                  className="mt-1 h-[10px] w-[10px] shrink-0 rounded-full"
                  style={{
                    background: toneGlow(it.glowKey),
                    boxShadow: `0 0 18px ${toneGlow(it.glowKey)}`,
                    opacity: 0.9,
                  }}
                  aria-hidden="true"
                />
              </div>
            </CardHeader>

            <CardBodyRegion className="mt-0">
              <CardBody className="mt-4 text-white/72">
                {it.interpret}
              </CardBody>
            </CardBodyRegion>
          </PremiumCard>
        ))}
      </div>
    </PremiumCard>
  );
}
