import React, { memo } from "react";
import type { NewsEvent } from "../../services/news/newsStoryTypes";
import type { ConfidenceTheme } from "../intelligence/ConfidenceEngine";
import SSPill from "../ui/SSPill";

function glowFor(confidenceTone: NewsEvent["confidenceTone"], theme: ConfidenceTheme): string {
  switch (confidenceTone) {
    case "ELEVATED_RISK":
      return theme.warningGlow;
    case "MOMENTUM_WEAKENING":
      return theme.magentaGlow;
    case "CONFIDENCE_RISING":
      return theme.cyanGlow;
    case "NEUTRAL_ENVIRONMENT":
    case "STABLE_CONVICTION":
    default:
      return theme.deepBlueGlow;
  }
}

function trimList(items: string[], cap: number): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const v of items) {
    const t = v.trim();
    if (!t) continue;
    const k = t.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
    if (out.length >= cap) break;
  }
  return out;
}

type Props = {
  event: NewsEvent;
  theme: ConfidenceTheme;
  beginner: boolean;
  isMobile: boolean;

  /**
   * Optional connection layer: if provided, "related company" chips become navigable.
   */
  onOpenCompany?: (ticker: string) => void;
};

export const NewsEventCard = memo(function NewsEventCard({
  event,
  theme,
  beginner,
  isMobile,
  onOpenCompany,
}: Props): JSX.Element {
  const glow = glowFor(event.confidenceTone, theme);

  const sectors = trimList(event.affectedSectors ?? [], beginner ? 1 : 2);
  const companies = trimList(event.relatedCompanies ?? [], beginner ? 1 : 2);

  return (
    <article
      className={[
        "rounded-[24px] border border-white/10 bg-black/25 p-6 shadow-[0_0_40px_rgba(0,0,0,0.35)]",
        isMobile ? "p-5" : "",
      ].join(" ")}
      style={{ boxShadow: `0 0 60px ${glow}` }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[12px] uppercase tracking-[0.18em] text-white/60">{event.kind.replaceAll("_", " ")}</div>
          <div className="mt-2 text-[18px] font-semibold leading-[1.4] text-white/92">{event.title}</div>
        </div>

        <div
          className="h-[10px] w-[10px] rounded-full shrink-0 mt-2"
          style={{ background: glow, boxShadow: `0 0 18px ${glow}` }}
          aria-hidden="true"
        />
      </div>

      <div className="mt-4 text-[15px] leading-[1.9] text-white/85">{event.summary}</div>

      <div className="mt-4 rounded-[20px] border border-white/10 bg-black/20 p-4">
        <div className="text-[10px] uppercase tracking-[0.18em] text-white/55">Why it matters (educational)</div>
        <div className="mt-2 text-[13px] leading-[1.7] text-white/80">{event.impactExplanation}</div>
      </div>

      {(sectors.length > 0 || companies.length > 0) && (
        <div className="mt-4 flex flex-wrap gap-2">
          {sectors.map((s) => (
            <SSPill key={`sec_${s}`}>{s}</SSPill>
          ))}

          {companies.map((c) =>
            onOpenCompany ? (
              <button
                key={`cmp_${c}`}
                type="button"
                onClick={() => onOpenCompany(c)}
                className={[
                  "inline-flex items-center justify-center rounded-full border px-3 py-2 text-[11px] uppercase tracking-[0.18em] ss-focus-outline",
                  "border-white/10 bg-black/30 text-white/70",
                  "hover:text-white/92 hover:border-white/16 transition",
                ].join(" ")}
                aria-label={`Open company: ${c}`}
              >
                {c}
              </button>
            ) : (
              <SSPill key={`cmp_${c}`}>{c}</SSPill>
            ),
          )}
        </div>
      )}

      {event.historicalParallels?.length ? (
        <div className="mt-4 text-[12px] leading-[1.8] text-white/75">
          <span className="text-white/90 font-semibold">Historical parallels:</span>{" "}
          {trimList(event.historicalParallels, beginner ? 1 : 2).join(" • ")}
        </div>
      ) : null}

      <div className="mt-5 text-[11px] uppercase tracking-[0.18em] text-white/45">Learning lens</div>
    </article>
  );
});
