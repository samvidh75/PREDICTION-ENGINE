// src/pages/DashboardPage.tsx
// Phase 47 — Premium Analytics Dashboard page wrapper.

import { useMemo } from "react";
import StockExDashboard from "../components/StockExDashboard";
import PersonalizedFeed from "../components/PersonalizedFeed";
import { loadAuthSession } from "../services/auth/sessionStore";
import { layout } from "../design/tokens";

export default function DashboardPage() {
  try {
    const session = useMemo(() => loadAuthSession(), []);
    const userId = session.status === "authenticated" && session.uid ? session.uid : "anonymous";
    const hasProTier = false;

    return (
      <div
        style={{
          maxWidth: layout.contentMaxWidth,
          margin: "0 auto",
          padding: layout.pagePaddingDesktop,
        }}
      >
        <StockExDashboard userId={userId} hasProTier={hasProTier} />
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
