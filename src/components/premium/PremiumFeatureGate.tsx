import React from "react";

type Props = {
  featureKey: string;
  title: string;
  subtitle: string;
  previewLines: string[];
  requiredTier?: string;
  className?: string;
  children: React.ReactNode;
};

export default function PremiumFeatureGate({
  children,
}: Props): JSX.Element {
  return <>{children}</>;
}
