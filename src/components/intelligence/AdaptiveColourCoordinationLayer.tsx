import React from "react";
import { useConfidenceEngine } from "./ConfidenceEngine";

type Props = {
  children: React.ReactNode;
};

function styleWithCssVars(vars: Record<string, string>): React.CSSProperties {
  return {
    display: "contents",
    ...(Object.fromEntries(Object.entries(vars).map(([k, v]) => [`${k}`, v])) as Record<string, string>),
  } as React.CSSProperties;
}

export default function AdaptiveColourCoordinationLayer({ children }: Props): JSX.Element {
  const { state, theme } = useConfidenceEngine();

  const glowCurrent = (() => {
    switch (state) {
      case "ELEVATED_RISK":
        return theme.warningGlow;
      case "MOMENTUM_WEAKENING":
        return theme.magentaGlow;
      case "CONFIDENCE_RISING":
        return theme.cyanGlow;
      case "STABLE_CONVICTION":
      case "NEUTRAL_ENVIRONMENT":
      default:
        return theme.deepBlueGlow;
    }
  })();

  return (
    <div
      style={styleWithCssVars({
        /* legacy dynamic glows */
        "--ss-dyn-glow-cyan": theme.cyanGlow,
        "--ss-dyn-glow-magenta": theme.magentaGlow,
        "--ss-dyn-glow-deep-blue": theme.deepBlueGlow,
        "--ss-dyn-glow-warning": theme.warningGlow,

        /* Step 7: Stock-state → semantic neon mapping (governed) */
        "--ss-sem-neon-glow-current": glowCurrent,

        "--ss-sem-neon-glow-strength": theme.cyanGlow,
        "--ss-sem-neon-glow-drift": theme.magentaGlow,
        "--ss-sem-neon-glow-structural": theme.deepBlueGlow,
        "--ss-sem-neon-glow-uncertainty": theme.warningGlow,
      })}
    >
      {children}
    </div>
  );
}
