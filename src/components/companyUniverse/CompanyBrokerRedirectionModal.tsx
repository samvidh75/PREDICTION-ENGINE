import React, { useMemo } from "react";
import type { CompanyHealthState } from "../../types/CompanyUniverse";
import type { ConfidenceTheme } from "../intelligence/ConfidenceEngine";

export type BrokerKey = "zerodha" | "angelone" | "groww" | "upstox";

type BrokerDef = {
  key: BrokerKey;
  label: string;
  short: string;
  // best-effort: broker search/deeplink availability varies; we keep this “smart redirect” layer lightweight.
  buildUrl: (args: { ticker: string; healthState: CompanyHealthState }) => string;
  toneGlow: string;
};

function safeEncode(v: string): string {
  return encodeURIComponent(v.toUpperCase().trim());
}

export default function CompanyBrokerRedirectionModal({
  open,
  onClose,
  ticker,
  healthState,
  theme,
}: {
  open: boolean;
  onClose: () => void;
  ticker: string;
  healthState: CompanyHealthState;
  theme: ConfidenceTheme;
}): JSX.Element | null {
  const brokers = useMemo<BrokerDef[]>(
    () => [
      {
        key: "zerodha",
        label: "Zerodha / Kite",
        short: "Zerodha",
        buildUrl: ({ ticker: t }) => `https://kite.zerodha.com/?q=${safeEncode(t)}`,
        toneGlow: theme.cyanGlow,
      },
      {
        key: "angelone",
        label: "Angel One",
        short: "Angel One",
        buildUrl: ({ ticker: t }) => `https://www.angelone.in/search?query=${safeEncode(t)}`,
        toneGlow: theme.deepBlueGlow,
      },
      {
        key: "groww",
        label: "Groww",
        short: "Groww",
        buildUrl: ({ ticker: t }) => `https://groww.in/stocks?search=${safeEncode(t)}`,
        toneGlow: theme.magentaGlow,
      },
      {
        key: "upstox",
        label: "Upstox",
        short: "Upstox",
        buildUrl: ({ ticker: t }) => `https://upstox.com/stocks?search=${safeEncode(t)}`,
        toneGlow: theme.warningGlow,
      },
    ],
    [theme],
  );

  const overlay = open ? "opacity-100" : "opacity-0 pointer-events-none";

  const containerBoxShadow = useMemo(() => {
    // small glow that aligns with the current confidence theme
    return `0 0 80px ${healthState === "LIQUIDITY_FRAGILE" || healthState === "STRUCTURALLY_WEAKENING" ? theme.warningGlow : theme.cyanGlow}`;
  }, [healthState, theme]);

  if (!open) return null;

  return (
    <div
      className={[
        "fixed inset-0 z-[60] flex items-end sm:items-center justify-center",
        overlay,
      ].join(" ")}
      aria-modal="true"
      role="dialog"
      onMouseDown={(e) => {
        // click-outside to close
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/65 backdrop-blur-[10px]" />

      <div
        className="relative w-full sm:max-w-[980px] mx-0 sm:mx-auto rounded-[28px] border border-white/10 bg-black/50 backdrop-blur-[24px] shadow-[0_0_100px_rgba(0,0,0,0.35)]"
        style={{ boxShadow: containerBoxShadow }}
      >
        <div className="p-6 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-[12px] uppercase tracking-[0.18em] text-white/70">Continue via Broker</div>
              <div className="mt-3 text-[24px] font-medium text-white/92 leading-[1.2]">
                External broker redirection (educational)
              </div>
              <div className="mt-3 text-[14px] leading-[1.8] text-white/75 max-w-[70ch]">
                StockStory India provides intelligence environments. Execution happens externally through your brokerage platform.
                Broker preloading is best-effort (depends on broker routing).
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="h-[44px] w-[44px] rounded-full border border-white/10 bg-black/25 text-white/80 hover:text-white/95 transition"
              aria-label="Close broker modal"
              title="Close"
            >
              ✕
            </button>
          </div>

          <div className="mt-6">
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">
              Choose your brokerage (ticker: {ticker.toUpperCase().trim()})
            </div>

            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {brokers.map((b) => (
                <button
                  key={b.key}
                  type="button"
                  onClick={() => {
                    const url = b.buildUrl({ ticker, healthState });
                    window.open(url, "_blank", "noopener,noreferrer");
                    onClose();
                  }}
                  className="text-left rounded-[22px] border border-white/10 bg-black/25 p-5 hover:bg-black/35 hover:border-white/20 transition"
                  style={{
                    boxShadow: `0 0 90px rgba(0,0,0,0), 0 0 60px ${b.toneGlow}`,
                  }}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-[14px] font-semibold text-white/92">{b.label}</div>
                      <div className="mt-2 text-[13px] leading-[1.7] text-white/70">
                        Open broker + best-effort ticker search
                      </div>
                    </div>

                    <div
                      className="h-[10px] w-[10px] rounded-full shrink-0"
                      style={{
                        background: b.toneGlow,
                        boxShadow: `0 0 22px ${b.toneGlow}`,
                        opacity: 0.95,
                      }}
                      aria-hidden="true"
                    />
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 rounded-[22px] border border-white/10 bg-black/20 p-4">
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/55">SEBI-safe trust line</div>
            <div className="mt-2 text-[13px] leading-[1.7] text-white/80">
              Educational only • no recommendations • no trade execution inside StockStory India
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
