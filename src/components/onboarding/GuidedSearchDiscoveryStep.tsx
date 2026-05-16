import React, { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { universalIntelligenceSearch } from "../../services/discovery/universalIntelligenceSearch";
import type { ConfidenceState } from "../../components/intelligence/ConfidenceEngine";
import type { DiscoveryResult } from "../../services/discovery/discoveryTypes";
import { getDiscoveryIndex } from "../../services/discovery/discoveryIndex";
import { loadDiscoveryMemory, saveDiscoveryMemory, updateDiscoveryMemoryWithEntity } from "../../services/discovery/discoveryMemory";

type Props = {
  confidenceState: ConfidenceState;
  marketStateLabel: string;
  narrativeKey: number;
  preferredSectors?: string[];
  preferredThemes?: string[];
  onContinue: (selected: DiscoveryResult) => void;
};

function pickLabel(r: DiscoveryResult): string {
  if (r.kind === "sector" || r.kind === "theme") return r.title;
  return r.title;
}

export default function GuidedSearchDiscoveryStep({
  confidenceState,
  marketStateLabel,
  narrativeKey,
  preferredSectors,
  preferredThemes,
  onContinue,
}: Props): JSX.Element {
  const prefersReducedMotion = useReducedMotion();

  const [query, setQuery] = useState<string>("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [continuing, setContinuing] = useState(false);

  const results = useMemo<DiscoveryResult[]>(() => {
    return universalIntelligenceSearch({
      query,
      confidenceState,
      marketStateLabel,
      narrativeKey,
      preferredSectors,
      preferredThemes,
    }).slice(0, 4);
  }, [query, confidenceState, marketStateLabel, narrativeKey, preferredSectors, preferredThemes]);

  const selected = useMemo(() => results.find((r) => r.id === selectedId) ?? null, [results, selectedId]);
  const canContinue = selected !== null && !continuing;

  // Auto-advance: avoid unreliable "Continue" button click hit-testing by handling selection changes.
  useEffect(() => {
    if (!selected) return;
    if (continuing) return;

    // Immediate state flip so the UI proves the effect fired.
    setContinuing(true);

    const r = selected;
    const t = window.setTimeout(() => {
      // eslint-disable-next-line no-console
      console.log("[onboarding-guided-search] auto-advance fired", { selectedId: r.id, kind: r.kind, title: r.title });

      const index = getDiscoveryIndex();
      const entity = index.find((e) => e.id === r.id && e.kind === r.kind);
      if (entity) {
        const prev = loadDiscoveryMemory();
        const next = updateDiscoveryMemoryWithEntity(prev, entity);
        saveDiscoveryMemory(next);
      }

      onContinue(r);
    }, 0);

    return () => window.clearTimeout(t);
  }, [selected, continuing, onContinue]);

  const continueWithSelection = (): void => {
    if (!selected) return;
    if (continuing) return;

    setContinuing(true);

    // eslint-disable-next-line no-console
    console.log("[onboarding-guided-search] Continue clicked", {
      selectedId: selected.id,
      selectedKind: selected.kind,
      selectedTitle: selected.title,
    });

    const index = getDiscoveryIndex();
    const entity = index.find((e) => e.id === selected.id && e.kind === selected.kind);
    if (entity) {
      const prev = loadDiscoveryMemory();
      const next = updateDiscoveryMemoryWithEntity(prev, entity);
      saveDiscoveryMemory(next);
    }

    onContinue(selected);
  };

  return (
    <div className="w-full relative z-[90] pointer-events-auto">
      <motion.div
        initial={{ opacity: 0, y: 10, filter: "blur(10px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        exit={{ opacity: 0, y: -6, filter: "blur(10px)" }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] as const }}
        className="w-full"
      >
        <div className="text-[28px] font-semibold leading-[1.2] tracking-[-0.02em]">Guided search discovery</div>
        <div className="mt-3 max-w-[760px] text-[15px] leading-[1.8] text-white/85">
          Search is the heart of StockStory India. Start with a calm curiosity—select one result to continue.
        </div>

        <div className="mt-8">
          <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">Your search lens</div>
          <div className="mt-3">
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedId(null);
              }}
              placeholder="Try: volatility, institutional, sector rotation…"
              className="w-full h-[58px] rounded-[18px] bg-white/3 border border-white/5 px-4 text-white/90 outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/30"
            />
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {results.map((r) => {
            const active = r.id === selectedId;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => setSelectedId(r.id)}
                className={[
                  "text-left rounded-[22px] border bg-black/20 backdrop-blur-2xl p-5 transition",
                  active ? "border-white/18" : "border-white/10 hover:border-white/16",
                ].join(" ")}
                aria-pressed={active}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[12px] uppercase tracking-[0.18em] text-white/60">{r.kind}</div>
                    <div className="mt-2 text-[16px] font-semibold text-white/92 whitespace-nowrap overflow-hidden text-ellipsis">
                      {pickLabel(r)}
                    </div>
                  </div>

                  {!prefersReducedMotion && active && (
                    <motion.span
                      className="mt-1 h-[10px] w-[10px] rounded-full"
                      style={{ background: "rgba(0,255,210,0.92)", boxShadow: "0 0 18px rgba(0,255,210,0.22)" }}
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 1.2, repeat: Infinity, ease: [0.22, 1, 0.36, 1] }}
                    />
                  )}
                </div>

                <div className="mt-3 text-[13px] leading-[1.7] text-white/80">{r.narrativeSummary}</div>

                <div className="mt-4 text-[10px] uppercase tracking-[0.18em] text-white/45">
                  {active ? "Selected • keep it calm" : "Select to continue"}
                </div>
              </button>
            );
          })}
        </div>

        {selected && (
          <motion.div
            key={selected.id}
            initial={{ opacity: 0, y: 8, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -6, filter: "blur(8px)" }}
            transition={{ duration: 0.3 }}
            className="mt-6 rounded-[22px] border border-white/10 bg-black/25 p-5"
          >
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">Guidance note</div>
            <div className="mt-2 text-[14px] leading-[1.8] text-white/85">
              We’ll seed your environment around this selection. Your result stays educational—no trade execution framing.
            </div>
          </motion.div>
        )}

        <div className="mt-8 flex items-center gap-4 relative z-[100] pointer-events-auto">
          <button
            type="button"
            className="h-[56px] px-[28px] rounded-[18px] border border-white/10 bg-black/25 text-white/65 transition opacity-50 cursor-not-allowed"
            aria-disabled="true"
            disabled
          >
            Back
          </button>

          <motion.button
            type="button"
            onClick={() => {
              if (!canContinue) return;
              continueWithSelection();
            }}
            aria-disabled={!canContinue}
            whileHover={!prefersReducedMotion && canContinue ? { translateY: -2 } : undefined}
            className={[
              "h-[56px] px-[28px] rounded-[18px] border border-white/10 bg-black/25 transition",
              canContinue ? "text-white/90 hover:text-white/95" : "opacity-50 cursor-not-allowed",
            ].join(" ")}
          >
            {continuing ? "Continuing…" : "Continue"}
          </motion.button>
        </div>

        <div className="mt-4 text-[11px] uppercase tracking-[0.18em] text-white/45">
          Beginner-first futurism • fewer overlays • calm educational context
        </div>
      </motion.div>
    </div>
  );
}
