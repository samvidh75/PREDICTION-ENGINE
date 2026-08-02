/**
 * RoadmapPrioritizer — Helps prioritize product improvements based on PMF signals.
 *
 * Combines multiple signals into a composite priority score:
 *  - Research quality issues (negative feedback volume)
 *  - Search demand (failed queries = content gaps)
 *  - Feature request volume
 *  - Correction request volume
 *  - Premium intent (users wanting a feature)
 *  - Strategic alignment score
 */

export interface RoadmapItem {
  id: string;
  title: string;
  description: string;
  category: 'content' | 'feature' | 'quality' | 'ux' | 'infrastructure';
  sourceSignals: string[]; // e.g. "research_quality", "search_demand", "corrections", "feature_requests"
  signalStrength: number; // 0-100 composite
  estimatedEffort: 'small' | 'medium' | 'large';
  priority: number; // 1 (highest) - 100
  linkedMetricKeys: string[]; // pmf metric keys this would improve
  suggestedAt: string;
}

export interface PrioritizationInput {
  researchQualityIssues: Array<{ issue: string; count: number }>;
  topFailedQueries: Array<{ query: string; count: number }>;
  correctionTrends: Array<{ issueType: string; count: number }>;
  featureRequests: Array<{ feature: string; count: number }>;
  searchTrends: Array<{ topic: string; growth: number }>;
}

interface SignalMapping {
  pattern: RegExp;
  category: RoadmapItem['category'];
  estimate: RoadmapItem['estimatedEffort'];
  title: string;
  description: string;
  metricKeys: string[];
}

const SIGNAL_MAPPINGS: SignalMapping[] = [
  {
    pattern: /data|inaccurate|wrong|factual|error/i,
    category: 'quality',
    estimate: 'medium',
    title: 'Improve data accuracy for frequently-corrected stocks',
    description: 'Multiple users reported data inaccuracies for specific stocks. Prioritize data source validation.',
    metricKeys: ['pmf.research.quality_positive_rate'],
  },
  {
    pattern: /outdated|stale|old|quarter/i,
    category: 'quality',
    estimate: 'medium',
    title: 'Refresh quarterly data for active research stocks',
    description: 'Users report outdated quarterly data. Accelerate data refresh pipeline.',
    metricKeys: ['pmf.research.quality_positive_rate'],
  },
  {
    pattern: /context|missing|not enough|insufficient/i,
    category: 'content',
    estimate: 'small',
    title: 'Expand research depth with more context sections',
    description: 'Users want more context in research reports. Add industry/macro context sections.',
    metricKeys: ['pmf.research.quality_positive_rate', 'pmf.research.feedback_count'],
  },
  {
    pattern: /compare|vs|versus/i,
    category: 'feature',
    estimate: 'large',
    title: 'Build peer comparison feature',
    description: 'Users are searching for stock comparisons. Build dedicated compare tool.',
    metricKeys: ['pmf.activation.funnel_compare', 'pmf.retention.d7_retention'],
  },
  {
    pattern: /screener|filter|scanner/i,
    category: 'feature',
    estimate: 'medium',
    title: 'Enhance stock scanner with more filters',
    description: 'Search demand indicates users want advanced screening capabilities.',
    metricKeys: ['pmf.engagement.scanner_views', 'pmf.engagement.scanner_actions'],
  },
  {
    pattern: /alert|notification|price|trigger/i,
    category: 'feature',
    estimate: 'medium',
    title: 'Improve alert customization and delivery',
    description: 'Users engage with alerts but want more granular triggers and delivery options.',
    metricKeys: ['pmf.engagement.alerts_viewed', 'pmf.engagement.alerts_clicked'],
  },
  {
    pattern: /scenario|what.?if/i,
    category: 'feature',
    estimate: 'large',
    title: 'Expand scenario analysis capabilities',
    description: 'Users want more sophisticated what-if analysis tools.',
    metricKeys: ['pmf.engagement.scenario_views', 'pmf.engagement.scenario_comparisons'],
  },
  {
    pattern: /premium|upgrade|pro|paid/i,
    category: 'feature',
    estimate: 'medium',
    title: 'Build premium tier with exclusive features',
    description: 'Users are exploring premium features. Prioritize highest-demand premium capabilities.',
    metricKeys: ['pmf.engagement.premium_views', 'pmf.engagement.upgrade_cta_clicks'],
  },
];

const items: RoadmapItem[] = [];
let nextItemId = 1;

function generateItemId(): string {
  return `roadmap-${Date.now()}-${nextItemId++}`;
}

export function prioritize(input: PrioritizationInput): RoadmapItem[] {
  const newItems: RoadmapItem[] = [];
  const signalTexts: string[] = [];

  // Build signal text corpus
  for (const qi of input.researchQualityIssues) {
    for (let i = 0; i < qi.count; i++) signalTexts.push(qi.issue);
  }
  for (const fq of input.topFailedQueries) {
    for (let i = 0; i < Math.min(fq.count, 5); i++) signalTexts.push(fq.query);
  }
  for (const ct of input.correctionTrends) {
    for (let i = 0; i < ct.count; i++) signalTexts.push(ct.issueType);
  }
  for (const fr of input.featureRequests) {
    for (let i = 0; i < fr.count; i++) signalTexts.push(fr.feature);
  }

  // Score signals by matching patterns
  const signalScores = new Map<SignalMapping, number>();

  for (const signal of SIGNAL_MAPPINGS) {
    let score = 0;
    for (const text of signalTexts) {
      if (signal.pattern.test(text)) score++;
    }
    if (score > 0) {
      signalScores.set(signal, score);
    }
  }

  // Create roadmap items from matched signals
  for (const [signal, score] of signalScores) {
    const signalStrength = Math.min(Math.round((score / Math.max(signalTexts.length, 1)) * 100), 100);
    newItems.push({
      id: generateItemId(),
      title: signal.title,
      description: signal.description,
      category: signal.category,
      sourceSignals: ['user_feedback'],
      signalStrength,
      estimatedEffort: signal.estimate,
      priority: 0, // Will be computed
      linkedMetricKeys: signal.metricKeys,
      suggestedAt: new Date().toISOString(),
    });
  }

  // Compute priority scores
  for (const item of newItems) {
    const effortWeight = item.estimatedEffort === 'small' ? 1 : item.estimatedEffort === 'medium' ? 0.7 : 0.4;
    item.priority = Math.max(1, Math.min(100, Math.round(100 - (item.signalStrength * effortWeight))));
  }

  // Sort by priority (ascending)
  newItems.sort((a, b) => a.priority - b.priority);

  items.push(...newItems);
  return newItems;
}

export function getRoadmap(category?: RoadmapItem['category']): RoadmapItem[] {
  if (category) return items.filter((i) => i.category === category);
  return [...items];
}

export function clearRoadmap(): void {
  items.length = 0;
}
