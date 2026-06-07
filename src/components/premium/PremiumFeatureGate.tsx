import React, { useEffect, useMemo, useRef } from "react";
import type { PremiumFeatureKey } from "../../services/premium/premiumFeatureGates";
import type { PremiumTier } from "../../services/premium/premiumEntitlementStore";
import { usePremiumEntitlement } from "../../services/premium/usePremiumEntitlement";
import { usePremiumAccess, emitPremiumFeatureRendered } from "../../services/premium/usePremiumAccess";

type Props = {
  featureKey: PremiumFeatureKey;
  title: string;
  subtitle: string;
  previewLines: string[];
  requiredTier?: PremiumTier;
  className?: string;
  children: React.ReactNode;
};

function tierLabel(tier: PremiumTier): string {
  if (tier === "institutional") return "Institutional tier";
  if (tier === "premium") return "Premium tier";
  return "Free tier";
}

function cleanPreviewLine(line: string): string {
  let out = line;

  // Strip disclaimer-style phrases (must not appear in main product UI).
  out = out.replace(/\bSEBI[- ]safe\b/gi, "");
  out = out.replace(/\beducational only\b/gi, "");
  out = out.replace(/\bno recommendations\b/gi, "");
  out = out.replace(/\bno trade execution\b/gi, "");
  out = out.replace(/\bno execution framing\b/gi, "");
  out = out.replace(/\bno certainty claims\b/gi, "");
  out = out.replace(/\bnot guaranteed\b/gi, "");
  out = out.replace(/\bnot investment advice\b/gi, "");
  out = out.replace(/\bprobabilistic framing\b/gi, "");
  out = out.replace(/\bprobabilistic lens\b/gi, "");
  out = out.replace(/\bno execution\b/gi, "");

  // Collapse common separators introduced by removals.
  out = out.replace(/\s+•\s+/g, " • ");
  out = out.replace(/\s+-\s+/g, " - ");
  out = out.replace(/\s{2,}/g, " ");
  out = out.replace(/(\s+•\s*)+$/g, "");
  out = out.trim();

  return out;
}

export default function PremiumFeatureGate({
  featureKey,
  title,
  subtitle,
  previewLines,
  requiredTier,
  className,
  children,
}: Props): JSX.Element {
  const entitlement = usePremiumEntitlement();
  const { hasAccess, requiredTier: inferredRequiredTier } = usePremiumAccess(featureKey);

  const effectiveRequiredTier = requiredTier ?? inferredRequiredTier;

  const didEmitRef = useRef(false);
  const accessLabel = useMemo(() => (hasAccess ? "has_access" : "denied"), [hasAccess]);

  useEffect(() => {
    if (didEmitRef.current) return;
    didEmitRef.current = true;

    emitPremiumFeatureRendered(featureKey, hasAccess, effectiveRequiredTier, entitlement.tier);
  }, [effectiveRequiredTier, entitlement.tier, featureKey, hasAccess]);

  if (hasAccess) return <>{children}</>;

  return (
    <div
      className={className ?? "rounded-[22px] border border-white/10 bg-black/25 p-5"}
      aria-label={`Premium feature gate: ${title}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-[0.18em] text-white/55">Premium deepening</div>
          <div className="mt-2 text-[16px] font-semibold text-white/92 leading-[1.2]">{title}</div>
          <div className="mt-2 text-[13px] leading-[1.8] text-white/80">{subtitle}</div>

          <div className="mt-3 space-y-1">
            {previewLines.map((line, idx) => {
              const cleaned = cleanPreviewLine(line);
              return (
                <div key={`${featureKey}_${idx}`} className="text-[12px] leading-[1.7] text-white/75">
                  {cleaned || line}
                </div>
              );
            })}
          </div>

          <div className="mt-3 text-[11px] uppercase tracking-[0.18em] text-white/45">
            Context-first deep lens
          </div>
        </div>

        <div className="shrink-0 text-right">
          <div className="text-[11px] uppercase tracking-[0.18em] text-white/60">{tierLabel(effectiveRequiredTier)}</div>

          <button
            type="button"
            onClick={() => {
              // Track interaction via lock cards; this gate is lightweight so we only flip tier.
              entitlement.setTier(effectiveRequiredTier);
            }}
            className="mt-3 h-[44px] rounded-[999px] border border-white/10 bg-black/35 px-[18px] text-[12px] uppercase tracking-[0.18em] text-white/85 hover:text-white/95 transition"
            aria-label={`Unlock ${effectiveRequiredTier} for ${title}`}
          >
            Unlock for deeper lens
          </button>

          <div className="mt-2 text-[10px] uppercase tracking-[0.18em] text-white/40">{accessLabel}</div>
        </div>
      </div>
    </div>
  );
}
