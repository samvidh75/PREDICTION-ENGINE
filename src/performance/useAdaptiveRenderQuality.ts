import { useEffect, useMemo, useState } from "react";
import type { RouteIntensity } from "../services/charting/live/routeIntensityStore";
import { routeIntensityStore } from "../services/charting/live/routeIntensityStore";
import type { BackgroundState } from "../services/realtime/backgroundThrottleController";
import { backgroundThrottleController } from "../services/realtime/backgroundThrottleController";

export type RenderQuality = "high" | "medium" | "low";

function computeQuality(route: RouteIntensity, background: BackgroundState): RenderQuality {
  if (background === "hidden") return "low";
  if (route === "high") return "high";
  if (route === "medium") return "medium";
  return "low";
}

/**
 * useAdaptiveRenderQuality
 * Centralizes a “calm performance profile” based on:
 * - route intensity (what the user is looking at)
 * - background visibility (battery-safe)
 */
export function useAdaptiveRenderQuality(): RenderQuality {
  const [routeIntensity, setRouteIntensity] = useState<RouteIntensity>(routeIntensityStore.getIntensity());
  const [background, setBackground] = useState<BackgroundState>(backgroundThrottleController.getState());

  useEffect(() => {
    const unsubRoute = routeIntensityStore.subscribe((v) => setRouteIntensity(v));
    const unsubBg = backgroundThrottleController.subscribe((s) => setBackground(s));
    return () => {
      unsubRoute();
      unsubBg();
    };
  }, []);

  return useMemo(() => computeQuality(routeIntensity, background), [routeIntensity, background]);
}
