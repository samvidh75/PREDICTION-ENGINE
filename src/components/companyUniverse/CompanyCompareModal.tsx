import React, { useEffect, useMemo, useState } from "react";
import type { ConfidenceTheme } from "../intelligence/ConfidenceEngine";
import type { CompanyHealthState } from "../../types/CompanyUniverse";
import { navigateToStock } from "../../architecture/navigation/routeCoordinator";

function seiSafeNote(): string {
  return "Comparison is educational only • no certainty claims • no trade execution • SEBI-safe framing";
}

export default function CompanyCompareModal({
  open,
  onClose,
  primaryTicker,
  theme,
}: {
  open: boolean;
  onClose: () => void;
  primaryTicker: string;
  theme: ConfidenceTheme;
}): JSX.Element | null {
  const [secondaryTicker, setSecondaryTicker] = useState<string>("INFY");

  useEffect(() => {
    if (!open) return;
    setSecondaryTicker((prev) => (prev.trim().length > 0 ? prev : "INFY"));
  }, [open]);

  const cleanedPrimary = useMemo(() => primaryTicker.toUpperCase().trim(), [primaryTicker]);
  const cleanedSecondary = useMemo(() => secondaryTicker.toUpperCase().trim(), [secondaryTicker]);

  if (!open) return null;

  const closeOnBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  const openCompany = (ticker: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set("page", "company");
    url.searchParams.set("ticker", ticker);
    // keep onboarding skip if user already has it
    // (CompanyUniversePage itself preserves existing params on reload)
    window.location.href = url.toString();
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      onMouseDown={closeOnBackdrop}
    >
      <div className="absolute inset-0 bg-black/65 backdrop-blur-[10px]" />
      <div
        className="relative w-full sm:max-w-[980px] mx-0 sm:mx-auto rounded-[28px] border border-white/10 bg-black/50 backdrop-blur-[24px] shadow-[0_0_100px_rgba(0,0,0,0.35)]"
        style={{ boxShadow: `0 0 120px rgba(0,0,0,0.35), 0 0 100px ${theme.cyanGlow}` }}
      >
        <div className="p-6 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-[12px] uppercase tracking-[0.18em] text-white/70">Compare Company (educational)</div>
              <div className="mt-3 text-[24px] font-medium text-white/92 leading-[1.2]">Two-company research lens</div>
              <div className="mt-3 text-[14px] leading-[1.8] text-white/75 max-w-[70ch]">
                This screen sets the intent for comparison. Full chart overlays can be explored by opening the selected company environments.
              </div>
              <div className="mt-4 text-[11px] uppercase tracking-[0.18em] text-white/45">{seiSafeNote()}</div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="h-[44px] w-[44px] rounded-full border border-white/10 bg-black/25 text-white/80 hover:text-white/95 transition"
              aria-label="Close compare modal"
              title="Close"
            >
              ✕
            </button>
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="rounded-[22px] border border-white/10 bg-black/25 p-5">
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">Company A</div>
              <div className="mt-3 text-[18px] font-semibold text-white/92">{cleanedPrimary}</div>

              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => openCompany(cleanedPrimary)}
                  className="h-[44px] rounded-full border border-white/10 bg-black/30 px-[16px] text-[12px] uppercase tracking-[0.18em] text-white/85 hover:bg-black/35 hover:border-white/20 transition"
                >
                  Open Company A
                </button>
              </div>
            </div>

            <div className="rounded-[22px] border border-white/10 bg-black/25 p-5">
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">Company B</div>

              <div className="mt-3 flex items-center gap-3">
                <input
                  value={secondaryTicker}
                  onChange={(e) => setSecondaryTicker(e.target.value)}
                  className="flex-1 h-[44px] rounded-full bg-white/[0.03] border border-white/[0.06] px-[16px] text-[14px] text-white/92 outline-none"
                  aria-label="Secondary company ticker"
                />
              </div>

              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => openCompany(cleanedSecondary || cleanedPrimary)}
                  className="h-[44px] rounded-full border border-white/10 bg-black/30 px-[16px] text-[12px] uppercase tracking-[0.18em] text-white/85 hover:bg-black/35 hover:border-white/20 transition"
                >
                  Open Company B
                </button>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-[22px] border border-white/10 bg-black/20 p-5">
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/55">What you should compare</div>
            <div className="mt-3 text-[14px] leading-[1.85] text-white/85">
              Look for: health boundary framing • financial evolution corridors • narrative mission tone • institutional and macro learning context.
              Keep it educational—comparison is interpretation, not certainty.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
