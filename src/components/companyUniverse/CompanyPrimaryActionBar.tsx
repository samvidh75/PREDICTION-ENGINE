import React from "react";
import type { CompanyHealthState } from "../../types/CompanyUniverse";
import type { ConfidenceTheme } from "../intelligence/ConfidenceEngine";

type Props = {
  /**
   * Primary “Open charts” action.
   */
  onOpenCharts: () => void;

  /**
   * “Compare Company” educational action (opens modal / overlay handled by parent).
   */
  onCompareCompany: () => void;

  /**
   * Watchlist action.
   */
  watchlistHasTicker: boolean;
  onToggleWatchlist: () => void;

  /**
   * View sector action (navigate).
   */
  sectorLabel: string;
  sectorAvailable: boolean;
  onViewSector: () => void;

  /**
   * Continue via broker action.
   */
  healthState: CompanyHealthState;
  theme: ConfidenceTheme;
  onContinueViaBroker: () => void;

  /**
   * Compact on mobile.
   */
  isMobile?: boolean;
};

export default function CompanyPrimaryActionBar({
  onOpenCharts,
  onCompareCompany,
  watchlistHasTicker,
  onToggleWatchlist,
  sectorLabel,
  sectorAvailable,
  onViewSector,
  healthState,
  theme,
  onContinueViaBroker,
  isMobile = false,
}: Props): JSX.Element {
  const brokerGlow =
    healthState === "LIQUIDITY_FRAGILE" || healthState === "STRUCTURALLY_WEAKENING"
      ? theme.warningGlow
      : healthState === "VOLATILITY_SENSITIVE"
        ? theme.magentaGlow
        : theme.cyanGlow;

  return (
    <div className={isMobile ? "mt-5" : "mt-5 flex items-center gap-3"}>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onOpenCharts}
          className="h-[44px] rounded-full border border-white/10 bg-black/25 px-[16px] text-[12px] uppercase tracking-[0.18em] text-white/85 hover:bg-black/35 hover:border-white/20 transition"
        >
          Open Charts
        </button>

        <button
          type="button"
          onClick={onCompareCompany}
          className="h-[44px] rounded-full border border-white/10 bg-black/25 px-[16px] text-[12px] uppercase tracking-[0.18em] text-white/85 hover:bg-black/35 hover:border-white/20 transition"
        >
          Compare Company
        </button>

        <button
          type="button"
          onClick={onToggleWatchlist}
          className="h-[44px] rounded-full border border-white/10 bg-black/25 px-[16px] text-[12px] uppercase tracking-[0.18em] text-white/85 hover:bg-black/35 hover:border-white/20 transition"
        >
          {watchlistHasTicker ? "Saved to watchlist" : "Save to Watchlist"}
        </button>

        <button
          type="button"
          disabled={!sectorAvailable}
          onClick={() => {
            if (!sectorAvailable) return;
            onViewSector();
          }}
          className={[
            "h-[44px] rounded-full border px-[16px] text-[12px] uppercase tracking-[0.18em] transition",
            sectorAvailable
              ? "border-white/10 bg-black/25 text-white/85 hover:bg-black/35 hover:border-white/20"
              : "border-white/10 bg-black/15 text-white/35 cursor-not-allowed",
          ].join(" ")}
          title={sectorAvailable ? `View sector: ${sectorLabel}` : "Sector environment unavailable in this demo set"}
        >
          View Sector
        </button>

        <button
          type="button"
          onClick={onContinueViaBroker}
          className="h-[44px] rounded-full border border-white/10 bg-black/35 px-[18px] text-[12px] uppercase tracking-[0.18em] text-white/90 hover:text-white/100 transition"
          style={{
            boxShadow: `0 0 30px rgba(0,0,0,0.25), 0 0 70px ${brokerGlow}`,
          }}
        >
          Continue via Broker
        </button>
      </div>
    </div>
  );
}
