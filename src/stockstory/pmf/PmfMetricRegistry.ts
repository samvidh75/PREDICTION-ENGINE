/**
 * PmfMetricRegistry — Typed PMF metric definitions for StockStory India.
 *
 * Central registry of all PMF metrics. Each metric has a typed key,
 * human-readable label, unit, and tracking category.
 *
 * Categories:
 *   activation   — first-time user milestones
 *   retention    — repeat usage and session patterns
 *   engagement   — depth-of-use signals
 *   research     — research quality signals
 *   search       — search demand signals
 *   scanner      — scanner quality signals
 *   alert        — alert usefulness signals
 *   scenario     — scenario usefulness signals
 *   premium      — premium intent signals
 *   experiment   — experiment assignment / result
 */

export type MetricCategory =
  | 'activation'
  | 'retention'
  | 'engagement'
  | 'research'
  | 'search'
  | 'scanner'
  | 'alert'
  | 'scenario'
  | 'premium'
  | 'experiment';

export type MetricKind = 'counter' | 'gauge' | 'histogram' | 'ratio';

export interface MetricDef {
  key: string;
  label: string;
  category: MetricCategory;
  kind: MetricKind;
  unit: string;
  description: string;
}

export class PmfMetricRegistry {
  private static readonly metrics = new Map<string, MetricDef>();

  static readonly ACTIVATION_SIGNUP = PmfMetricRegistry.reg({
    key: 'pmf.activation.signup',
    label: 'Sign-ups',
    category: 'activation',
    kind: 'counter',
    unit: 'users',
    description: 'New user registrations',
  });

  static readonly ACTIVATION_FIRST_SEARCH = PmfMetricRegistry.reg({
    key: 'pmf.activation.first_search',
    label: 'First Search',
    category: 'activation',
    kind: 'counter',
    unit: 'users',
    description: 'Users who performed at least one search',
  });

  static readonly ACTIVATION_FIRST_STOCK_VIEW = PmfMetricRegistry.reg({
    key: 'pmf.activation.first_stock_view',
    label: 'First Stock View',
    category: 'activation',
    kind: 'counter',
    unit: 'users',
    description: 'Users who viewed at least one stock superpage',
  });

  static readonly ACTIVATION_FIRST_WATCHLIST = PmfMetricRegistry.reg({
    key: 'pmf.activation.first_watchlist_add',
    label: 'First Watchlist Add',
    category: 'activation',
    kind: 'counter',
    unit: 'users',
    description: 'Users who added at least one stock to watchlist',
  });

  static readonly ACTIVATION_FIRST_COMPARE = PmfMetricRegistry.reg({
    key: 'pmf.activation.first_compare',
    label: 'First Compare',
    category: 'activation',
    kind: 'counter',
    unit: 'users',
    description: 'Users who performed at least one comparison',
  });

  static readonly RETENTION_DA_1 = PmfMetricRegistry.reg({
    key: 'pmf.retention.d1',
    label: 'D1 Retention',
    category: 'retention',
    kind: 'ratio',
    unit: 'percent',
    description: 'Users returning on day 1 after signup',
  });

  static readonly RETENTION_DA_7 = PmfMetricRegistry.reg({
    key: 'pmf.retention.d7',
    label: 'D7 Retention',
    category: 'retention',
    kind: 'ratio',
    unit: 'percent',
    description: 'Users returning on day 7 after signup',
  });

  static readonly RETENTION_DA_30 = PmfMetricRegistry.reg({
    key: 'pmf.retention.d30',
    label: 'D30 Retention',
    category: 'retention',
    kind: 'ratio',
    unit: 'percent',
    description: 'Users returning on day 30 after signup',
  });

  static readonly RETENTION_WAU = PmfMetricRegistry.reg({
    key: 'pmf.retention.wau',
    label: 'Weekly Active Users',
    category: 'retention',
    kind: 'gauge',
    unit: 'users',
    description: 'Unique users active in the last 7 days',
  });

  static readonly RETENTION_MAU = PmfMetricRegistry.reg({
    key: 'pmf.retention.mau',
    label: 'Monthly Active Users',
    category: 'retention',
    kind: 'gauge',
    unit: 'users',
    description: 'Unique users active in the last 30 days',
  });

  static readonly ENGAGEMENT_SESSIONS_PER_USER = PmfMetricRegistry.reg({
    key: 'pmf.engagement.sessions_per_user',
    label: 'Sessions per User',
    category: 'engagement',
    kind: 'histogram',
    unit: 'sessions',
    description: 'Session count distribution per user per week',
  });

  static readonly ENGAGEMENT_STOCK_PAGES_PER_SESSION = PmfMetricRegistry.reg({
    key: 'pmf.engagement.stock_pages_per_session',
    label: 'Stock Pages per Session',
    category: 'engagement',
    kind: 'histogram',
    unit: 'pages',
    description: 'Number of stock superpages viewed per session',
  });

  static readonly ENGAGEMENT_SEARCHES_PER_SESSION = PmfMetricRegistry.reg({
    key: 'pmf.engagement.searches_per_session',
    label: 'Searches per Session',
    category: 'engagement',
    kind: 'histogram',
    unit: 'searches',
    description: 'Search count per session',
  });

  static readonly RESEARCH_QUALITY_POSITIVE_RATE = PmfMetricRegistry.reg({
    key: 'pmf.research.quality_positive_rate',
    label: 'Research Quality Positive Rate',
    category: 'research',
    kind: 'ratio',
    unit: 'percent',
    description: 'Fraction of research feedback rated "useful"',
  });

  static readonly RESEARCH_QUALITY_FEEDBACK_COUNT = PmfMetricRegistry.reg({
    key: 'pmf.research.feedback_count',
    label: 'Research Feedback Count',
    category: 'research',
    kind: 'counter',
    unit: 'submissions',
    description: 'Total research quality feedback submissions',
  });

  static readonly RESEARCH_CORRECTION_ISSUES_OPEN = PmfMetricRegistry.reg({
    key: 'pmf.research.correction_issues_open',
    label: 'Open Correction Issues',
    category: 'research',
    kind: 'gauge',
    unit: 'issues',
    description: 'Number of open research correction issues',
  });

  static readonly SEARCH_DEMAND_EMPTY_RESULTS = PmfMetricRegistry.reg({
    key: 'pmf.search.demand_empty_results',
    label: 'Empty Search Results',
    category: 'search',
    kind: 'counter',
    unit: 'queries',
    description: 'Search queries that returned zero symbols',
  });

  static readonly SEARCH_DEMAND_TOP_FAILED = PmfMetricRegistry.reg({
    key: 'pmf.search.top_failed_queries',
    label: 'Top Failed Queries',
    category: 'search',
    kind: 'gauge',
    unit: 'queries',
    description: 'Most frequent search queries with no results',
  });

  static readonly SCANNER_QUALITY_PRECISION = PmfMetricRegistry.reg({
    key: 'pmf.scanner.precision',
    label: 'Scanner Precision',
    category: 'scanner',
    kind: 'ratio',
    unit: 'percent',
    description: 'Fraction of scanner results user engages with',
  });

  static readonly SCANNER_QUALITY_INTERACTION_RATE = PmfMetricRegistry.reg({
    key: 'pmf.scanner.interaction_rate',
    label: 'Scanner Interaction Rate',
    category: 'scanner',
    kind: 'ratio',
    unit: 'percent',
    description: 'Fraction of users who interact with scanner results',
  });

  static readonly ALERT_USEFULNESS_CLICK_RATE = PmfMetricRegistry.reg({
    key: 'pmf.alert.click_rate',
    label: 'Alert Click Rate',
    category: 'alert',
    kind: 'ratio',
    unit: 'percent',
    description: 'Fraction of alerts that are clicked',
  });

  static readonly ALERT_USEFULNESS_FEEDBACK_POSITIVE = PmfMetricRegistry.reg({
    key: 'pmf.alert.feedback_positive_rate',
    label: 'Alert Positive Feedback Rate',
    category: 'alert',
    kind: 'ratio',
    unit: 'percent',
    description: 'Fraction of alert feedback that is positive',
  });

  static readonly SCENARIO_USEFULNESS_VIEW_RATE = PmfMetricRegistry.reg({
    key: 'pmf.scenario.view_rate',
    label: 'Scenario View Rate',
    category: 'scenario',
    kind: 'ratio',
    unit: 'percent',
    description: 'Fraction of scenario explanations viewed',
  });

  static readonly SCENARIO_USEFULNESS_FEEDBACK_POSITIVE = PmfMetricRegistry.reg({
    key: 'pmf.scenario.feedback_positive_rate',
    label: 'Scenario Positive Feedback Rate',
    category: 'scenario',
    kind: 'ratio',
    unit: 'percent',
    description: 'Fraction of scenario feedback that is positive',
  });

  static readonly PREMIUM_INTENT_CLICK_RATE = PmfMetricRegistry.reg({
    key: 'pmf.premium.intent_click_rate',
    label: 'Premium Intent Click Rate',
    category: 'premium',
    kind: 'ratio',
    unit: 'percent',
    description: 'Fraction of premium feature prompts that are clicked',
  });

  static readonly PREMIUM_INTENT_UPGRADE_START = PmfMetricRegistry.reg({
    key: 'pmf.premium.upgrade_started',
    label: 'Upgrade Started',
    category: 'premium',
    kind: 'counter',
    unit: 'users',
    description: 'Users who started premium upgrade flow',
  });

  static readonly EXPERIMENT_ASSIGNED = PmfMetricRegistry.reg({
    key: 'pmf.experiment.assigned',
    label: 'Experiment Assignments',
    category: 'experiment',
    kind: 'counter',
    unit: 'assignments',
    description: 'Total experiment variant assignments',
  });

  // ── Lookup ──────────────────────────────────────────────────────────────

  static get(key: string): MetricDef | undefined {
    return PmfMetricRegistry.metrics.get(key);
  }

  static getAll(): MetricDef[] {
    return Array.from(PmfMetricRegistry.metrics.values());
  }

  static getByCategory(category: MetricCategory): MetricDef[] {
    return PmfMetricRegistry.getAll().filter((m) => m.category === category);
  }

  static validateKey(key: string): boolean {
    return PmfMetricRegistry.metrics.has(key);
  }

  // ── Private ──────────────────────────────────────────────────────────────

  private static reg(def: MetricDef): MetricDef {
    PmfMetricRegistry.metrics.set(def.key, def);
    return def;
  }
}
