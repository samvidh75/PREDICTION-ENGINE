import React from "react";

export type SpatialFrameVariant = "onboarding" | "private" | "public";

type Props = {
  variant: SpatialFrameVariant;
  isMobile?: boolean;
  className?: string;
  children: React.ReactNode;
};

export function getSpatialFrameClassNames(variant: SpatialFrameVariant, isMobile: boolean): string {
  // Centralized padding + z-layer discipline for major experience surfaces.
  // Keep these values aligned with existing page spacing to avoid jarring regressions.
  switch (variant) {
    case "onboarding":
      return isMobile
        ? "relative z-[20] ss-px-20 ss-pt-96 ss-pb-64"
        : "relative z-[20] ss-px-20 ss-px-72-sm ss-pt-96 ss-pb-64";

    // Public About-like pages use pt-[110px] pb-[64px] in the current codebase.
    case "public":
      return isMobile
        ? "relative z-[10] ss-px-20 ss-pt-110 ss-pb-64"
        : "relative z-[10] ss-px-20 ss-px-72-sm ss-pt-110 ss-pb-64";

    // Most private app pages use z-[10], pt-[96px], pb-[80px] today.
    case "private":
    default:
      return isMobile
        ? "relative z-[10] ss-px-20 ss-pt-96 ss-pb-80"
        : "relative z-[10] ss-px-20 ss-px-72-sm ss-pt-96 ss-pb-80";
  }
}

export default function SpatialFrame({ variant, isMobile = false, className, children }: Props): JSX.Element {
  return (
    <div className={[getSpatialFrameClassNames(variant, isMobile), className ?? ""].join(" ").trim()}>
      {children}
    </div>
  );
}
