import React from "react";
import RenderIsolationBoundary from "./RenderIsolationBoundary";

type Props = {
  featureKey: string;

  /**
   * Only replaces the wrapped subtree when deps change.
   * Useful to prevent parent rerender churn from “recreating” heavy children.
   */
  deps: readonly unknown[];

  children: React.ReactNode;
};

export default function RealtimeRenderIsolationCoordinator({ featureKey, deps, children }: Props): JSX.Element {
  return (
    <RenderIsolationBoundary deps={deps} debugLabel={`rt_isolation:${featureKey}`}>
      {children}
    </RenderIsolationBoundary>
  );
}
