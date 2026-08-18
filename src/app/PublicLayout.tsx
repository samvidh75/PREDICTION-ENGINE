import { type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { SiteHeader, MarketTape, BottomNav, Shell } from "./AppChrome";
import { useIndexTape, bottomActive } from "./chromeShared";
import { useMarketStatus } from "../hooks/useMarketStatus";

/* ============================================================================
   PublicLayout — StockEX design chrome (StockStory design set, ported 1:1).
   Sticky header + live index tape + content shell + bottom nav on mobile.
   ============================================================================ */

export function PublicLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
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
        </div>
      </Shell>

      <BottomNav active={bottomActive(location.pathname)} />

      <style>{`
        .stockex-page-enter {
          /*
           * Opacity-only: a transform here (even the identity
           * translateY(0) the animation used to end on, held forever by
           * animation-fill-mode: both) makes this element the containing
           * block for every position:fixed descendant -- which breaks
           * any fixed-position modal/banner/floating button rendered
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