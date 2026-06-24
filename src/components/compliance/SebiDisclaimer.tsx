import React, { useEffect, useState } from "react";
import { X } from "lucide-react";

type DisclaimerVariant = "banner" | "footer" | "inline" | "tooltip";

interface SebiDisclaimerProps {
  variant?: DisclaimerVariant;
  className?: string;
}

const DISCLAIMER_TEXT =
  "Research scores, factor analysis, and signals on this platform are for educational and research purposes only. They are not recommendations to buy, sell, or hold any securities. Past research scores are not indicative of future returns. StockStory India is not a SEBI-registered investment adviser. Always consult a SEBI-registered investment adviser before making investment decisions. All investments are subject to market risk; read all scheme-related documents carefully. SEBI registration is not an endorsement or guarantee of returns.";

const BANNER_KEY = "sebi_disclaimer_dismissed_at";
const REDISPLAY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function isBannerDismissed(): boolean {
  try {
    const ts = localStorage.getItem(BANNER_KEY);
    if (!ts) return false;
    return Date.now() - Number(ts) < REDISPLAY_MS;
  } catch {
    return false;
  }
}

function dismissBanner(): void {
  try {
    localStorage.setItem(BANNER_KEY, String(Date.now()));
  } catch {
    // Storage not available — ignore
  }
}

export function SebiDisclaimer({ variant = "footer", className = "" }: SebiDisclaimerProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (variant === "banner") {
      setVisible(!isBannerDismissed());
    }
  }, [variant]);

  if (variant === "banner") {
    if (!visible) return null;
    return (
      <div className="flex w-full items-start gap-3 border-l-[3px] border-[#92400E] bg-[#FFFBEB] px-4 py-3">
        <p className="flex-1 text-[12px] leading-[1.6] text-[var(--c-ink-secondary)]">
          <strong className="font-semibold">SEBI Disclaimer:</strong>{" "}
          {DISCLAIMER_TEXT}
        </p>
        <button
          onClick={() => { dismissBanner(); setVisible(false); }}
          className="mt-0.5 shrink-0 text-[var(--c-ink-muted)] transition-colors hover:text-[var(--c-ink)]"
          aria-label="Dismiss disclaimer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  if (variant === "footer") {
    return (
      <footer className={`mt-8 px-4 py-4 border-t border-[#E2E8F0] bg-[#F8FAFC] ${className}`.trim()}>
        <p className="text-[11px] leading-5 text-[#94A3B8] max-w-5xl mx-auto">
          <strong className="font-semibold text-[#64748B]">Disclaimer:</strong>{" "}
          {DISCLAIMER_TEXT}
        </p>
      </footer>
    );
  }

  if (variant === "inline") {
    return (
      <p className="text-[11px] leading-5 text-[#94A3B8]">
        <strong className="font-semibold text-[#64748B]">Disclaimer:</strong>{" "}
        {DISCLAIMER_TEXT}
      </p>
    );
  }

  // tooltip — just the short form
  return (
    <span className="text-[10px] text-[#94A3B8]" title={DISCLAIMER_TEXT}>
      For educational purposes only. Not investment advice.
    </span>
  );
}

export default SebiDisclaimer;
