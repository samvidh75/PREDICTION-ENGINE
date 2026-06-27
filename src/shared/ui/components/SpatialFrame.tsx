import React from "react";
import { spacing } from "../../../styles";

export type SpatialFrameVariant = "onboarding" | "private" | "public";

type Props = {
  variant: SpatialFrameVariant;
  isMobile?: boolean;
  className?: string;
  children: React.ReactNode;
};

const VARIANT_Z: Record<SpatialFrameVariant, number> = {
  onboarding: 20,
  public: 10,
  private: 10,
};

function getPt(variant: SpatialFrameVariant): string {
  switch (variant) {
    case "onboarding":
      return `calc(${spacing.xxxl} + ${spacing.xl})`;
    case "public":
      return "112px";
    case "private":
    default:
      return `calc(${spacing.xxxl} + ${spacing.xl})`;
  }
}

function getPb(variant: SpatialFrameVariant): string {
  switch (variant) {
    case "onboarding":
      return spacing.xxxl;
    case "public":
      return spacing.xxxl;
    case "private":
    default:
      return "80px";
  }
}

export function getSpatialFrameStyle(variant: SpatialFrameVariant, isMobile: boolean): React.CSSProperties {
  return {
    paddingLeft: isMobile ? spacing.pagePadSm : spacing.pagePad,
    paddingRight: isMobile ? spacing.pagePadSm : spacing.pagePad,
    paddingTop: getPt(variant),
    paddingBottom: getPb(variant),
  };
}

export function getSpatialFrameClassNames(variant: SpatialFrameVariant): string {
  return `relative z-[${VARIANT_Z[variant]}]`;
}

export default function SpatialFrame({ variant, isMobile = false, className, children }: Props): JSX.Element {
  return (
    <div
      className={[getSpatialFrameClassNames(variant), className ?? ""].join(" ").trim()}
      style={getSpatialFrameStyle(variant, isMobile)}
    >
      {children}
    </div>
  );
}
