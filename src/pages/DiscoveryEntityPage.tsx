import React, { useMemo } from "react";
import { useConfidenceEngine, type ConfidenceState } from "../components/intelligence/ConfidenceEngine";
import type { DiscoveryEntity, DiscoveryEntityKind } from "../services/discovery/discoveryTypes";
import { getDiscoveryIndex } from "../services/discovery/discoveryIndex";

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function kindLabel(kind: DiscoveryEntityKind): string {
  switch (kind) {
    case "sector":
      return "Sector";
    case "theme":
      return "Theme";
    case "market_narrative":
      return "Market narrative";
    case "institutional_environment":
      return "Institutional environment";
    case "behavioural_condition":
      return "Behavioural condition";
    case "macro_trend":
      return "Macro trend";
    case "stock":
    default:
      return "Intelligence";
  }
}

function confidenceLabel(state: ConfidenceState): string {
  switch (state) {
    case "CONFIDENCE_RISING":
      return "Confidence Rising";
    case "STABLE_CONVICTION":
      return "Stable Conviction";
    case "NEUTRAL_ENVIRONMENT":
      return "Balanced Environment";
    case "MOMENTUM_WEAKENING":
      return "Momentum Weakening";
    case "ELEVATED_RISK":
      return "Elevated Risk";
  }
}

function buildHints(entity: DiscoveryEntity): Array<{ title: string; body: string }> {
  const d = entity.details;
  const hints: Array<{ title: string; body: string }> = [];

  if (d?.executiveNarrative) {
    hints.push({ title: "Executive narrative", body: d.executiveNarrative });
  }

  if (d?.confidenceEnvironmentHint) {
    hints.push({ title: "Confidence environment framing", body: d.confidenceEnvironmentHint });
  }

  if (d?.marketContextHint) {
    hints.push({ title: "Market context (educational)", body: d.marketContextHint });
  }

  if (d?.volatilityHint) {
    hints.push({ title: "Volatility conditioning", body: d.volatilityHint });
  }

  if (d?.liquidityHint) {
    hints.push({ title: "Liquidity texture", body: d.liquidityHint });
  }

  if (d?.institutionalHint) {
    hints.push({ title: "Institutional posture", body: d.institutionalHint });
  }

  if (d?.behaviouralHint) {
    hints.push({ title: "Behavioural learning cue", body: d.behaviouralHint });
  }

  return hints;
}

function formatTag(tag: string): string {
  return tag
    .replaceAll("_", " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

export default function DiscoveryEntityPage(): JSX.Element {
  const { state, theme, marketState } = useConfidenceEngine();

  const { kind, id } = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const nextKind = (params.get("kind") ?? "").trim();
    const nextId = (params.get("id") ?? "").trim();
    return { kind: nextKind, id: nextId };
  }, []);

  const entity = useMemo(() => {
    if (!kind || !id) return null;
    const index = getDiscoveryIndex();
    const found = index.find((e) => e.id === id && e.kind === kind);
    return found ?? null;
  }, [kind, id]);

  const relatedSectors = useMemo(() => {
    if (!entity?.details?.relatedSectors?.length) return [];
    return entity.details.relatedSectors;
  }, [entity?.details?.relatedSectors]);

  const hints = useMemo(() => {
    if (!entity) return [];
    return buildHints(entity);
  }, [entity]);

  const relationshipTags = useMemo(() => {
    if (!entity) return [];
    return entity.relationshipTags.slice(0, clamp(entity.relationshipTags.length, 0, 8)).map(formatTag);
  }, [entity]);

  const onBack = () => {
    const next = "?page=stock";
    window.history.pushState({}, "", next);
    window.dispatchEvent(new Event("urlchange"));
  };

  if (!entity) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-[#020304]">
        <div className="absolute inset-0 z-0" />
        <div className="relative z-[10] px-[20px] sm:px-[72px] pt-[96px] pb-[80px]">
          <div className="mx-auto max-w-[1160px]">
            <div className="rounded-[28px] border border-white/10 bg-black/25 backdrop-blur-2xl p-6 shadow-[0_0_40px_rgba(0,0,0,0.35)]">
              <div className="text-[12px] uppercase tracking-[0.18em] text-white/70">Discovery environment</div>
              <div className="mt-3 text-[32px] font-semibold text-white/92">No matching intelligence environments detected.</div>
              <div className="mt-4 text-[15px] leading-[1.9] text-white/80">
                The exploration link doesn’t match an available intelligence entry. If you were expecting a specific topic, open the search overlay and
                try a fresh query.
              </div>

              <div className="mt-6 flex items-center gap-3">
                <button
                  type="button"
                  onClick={onBack}
                  className="h-[42px] px-[18px] rounded-[18px] border border-white/10 bg-black/25 text-white/85 hover:text-white/95 transition"
                >
                  Back to Market Intelligence
                </button>

                <div
                  className="h-[32px] rounded-full px-[14px] flex items-center"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    boxShadow: `0 0 18px ${theme.cyanGlow}`,
                  }}
                >
                  <div className="text-[10px] uppercase tracking-[0.18em] text-white/75">{confidenceLabel(state)}</div>
                </div>
              </div>

              <div className="mt-6 text-[11px] uppercase tracking-[0.18em] text-white/45">
                Educational intelligence only • no certainty claims • no trade execution
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const kindTitle = kindLabel(entity.kind);
  const tags = relationshipTags;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#020304]">
      <div className="absolute inset-0 z-0" />
      <div className="relative z-[10] px-[20px] sm:px-[72px] pt-[96px] pb-[80px]">
        <div className="mx-auto max-w-[1160px]">
          {/* Hero */}
          <div className="rounded-[28px] border border-white/10 bg-black/25 backdrop-blur-2xl p-6 shadow-[0_0_40px_rgba(0,0,0,0.35)]">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
              <div className="flex-1">
                <div className="text-[12px] uppercase tracking-[0.18em] text-white/70">
                  {kindTitle} • {confidenceLabel(state)}
                </div>
                <div className="mt-3 text-[36px] font-semibold leading-[1.08] tracking-[-0.03em] text-white/92">{entity.title}</div>
                <div className="mt-4 text-[15px] leading-[1.9] text-white/85 max-w-[68ch]">{entity.shortNarrative}</div>

                {tags.length > 0 && (
                  <div className="mt-6 flex flex-wrap gap-2">
                    {tags.map((t) => (
                      <span key={t} className="h-[28px] px-[12px] rounded-full border border-white/10 bg-black/20 text-[11px] uppercase tracking-[0.18em] text-white/60">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="md:w-[340px]">
                <div
                  className="rounded-[24px] border border-white/10 bg-black/40 backdrop-blur-[24px] p-5"
                  style={{ boxShadow: `0 0 60px rgba(0,0,0,0.35), 0 0 120px ${theme.cyanGlow}` }}
                >
                  <div className="text-[12px] uppercase tracking-[0.18em] text-white/70">Market environment</div>
                  <div className="mt-3 text-[20px] font-semibold text-white/92">{marketState}</div>

                  <div className="mt-4 space-y-2 text-[13px] leading-[1.7] text-white/80">
                    <div>
                      Confidence framing is active: <span style={{ color: "rgba(255,255,255,0.94)" }}>{confidenceLabel(state)}</span>
                    </div>
                    <div>Exploration stays educational and probabilistic.</div>
                  </div>

                  <div className="mt-5 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={onBack}
                      className="h-[42px] flex-1 rounded-[18px] border border-white/10 bg-black/25 text-white/85 hover:text-white/95 transition"
                    >
                      Return
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {relatedSectors.length > 0 && (
              <div className="mt-6 border-t border-white/10 pt-6">
                <div className="text-[12px] uppercase tracking-[0.18em] text-white/60">Related sectors</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {relatedSectors.slice(0, 7).map((s) => (
                    <span
                      key={s}
                      className="h-[30px] px-[14px] rounded-[999px] border border-white/10 bg-black/20 text-[12px] text-white/80"
                      title="Educational relationship (not an execution cue)"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Details grid */}
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            {hints.length > 0 ? (
              hints.map((h) => (
                <div key={h.title} className="rounded-[28px] border border-white/10 bg-black/25 backdrop-blur-2xl p-6 shadow-[0_0_40px_rgba(0,0,0,0.35)]">
                  <div className="text-[12px] uppercase tracking-[0.18em] text-white/60">{h.title}</div>
                  <div className="mt-3 text-[14px] leading-[1.9] text-white/85">{h.body}</div>
                </div>
              ))
            ) : (
              <div className="rounded-[28px] border border-white/10 bg-black/25 backdrop-blur-2xl p-6 shadow-[0_0_40px_rgba(0,0,0,0.35)] lg:col-span-2">
                <div className="text-[12px] uppercase tracking-[0.18em] text-white/60">Exploration note</div>
                <div className="mt-3 text-[14px] leading-[1.9] text-white/85">
                  This intelligence entry is available, but its detailed hints are currently minimal. Try another topic from the search overlay to explore deeper
                  framing cues.
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 text-[12px] uppercase tracking-[0.18em] text-white/45">
            Educational market intelligence only • No trade execution • No guaranteed returns
          </div>
        </div>
      </div>
    </div>
  );
}
