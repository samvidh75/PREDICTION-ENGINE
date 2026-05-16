import React, { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useConfidenceEngine, type ConfidenceState } from "../intelligence/ConfidenceEngine";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { loadDiscoveryMemory } from "../../services/discovery/discoveryMemory";
import { getDiscoveryIndex } from "../../services/discovery/discoveryIndex";
import type { DiscoveryEntityKind } from "../../services/discovery/discoveryTypes";
import { navigate, navigateToExplore, navigateToStock, type PageKey } from "../../architecture/navigation/routeCoordinator";

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

export default function IntelligenceNavigationRail(): JSX.Element {
  const prefersReducedMotion = useReducedMotion();
  const isMobile = useMediaQuery("(max-width: 639px)");

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
        description: "Market health & telemetry synthesis",
      },
      {
        id: "explore",
        label: "Intelligence Hub",
        page: "explore",
        description: "Curated discovery environments",
      },
      {
        id: "practice",
        label: "Practice Terminal",
        page: "practice",
        description: "Simulated portfolio intelligence lessons",
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
        id: "community",
        label: "Community Intelligence",
        page: "community",
        description: "Collective learning context",
      },
      {
        id: "macro",
        label: "Macro Environment",
        page: "dashboard",
        description: "Calibration under shifting market texture",
      },
      {
        id: "assistant",
        label: "AI Assistant",
        page: "assistant",
        description: "Educational guidance & reflection framing",
      },
      {
        id: "portfolio",
        label: "Portfolio Intelligence",
        page: "practice",
        description: "Exposure-aware learning pacing",
      },
      {
        id: "health",
        label: "Healthometer Labs",
        page: "company",
        description: "Resilience-first corporate health rendering",
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
    // We rely on IntelligenceHUD's mount-time URL param parsing:
    // ?search=1&q=... opens the overlay.
    navigateToStock({ openSearchQ: q, mode: "hard" });
  };

  const railWidthClass = isMobile ? "w-[100%]" : "w-[210px]";
  const railPosClass = isMobile ? "left-0 right-0 bottom-0 top-auto" : "left-6 top-[94px] bottom-auto";

  return (
    <div
      className={[
        "pointer-events-none fixed z-[13]",
        railWidthClass,
        railPosClass,
        isMobile ? "px-4 py-4" : "",
      ].join(" ")}
      aria-hidden="false"
    >
      {/* Rail container */}
      <div
        className={[
          "pointer-events-auto rounded-[24px] border border-white/10 bg-black/30 backdrop-blur-[24px] shadow-[0_0_60px_rgba(0,0,0,0.30)]",
          isMobile ? "px-3 py-3" : "p-3",
        ].join(" ")}
        style={{
          boxShadow: `0 0 80px rgba(0,0,0,0.25), 0 0 60px ${glow.main}`,
        }}
      >
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/55">Navigation Rail</div>
            <div className="mt-1 text-[12px] text-white/85 font-medium truncate">Intelligence routing</div>
          </div>
          {!prefersReducedMotion && (
            <div className="h-2 w-2 rounded-full bg-white/70" style={{ boxShadow: `0 0 22px ${glow.main}` }} />
          )}
        </div>

        {/* Nav items */}
        <div className={isMobile ? "flex gap-2 overflow-x-auto pb-1" : "flex flex-col gap-2"}>
          {navItems.slice(0, isMobile ? 6 : 10).map((item) => {
            const active = pageKey === item.page;
            const emphasize = item.id === highlightId;

            const mainGlow = emphasize ? glow.main : "rgba(255,255,255,0.0)";
            const borderColor = active ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.08)";

            return (
              <motion.button
                key={item.id}
                type="button"
                onClick={() => navigateTo(item.page)}
                className={[
                  "text-left rounded-[18px] border px-3 py-2 transition",
                  "hover:border-white/15 hover:bg-black/35",
                  active ? "bg-white/[0.05]" : "bg-black/[0.0]",
                ].join(" ")}
                style={{
                  borderColor,
                  boxShadow: active ? `0 0 60px ${glow.main}` : emphasize ? `0 0 40px ${glow.dim}` : "none",
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
                <div className="text-[11px] uppercase tracking-[0.18em] text-white/75 truncate">
                  {item.label}
                </div>
                {!isMobile && (
                  <div className="mt-1 text-[12px] text-white/55 leading-[1.2]">{item.description}</div>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Suggestions: calm exploration continuity */}
        {suggestions.length > 0 && !isMobile && (
          <div className="mt-4">
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/45">Continuity cues</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {suggestions.slice(0, 4).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => openGuidedSearch(s)}
                  className="h-[30px] rounded-full border border-white/10 bg-black/20 px-[12px] text-[11px] uppercase tracking-[0.18em] text-white/60 hover:text-white/85 transition"
                  style={{
                    boxShadow: `0 0 18px ${glow.dim}`,
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
