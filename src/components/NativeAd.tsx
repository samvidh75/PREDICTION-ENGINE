/**
 * NativeAd — Sponsored content slot for positions 3 & 7 in news feeds.
 *
 * CPM model: ₱50-100 per 1K impressions. Labeled "SPONSORED" per SEC guidelines.
 * Premium subscribers see no ads (FeatureGate checks subscription tier).
 *
 * Spec ref: Section "Native Advertising" — ad positions 3 & 7.
 *
 * No real ad-server integration or advertiser relationships exist yet
 * (a prior version hardcoded real Indian brokers — Zerodha, Groww,
 * INDmoney — with real referral links; those are not real sponsors of
 * this product and PSE users can't use Indian-market broker services
 * anyway). Until a real ad inventory source exists, this renders nothing
 * rather than fabricate sponsor content.
 */

import { useRef, useEffect, useState } from "react";
import { ExternalLink, X } from "lucide-react";
import { colors, radius, animation } from "../design/tokens";
import { useEntitlements } from "../commercial/useEntitlements";

interface NativeAdProps {
  position: number; // 3 or 7 for news feed position
  compact?: boolean;
}

interface AdCreative {
  id: string;
  sponsor: string;
  headline: string;
  body: string;
  cta: string;
  url: string;
  logo: string;
}

/** Wire this to a real ad-server response when one exists. */
const AD_INVENTORY: AdCreative[] = [];

export function NativeAd({ position, compact = false }: NativeAdProps) {
  const { entitlements, loaded } = useEntitlements();
  const isPremium = loaded && entitlements?.tier === "pro";
  const [dismissed, setDismissed] = useState(false);
  const [impressed, setImpressed] = useState(false);
  const adRef = useRef<HTMLDivElement>(null);

  const ad: AdCreative | undefined = AD_INVENTORY.length > 0
    ? AD_INVENTORY[position % AD_INVENTORY.length]
    : undefined;
  const hidden = isPremium || dismissed || !ad;

  // Impression tracking via IntersectionObserver
  useEffect(() => {
    if (!adRef.current || impressed || !ad) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setImpressed(true);
          // Fire impression pixel in production
          if (typeof window !== "undefined" && (window as any).gtag) {
            (window as any).gtag("event", "ad_impression", {
              ad_id: ad.id,
              position,
              sponsor: ad.sponsor,
            });
          }
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(adRef.current);
    return () => observer.disconnect();
  }, [ad, position, impressed]);

  if (hidden || !ad) return null;

  const handleClick = () => {
    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("event", "ad_click", {
        ad_id: ad.id,
        position,
        sponsor: ad.sponsor,
      });
    }
    window.open(ad.url, "_blank", "noopener,noreferrer");
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissed(true);
  };

  if (compact) {
    return (
      <div
        ref={adRef}
        onClick={handleClick}
        style={{
          cursor: "pointer",
          padding: "12px 16px",
          background: colors.surface,
          borderRadius: radius.md,
          border: `1px solid ${colors.hairline}`,
          display: "flex",
          alignItems: "center",
          gap: "12px",
          transition: `all ${animation.fast}`,
          position: "relative",
        }}
        className="native-ad-compact"
      >
        {/* Sponsor avatar */}
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: radius.sm,
            background: colors.accentRedSoft,
            color: colors.accentRed,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "13px",
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {ad.logo}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "10px", color: colors.textTertiary, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: "2px" }}>
            SPONSORED
          </div>
          <div style={{ fontSize: "13px", fontWeight: 500, color: colors.textPrimary }}>
            {ad.headline}
          </div>
        </div>
        <button
          onClick={handleDismiss}
          style={{
            background: "none",
            border: "none",
            color: colors.textTertiary,
            cursor: "pointer",
            padding: "4px",
            borderRadius: radius.xs,
            flexShrink: 0,
          }}
          aria-label="Dismiss ad"
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <div
      ref={adRef}
      onClick={handleClick}
      style={{
        cursor: "pointer",
        padding: "16px 20px",
        background: colors.surface,
        borderRadius: radius.lg,
        border: `1px solid ${colors.hairline}`,
        transition: `all ${animation.fast}`,
        position: "relative",
      }}
      className="native-ad-full"
      onMouseEnter={(e) => {
        e.currentTarget.style.background = colors.surfaceElevated;
        e.currentTarget.style.borderColor = colors.hairlineStrong;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = colors.surface;
        e.currentTarget.style.borderColor = colors.hairline;
      }}
    >
      {/* Sponsored label */}
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          padding: "2px 8px",
          borderRadius: radius.full,
          background: colors.accentRedSoft,
          color: colors.accentRed,
          fontSize: "10px",
          fontWeight: 600,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          marginBottom: "10px",
        }}
      >
        SPONSORED
      </div>

      {/* Content */}
      <div style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: radius.sm,
            background: colors.accentRedSoft,
            color: colors.accentRed,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "15px",
            fontWeight: 700,
            flexShrink: 0,
            marginTop: "2px",
          }}
        >
          {ad.logo}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "15px", fontWeight: 600, color: colors.textPrimary, marginBottom: "4px", lineHeight: "1.4" }}>
            {ad.headline}
          </div>
          <div style={{ fontSize: "13px", color: colors.textSecondary, lineHeight: "1.5", marginBottom: "8px" }}>
            {ad.body}
          </div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "13px",
              fontWeight: 500,
              color: colors.accentRed,
            }}
          >
            {ad.cta} <ExternalLink size={12} />
          </div>
        </div>
        {/* Dismiss */}
        <button
          onClick={handleDismiss}
          style={{
            background: "none",
            border: "none",
            color: colors.textTertiary,
            cursor: "pointer",
            padding: "4px",
            borderRadius: radius.xs,
            flexShrink: 0,
          }}
          aria-label="Dismiss ad"
        >
          <X size={16} />
        </button>
      </div>

      {/* Premium upsell */}
      <div
        style={{
          marginTop: "12px",
          paddingTop: "12px",
          borderTop: `1px solid ${colors.hairline}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span style={{ fontSize: "12px", color: colors.textTertiary }}>
          Ad-free with StockEX Premium
        </span>
        <span
          style={{
            fontSize: "12px",
            fontWeight: 500,
            color: colors.primary,
            cursor: "pointer",
          }}
        >
          Upgrade →
        </span>
      </div>
    </div>
  );
}
