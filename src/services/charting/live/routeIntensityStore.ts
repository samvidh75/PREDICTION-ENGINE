import type { ChartTimeframe } from "../../../components/charts/chartTypes";

export type RouteIntensity = "high" | "medium" | "low";

function readPageFromUrl(): string {
  try {
    const params = new URLSearchParams(window.location.search);
    return (params.get("page") ?? "landing").toLowerCase().trim();
  } catch {
    return "landing";
  }
}

function readSearchOverlayFromUrl(): boolean {
  try {
    const params = new URLSearchParams(window.location.search);
    const searchParam = params.get("search");
    const q = params.get("q");
    if (searchParam === "1" || searchParam?.toLowerCase() === "true") return true;
    // If q exists and search param missing, we still treat as overlay-ish.
    if (q && q.trim().length > 0) return true;
    return false;
  } catch {
    return false;
  }
}

export function computeRouteIntensity(): RouteIntensity {
  const page = readPageFromUrl();

  // “High”: user is actively exploring/reading a live chart and wants responsiveness.
  if (page === "stock" || page === "company" || page === "explore") return "high";

  // Overlay routes (e.g., stock search overlay) should still be responsive.
  if (page === "stock" && readSearchOverlayFromUrl()) return "high";

  // “Medium”: dashboard + market overview style pages.
  if (page === "dashboard") return "medium";

  // “Low”: public, onboarding, auth-ish, everything else.
  return "low";
}

type Subscriber = (intensity: RouteIntensity) => void;

class RouteIntensityStore {
  private intensity: RouteIntensity = "low";
  private subscribers: Set<Subscriber> = new Set();
  private started = false;

  start(): void {
    if (this.started) return;
    this.started = true;

    const refresh = () => {
      const next = computeRouteIntensity();
      if (this.intensity === next) return;
      this.intensity = next;
      for (const fn of this.subscribers) fn(this.intensity);
    };

    // Initialize immediately.
    this.intensity = computeRouteIntensity();

    // App.tsx dispatches "urlchange" for pushState/replaceState.
    window.addEventListener("urlchange", refresh);
    window.addEventListener("popstate", refresh);
  }

  stop(): void {
    if (!this.started) return;
    this.started = false;
    window.removeEventListener("urlchange", this.onUrlChange as EventListener);
    window.removeEventListener("popstate", this.onUrlChange as EventListener);
    this.subscribers.clear();
  }

  // Stored to keep removeEventListener working.
  private onUrlChange = () => {
    const next = computeRouteIntensity();
    if (this.intensity === next) return;
    this.intensity = next;
    for (const fn of this.subscribers) fn(this.intensity);
  };

  getIntensity(): RouteIntensity {
    return this.intensity;
  }

  subscribe(fn: Subscriber): () => void {
    this.subscribers.add(fn);
    fn(this.intensity);

    return () => {
      this.subscribers.delete(fn);
    };
  }
}

export const routeIntensityStore = new RouteIntensityStore();

// Start immediately (lightweight) since it only parses URL and listens to events.
if (typeof window !== "undefined") {
  routeIntensityStore.start();
}
