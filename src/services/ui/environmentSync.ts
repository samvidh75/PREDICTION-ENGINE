import { useEffect, useMemo, useState } from "react";
import { MarketService, type MarketComposite } from "../market/marketService";

type MarketStreamSnapshot = {
  snapshot: MarketComposite;
  // connection state stays separate for UI clarity
  connectionStatus: MarketComposite["connectionStatus"];
};

function shallowEqualConnection(a: string, b: string): boolean {
  return a === b;
}

/**
 * useMarketService
 * - subscribes to MarketService
 * - maintains a single snapshot state
 * - throttles state updates via MarketService's batching
 */
export function useMarketService(service: MarketService): MarketStreamSnapshot {
  const initial = useMemo<MarketStreamSnapshot>(() => {
    const snap = service.getSnapshot();
    return {
      snapshot: snap,
      connectionStatus: snap.connectionStatus,
    };
  }, [service]);

  const [state, setState] = useState<MarketStreamSnapshot>(initial);

  useEffect(() => {
    const unsub = service.subscribe((next) => {
      setState((prev) => {
        // Avoid state churn if only connection status changed and UI doesn't need full snapshot recompute.
        if (shallowEqualConnection(prev.connectionStatus, next.connectionStatus) && prev.snapshot.at === next.at) {
          return prev;
        }
        return { snapshot: next, connectionStatus: next.connectionStatus };
      });
    });

    service.start();

    return () => {
      unsub();
      service.stop();
    };
  }, [service]);

  return state;
}
