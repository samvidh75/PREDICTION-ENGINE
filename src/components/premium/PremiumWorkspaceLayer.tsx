import React from "react";

type Props = {
  featureKey: string;
  lockWrapperClassName?: string;
  children: React.ReactNode;
  lockCard: { title: string; subtitle: string; previewLines: string[]; accentGlow: string; ctaLabel?: string };
  requiredTierOverride?: string;
};

export default function PremiumWorkspaceLayer({
  children,
}: Props): JSX.Element {
  return <>{children}</>;
}
