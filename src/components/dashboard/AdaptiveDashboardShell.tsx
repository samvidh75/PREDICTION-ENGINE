import React from "react";
import { useReducedMotion } from "framer-motion";

import type { ConfidenceState, ConfidenceTheme } from "../intelligence/ConfidenceEngine";
import type { NeuralMarketSynthesis } from "../../services/synthesis/neuralMarketSynthesisTypes";
import type { MarketComposite, MarketConnectionStatus } from "../../services/market/marketService";

import ProgressiveDisclosure from "../../designSystem/ProgressiveDisclosure";
import DashboardCommandSearchBar from "./DashboardCommandSearchBar";

import MarketOverviewStripCard from "./MarketOverviewStripCard";
import TopMoversSnapshotCompact from "./TopMoversSnapshotCompact";

import MarketOverviewPanel from "../market/MarketOverviewPanel";
import MarketStructuredNewsFeed from "../market/MarketStructuredNewsFeed";
import SectorRotationEcosystem from "./SectorRotationEcosystem";
import MacroIntelligenceEngine from "../macro/MacroIntelligenceEngine";
import MarketHealthEnvironment from "./MarketHealthEnvironment";
import MarketScannerEngine from "../scanner/MarketScannerEngine";
import CentralIntelligenceCore from "./CentralIntelligenceCore";
import InstitutionalActivityNetwork from "../commandCentre/InstitutionalActivityNetwork";
import IntelligenceFeed from "../community/IntelligenceFeed";
import NeuralMarketSynthesisPanel from "../synthesis/NeuralMarketSynthesisPanel";

import PremiumLockCard from "../premium/PremiumLockCard";
import type { PremiumTier } from "../../services/premium/premiumEntitlementStore";
import WatchlistSnapshotCard from "./WatchlistSnapshotCard";

type Props = {
  isMobile: boolean;

  beginner: boolean;
  hasPremium: boolean;
  hasInstitutional: boolean;

  // primary state
  state: ConfidenceState;
  theme: ConfidenceTheme;
  marketStateLabel: string;

  synthesis: NeuralMarketSynthesis;
  marketSnapshot: MarketComposite;
  connectionStatus: MarketConnectionStatus;

  statusPill: string;
  preferredSearchPills: string[];

  onOpenSearch: (q: string) => void;

  // Whether to render extra “guided” emphasis in first screen
  firstDashboardPending: boolean;
};

export default function AdaptiveDashboardShell(props: Props): JSX.Element {
  const prefersReducedMotion = useReducedMotion();

  const {
    isMobile,
    beginner,
    hasPremium,
    hasInstitutional,
    state,
    theme,
    marketStateLabel,
    synthesis,
    marketSnapshot,
    connectionStatus,
    statusPill,
    preferredSearchPills,
    onOpenSearch,
    firstDashboardPending,
  } = props;

  const layer1 = (
    <div className="mx-auto max-w-[1680px] flex flex-col gap-6">
      {/* First screen only: market summary + universal search + watchlist + key movement cues */}
      <MarketOverviewStripCard
        marketSnapshot={marketSnapshot}
        connectionStatus={connectionStatus}
        confidenceState={state}
        theme={theme}
        beginner={beginner || firstDashboardPending}
      />

      <DashboardCommandSearchBar statusPill={statusPill} preferredPills={preferredSearchPills} onOpenSearch={onOpenSearch} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <section className="relative z-[12]">
          <TopMoversSnapshotCompact
            marketSnapshot={marketSnapshot}
            connectionStatus={connectionStatus}
            confidenceState={state}
            theme={theme}
          />
        </section>

        <section className="relative z-[12]">
          <WatchlistSnapshotCard beginner={beginner || firstDashboardPending} maxItems={isMobile ? 4 : 5} />
        </section>
      </div>
    </div>
  );

  const layer2 = (
    <div className="space-y-6">
      <CentralIntelligenceCore
        synthesis={synthesis}
        confidenceState={state}
        theme={theme}
        marketStateLabel={marketStateLabel}
        beginner={beginner || !hasPremium}
      />

      <MarketOverviewPanel
        variant="page"
        marketSnapshot={marketSnapshot}
        synthesis={synthesis}
        confidenceState={state}
        theme={theme}
        beginner={beginner || !hasPremium}
      />

      <MarketStructuredNewsFeed
        variant="page"
        synthesis={synthesis}
        confidenceState={state}
        theme={theme}
        beginner={beginner || !hasPremium}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectorRotationEcosystem state={state} theme={theme} compact={beginner || isMobile} />
        <MarketHealthEnvironment synthesis={synthesis} confidenceState={state} theme={theme} beginner={beginner || !hasPremium} />
      </div>

      <MacroIntelligenceEngine
        synthesis={synthesis}
        confidenceState={state}
        theme={theme}
        compact={!hasPremium || beginner || isMobile}
      />
    </div>
  );

  const layer3 = (
    <div className="space-y-6">
      <MarketScannerEngine synthesis={synthesis} confidenceState={state} theme={theme} compact={!hasPremium} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {hasInstitutional ? (
          <InstitutionalActivityNetwork className="mx-auto max-w-[1400px]" />
        ) : (
          <div className="lg:col-span-1">
            <PremiumLockCard
              requiredTier={"institutional" satisfies PremiumTier}
              title="Institutional Activity Tier"
              subtitle="Participation web + liquidity flow corridors (educational)"
              previewLines={[
                "Deep FII/DII posture as participation-quality context",
                "Defensive rotation cues interpreted calmly (no fear framing)",
                "Institutional intelligence surfaces without recommendations",
              ]}
              accentGlow={theme.warningGlow}
              ctaLabel="Unlock institutional intelligence"
            />
          </div>
        )}

        <div className="space-y-6">
          {hasPremium ? (
            <>
              <NeuralMarketSynthesisPanel compact={false} />
              <IntelligenceFeed compact={beginner} />
            </>
          ) : (
            <PremiumLockCard
              requiredTier={"premium" satisfies PremiumTier}
              title="Advanced intelligence feed"
              subtitle="High-quality narratives (educational)"
              previewLines={[
                "Macro developments translated into calm learning contexts",
                "Sector evolution + behavioural notes as probabilistic framing",
                "Institutional behavior interpreted without fear-driven headlines",
              ]}
              accentGlow={theme.cyanGlow}
              ctaLabel="Unlock intelligence feed"
            />
          )}
        </div>
      </div>

      <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">
        Advanced layer • educational only • no trade execution • no certainty claims
      </div>
    </div>
  );

  return (
    <div className="relative z-[6]">
      {/* First screen: ONLY layer1 content */}
      {layer1}

      {/* Layer 2 + Layer 3 progressively revealed */}
      <div className="mt-10">
        <ProgressiveDisclosure
          debugLabel="adaptive_dashboard_layers"
          front={
            <div className="rounded-[28px] border border-white/10 bg-black/20 backdrop-blur-2xl p-6 shadow-[0_0_60px_rgba(0,0,0,0.35)]">
              <div className="text-[12px] uppercase tracking-[0.18em] text-white/70">Progressive expansion</div>
              <div className="mt-3 text-[22px] font-medium text-white/92">Reveal deeper market intelligence</div>
              <div className="mt-3 text-[14px] leading-[1.9] text-white/85 max-w-[92ch]">
                Expand to see sector context, macro learning nodes, and advanced interpretive layers—calmly, without overwhelm.
              </div>
              <div className="mt-4 text-[11px] uppercase tracking-[0.18em] text-white/45">
                educational only • no recommendations • calm density
              </div>
            </div>
          }
          steps={[
            { id: "layer2", label: "Layer 2 • Market intelligence", content: layer2 },
            { id: "layer3", label: "Layer 3 • Advanced analysis", content: layer3 },
          ]}
          collapsedCtaLabel="Expand market intelligence"
          collapseCtaLabel="Collapse"
          initialOpen={false}
          className="mt-0"
        />
      </div>
    </div>
  );
}
