export type CompanyHealthState =
  | "STRUCTURALLY_HEALTHY"
  | "STABLE_EXPANSION"
  | "CONFIDENCE_IMPROVING"
  | "LIQUIDITY_FRAGILE"
  | "VOLATILITY_SENSITIVE"
  | "STRUCTURALLY_WEAKENING";

export type HealthTheme = {
  label: string;
  // glows should be used subtly (confidence atmospheres, not neon spam)
  glowCyan: string; // rgba
  glowAmber: string; // rgba
  glowWarning: string; // rgba
  glowDeep: string; // rgba
};

export type CompanyNarrative = {
  id: string;
  title: string;
  body: string; // editorial + cinematic, not a list
};

export type TimelineMilestone = {
  id: string;
  yearLabel: string; // e.g. "1945"
  title: string; // e.g. "Foundational industrial expansion phase initiated"
  body: string; // short editorial explanation
  // visual placement: keep editorial, not data-heavy
  railIndex: number; // 0..n
};

export type LeaderProfile = {
  id: string;
  name: string;
  role: string;
  narrativeProfile: string; // strategic impact summary
  philosophy: string; // management philosophy
};

export type FinancialTelemetryPoint = {
  id: string;
  label: string; // e.g. "FY25 Q4"
  revenue: number;
  ebitda: number;
  profit: number;
  freeCashFlow: number;
  debtRatio: number; // 0..1
};

export type CompanyNewsItem = {
  id: string;
  kind:
    | "EARNINGS"
    | "ACQUISITION"
    | "LEADERSHIP"
    | "PARTNERSHIP"
    | "REGULATORY"
    | "PRODUCT"
    | "INSTITUTIONAL";
  title: string;
  body: string;
  recencyLabel: string; // e.g. "2 weeks ago"
};

export type CompanyUniverseModel = {
  companyName: string;
  ticker: string;
  narrative: CompanyNarrative;
  healthState: CompanyHealthState;
  healthTheme: HealthTheme;

  marketStateLabel: string; // editorial
  positioningRailLabel: string;

  founders: LeaderProfile[];
  leadership: LeaderProfile[];

  foundingTimeline: TimelineMilestone[];

  financialTelemetry: FinancialTelemetryPoint[];

  news: CompanyNewsItem[];

  strategicSummary: string;

  // small “future probability” editorial hints
  futureProbabilityCapsules: { id: string; body: string }[];
};
