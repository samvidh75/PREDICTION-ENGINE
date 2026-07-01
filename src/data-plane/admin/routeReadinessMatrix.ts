/**
 * routeReadinessMatrix.ts — Internal route readiness matrix builder.
 *
 * Combines ROUTE_SNAPSHOT_DEPENDENCIES with live snapshot readiness checks
 * to produce a per-route matrix showing whether each route can serve
 * content from precomputed data.
 *
 * Admin-only — never exposed on public routes.
 */

import { ROUTE_SNAPSHOT_DEPENDENCIES, type RouteSnapshotDependency } from './routeFallbackConfig';
import { getSnapshotReadiness } from './snapshotReadiness';

export interface RouteReadinessRow {
  route: string;
  snapshotKind: string;
  description: string;
  staleThresholdMinutes: number;
  available: boolean;
  ok: boolean;
}

export interface RouteReadinessMatrix {
  generatedAt: string;
  rows: RouteReadinessRow[];
  summary: {
    totalRoutes: number;
    ready: number;
    degraded: number;
    ok: boolean;
  };
}

/**
 * Build a readiness matrix mapping each route to its precomputed snapshot status.
 */
export async function buildRouteReadinessMatrix(
  staleThresholdMinutes?: number,
): Promise<RouteReadinessMatrix> {
  const now = new Date().toISOString();

  // Collect unique snapshot kinds with their thresholds from the route config
  const kindThresholdMap = new Map<string, number>();
  const depsByKind = new Map<string, RouteSnapshotDependency[]>();

  for (const dep of ROUTE_SNAPSHOT_DEPENDENCIES) {
    const existing = kindThresholdMap.get(dep.requiredSnapshotKind);
    if (existing === undefined || dep.staleThresholdMinutes < existing) {
      kindThresholdMap.set(dep.requiredSnapshotKind, dep.staleThresholdMinutes);
    }
    const deps = depsByKind.get(dep.requiredSnapshotKind) ?? [];
    deps.push(dep);
    depsByKind.set(dep.requiredSnapshotKind, deps);
  }

  // Build a blank timestamp map for the readiness check
  // In production, replace with actual last-run timestamps from JobRunStore
  const blankTimestamps: Record<string, string | null> = {};
  for (const kind of kindThresholdMap.keys()) {
    blankTimestamps[kind] = null;
  }

  const readinessMap = await getSnapshotReadiness(blankTimestamps, staleThresholdMinutes);

  // Assemble rows
  const rows: RouteReadinessRow[] = ROUTE_SNAPSHOT_DEPENDENCIES.map((dep) => {
    const snapshotHealth = readinessMap[dep.requiredSnapshotKind];
    return {
      route: dep.route,
      snapshotKind: dep.requiredSnapshotKind,
      description: dep.description,
      staleThresholdMinutes: dep.staleThresholdMinutes,
      available: snapshotHealth?.available ?? false,
      ok: snapshotHealth?.ok ?? false,
    };
  });

  const ready = rows.filter((r) => r.ok).length;
  const degraded = rows.filter((r) => !r.ok).length;

  return {
    generatedAt: now,
    rows,
    summary: {
      totalRoutes: rows.length,
      ready,
      degraded,
      ok: degraded === 0,
    },
  };
}
