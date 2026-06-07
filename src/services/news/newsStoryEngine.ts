import type { BuiltNewsStory, BuildNewsStoryInputs, NewsEducationalPanel, NewsEvent } from "./newsStoryTypes";
import type { NewsEventKind, NewsStoryLayerId } from "./newsStoryTypes";
import type { CompanyUniverseModel } from "../../types/CompanyUniverse";
import { applyComplianceCopyFilter } from "../../lib/compliance/complianceCopyFilter";
import type { ConfidenceState, ConfidenceTheme } from "../../components/intelligence/ConfidenceEngine";
import type { NeuralMarketSynthesis } from "../synthesis/neuralMarketSynthesisTypes";
import { getCompanyIntelligence } from "../intelligence/clientIntelligenceProvider";

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    const r = Math.imul(t ^ (t >>> 15), 1 | t);
    const r2 = r ^ (r + Math.imul(r ^ (r >>> 7), 61 | r));
    return ((r2 ^ (r2 >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(arr: T[], rnd: () => number): T {
  const safe = arr.length ? arr : [];
  if (!safe.length) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return undefined as T;
  }
  const idx = Math.floor(rnd() * safe.length);
  return safe[idx] ?? safe[0];
}

function titleWithTone(base: string, confidenceState: ConfidenceState, theme: ConfidenceTheme): string {
  if (confidenceState === "ELEVATED_RISK") return `${base} • volatility-conditioned caution`;
  if (confidenceState === "MOMENTUM_WEAKENING") return `${base} • confirmation-aware pacing`;
  if (confidenceState === "CONFIDENCE_RISING") return `${base} • constructive strength`;
  return `${base} • calm, structured context`;
}

/**************************/
/* CODE REDACTED FOR SWR */
/**************************/

function confidenceToneFor(idx: number, confidenceState: ConfidenceState): ConfidenceState {
  if (idx % 5 === 0) return confidenceState;
  if (confidenceState === "ELEVATED_RISK") return idx % 2 === 0 ? "MOMENTUM_WEAKENING" : "ELEVATED_RISK";
  if (confidenceState === "MOMENTUM_WEAKENING") return idx % 2 === 0 ? "NEUTRAL_ENVIRONMENT" : "MOMENTUM_WEAKENING";
  if (confidenceState === "CONFIDENCE_RISING") return idx % 2 === 0 ? "STABLE_CONVICTION" : "CONFIDENCE_RISING";
  return confidenceState;
}

function safeSEBI(input: string): string {
  // Conservative filter: ensures “no execution / no guarantees” language exists.
  return applyComplianceCopyFilter(input, "educational");
}

function buildEducationalPanel(inputs: BuildNewsStoryInputs, synthesis: NeuralMarketSynthesis, beginner: boolean): NewsEducationalPanel {
  const { confidenceState, narrativeKey } = inputs;

  const confidenceLine =
    confidenceState === "ELEVATED_RISK"
      ? "Confidence is treated as tighter and more cautious—interpretation focuses on conditioning texture."
      : confidenceState === "MOMENTUM_WEAKENING"
        ? "Confidence is treated as selective—confirmation cycles lengthen and interpretation stays grounded."
        : confidenceState === "CONFIDENCE_RISING"
          ? "Confidence is treated as constructive—breadth supports a steadier learning tone."
          : "Confidence is treated as balanced—risk sensitivity shifts gradually.";

  const liquidityLine = `Liquidity conditioning changes pacing: narratives may feel clearer or more selective as context shifts.`;

  const glossary = beginner
    ? [
        { term: "Confidence environment", definition: "A calm learning lens for how interpretation speed and margin should feel under current conditions." },
        { term: "Liquidity conditioning", definition: "A pacing texture that changes how clearly narratives appear as context shifts." },
        { term: "Sector pacing", definition: "How sector relevance shifts across confidence atmospheres, framed as context." },
      ]
    : [
        { term: "Participation sensitivity", definition: "How concentrated or distributed interpretation feels—used to adjust reading depth." },
        { term: "Interpretation margins", definition: "The boundary of how tight or wide our educational framing stays." },
        { term: "Learning lens probability", definition: "A structured way to read what could change in the story texture, without certainty framing." },
      ];

  const headline = beginner ? "How to read this market context (calm + structured)" : "Understanding market changes as educational context";
  const body = safeSEBI(
    `${confidenceLine}\n\nWhat changed here is the *conditioning texture*—macro pacing, sector relevance, and company update framing. ${liquidityLine}\n\nWhen you explore, use the “What changed?” lens: interpret it as a structured learning node.`,
  );

  const trustLine = "Learning context • signal-first interpretation";

  // Ensure stable “headline/body” but still varies mildly with narrativeKey.
  const rnd = mulberry32(narrativeKey + synthesis.quality.length);
  const variants = ["Structured learning lens", "Calm interpretation lens", "Context-first learning node"];
  const suffix = pick(variants, rnd);

  return {
    headline,
    body,
    glossary,
    trustLine: `${trustLine} • ${suffix}.`,
  };
}

function buildEvent(args: {
  id: string;
  kind: NewsEventKind;
  title: string;
  summary: string;
  impactExplanation: string;
  affectedSectors: string[];
  relatedCompanies: string[];
  historicalParallels?: string[];
  confidenceTone: ConfidenceState;
}): NewsEvent {
  return {
    ...args,
    summary: safeSEBI(args.summary),
    impactExplanation: safeSEBI(args.impactExplanation),
  };
}

function deriveAffectedSectors(synthesis: NeuralMarketSynthesis, confidenceState: ConfidenceState): string[] {
  // We don't have a canonical “sector” taxonomy at the market level in this repo.
  // Keep this lightweight + deterministic by using qualitative anchors from synthesis.
  if (confidenceState === "ELEVATED_RISK") return ["Sector pacing (tightened)", "Participation sensitivity"];
  if (confidenceState === "MOMENTUM_WEAKENING") return ["Sector relevance (selective)", "Confirmation-aware pacing"];
  if (confidenceState === "CONFIDENCE_RISING") return ["Sector leadership lens (constructive)", "Breadth-supported tone"];
  return ["Sector pacing (balanced)", "Structured context continuity"];
}

function deriveRelatedCompanies(company?: CompanyUniverseModel | null): string[] {
  if (!company) return [];
  const ticker = company.ticker?.toUpperCase().trim();
  if (!ticker) return [];
  return [ticker];
}

export function buildNewsStory(inputs: BuildNewsStoryInputs): BuiltNewsStory {
  const { synthesis, confidenceState, theme, beginner, company, narrativeKey } = inputs;

  const rnd = mulberry32(narrativeKey + synthesis.marketCompositeAt + (beginner ? 7 : 11));
  const affectedSectors = deriveAffectedSectors(synthesis, confidenceState);
  const relatedCompanies = deriveRelatedCompanies(company);

  const timelineAnchors = (synthesis.timeline ?? []).slice(0, 5);
  const scannerAnchors = (synthesis.scannerCards ?? []).slice(0, 4);

  const historicalParallels = (() => {
    const base = timelineAnchors
      .slice(0, 3)
      .map((t) => t.text.split(".")[0]?.trim())
      .filter(Boolean) as string[];
    const alt = base.length ? base : ["Continuity-first reading remains active"];
    return alt.slice(0, beginner ? 1 : 2);
  })();

  const majorTitle = titleWithTone("Market shift as conditioning texture", confidenceState, theme);
  const majorSummary = `This update reorganizes interpretation boundaries: sector relevance, macro pacing, and company framing adjust together.`;
  const majorImpact = `Why it matters (learning): the “what changed?” lens becomes sharper—so you can read the next node with calm focus.`;

  const sectorTitle = titleWithTone("Sector pacing & relevance recalibration", confidenceState, theme);
  const sectorSummary = `Sector relevance is treated as context: rotation cues may feel more selective or more constructive depending on the current confidence atmosphere.`;
  const sectorImpact = `Impact explanation: ${synthesis.sectorRotationMatrix} We translate it into learnable pacing notes for interpretation depth.`;

  const macroTitle = titleWithTone("Macro conditions (calm scenario framing)", confidenceState, theme);
  const macroSummary = `Macro inputs reshape narrative tone and interpretation speed.`;
  const macroImpact = `Impact explanation: ${synthesis.macroGeopolitical.body}`;

  const earningsTitle = titleWithTone("Earnings & business developments (interpretation context)", confidenceState, theme);
  const earningsSummary = `Earnings observations are treated as narrative input—how the business quality evolves inside this environment.`;
  const earningsImpact = `Impact explanation: ${synthesis.institutionalBehaviour} ${synthesis.behaviouralPsychology}`;

  const companyTitle = (() => {
    if (!company) return titleWithTone("Company-specific context (optional)", confidenceState, theme);
    return titleWithTone(`${company.companyName} • company update framing`, confidenceState, theme);
  })();

  const companyIntel = company ? getCompanyIntelligence(company.ticker) : null;
  const companySummary = companyIntel
    ? companyIntel.companyOutlook.overallSummary
    : `When you explore a company, this layer connects its narrative texture to the same market conditioning environment.`;

  const companyImpact = companyIntel
    ? `Impact explanation: ${companyIntel.narrative.narrative250}`
    : `Impact explanation: company updates are presented as educational editorial developments without speculation pressure.`;

  const educational = buildEducationalPanel(inputs, synthesis, beginner);

  const companyEvents: NewsEvent[] = [
    buildEvent({
      id: `ne_company_${narrativeKey}`,
      kind: "company_update",
      title: companyTitle,
      summary: companySummary,
      impactExplanation: companyImpact,
      affectedSectors: affectedSectors.slice(0, beginner ? 1 : 2),
      relatedCompanies,
      historicalParallels: historicalParallels.length ? historicalParallels : undefined,
      confidenceTone: confidenceToneFor(2, confidenceState),
    }),
  ];

  const sectorEvents: NewsEvent[] = [
    buildEvent({
      id: `ne_sector_${narrativeKey}_0`,
      kind: "sector_movement",
      title: sectorTitle,
      summary: sectorSummary,
      impactExplanation: sectorImpact,
      affectedSectors,
      relatedCompanies: relatedCompanies.length ? relatedCompanies : [],
      historicalParallels: historicalParallels.length ? historicalParallels : undefined,
      confidenceTone: confidenceToneFor(1, confidenceState),
    }),
  ];

  const macroEvents: NewsEvent[] = [
    buildEvent({
      id: `ne_macro_${narrativeKey}_0`,
      kind: "macro_event",
      title: macroTitle,
      summary: macroSummary,
      impactExplanation: macroImpact,
      affectedSectors,
      relatedCompanies: relatedCompanies.length ? relatedCompanies : [],
      historicalParallels: historicalParallels.length ? historicalParallels : undefined,
      confidenceTone: confidenceToneFor(0, confidenceState),
    }),
  ];

  const earningsEvents: NewsEvent[] = [
    buildEvent({
      id: `ne_earnings_${narrativeKey}_0`,
      kind: "earnings_development",
      title: earningsTitle,
      summary: earningsSummary,
      impactExplanation: earningsImpact,
      affectedSectors: affectedSectors.slice(0, beginner ? 1 : 2),
      relatedCompanies: relatedCompanies.length ? relatedCompanies : [],
      historicalParallels: beginner ? undefined : historicalParallels,
      confidenceTone: confidenceToneFor(3, confidenceState),
    }),
  ];

  const majorEvents: NewsEvent[] = [
    buildEvent({
      id: `ne_major_${narrativeKey}_0`,
      kind: "major_development",
      title: majorTitle,
      summary: majorSummary,
      impactExplanation: majorImpact,
      affectedSectors: affectedSectors.slice(0, beginner ? 1 : 2),
      relatedCompanies: relatedCompanies.length ? relatedCompanies : [],
      historicalParallels: beginner ? undefined : historicalParallels,
      confidenceTone: confidenceToneFor(4, confidenceState),
    }),
  ];

    const educationalEvents: NewsEvent[] = (() => {
    const safeTone = confidenceToneFor(6, confidenceState);

    const nodeHint = (() => {
      if (scannerAnchors.length) {
        const s = pick(scannerAnchors, rnd);
        return s?.title ?? "structured learning node";
      }

      const t = timelineAnchors.length ? pick(timelineAnchors, rnd) : null;
      const textHint = t?.text?.split(".")?.[0]?.trim();
      return textHint || t?.whenLabel || "structured learning node";
    })();

      const ev0 = buildEvent({
      id: `ne_edu_${narrativeKey}_0`,
      kind: "educational_context",
      title: beginner ? "What changed? (calm lens)" : "What changed? (structure-first lens)",
      summary: `You’re reading a structured learning node: ${nodeHint}.`,
      impactExplanation: `Interpretation stays educational and context-first.`,
      affectedSectors: affectedSectors.slice(0, beginner ? 1 : 2),
      relatedCompanies: relatedCompanies.length ? relatedCompanies : [],
      historicalParallels: beginner ? undefined : historicalParallels,
      confidenceTone: safeTone,
    });

    return [ev0];
  })();

  const layers: Record<NewsStoryLayerId, NewsEvent[]> = {
    major: majorEvents,
    sector: sectorEvents,
    company: companyEvents,
    macro: macroEvents,
    earnings: earningsEvents,
    educational: educationalEvents,
  };

  return {
    narrativeSeed: narrativeKey,
    layers,
    educational,
  };
}
