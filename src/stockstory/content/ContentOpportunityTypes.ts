export interface ContentOpportunity {
  id: string;
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  category: "company" | "sector" | "scanner";
  rationale: string;
  estimatedEffort: string;
}

export interface GrowthContentPlan {
  generatedAt: string;
  opportunities: ContentOpportunity[];
  summary: {
    total: number;
    highPriority: number;
    mediumPriority: number;
    lowPriority: number;
  };
}
