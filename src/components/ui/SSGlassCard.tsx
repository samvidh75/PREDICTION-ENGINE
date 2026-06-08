import React from "react";
import PremiumCard from "../../shared/ui/components/PremiumCard";

type Props = {
  children: React.ReactNode;
  /**
   * visual surface hierarchy presets
   */
  variant?: "primary" | "secondary";
  className?: string;
};

export default function SSGlassCard({ children, variant = "primary", className }: Props): JSX.Element {
  const mapped = variant === "primary" ? "glass" : "glass2";

  return (
    <PremiumCard
      variant={mapped}
      className={className}
      ariaLabel={variant === "primary" ? "Primary info surface" : "Secondary info surface"}
    >
      {children}
    </PremiumCard>
  );
}
