/**
 * commercial/useEntitlements — React hook for frontend feature gating.
 *
 * Provides the current user's resolved entitlements and helper methods
 * for checking feature access at runtime.
 *
 * Usage:
 *   const { check, entitlements, withinLimit } = useEntitlements();
 *   if (check('peer_comparison').granted) { ... }
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { EntitlementService, entitlementService } from "./EntitlementService";
import type { EntitlementCheck, ResolvedEntitlements, EntitlementStoreState } from "./entitlementTypes";
import type { FeatureKey } from "./plans";

// Singleton service instance
const service = entitlementService;

// ─── Store (simple pub/sub; replace with Zustand/Jotai if complexity grows) ──

type Listener = (state: EntitlementStoreState) => void;

class Store {
  private state: EntitlementStoreState = {
    loaded: false,
    loading: true,
    subscription: null,
    entitlements: null,
    error: null,
  };

  private listeners = new Set<Listener>();

  getState(): EntitlementStoreState {
    return this.state;
  }

  async load(userId: string): Promise<void> {
    this.state = { ...this.state, loading: true, loaded: false, error: null };
    this.notify();

    try {
      // In production: fetch user_subscription from API / DB
      // For now, resolve as free (no subscription)
      const sub = null; // await fetchUserSubscription(userId);
      const entitlements = service.resolve(sub);
      this.state = {
        loaded: true,
        loading: false,
        subscription: sub,
        entitlements,
        error: null,
      };
    } catch (err) {
      this.state = {
        loaded: false,
        loading: false,
        subscription: null,
        entitlements: null,
        error: err instanceof Error ? err.message : "Failed to load entitlements",
      };
    }
    this.notify();
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((fn) => fn(this.state));
  }
}

const store = new Store();

// ─── Hook ────────────────────────────────────────────────────────────

export function useEntitlements() {
  const [state, setState] = useState<EntitlementStoreState>(store.getState());

  useEffect(() => {
    const unsub = store.subscribe(setState);
    return unsub;
  }, []);

  const check = useCallback(
    (feature: FeatureKey): EntitlementCheck => {
      return service.check(state.entitlements, feature);
    },
    [state.entitlements],
  );

  const withinLimit = useCallback(
    (resource: "watchlists" | "alerts" | "portfolio_entries", current: number): boolean => {
      return service.withinLimit(state.entitlements, resource, current);
    },
    [state.entitlements],
  );

  const canUpgrade = useMemo(() => {
    return state.entitlements?.tier === "free" || state.entitlements?.tier === "plus";
  }, [state.entitlements]);

  return {
    ...state,
    check,
    withinLimit,
    canUpgrade,
    /** Manually trigger load for a user */
    load: store.load,
  };
}
