import React, { useEffect, useMemo, useState } from "react";

export type HydrationBoundaryMode = "immediate" | "idle";

export type HydrationBoundaryManagerProps = {
  children: React.ReactNode;

  /**
   * Rendered until the component hydrates (client-mounted).
   * If omitted, we render children only once hydrated to avoid flicker.
   */
  fallback?: React.ReactNode;

  /**
   * immediate: hydrate on mount (useEffect)
   * idle: hydrate on idle callback when available
   */
  mode?: HydrationBoundaryMode;

  /**
   * Extra delay (ms) after we decide to hydrate.
   * Use small values to avoid layout jumps during fast route transitions.
   */
  delayMs?: number;

  /**
   * Optional debug data attr
   */
  debugLabel?: string;
};

export default function HydrationBoundaryManager({
  children,
  fallback = null,
  mode = "immediate",
  delayMs = 0,
  debugLabel,
}: HydrationBoundaryManagerProps): JSX.Element {
  const [hydrated, setHydrated] = useState(false);

  const strategy = useMemo(() => {
    return mode;
  }, [mode]);

  useEffect(() => {
    let alive = true;
    let t: number | null = null;
    let idleHandle: number | null = null;

    const hydrate = () => {
      if (!alive) return;
      if (delayMs <= 0) {
        setHydrated(true);
        return;
      }
      t = window.setTimeout(() => {
        if (!alive) return;
        setHydrated(true);
      }, delayMs);
    };

    if (strategy === "immediate") {
      hydrate();
    } else {
      // idle hydration
      const ric = (window as unknown as { requestIdleCallback?: typeof requestIdleCallback }).requestIdleCallback;
      if (typeof ric === "function") {
        idleHandle = ric(() => hydrate(), { timeout: 250 });
      } else {
        hydrate();
      }
    }

    return () => {
      alive = false;
      if (t != null) window.clearTimeout(t);
      if (idleHandle != null) {
        const cic = (window as unknown as { cancelIdleCallback?: typeof cancelIdleCallback }).cancelIdleCallback;
        if (typeof cic === "function") cic(idleHandle);
      }
    };
  }, [delayMs, strategy]);

  return (
    <div data-ss-hydration-boundary={debugLabel ?? undefined}>
      {hydrated ? children : fallback}
    </div>
  );
}
