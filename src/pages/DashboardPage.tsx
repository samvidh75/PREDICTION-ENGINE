// src/pages/DashboardPage.tsx
// Phase 47 — Premium Analytics Dashboard page wrapper.

import { useMemo } from "react";
import StockExDashboard from "../components/StockExDashboard";
import PersonalizedFeed from "../components/PersonalizedFeed";
import { EnhancedScreener } from "../components/EnhancedScreener";
import Watchlist from "../components/Watchlist";
import ProviderHealthIndicator from "../components/ProviderHealthIndicator";
import TrendingStocksWidget from "../components/TrendingStocksWidget";
import { loadAuthSession } from "../services/auth/sessionStore";
import { layout } from "../design/tokens";

export default function DashboardPage() {
  try {
    const session = useMemo(() => loadAuthSession(), []);
    const userId = session.status === "authenticated" && session.uid ? session.uid : "anonymous";
    // For now: authenticated users get pro tier, anonymous users get free tier
    const hasProTier = session.status === "authenticated";

    return (
      <div
        style={{
          maxWidth: layout.contentMaxWidth,
          margin: "0 auto",
          padding: layout.pagePaddingDesktop,
        }}
      >
        <StockExDashboard userId={userId} hasProTier={hasProTier} />
        <ProviderHealthIndicator />
        <Watchlist />
        <TrendingStocksWidget />
        <EnhancedScreener />
        <PersonalizedFeed />
      </div>
    );
  } catch (error) {
    console.error('[DashboardPage] Error:', error);
    return (
      <div style={{ padding: '40px', color: '#fff', textAlign: 'center' }}>
        <p>Error loading dashboard. Please refresh the page.</p>
      </div>
    );
  }
}
