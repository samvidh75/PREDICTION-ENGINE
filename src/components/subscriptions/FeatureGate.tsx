import React from "react";

interface FeatureGateProps {
  feature: string;
  children: React.ReactNode;
  fallbackMessage?: string;
}

export const FeatureGate: React.FC<FeatureGateProps> = ({
  children,
}: FeatureGateProps) => {
  return <>{children}</>;
};

export default FeatureGate;
