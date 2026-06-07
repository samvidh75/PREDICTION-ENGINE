import React, { useEffect } from "react";
import { usePremiumEntitlement } from "../../services/premium/usePremiumEntitlement";
import type { PremiumTier } from "../../services/premium/premiumEntitlementStore";
import { emitMonetisationEvent } from "../../services/premium/monetisationObservability";

type Props = {
  requiredTier: PremiumTier;
  title: string;
  subtitle: string;
  previewLines: string[];
  accentGlow: string;
  ctaLabel?: string;
};

function tierLabel(tier: PremiumTier): string {
  if (tier === "institutional") return "Institutional tier";
  if (tier === "premium") return "Premium tier";
  return "Free tier";
}

export default function PremiumLockCard({
  requiredTier,
  title,
  subtitle,
  previewLines,
  accentGlow,
  ctaLabel,
}: Props): JSX.Element {
  const entitlement = usePremiumEntitlement();

  const hasAccess =
    requiredTier === "free"
      ? true
      : requiredTier === "premium"
        ? entitlement.hasPremium
        : entitlement.hasInstitutional;

  const canUnlock = requiredTier !== "free" && !hasAccess;

  const topStatus = hasAccess ? "Unlocked" : "Locked";

  const lockedMessage =
    requiredTier === "institutional"
      ? "Institutional intelligence surfaces are part of the top tier."
      : "Premium unlocks deeper intelligence environments.";

  useEffect(() => {
    // Observability: emit when a non-free module is displayed as locked.
    if (requiredTier === "free") return;
    if (hasAccess) return;

    emitMonetisationEvent({
      type: "premium_unlock_prompt_viewed",
      ts: Date.now(),
      ctx: {
        requiredTier,
        currentTier: entitlement.tier,
      },
    });
  }, [requiredTier, hasAccess, entitlement.tier]);

  return (
    <div className="ss-glass p-6">
      <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
          <div className="ss-laser-label">{topStatus} intelligence module</div>
          <div className="mt-2 text-[20px] font-semibold text-white/92 leading-[1.2]">{title}</div>
          <div className="mt-2 text-[14px] leading-[1.8] text-white/80">{subtitle}</div>
        </div>

        <div
          className="shrink-0 ss-telemetry-pill px-[14px] py-[10px] inline-flex items-center gap-2"
          style={{
            boxShadow: `0 0 22px rgba(0,0,0,0.2), 0 0 120px ${accentGlow}`,
          }}
        >
          <div className="h-[8px] w-[8px] rounded-full" style={{ background: accentGlow, boxShadow: `0 0 18px ${accentGlow}` }} />
          <div className="text-[11px] uppercase tracking-[0.18em] text-white/70">{tierLabel(requiredTier)}</div>
        </div>
      </div>

      <div className="mt-5 rounded-[22px] border border-white/10 bg-black/15 p-4">
        <div className="text-[10px] uppercase tracking-[0.18em] text-white/55">What you’ll get</div>
        <div className="mt-3 space-y-2">
          {previewLines.map((line, idx) => (
            <div key={`${requiredTier}_${idx}`} className="text-[13px] leading-[1.7] text-white/85">
              {line}
            </div>
          ))}
        </div>
        <div className="mt-3 text-[12px] leading-[1.7] text-white/60">{lockedMessage}</div>
        <div className="mt-3 text-[11px] uppercase tracking-[0.18em] text-white/45">
          Learning lens content
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {requiredTier === "free" ? (
          <div className="text-[12px] uppercase tracking-[0.18em] text-white/45">Free tier</div>
        ) : canUnlock ? (
          <button
            type="button"
            onClick={() => {
              emitMonetisationEvent({
                type: "premium_unlock_cta_clicked",
                ts: Date.now(),
                ctx: {
                  requiredTier,
                  currentTier: entitlement.tier,
                },
              });
              entitlement.setTier(requiredTier);
            }}
            className="h-[44px] rounded-[999px] border border-white/10 bg-black/35 px-[18px] text-[12px] uppercase tracking-[0.18em] text-white/85 hover:text-white/95 transition"
            style={{
              boxShadow: `0 0 30px rgba(0,0,0,0.25), 0 0 60px ${accentGlow}`,
            }}
            aria-label={`Unlock ${requiredTier} tier`}
          >
            {ctaLabel ?? "Unlock with premium"}
          </button>
        ) : (
          <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">Already unlocked</div>
        )}

        {entitlement.tier !== "free" && (
          <button
            type="button"
            onClick={() => {
              emitMonetisationEvent({
                type: "premium_tier_clear",
                ts: Date.now(),
                ctx: {
                  currentTier: entitlement.tier,
                },
              });
              entitlement.clear();
            }}
            className="h-[44px] rounded-[999px] border border-white/10 bg-black/20 px-[18px] text-[12px] uppercase tracking-[0.18em] text-white/70 hover:text-white/90 transition"
          >
            Switch to free
          </button>
        )}
      </div>
    </div>
  );
}
