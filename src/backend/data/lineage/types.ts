export type Availability = "real" | "partial" | "unavailable";

export interface AnalyticalInputLineage {
  symbol: string;
  metric: string;
  source: string;
  sourceUrl?: string;
  sourceTable: string;
  sourceField: string;
  asOf: string;
  retrievedAt: string;
  freshnessDays: number;
  isFallback: boolean;
  isSynthetic: boolean;
  availability: Availability;
  rejectionReason?: string;
}

