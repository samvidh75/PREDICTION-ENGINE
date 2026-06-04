import React, { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useConfidenceEngine, type ConfidenceState } from "../intelligence/ConfidenceEngine";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { loadDiscoveryMemory } from "../../services/discovery/discoveryMemory";
import { getDiscoveryIndex } from "../../services/discovery/discoveryIndex";
import type { DiscoveryEntityKind } from "../../services/discovery/discoveryTypes";
import { navigate, navigateToExplore, navigateToStock, type PageKey } from "../../architecture/navigation/routeCoordinator";
import { NavLabel } from "../../designSystem/PremiumTypography";

type NavItem = {
  id: string;
  label: string;
  page: PageKey;
  description: string;
};

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function getPageKeyFromUrl(): PageKey {
  if (typeof window === "undefined") return "stock";
  try {
    const params = new URLSearchParams(window.location.search);
    const raw = (params.get("page") ?? "stock").toLowerCase().trim();

    if (raw === "company") return "company";
    if (raw === "community") return "community";
    if (raw === "practice") return "practice";
    if (raw === "assistant") return "assistant";
    if (raw === "explore") return "explore";
    if (raw === "dashboard" || raw === "market") return "dashboard";
    return "stock";
  } catch {
    return "stock";
  }
}

function activeGlowForState(state: ConfidenceState): { main: string; dim: string } {
  // keep it calm; no neon spam
  switch (state) {
    case "ELEVATED_RISK":
      return { main: "rgba(217,140,122,0.28)", dim: "rgba(217,140,122,0.10)" };
    case "MOMENTUM_WEAKENING":
      return { main: "rgba(209,107,165,0.26)", dim: "rgba(209,107,165,0.10)" };
    case "CONFIDENCE_RISING":
      return { main: "rgba(0,255,210,0.24)", dim: "rgba(0,255,210,0.10)" };
    case "NEUTRAL_ENVIRONMENT":
      return { main: "rgba(0,120,255,0.22)", dim: "rgba(0,120,255,0.09)" };
    case "STABLE_CONVICTION":
    default:
      return { main: "rgba(0,120,255,0.20)", dim: "rgba(0,120,255,0.08)" };
  }
}

export default function IntelligenceNavigationRail(): JSX.Element | null {
  const prefersReducedMotion = useReducedMotion();
  const isMobile = useMediaQuery("(max-width: 767px)");

  // Desktop uses a fixed left rail; top command bar remains handled by IntelligenceHUD.
  const { state, narrativeKey } = useConfidenceEngine();
  const glow = useMemo(() => activeGlowForState(state), [state]);

  const [pageKey, setPageKey] = useState<PageKey>(() => getPageKeyFromUrl());

  useEffect(() => {
    const onChange = () => setPageKey(getPageKeyFromUrl());
    window.addEventListener("urlchange", onChange);
    window.addEventListener("popstate", onChange);
    return () => {
      window.removeEventListener("urlchange", onChange);
      window.removeEventListener("popstate", onChange);
    };
  }, []);

  const navItems = useMemo<NavItem[]>(
    () => [
      {
        id: "dashboard",
        label: "Dashboard",
        page: "dashboard",
        description: "Market health and data",
      },
      {
        id: "search",
        label: "Search",
        page: "stock",
        description: "Command search",
      },
      {
        id: "explore",
        label: "Explore",
        page: "explore",
        description: "Discovery environments",
      },
      {
        id: "company",
        label: "Company Universe",
        page: "company",
        description: "Corporate narrative & financial evolution rails",
      },
      {
        id: "scanner",
        label: "Market Scanner",
        page: "explore",
        description: "Scan themes, sectors & institutional cues",
      },
      {
        id: "macro",
        label: "Macro Environment",
        page: "dashboard",
        description: "Adjustment under shifting market conditions",
      },
    ],
    [],
  );

  const [suggestions, setSuggestions] = useState<string[]>(() => []);
  useEffect(() => {
    try {
      const mem = loadDiscoveryMemory();
      const base = [...mem.preferredSectors, ...mem.preferredThemes];
      const uniq: string[] = [];
      const seen = new Set<string>();

      for (const x of base) {
        const k = x.trim().toLowerCase();
        if (!k) continue;
        if (seen.has(k)) continue;
        seen.add(k);
        uniq.push(x.trim());
        if (uniq.length >= 6) break;
      }
      setSuggestions(uniq);
    } catch {
      setSuggestions([]);
    }
  }, []);

  const highlightId = useMemo(() => {
    switch (state) {
      case "ELEVATED_RISK":
        return "dashboard";
      case "MOMENTUM_WEAKENING":
        return "practice";
      case "NEUTRAL_ENVIRONMENT":
        return "company";
      case "CONFIDENCE_RISING":
        return "explore";
      case "STABLE_CONVICTION":
      default:
        return "dashboard";
    }
  }, [state]);

  const exploreTarget = useMemo((): { kind: DiscoveryEntityKind; id: string } | null => {
    try {
      const mem = loadDiscoveryMemory();
      const preferredTitles = [...mem.preferredSectors, ...mem.preferredThemes]
        .map((x) => x.trim().toLowerCase())
        .filter(Boolean);

      const preferredSet = new Set(preferredTitles);
      const index = getDiscoveryIndex();

      const exact = index.filter((e) => preferredSet.has(e.title.trim().toLowerCase()));
      if (exact.length > 0) {
        const idx = Math.abs(Math.floor((narrativeKey + exact.length) * 997)) % exact.length;
        return { kind: exact[idx].kind, id: exact[idx].id };
      }

      // Soft fallback: pick the first entity in a preferred kind (sector/theme) if present.
      const soft = index.find((e) => (e.kind === "sector" || e.kind === "theme") && preferredSet.has(e.title.trim().toLowerCase()));
      if (soft) return { kind: soft.kind, id: soft.id };

      const first = index[0];
      if (!first) return null;
      return { kind: first.kind, id: first.id };
    } catch {
      return null;
    }
  }, [narrativeKey]);

  const navigateTo = (targetPage: PageKey): void => {
    if (targetPage === "explore") {
      const index = getDiscoveryIndex();
      const fallback = index[0] ?? null;

      const exploreEntity = exploreTarget ?? (fallback ? { kind: fallback.kind, id: fallback.id } : null);
      if (!exploreEntity) return;

      // “Hard” nav ensures DiscoveryEntityPage reads correct kind/id on mount.
      navigateToExplore(exploreEntity.kind, exploreEntity.id, { mode: "hard" });
      return;
    }

    navigate({ page: targetPage, mode: "push" });
  };

  const openGuidedSearch = (q: string): void => {
    navigateToStock({ openSearchQ: q, mode: "hard" });
  };

  const bottomRailReservePx = 72;

  useEffect(() => {
    if (!isMobile) return;

    const prevBodyPaddingBottom = document.body.style.paddingBottom;
    const prevHtmlPaddingBottom = document.documentElement.style.paddingBottom;

    document.body.style.paddingBottom = `${bottomRailReservePx}px`;
    document.documentElement.style.paddingBottom = `${bottomRailReservePx}px`;

    return () => {
      document.body.style.paddingBottom = prevBodyPaddingBottom;
      document.documentElement.style.paddingBottom = prevHtmlPaddingBottom;
    };
  }, [isMobile]);

  // Mobile Bottom Navigation Custom Rendering (Section 72 spec)
  if (isMobile) {
    const mobileNavItems = [
      { id: "dashboard", label: "Dashboard", page: "dashboard" as PageKey, path: "M4 4h6v8H4zm10 0h6v6h-6zm0 10h6v6h-6zm-10-6h6v8H4z" },
      { id: "search", label: "Search", page: "stock" as PageKey, path: "M19 19l-3.5-3.5M17 10A7 7 0 113 10a7 7 0 0114 0z" },
      { id: "explore", label: "Markets", page: "explore" as PageKey, path: "M23 6l-9.5 9.5-5-5L1 18" },
      { id: "practice", label: "Watchlist", page: "practice" as PageKey, path: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" },
      { id: "assistant", label: "Assistant", page: "assistant" as PageKey, path: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" }
    ];

    return (
      <div className="fixed bottom-0 left-0 right-0 z-[99] h-[72px] border-t border-cyan-100/10 bg-[#172331]/88 backdrop-blur-2xl px-4 flex items-center justify-around shadow-[0_-10px_40px_rgba(5,12,20,0.22)]">
        {mobileNavItems.map((item) => {
          const active = pageKey === item.page;
          return (
            <button
              key={item.id}
              type="button"
              className="flex flex-col items-center justify-center gap-1 w-[60px] h-full text-white/55 active:scale-95 transition"
              onClick={() => {
                if (item.id === "search") {
                  window.dispatchEvent(new CustomEvent("ss:openSearchOverlay", { detail: { q: "" } }));
                  return;
                }
                navigateTo(item.page);
              }}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke={active ? "#00D17A" : "currentColor"}
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  filter: active ? "drop-shadow(0 0 8px rgba(0, 209, 122, 0.4))" : "none"
                }}
              >
                <path d={item.path} />
              </svg>
              <span
                className="text-[11px] font-medium"
                style={{
                  color: active ? "#00D17A" : "rgba(255, 255, 255, 0.65)"
                }}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  // Desktop Left Rail Navigation
  return (
    <div
      className="pointer-events-none fixed z-[13] w-[210px] left-6 top-[94px]"
      aria-hidden="false"
    >
      <div
        className="pointer-events-auto rounded-[24px] border border-white/10 bg-black/60 backdrop-blur-[24px] p-3"
        style={{
          boxShadow: `0 0 80px rgba(0,0,0,0.25), 0 0 60px ${glow.main}`,
        }}
      >
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="min-w-0">
            <div style={{ ["--ss-ty-nav-label-color" as never]: "rgba(255,255,255,0.55)" }}>
              <NavLabel>Quick nav</NavLabel>
            </div>
            <div className="mt-1 text-[12px] text-white/85 font-medium truncate">StockStory India</div>
          </div>
          {!prefersReducedMotion && (
            <div className="h-2 w-2 rounded-full bg-white/70" style={{ boxShadow: `0 0 22px ${glow.main}` }} />
          )}
        </div>

        <div className="flex flex-col gap-2">
          {navItems.slice(0, 5).map((item) => {
            const active = pageKey === item.page;
            const emphasize = item.id === highlightId;

            const borderColor = active ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.08)";

            return (
              <motion.button
                key={item.id}
                type="button"
                className={[
                  "text-left rounded-[18px] border px-3 py-2 transition w-full",
                  "hover:border-white/15 hover:bg-black/35",
                  active ? "bg-white/[0.05]" : "bg-black/[0.0]",
                ].join(" ")}
                style={{
                  borderColor,
                  boxShadow: active ? `0 0 60px ${glow.main}` : emphasize ? `0 0 40px ${glow.dim}` : "none",
                }}
                onClick={() => {
                  if (item.id === "search") {
                    window.dispatchEvent(new CustomEvent("ss:openSearchOverlay", { detail: { q: "" } }));
                    return;
                  }
                  navigateTo(item.page);
                }}
                whileHover={
                  prefersReducedMotion
                    ? undefined
                    : {
                        y: -2,
                      }
                }
                aria-current={active ? "page" : undefined}
              >
                <NavLabel className="truncate">{item.label}</NavLabel>
                <div className="mt-1 text-[12px] text-white/55 leading-[1.2]">{item.description}</div>
              </motion.button>
            );
          })}
        </div>

        {suggestions.length > 0 && (
          <div className="mt-4">
            <div style={{ ["--ss-ty-nav-label-color" as never]: "rgba(255,255,255,0.45)" }}>
              <NavLabel>Continuity cues</NavLabel>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {suggestions.slice(0, 4).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => openGuidedSearch(s)}
                  className="h-[30px] rounded-full border border-white/10 bg-black/20 px-[12px] ss-ty-nav-label hover:text-white/85 transition ss-focus-outline"
                  style={{
                    boxShadow: `0 0 18px ${glow.dim}`,
                    ["--ss-ty-nav-label-color" as never]: "rgba(255,255,255,0.60)",
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
