import React, { useCallback, useMemo, useState } from "react";
import type { PremiumTier } from "../../services/premium/premiumEntitlementStore";
import { usePremiumEntitlement } from "../../services/premium/usePremiumEntitlement";

function labelForTier(tier: PremiumTier): string {
  if (tier === "institutional") return "Institutional";
  if (tier === "premium") return "Premium";
  return "Free";
}

export default function PremiumTierSwitch(): JSX.Element {
  const entitlement = usePremiumEntitlement();
  const [open, setOpen] = useState(false);

  const currentLabel = useMemo(() => labelForTier(entitlement.tier), [entitlement.tier]);

  const onChoose = useCallback(
    (tier: PremiumTier) => {
      entitlement.setTier(tier);
      setOpen(false);
    },
    [entitlement],
  );

  return (
    <div className="relative">
      <button
        type="button"
        className="text-[11px] uppercase tracking-[0.18em] text-white/65 hover:text-white/85 transition"
        onClick={() => setOpen((v) => !v)}
        aria-label="Premium tier"
      >
        {currentLabel}
      </button>

      {open && (
        <div
          className="absolute right-0 top-[34px] z-[30] rounded-[22px] border border-white/10 bg-black/60 backdrop-blur-[24px] shadow-[0_0_50px_rgba(0,0,0,0.45)] p-3"
          style={{ width: 220 }}
          role="menu"
          aria-label="Choose premium tier (demo)"
        >
          <div className="text-[10px] uppercase tracking-[0.18em] text-white/55 px-2">Demo tier switch</div>

          <div className="mt-3 space-y-2">
            <button
              type="button"
              className="w-full h-[40px] rounded-[14px] border border-white/10 bg-black/20 text-[11px] uppercase tracking-[0.18em] text-white/70 hover:text-white/90 transition"
              onClick={() => onChoose("free")}
              role="menuitem"
            >
              Free
            </button>

            <button
              type="button"
              className="w-full h-[40px] rounded-[14px] border border-white/10 bg-black/20 text-[11px] uppercase tracking-[0.18em] text-white/70 hover:text-white/90 transition"
              onClick={() => onChoose("premium")}
              role="menuitem"
            >
              Premium
            </button>

            <button
              type="button"
              className="w-full h-[40px] rounded-[14px] border border-white/10 bg-black/20 text-[11px] uppercase tracking-[0.18em] text-white/70 hover:text-white/90 transition"
              onClick={() => onChoose("institutional")}
              role="menuitem"
            >
              Institutional
            </button>
          </div>

          <div className="mt-3 text-[10px] uppercase tracking-[0.18em] text-white/45 px-2">
            Respects educational framing • no recommendations
          </div>
        </div>
      )}
    </div>
  );
}
