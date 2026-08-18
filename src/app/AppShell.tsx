import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { SiteHeader, MarketTape, BottomNav, Shell } from "./AppChrome";
import { useIndexTape, bottomActive } from "./chromeShared";
import { useMarketStatus } from "../hooks/useMarketStatus";
import { ResearchProfileModal } from "../components/ResearchProfileModal";
import { useKeyboardShortcuts, KeyboardHelpOverlay } from "../hooks/useKeyboardShortcuts";
import { FloatingAiAssistant } from "../components/FloatingAiAssistant";

/* ============================================================================
   AppShell — StockStory design chrome for the authenticated workspace routes.
   To keep every route visually identical, this uses the same chrome primitives
   as PublicLayout (SiteHeader / MarketTape / Shell / BottomNav) and layers the
   workspace-only functionality (keyboard shortcuts, profile modal, feedback
   FAB, footer) on top. The old navy-sidebar identity is gone.
   ============================================================================ */

export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [helpOpen, setHelpOpen] = useState(false);
  const [showFeedbackFab, setShowFeedbackFab] = useState(
    () => document.body.dataset.onboardingActive !== "true",
  );

  useKeyboardShortcuts({
    handlers: {
      "toggle-help": () => setHelpOpen((o) => !o),
      "toggle-compare": () => navigate("/compare"),
      "toggle-track": () => navigate("/watchlist"),
      "escape": () => setHelpOpen(false),
    },
  });

  useEffect(() => {
    const sync = () => setShowFeedbackFab(document.body.dataset.onboardingActive !== "true");
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(document.body, { attributes: true, attributeFilter: ["data-onboarding-active"] });
    return () => obs.disconnect();
  }, []);

  const indices = useIndexTape();
  const marketStatus = useMarketStatus(60000);

  return (
    <div style={{ background: "var(--sx-bg)", color: "var(--sx-ink)", minHeight: "100dvh" }}>
      <SiteHeader />

      {indices.length > 0 && (
        <MarketTape
          indices={indices}
          marketOpen={marketStatus.isOpen}
          closesAt="3:30 PM PHT"
        />
      )}

      <Shell>
        <div key={location.pathname} className="stockex-page-enter">
          {children}
          <footer
            style={{
              marginTop: "clamp(28px,4vw,48px)",
              paddingTop: 16,
              borderTop: "1px solid var(--sx-rule)",
              fontSize: 11.5,
              color: "var(--sx-ink-3)",
              display: "flex",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <span>© 2026 StockEX · Independent research platform, not a broker.</span>
            <Link to="/trust" style={{ color: "var(--sx-ink-3)", textDecoration: "underline" }}>
              Methodology & Data Sources
            </Link>
          </footer>
        </div>
      </Shell>

      <BottomNav active={bottomActive(location.pathname)} />

      {/* Workspace-only floating chrome */}
      <div style={{ position: "fixed", right: 16, bottom: "calc(16px + env(safe-area-inset-bottom))", zIndex: 59 }}>
        <ResearchProfileModal />
      </div>
      {showFeedbackFab && <FloatingAiAssistant />}

      <KeyboardHelpOverlay open={helpOpen} onClose={() => setHelpOpen(false)} />

      <style>{`
        .stockex-page-enter {
          /*
           * Opacity-only: a transform here (even the identity translateY(0)
           * held forever by animation-fill-mode: both) makes this element the
           * containing block for every position:fixed descendant -- which
           * breaks any fixed-position modal/banner/floating button rendered
           * inside a page. Keep the fade, drop the slide.
           */
          animation: stockex-page-fade-in 220ms cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        @keyframes stockex-page-fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .stockex-page-enter { animation: none; }
        }
      `}</style>
    </div>
  );
}
