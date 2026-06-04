import React, { useMemo } from "react";
import { useReducedMotion } from "framer-motion";

import type { ConfidenceState, ConfidenceTheme } from "../intelligence/ConfidenceEngine";
import type { NeuralMarketSynthesis } from "../../services/synthesis/neuralMarketSynthesisTypes";
import type { MarketComposite, MarketConnectionStatus } from "../../services/market/marketService";

import ProgressiveDisclosure from "../../designSystem/ProgressiveDisclosure";
import PremiumCard from "../../designSystem/PremiumCard";
import { BodyText, MicroLabel, SectionTitle } from "../../designSystem/TypographyIntelligence";
import DashboardCommandSearchBar from "./DashboardCommandSearchBar";
import MobileSwipeDeck from "./MobileSwipeDeck";
import DashboardKeyIntelligenceCards from "./DashboardKeyIntelligenceCards";

import MarketOverviewStripCard from "./MarketOverviewStripCard";

import MarketOverviewPanel from "../market/MarketOverviewPanel";
import CalmMarketNewsStoryPanel from "../news/CalmMarketNewsStoryPanel";
import SectorRotationEcosystem from "./SectorRotationEcosystem";
import MacroIntelligenceEngine from "../macro/MacroIntelligenceEngine";
import MarketHealthEnvironment from "./MarketHealthEnvironment";
import MarketScannerEngine from "../scanner/MarketScannerEngine";
import DashboardCompanyExplorationPreview from "./DashboardCompanyExplorationPreview";
import CentralIntelligenceCore from "./CentralIntelligenceCore";
import InstitutionalActivityNetwork from "../commandCentre/InstitutionalActivityNetwork";
import IntelligenceFeed from "../community/IntelligenceFeed";
import NeuralMarketSynthesisPanel from "../synthesis/NeuralMarketSynthesisPanel";

import PremiumLockCard from "../premium/PremiumLockCard";
import type { PremiumTier } from "../../services/premium/premiumEntitlementStore";
import WatchlistSnapshotCard from "./WatchlistSnapshotCard";
import TodayIntelligenceBrief from "./TodayIntelligenceBrief";

type Props = {
  isMobile: boolean;
  beginner: boolean;
  hasPremium: boolean;
  hasInstitutional: boolean;
  state: ConfidenceState;
  theme: ConfidenceTheme;
  marketStateLabel: string;
  synthesis: NeuralMarketSynthesis;
  marketSnapshot: MarketComposite;
  connectionStatus: MarketConnectionStatus;
  statusPill: string;
  preferredSearchPills: string[];
  onOpenSearch: (q: string) => void;
  firstDashboardPending: boolean;
};

export default function AdaptiveDashboardShell(props: Props): JSX.Element {
  useReducedMotion();

  const debugOpenLayers = useMemo(() => {
    if (typeof window === "undefined") return false;

    try {
      const params = new URLSearchParams(window.location.search);
      const raw = params.get("debugOpenDashboardLayers");
      return raw === "1" || raw?.toLowerCase() === "true";
    } catch {
      return false;
    }
  }, []);

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

  const layer1 = isMobile ? (
    <div className="mx-auto flex max-w-[1680px] flex-col gap-6">
      <MobileSwipeDeck
        debugLabel="dashboard_layer1_mobile_deck"
        initialIndex={0}
        pages={[
          {
            id: "market",
            title: "Market Overview",
            content: (
              <>
                <MarketOverviewStripCard
                  marketSnapshot={marketSnapshot}
                  connectionStatus={connectionStatus}
                  confidenceState={state}
                  theme={theme}
                  beginner={beginner || firstDashboardPending}
                />

                <div className="mt-6">
                  <TodayIntelligenceBrief />
                </div>

                <div className="mt-6">
                  <DashboardKeyIntelligenceCards
                    synthesis={synthesis}
                    confidenceState={state}
                    theme={theme}
                    marketStateLabel={marketStateLabel}
                    beginner={beginner || firstDashboardPending}
                  />
                </div>
              </>
            ),
          },
          {
            id: "search",
            title: "Search Stocks",
            content: (
              <DashboardCommandSearchBar
                statusPill={statusPill}
                preferredPills={preferredSearchPills}
                onOpenSearch={onOpenSearch}
              />
            ),
          },
          {
            id: "watchlist",
            title: "Watchlist",
            content: (
              <WatchlistSnapshotCard
                beginner={beginner || firstDashboardPending}
                maxItems={4}
              />
            ),
          },
        ]}
      />
    </div>
  ) : (
    <div className="mx-auto flex max-w-[1680px] flex-col gap-6">
      <MarketOverviewStripCard
        marketSnapshot={marketSnapshot}
        connectionStatus={connectionStatus}
        confidenceState={state}
        theme={theme}
        beginner={beginner || firstDashboardPending}
      />

      <TodayIntelligenceBrief />

      <DashboardCommandSearchBar
        statusPill={statusPill}
        preferredPills={preferredSearchPills}
        onOpenSearch={onOpenSearch}
      />

      <div className="mt-6">
        <DashboardKeyIntelligenceCards
          synthesis={synthesis}
          confidenceState={state}
          theme={theme}
          marketStateLabel={marketStateLabel}
          beginner={beginner || firstDashboardPending}
          maxCards={2}
        />
      </div>

      <section className="relative z-[12]">
        <WatchlistSnapshotCard
          beginner={beginner || firstDashboardPending}
          maxItems={isMobile ? 4 : 5}
        />
      </section>
    </div>
  );

  const layer2 = (
    <div className="space-y-6">
      <WatchlistSnapshotCard
        beginner={beginner || firstDashboardPending}
        maxItems={isMobile ? 6 : 7}
      />

      <DashboardCompanyExplorationPreview
        beginner={beginner}
        isMobile={isMobile}
        compact={false}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SectorRotationEcosystem
          state={state}
          theme={theme}
          compact={beginner || isMobile}
        />

        <MarketHealthEnvironment
          synthesis={synthesis}
          confidenceState={state}
          theme={theme}
          beginner={beginner || !hasPremium}
        />
      </div>

      <MarketScannerEngine
        synthesis={synthesis}
        confidenceState={state}
        theme={theme}
        compact={!hasPremium}
      />

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

      <CalmMarketNewsStoryPanel
        synthesis={synthesis}
        confidenceState={state}
        theme={theme}
        beginner={beginner || !hasPremium}
        company={null}
        isMobile={isMobile}
        layerOrder={["major", "sector", "macro", "earnings", "educational"]}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {hasInstitutional ? (
          <InstitutionalActivityNetwork className="mx-auto max-w-[1400px]" />
        ) : (
          <div className="lg:col-span-1">
            <PremiumLockCard
              requiredTier={"institutional" satisfies PremiumTier}
              title="Advanced Market Activity"
              subtitle="Broader institutional market movement and participation overview"
              previewLines={[
                "Track broader buying and selling participation",
                "Understand sector positioning more clearly",
                "Simplified institutional market behaviour",
              ]}
              accentGlow={theme.warningGlow}
              ctaLabel="Unlock advanced market activity"
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
              title="Premium Market Stories"
              subtitle="Deeper market insights and cleaner company storytelling"
              previewLines={[
                "Simplified macro and sector explanations",
                "Cleaner market narratives without clutter",
                "Premium market tracking and company stories",
              ]}
              accentGlow={theme.cyanGlow}
              ctaLabel="Unlock premium stories"
            />
          )}
        </div>
      </div>

      <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">
        Advanced market layer
      </div>
    </div>
  );

  return (
    <div className={["relative z-[6]", isMobile ? "pb-[110px]" : "pt-[72px]"].join(" ")}>
      {layer1}

      <div className="mt-10">
        <ProgressiveDisclosure
          debugLabel="adaptive_dashboard_layers"
          front={
            <PremiumCard variant="glass2">
              <MicroLabel>Expand Dashboard</MicroLabel>

              <SectionTitle>
                Explore deeper market tracking and stock intelligence
              </SectionTitle>

              <BodyText className="mt-3 max-w-[92ch]">
                Continue exploring sector movement, market trends, company stories,
                and advanced market analysis in a cleaner and more structured format.
              </BodyText>

              <MicroLabel className="mt-4">
                Cleaner insights • calmer experience
              </MicroLabel>
            </PremiumCard>
          }
          steps={[
            {
              id: "layer2",
              label: "Layer 2 • Market Tracking",
              content: layer2,
            },
            {
              id: "layer3",
              label: "Layer 3 • Advanced Market Analysis",
              content: layer3,
            },
          ]}
          collapsedCtaLabel="Expand market view"
          collapseCtaLabel="Collapse"
          initialOpen={debugOpenLayers}
          className="mt-0"
        />
      </div>
    </div>
  );
}
