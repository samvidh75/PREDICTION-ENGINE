import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion, useTransform } from "framer-motion";
import { useConfidenceEngine, type ConfidenceState } from "./ConfidenceEngine";
import { useMotionController } from "../motion/MotionController";
import { navigateToExplore, navigateToStock } from "../../architecture/navigation/routeCoordinator";

import CommandResultCard from "../commandCentre/universalCommandCentre/CommandResultCard";
import { predictiveDiscoveryArchitecture } from "../../services/search/PredictiveDiscoveryArchitecture";
import { adaptiveSearchMemoryEngine } from "../../services/search/AdaptiveSearchMemoryEngine";
import { universalIntelligenceSearch } from "../../services/discovery/universalIntelligenceSearch";
import { getDiscoveryIndex } from "../../services/discovery/discoveryIndex";
import {
  loadDiscoveryMemory,
  saveDiscoveryMemory,
  updateDiscoveryMemoryWithEntity,
} from "../../services/discovery/discoveryMemory";
import type { DiscoveryMemory, DiscoveryResult } from "../../services/discovery/discoveryTypes";
import { SearchResultType, type SearchMemoryEntry } from "../../types/SearchTypes";

function labelForState(state: ConfidenceState): string {
  switch (state) {
    case "CONFIDENCE_RISING":
      return "Increased Sector Rotation";
    case "STABLE_CONVICTION":
      return "Stable Market Conditions";
    case "NEUTRAL_ENVIRONMENT":
      return "Liquidity Strength Improving";
    case "MOMENTUM_WEAKENING":
      return "Elevated Sector Drift";
    case "ELEVATED_RISK":
      return "Elevated Volatility";
    default:
      return "Market Conditions";
  }
}

function notificationForState(state: ConfidenceState): string {
  switch (state) {
    case "CONFIDENCE_RISING":
      return "Institutional activity reads steadier across large-cap banking exposures.";
    case "STABLE_CONVICTION":
      return "Market health checks remain controlled—signals stay constructive with contained risk intensity.";
    case "NEUTRAL_ENVIRONMENT":
      return "Energy is reorganizing slowly—liquidity and volatility are showing cautious balance.";
    case "MOMENTUM_WEAKENING":
      return "Mid-cycle momentum softens—follow-through becomes selective, not unstable.";
    case "ELEVATED_RISK":
      return "Volatility pressure is widening—risk intensity elevates with tighter interpretive confidence.";
  }
}

function formatKind(kind: DiscoveryResult["kind"]): string {
  return kind.replaceAll("_", " ");
}

function relationshipPreview(tags: string[]): string {
  return tags.slice(0, 2).join(" • ");
}

function mapDiscoveryKindToSearchResultType(kind: DiscoveryResult["kind"]): SearchResultType {
  switch (kind) {
    case "sector":
      return SearchResultType.SECTOR;
    case "theme":
      return SearchResultType.MACRO_THEME;
    case "macro_trend":
      return SearchResultType.MACRO_THEME;
    case "institutional_environment":
      return SearchResultType.INSTITUTIONAL_TREND;
    case "behavioural_condition":
      return SearchResultType.EDUCATIONAL_TOPIC;
    case "market_narrative":
      return SearchResultType.EDUCATIONAL_TOPIC;
    case "stock":
    default:
      return SearchResultType.STOCK;
  }
}

export default function IntelligenceHUD(): JSX.Element {
  const prefersReducedMotion = useReducedMotion();
  const { state, theme, marketState, narrativeKey } = useConfidenceEngine();
  const { scrollProgress, isMobile } = useMotionController();

  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(0);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [memoryTick, setMemoryTick] = useState<number>(0);

  const recentActivity = useMemo<SearchMemoryEntry[]>(
    () => adaptiveSearchMemoryEngine.getRecentSearches(4),
    [memoryTick],
  );

  const frequentActivity = useMemo<SearchMemoryEntry[]>(
    () => adaptiveSearchMemoryEngine.getFrequentSearches(4),
    [memoryTick],
  );

  const footerQuickChips = useMemo<string[]>(() => {
    const seen = new Set<string>();
    const out: string[] = [];

    for (const entry of [...recentActivity, ...frequentActivity]) {
      const q = entry.query.trim();
      if (!q) continue;
      const k = q.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(q);
      if (out.length >= 6) break;
    }

    return out;
  }, [recentActivity, frequentActivity]);

  const [toastOpen, setToastOpen] = useState(false);
  const toastTimeoutRef = useRef<number | null>(null);

  const [discoveryMemory, setDiscoveryMemory] = useState<DiscoveryMemory>(() => loadDiscoveryMemory());
  const [suggestionsVisible, setSuggestionsVisible] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const mobileGestureStartRef = useRef<{ x: number; y: number } | null>(null);
  const handleMobilePointerDown = (e: React.PointerEvent): void => {
    if (!isMobile) return;
    mobileGestureStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMobilePointerUp = (e: React.PointerEvent): void => {
    if (!isMobile) return;
    const start = mobileGestureStartRef.current;
    mobileGestureStartRef.current = null;
    if (!start) return;

    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;

    // Horizontal swipe: keep it strict to avoid fighting taps/vertical scroll.
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    const threshold = 60;

    if (absX < threshold) return;
    if (absX < absY) return;

    const maxIdx = searchResults.length - 1;
    if (maxIdx < 0) return;

    if (dx < 0) {
      // swipe left -> next
      setActiveIndex((prev) => Math.min(maxIdx, prev + 1));
    } else {
      // swipe right -> prev
      setActiveIndex((prev) => Math.max(0, prev - 1));
    }
  };

  const [debugNavHint, setDebugNavHint] = useState<string | null>(null);

  const [isPublicPage, setIsPublicPage] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const params = new URLSearchParams(window.location.search);
    const raw = (params.get("page") ?? "").toLowerCase().trim();
    return raw === "landing" || raw === "about";
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const read = () => {
      const params = new URLSearchParams(window.location.search);
      const raw = (params.get("page") ?? "").toLowerCase().trim();
      setIsPublicPage(raw === "landing" || raw === "about");
    };

    read();
    window.addEventListener("urlchange", read);
    window.addEventListener("popstate", read);

    return () => {
      window.removeEventListener("urlchange", read);
      window.removeEventListener("popstate", read);
    };
  }, []);

  const navHeight = useTransform(scrollProgress, [0, 1], [72, 64]);
  const navOpacity = useTransform(scrollProgress, [0, 1], [0.75, 0.92]);
  const navBlur = useTransform(scrollProgress, [0, 1], ["blur(0px)", "blur(10px)"]);

  const statusPill = useMemo(() => labelForState(state), [state]);

  const searchResults = useMemo<DiscoveryResult[]>(() => {
    const predicted = predictiveDiscoveryArchitecture.generatePredictions(query);

    const tickerSectorByTicker: Record<string, string> = {
      TCS: "IT Services",
      INFY: "IT Services",
      RELIANCE: "Energy & Retail",
      HDFCBANK: "Banking",
      ICICIBANK: "Banking",
      SBIN: "Banking",
      BHARTIARTL: "Telecom",
      ITC: "FMCG",
      HINDUNILVR: "FMCG",
      LT: "Infrastructure",
    };

    const stockPredicted: DiscoveryResult[] = predicted
      .filter((p) => p.type === SearchResultType.STOCK)
      .slice(0, 3)
      .map((p) => ({
        id: `pred_stock_${p.id}`,
        kind: "stock",
        // Spec: show company name prominently, ticker as intelligence identity.
        title: p.subtitle,
        ticker: p.id,
        companyName: p.subtitle,
        sector: tickerSectorByTicker[p.id] ?? undefined,
        miniChartSeed: p.id,
        narrativeSummary: "Predicted interest: educational stock context based on current confidence conditions.",
        confidenceEnvironment: marketState,
        marketContext: "Market context is treated as structure adaptation rather than prediction.",
        relationshipIndicators: ["confidence_context", "structure_first", "pacing_awareness"],
      }));

    const sectorIdByName = new Map<string, { id: string; title: string }>([
      ["banking", { id: "sec_banking", title: "Banking" }],
      ["it", { id: "sec_it", title: "IT" }],
      ["it services", { id: "sec_it", title: "IT" }],
      ["energy", { id: "sec_energy", title: "Energy" }],
      ["fmcg", { id: "sec_fmcg", title: "FMCG" }],
      ["pharmaceuticals", { id: "sec_pharma", title: "Pharma" }],
      ["pharma", { id: "sec_pharma", title: "Pharma" }],
      ["defence", { id: "sec_defence", title: "Defence" }],
      ["defense", { id: "sec_defence", title: "Defence" }],
    ]);

    const sectorPredicted: DiscoveryResult[] = predicted
      .filter((p) => p.type === SearchResultType.SECTOR)
      .slice(0, 3)
      .flatMap((p) => {
        const key = p.title.toLowerCase().trim();
        const mapped = sectorIdByName.get(key);
        if (!mapped) return [];

        const out: DiscoveryResult = {
          id: mapped.id,
          kind: "sector",
          title: mapped.title,
          narrativeSummary: "Predicted sector focus: educational context aligned to current confidence conditions.",
          confidenceEnvironment: marketState,
          marketContext: "Sector context is treated as structural pacing support, not execution guidance.",
          relationshipIndicators: ["confidence_context", "sector_pacing", "liquidity_texture"],
        };

        return [out];
      });

    const discoveryResults = universalIntelligenceSearch({
      query,
      confidenceState: state,
      marketStateLabel: marketState,
      narrativeKey,
      preferredSectors: discoveryMemory.preferredSectors,
      preferredThemes: discoveryMemory.preferredThemes,
    });

    // Predictions first, then discovery, limited to keep overlay calm.
    // Also dedupe by (kind,id) so React keys stay stable.
    const combined = [...stockPredicted, ...sectorPredicted, ...discoveryResults];
    const seen = new Set<string>();
    const unique: DiscoveryResult[] = [];

    for (const r of combined) {
      const k = `${r.kind}_${r.id}`;
      if (seen.has(k)) continue;
      seen.add(k);
      unique.push(r);
    }

    return unique.slice(0, 10);
  }, [
    query,
    state,
    marketState,
    narrativeKey,
    discoveryMemory.preferredSectors,
    discoveryMemory.preferredThemes,
  ]);

  const suggestionChips = useMemo<string[]>(() => {
    const preferred = [...discoveryMemory.preferredSectors, ...discoveryMemory.preferredThemes];

    // Predictive “anticipation system”: surface what the user likely wants before they type.
    const predictions = predictiveDiscoveryArchitecture.generatePredictions(query);
    const predictionTitles = predictions.map((p) => p.title);

    const combined = query.trim().length === 0 ? [...predictionTitles, ...preferred] : [...preferred];

    const seen = new Set<string>();
    const out: string[] = [];
    for (const item of combined) {
      const key = item.trim().toLowerCase();
      if (!key) continue;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(item.trim());
      if (out.length >= 6) break;
    }
    return out;
  }, [discoveryMemory.preferredSectors, discoveryMemory.preferredThemes, query]);

  useEffect(() => {
    if (!searchOpen) return;

    if (isMobile) {
      // Mobile: swipe-driven, don’t progressively reveal multiple cards.
      setVisibleCount(1);
      return;
    }

    const total = Math.min(searchResults.length, 6);

    if (prefersReducedMotion) {
      setVisibleCount(total);
      return;
    }

    setVisibleCount(0);
    const stepMs = 140;

    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setVisibleCount((prev) => Math.max(prev, i));
      if (i >= total) window.clearInterval(id);
    }, stepMs);

    return () => window.clearInterval(id);
  }, [searchOpen, prefersReducedMotion, searchResults, isMobile]);

  // Keep keyboard focus inside the progressively revealed range.
  useEffect(() => {
    if (!searchOpen) return;

    if (isMobile) {
      // Swipe should be able to move beyond visibleCount (we render a single active card).
      if (searchResults.length === 0) {
        if (activeIndex !== 0) setActiveIndex(0);
        return;
      }
      const maxIdx = searchResults.length - 1;
      if (activeIndex > maxIdx) setActiveIndex(Math.max(0, maxIdx));
      return;
    }

    if (visibleCount <= 0) {
      if (activeIndex !== 0) setActiveIndex(0);
      return;
    }
    if (activeIndex >= visibleCount) setActiveIndex(visibleCount - 1);
  }, [searchOpen, visibleCount, activeIndex, isMobile, searchResults]);

  // Elegant loading shell (for perceived intelligence “emergence”).
  useEffect(() => {
    if (!searchOpen) return;
    setIsLoading(true);
    const id = window.setTimeout(() => setIsLoading(false), prefersReducedMotion ? 0 : 160);
    return () => window.clearTimeout(id);
  }, [searchOpen, query, prefersReducedMotion]);

  useEffect(() => {
    // Toast appears softly and automatically; no aggressive UI.
    if (toastOpen) return;

    const id = window.setTimeout(() => {
      setToastOpen(true);
      if (toastTimeoutRef.current) window.clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = window.setTimeout(() => setToastOpen(false), 5200);
    }, 1500);

    return () => window.clearTimeout(id);
  }, [toastOpen]);

  useEffect(() => {
    if (!searchOpen) {
      setSuggestionsVisible(false);
      return;
    }

    if (prefersReducedMotion) {
      setSuggestionsVisible(true);
      return;
    }

    const id = window.setTimeout(() => setSuggestionsVisible(true), 650);
    return () => window.clearTimeout(id);
  }, [searchOpen, prefersReducedMotion]);

  useEffect(() => {
    if (!searchOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSearchOpen(false);
        setQuery("");
        return;
      }

      // Result keyboard navigation (power-user layer)
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        // Avoid stealing browser cursor movement when the input is focused.
        // We still intercept to enable spatial navigation through cards.
        e.preventDefault();

        const maxIdx = isMobile ? Math.max(0, searchResults.length - 1) : Math.max(0, Math.min(visibleCount, searchResults.length) - 1);
        if (maxIdx <= 0 && searchResults.length <= 1) return;

        setActiveIndex((prev) => {
          if (e.key === "ArrowDown") return Math.min(maxIdx, prev + 1);
          return Math.max(0, prev - 1);
        });
        return;
      }

      if (e.key === "Enter") {
        // Select current active result
        const maxIdx = isMobile ? Math.max(0, searchResults.length - 1) : Math.max(0, Math.min(visibleCount, searchResults.length) - 1);
        if (searchResults.length === 0) return;
        if (activeIndex < 0 || activeIndex > maxIdx) return;

        e.preventDefault();
        const r = searchResults[activeIndex];
        if (r) onOpenEntity(r);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [searchOpen, visibleCount, searchResults, activeIndex, isMobile]);

  const pillGlow = state === "ELEVATED_RISK" ? theme.warningGlow : theme.cyanGlow;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);

    const searchParam = params.get("search");
    if (searchParam === "1" || searchParam === "true") {
      const qParam = params.get("q");
      if (typeof qParam === "string" && qParam.trim().length > 0) setQuery(qParam);
      setSearchOpen(true);

      // Clean URL so overlay open doesn't repeatedly re-trigger on refresh/back.
      const url = new URL(window.location.href);
      url.searchParams.delete("search");
      url.searchParams.delete("q");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  // Close the overlay on navigation so it doesn't "stick" across pages.
  useEffect(() => {
    const closeIfOpen = () => {
      setSearchOpen(false);
      setQuery("");
      setSuggestionsVisible(false);
      setVisibleCount(0);
      setDebugNavHint(null);
    };

    window.addEventListener("urlchange", closeIfOpen);
    window.addEventListener("popstate", closeIfOpen);

    return () => {
      window.removeEventListener("urlchange", closeIfOpen);
      window.removeEventListener("popstate", closeIfOpen);
    };
  }, []);

  // Global command shortcuts (desktop):
  // - Ctrl+K opens search
  // - "/" opens search (only when not typing into an input/textarea/contenteditable)
  useEffect(() => {
    const isTypingContext = (): boolean => {
      if (typeof document === "undefined") return false;
      const el = document.activeElement as HTMLElement | null;
      if (!el) return false;

      const tag = (el.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return true;
      if (el.isContentEditable) return true;

      // If the element is a button or link, allow shortcut handling.
      return false;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      if (searchOpen) return;
      if (isTypingContext()) return;

      const key = e.key;
      if ((e.ctrlKey || e.metaKey) && (key === "k" || key === "K")) {
        e.preventDefault();
        setSearchOpen(true);
        window.setTimeout(() => inputRef.current?.focus(), 0);
        return;
      }

      if (key === "/") {
        e.preventDefault();
        setSearchOpen(true);
        window.setTimeout(() => inputRef.current?.focus(), 0);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [searchOpen]);

  const onOpenEntity = (r: DiscoveryResult): void => {
    setDebugNavHint(`${r.kind} • ${r.title}`);

    const index = getDiscoveryIndex();
    const entity = index.find((x) => x.id === r.id && x.kind === r.kind);

    if (entity) {
      const next = updateDiscoveryMemoryWithEntity(discoveryMemory, entity);
      setDiscoveryMemory(next);
      saveDiscoveryMemory(next);
    }

    // Search OS continuity:
    // - add to personal continuity memory
    // - feed predictive “recent exploration” continuity
    const mappedType = mapDiscoveryKindToSearchResultType(r.kind);
    adaptiveSearchMemoryEngine.addToMemory(r.title, mappedType);
    predictiveDiscoveryArchitecture.addToRecentSearches(r.title);
    setMemoryTick((t) => t + 1);

    if (r.kind === "stock") {
      const parsedTicker =
        r.ticker ??
        (r.title.length > 0 && r.title.length <= 6 && r.title === r.title.toUpperCase() && /^[A-Z0-9.\-]+$/.test(r.title)
          ? r.title
          : "");

      if (parsedTicker) {
        navigateToStock({ mode: "hard", ticker: parsedTicker, preserveParamKeys: ["skipOnboarding"] });
        return;
      }
    }

    navigateToExplore(r.kind, r.id, { mode: "hard", preserveParamKeys: ["skipOnboarding"] });
  };

  return (
    <div className="absolute inset-0 z-[10]" style={{ opacity: 0.95 }}>
      {/* Top Navigation */}
      {!isPublicPage && (
        <motion.div
          style={{
            height: navHeight,
            opacity: navOpacity,
            backdropFilter: navBlur,
          }}
          className="pointer-events-auto fixed left-0 right-0 top-0 z-[12]"
        >
          <div
            className="mx-auto w-full max-w-[1680px] px-6 sm:px-[72px] flex items-center justify-between"
            style={{
              background: "linear-gradient(180deg, rgba(2,3,4,0.75) 0%, rgba(2,3,4,0.00) 100%)",
            }}
          >
          {/* Left: brand */}
          <div className="flex items-center gap-3">
            <div className="text-[12px] uppercase tracking-[0.22em] text-white/80">StockStory India</div>
          </div>

          {/* Center: market state pill */}
          <div className="flex-1 flex justify-center">
            <div
              className="flex items-center justify-center rounded-full"
              style={{
                height: 32,
                padding: "0 14px",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.06)",
                boxShadow: `0 0 18px ${pillGlow}`,
              }}
            >
              <div className="text-[10px] uppercase tracking-[0.18em] text-white/75">{statusPill}</div>
            </div>
          </div>

          {/* Right controls + micro indicator */}
          <div className="flex items-center gap-6">
            <div className="hidden lg:flex items-center gap-3">
              <div className="relative h-2 w-2">
                <motion.span
                  className="absolute inset-0 rounded-full bg-white/70"
                  animate={
                    prefersReducedMotion
                      ? undefined
                      : {
                          opacity: [0.45, 0.85, 0.45],
                          scale: [0.9, 1.15, 0.9],
                        }
                  }
                  transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                />
              </div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/55">Market Intelligence Active</div>
            </div>

            {/* Buttons */}
            <button
              type="button"
              className="text-[11px] uppercase tracking-[0.18em] text-white/65 hover:text-white/85 transition"
              onClick={() => setSearchOpen(true)}
              aria-label="Search"
            >
              Search
            </button>
            <button
              type="button"
              className="text-[11px] uppercase tracking-[0.18em] text-white/65 hover:text-white/85 transition"
              onClick={() => setToastOpen(true)}
              aria-label="Notifications"
            >
              Intel
            </button>
            <button
              type="button"
              className="text-[11px] uppercase tracking-[0.18em] text-white/65 hover:text-white/85 transition"
              aria-label="Profile"
            >
              Profile
            </button>
          </div>
          </div>
        </motion.div>
      )}

      {/* Toast (institutional / premium) */}
      <AnimatePresence>
        {toastOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: 6, filter: "blur(6px)" }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-none absolute right-6 top-[90px] z-[14]"
            style={{
              width: 340,
              background: "rgba(12,14,18,0.58)",
              border: "1px solid rgba(255,255,255,0.06)",
              backdropFilter: "blur(24px)",
              borderRadius: 24,
              padding: 16,
              boxShadow: "0 0 40px rgba(0,0,0,0.35)",
            }}
            aria-hidden="true"
          >
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/60">Institutional Intelligence</div>
            <div className="mt-2 text-[14px] leading-[1.6] text-white/85">{notificationForState(state)}</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search overlay scaffolding */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            className="fixed inset-0 z-[20] pointer-events-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="absolute inset-0 pointer-events-none" style={{ background: "rgba(0,0,0,0.60)" }} />
            <div className="absolute inset-0 pointer-events-none backdrop-blur-[14px]" />

            <div className={isMobile ? "relative h-full flex items-start justify-center pt-0 px-0" : "relative h-full flex items-start justify-center pt-[96px] px-6"}>
              <motion.div
                initial={{ opacity: 0, y: 10, filter: "blur(10px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: 10, filter: "blur(10px)" }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                onPointerDown={isMobile ? handleMobilePointerDown : undefined}
                onPointerUp={isMobile ? handleMobilePointerUp : undefined}
                style={{
                  width: isMobile ? "100%" : "min(960px, 100%)",
                  borderRadius: isMobile ? 0 : 24,
                  background: "rgba(2,3,4,0.88)",
                  border: isMobile ? "none" : "1px solid rgba(255,255,255,0.06)",
                  boxShadow: isMobile ? "none" : "0 0 60px rgba(0,0,0,0.55)",
                }}
              >
                <div className="p-4 sm:p-6">
                  {/* Header row */}
                  <div className="flex items-center gap-3">
                    <div
                      className="h-8 w-8 rounded-full"
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.06)",
                      }}
                    />
                    <div className="text-[12px] uppercase tracking-[0.18em] text-white/70">Universal Intelligence Search</div>
                  </div>

                  {/* Search input */}
                  <div className="mt-5">
                    <motion.input
                      ref={inputRef}
                      autoFocus
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Explore market intelligence…"
                      className="w-full outline-none"
                      style={{
                        height: 72,
                        borderRadius: 24,
                        paddingLeft: 24,
                        paddingRight: 24,
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.05)",
                        color: "rgba(255,255,255,0.92)",
                        fontSize: 22,
                        letterSpacing: "-0.01em",
                      }}
                    />
                  </div>

                  <AnimatePresence>
                    {query.trim().length === 0 && suggestionsVisible && suggestionChips.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 6, filter: "blur(10px)" }}
                        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                        exit={{ opacity: 0, y: 6, filter: "blur(10px)" }}
                        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                        className="mt-3"
                      >
                        <div className="flex flex-wrap gap-2">
                          {suggestionChips.map((chip, idx) => (
                            <motion.button
                              key={`${chip}_${idx}`}
                              type="button"
                              onClick={() => {
                                setQuery(chip);
                                inputRef.current?.focus();
                              }}
                              className="h-[34px] rounded-full border border-white/10 bg-black/20 px-[14px] text-[11px] uppercase tracking-[0.18em] text-white/60 hover:text-white/85 transition"
                              whileHover={
                                prefersReducedMotion
                                  ? undefined
                                  : {
                                      translateY: -2,
                                      boxShadow: `0 0 0 1px rgba(255,255,255,0.06), 0 0 22px ${theme.cyanGlow}`,
                                    }
                              }
                            >
                              {chip}
                            </motion.button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Subheader + empty state */}
                  <div className="mt-4">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-white/45">
                      Exploring market intelligence…
                    </div>

                    {debugNavHint && (
                      <div className="mt-3 rounded-[16px] border border-white/10 bg-black/20 px-4 py-3 text-[13px] text-white/85">
                        Navigating to explore: {debugNavHint}
                      </div>
                    )}

                    <AnimatePresence mode="popLayout">
                      {isLoading ? (
                        <div className="mt-3 space-y-2">
                          {[0, 1, 2].map((idx) => (
                            <div
                              key={idx}
                              className="h-[132px] rounded-[16px] border border-white/10 bg-white/5 animate-pulse"
                              aria-hidden="true"
                            />
                          ))}
                        </div>
                      ) : searchResults.length === 0 ? (
                        <div className="mt-3 rounded-[16px] border border-white/10 bg-black/25 px-4 py-3 text-[13px] text-white/80">
                          No matching intelligence environments detected. Try a prediction chip above or select a recent activity below.
                        </div>
                      ) : (
                        <div className="mt-3 space-y-2">
                          {(isMobile
                            ? (searchResults[activeIndex] ? [searchResults[activeIndex]] : [])
                            : searchResults.slice(0, visibleCount)
                          ).map((r, i) => {
                            const isActive = isMobile ? true : i === activeIndex;
                            return (
                              <CommandResultCard
                                key={`${r.kind}_${r.id}`}
                                result={r}
                                state={state}
                                theme={theme}
                                narrativeKey={narrativeKey}
                                isActive={isActive}
                                delaySeconds={i * 0.03}
                                onOpenEntity={onOpenEntity}
                              />
                            );
                          })}
                        </div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Footer: recent + quick shortcuts (search-native continuity) */}
                <div className="px-4 sm:px-6 pt-4 pb-2">
                  <div className="flex items-center justify-between gap-4">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-white/45">Recent activity</div>
                    <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">
                      quick continuity
                    </div>
                  </div>

                  {footerQuickChips.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {footerQuickChips.map((chip) => (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => {
                            setQuery(chip);
                            setActiveIndex(0);
                            inputRef.current?.focus();
                          }}
                          className="h-[34px] rounded-full border border-white/10 bg-black/20 px-[14px] text-[11px] uppercase tracking-[0.18em] text-white/60 hover:text-white/85 transition"
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-2 text-[12px] text-white/45">
                      Explore any intelligence entry to support your editorial continuity.
                    </div>
                  )}
                </div>

                <div className="p-4 sm:p-6 pt-0 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setSearchOpen(false);
                      setQuery("");

                      const url = new URL(window.location.href);
                      url.searchParams.delete("search");
                      url.searchParams.delete("q");
                      window.history.replaceState({}, "", url.toString());
                    }}
                    className="text-[11px] uppercase tracking-[0.18em] text-white/65 hover:text-white/85 transition"
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
