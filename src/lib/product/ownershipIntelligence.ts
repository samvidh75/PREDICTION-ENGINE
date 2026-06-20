export type OwnershipState =
  | "Stable ownership"
  | "Institutional support improving"
  | "Promoter confidence stable"
  | "Ownership needs review"
  | "Risk rising"
  | "Not enough information";

export interface OwnershipDriver {
  label: string;
  direction: "positive" | "neutral" | "risk";
  detail: string;
}

export interface OwnershipIntelligenceView {
  state: OwnershipState;
  promoterHolding: number | null;
  promoterTrend: "rising" | "stable" | "falling" | null;
  fiiHolding: number | null;
  fiiTrend: "rising" | "stable" | "falling" | null;
  diiHolding: number | null;
  diiTrend: "rising" | "stable" | "falling" | null;
  publicHolding: number | null;
  pledgePercent: number | null;
  drivers: OwnershipDriver[];
  riskFlags: string[];
  explanation: string;
}

export interface ShareholdingSnapshot {
  date: string;
  promoter: number | null;
  fii: number | null;
  dii: number | null;
  public: number | null;
  pledge: number | null;
}

export interface OwnershipInput {
  snapshots: ShareholdingSnapshot[];
}

function computeTrend(values: (number | null)[], periods: number): "rising" | "stable" | "falling" | null {
  const valid = values.filter((v): v is number => v !== null);
  if (valid.length < 2) return null;
  const recent = valid.slice(-periods);
  if (recent.length < 2) return null;
  const first = recent[0];
  const last = recent[recent.length - 1];
  const diff = last - first;
  if (diff > 1) return "rising";
  if (diff < -1) return "falling";
  return "stable";
}

export function buildOwnershipIntelligence(input: OwnershipInput): OwnershipIntelligenceView {
  const { snapshots } = input;
  const drivers: OwnershipDriver[] = [];
  const riskFlags: string[] = [];

  if (snapshots.length === 0) {
    return {
      state: "Not enough information",
      promoterHolding: null,
      promoterTrend: null,
      fiiHolding: null,
      fiiTrend: null,
      diiHolding: null,
      diiTrend: null,
      publicHolding: null,
      pledgePercent: null,
      drivers: [],
      riskFlags: [],
      explanation: "Shareholding data not yet available.",
    };
  }

  const latest = snapshots[snapshots.length - 1];
  const promoterHoldings = snapshots.map((s) => s.promoter);
  const fiiHoldings = snapshots.map((s) => s.fii);
  const diiHoldings = snapshots.map((s) => s.dii);

  const promoterTrend = computeTrend(promoterHoldings, Math.min(promoterHoldings.length, 4));
  const fiiTrend = computeTrend(fiiHoldings, Math.min(fiiHoldings.length, 4));
  const diiTrend = computeTrend(diiHoldings, Math.min(diiHoldings.length, 4));

  if (latest.promoter !== null) {
    if (promoterTrend === "rising") {
      drivers.push({ label: "Promoter holding increasing", direction: "positive", detail: `Promoter holding at ${latest.promoter.toFixed(1)}%` });
    } else if (promoterTrend === "falling") {
      drivers.push({ label: "Promoter holding decreasing", direction: "risk", detail: `Promoter holding at ${latest.promoter.toFixed(1)}%` });
      riskFlags.push("Promoter reducing stake");
    } else {
      drivers.push({ label: "Promoter holding stable", direction: "neutral", detail: `Promoter holding at ${latest.promoter.toFixed(1)}%` });
    }
  }

  if (latest.fii !== null) {
    if (fiiTrend === "rising") {
      drivers.push({ label: "FII interest increasing", direction: "positive", detail: `FII holding at ${latest.fii.toFixed(1)}%` });
    } else if (fiiTrend === "falling") {
      drivers.push({ label: "FII interest declining", direction: "risk", detail: `FII holding at ${latest.fii.toFixed(1)}%` });
      riskFlags.push("FII selling detected");
    } else {
      drivers.push({ label: "FII holding stable", direction: "neutral", detail: `FII holding at ${latest.fii.toFixed(1)}%` });
    }
  }

  if (latest.dii !== null) {
    if (diiTrend === "rising") {
      drivers.push({ label: "DII interest increasing", direction: "positive", detail: `DII holding at ${latest.dii.toFixed(1)}%` });
    } else if (diiTrend === "falling") {
      drivers.push({ label: "DII interest declining", direction: "risk", detail: `DII holding at ${latest.dii.toFixed(1)}%` });
    } else {
      drivers.push({ label: "DII holding stable", direction: "neutral", detail: `DII holding at ${latest.dii.toFixed(1)}%` });
    }
  }

  if (latest.pledge !== null && latest.pledge > 0) {
    if (latest.pledge > 50) {
      riskFlags.push("High promoter pledge");
    } else if (latest.pledge > 25) {
      riskFlags.push("Moderate promoter pledge");
    }
    drivers.push({
      label: "Promoter pledge",
      direction: latest.pledge > 25 ? "risk" : "neutral",
      detail: `${latest.pledge.toFixed(1)}% pledged`,
    });
  }

  const positiveCount = drivers.filter((d) => d.direction === "positive").length;
  const riskCount = drivers.filter((d) => d.direction === "risk").length;

  let state: OwnershipState;
  if (snapshots.length === 1) {
    if (riskCount > positiveCount) state = "Ownership needs review";
    else if (latest.promoter !== null && latest.promoter >= 50) state = "Promoter confidence stable";
    else state = "Stable ownership";
  } else {
    if (riskCount > positiveCount && fiiTrend === "falling") state = "Risk rising";
    else if (riskCount > positiveCount) state = "Ownership needs review";
    else if (fiiTrend === "rising" && promoterTrend !== "falling") state = "Institutional support improving";
    else if (promoterTrend === "stable" || promoterTrend === "rising") state = "Promoter confidence stable";
    else state = "Stable ownership";
  }

  const explanation = buildOwnershipExplanation(state, snapshots.length);

  return {
    state,
    promoterHolding: latest.promoter,
    promoterTrend,
    fiiHolding: latest.fii,
    fiiTrend,
    diiHolding: latest.dii,
    diiTrend,
    publicHolding: latest.public,
    pledgePercent: latest.pledge,
    drivers,
    riskFlags: [...new Set(riskFlags)],
    explanation,
  };
}

function buildOwnershipExplanation(state: OwnershipState, snapshotCount: number): string {
  switch (state) {
    case "Stable ownership":
      return "Ownership structure appears stable based on available data.";
    case "Institutional support improving":
      return "Institutional investors are increasing their position.";
    case "Promoter confidence stable":
      return "Promoter holding indicates stable confidence.";
    case "Ownership needs review":
      return "Ownership trends or levels warrant closer examination.";
    case "Risk rising":
      return "Deteriorating ownership patterns detected.";
    default:
      return "Not enough information to assess ownership.";
  }
}
