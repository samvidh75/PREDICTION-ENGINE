/**
 * routeFallbackConfig.ts — Route-level snapshot readiness checks.
 *
 * Maps each public route to its required precomputed snapshot kind and
 * acceptable staleness threshold. Used by admin health reporting — never
 * exposed on public routes.
 *
 * When a snapshot is missing or stale, the route degrades gracefully rather
 * than calling a provider on-demand.
 */

export interface RouteSnapshotDependency {
  route: string;
  requiredSnapshotKind: string;
  description: string;
  /** How long the snapshot can be stale before the route is degraded */
  staleThresholdMinutes: number;
}

export const ROUTE_SNAPSHOT_DEPENDENCIES: RouteSnapshotDependency[] = [
  {
    route: '/',
    requiredSnapshotKind: 'healthometer',
    description: 'Healthometer dashboard',
    staleThresholdMinutes: 360,
  },
  {
    route: '/scanner',
    requiredSnapshotKind: 'scanner-double-threshold',
    description: 'Default scanner preset results',
    staleThresholdMinutes: 360,
  },
  {
    route: '/scanner',
    requiredSnapshotKind: 'scanner-strong-buy',
    description: 'Strong-buy preset results',
    staleThresholdMinutes: 360,
  },
  {
    route: '/scanner',
    requiredSnapshotKind: 'scanner-top-losers',
    description: 'Top-losers preset results',
    staleThresholdMinutes: 360,
  },
  {
    route: '/scanner',
    requiredSnapshotKind: 'scanner-most-active',
    description: 'Most-active preset results',
    staleThresholdMinutes: 360,
  },
  {
    route: '/scanner',
    requiredSnapshotKind: 'scanner-gap-up',
    description: 'Gap-up preset results',
    staleThresholdMinutes: 360,
  },
  {
    route: '/scanner',
    requiredSnapshotKind: 'scanner-52w-high',
    description: '52-week high preset results',
    staleThresholdMinutes: 360,
  },
  {
    route: '/scanner',
    requiredSnapshotKind: 'scanner-52w-low',
    description: '52-week low preset results',
    staleThresholdMinutes: 360,
  },
  {
    route: '/scanner',
    requiredSnapshotKind: 'scanner-new-highs',
    description: 'New-highs preset results',
    staleThresholdMinutes: 360,
  },
  {
    route: '/scanner',
    requiredSnapshotKind: 'scanner-new-lows',
    description: 'New-lows preset results',
    staleThresholdMinutes: 360,
  },
  {
    route: '/scanner',
    requiredSnapshotKind: 'scanner-long-term-buy',
    description: 'Long-term-buy preset results',
    staleThresholdMinutes: 360,
  },
  {
    route: '/scanner',
    requiredSnapshotKind: 'scanner-check-hold',
    description: 'Check-hold preset results',
    staleThresholdMinutes: 360,
  },
  {
    route: '/rankings',
    requiredSnapshotKind: 'rankings',
    description: 'P/E gain sorted stock rankings',
    staleThresholdMinutes: 360,
  },
  {
    route: '/stock',
    requiredSnapshotKind: 'event-evidence',
    description: 'Event evidence summary for selected stock',
    staleThresholdMinutes: 360,
  },
  {
    route: '/watchlist',
    requiredSnapshotKind: 'watchlist-theses',
    description: 'Watchlist thesis states',
    staleThresholdMinutes: 360,
  },
  {
    route: '/portfolio',
    requiredSnapshotKind: 'healthometer',
    description: 'Portfolio healthometer',
    staleThresholdMinutes: 360,
  },
  {
    route: '/relative-strength',
    requiredSnapshotKind: 'rankings',
    description: 'Relative strength rankings',
    staleThresholdMinutes: 360,
  },
];
