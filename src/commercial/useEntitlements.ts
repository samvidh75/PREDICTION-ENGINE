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
import type { EntitlementCheck, ResolvedEntitlements, EntitlementStoreState, UserSubscription } from "./entitlementTypes";
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
      // Fetch subscription from the billing API
      const token = await this.getIdToken();
      const res = await fetch("/api/checkout/subscription-status", {
        headers: { Authorization: `Bearer ${token}` },
      });

      let sub: UserSubscription | null = null;
      if (res.ok) {
        const data = await res.json();
        if (data.tier && data.tier !== "free") {
          sub = {
            userId: data.userId ?? "",
            planId: data.planId,
            tier: data.tier,
            status: data.status,
            startedAt: data.currentPeriodStart ?? Date.now(),
            expiresAt: data.currentPeriodEnd ?? null,
            autoRenew: data.autoRenew ?? true,
          };
        }
      }

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

  /**
   * Retrieve a Firebase ID token from the auth context.
   * Falls back to localStorage token for development.
   */
  private async getIdToken(): Promise<string> {
    // Try Firebase auth instance on window (set by App.tsx or auth provider)
    try {
      const { getAuth } = await import("firebase/auth");
      const auth = getAuth();
      if (auth.currentUser) {
        return await auth.currentUser.getIdToken();
      }
    } catch {
      // Firebase SDK not available in this context
    }
    // Dev fallback: check for stored token
    if (typeof localStorage !== "undefined") {
      return localStorage.getItem("firebase_id_token") ?? "";
    }
    return "";
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
