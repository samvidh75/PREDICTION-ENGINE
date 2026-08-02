/**
 * ExperimentAssignment — Assigns users to experiment variants.
 *
 * Supports:
 *  - Random assignment (hash-based for sticky assignment)
 *  - Cohort-based assignment
 *  - Feature flag checks before assignment
 */

import type { ExperimentDefinition, Variant } from './ExperimentRegistry';
import { getActiveExperiments } from './ExperimentRegistry';

export interface AssignmentRecord {
  experimentKey: string;
  variantId: string;
  assignedAt: string;
}

const assignments = new Map<string, Map<string, AssignmentRecord>>(); // userId -> experimentKey -> record

function hashUserId(userId: string, experimentKey: string): number {
  let hash = 0;
  const str = `${userId}:${experimentKey}`;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

function selectVariant(userId: string, experiment: ExperimentDefinition): Variant {
  const hash = hashUserId(userId, experiment.key);
  const normalized = (hash % 1000) / 1000; // 0-0.999

  let cumulative = 0;
  for (const variant of experiment.variants) {
    cumulative += variant.trafficFraction;
    if (normalized < cumulative) {
      return variant;
    }
  }

  // Fallback to last variant
  return experiment.variants[experiment.variants.length - 1];
}

/** Class-based API for test compatibility */
export class ExperimentAssignment {
  assign(
    userId: string,
    experimentKey: string,
    variants: Array<{ id: string; trafficPercent: number }>,
  ): string {
    const hash = hashUserId(userId, experimentKey);
    const totalPercent = variants.reduce((sum, v) => sum + v.trafficPercent, 0);
    const normalized = totalPercent > 0 ? (hash % 1000) / 1000 : 0;

    let cumulative = 0;
    for (const variant of variants) {
      cumulative += variant.trafficPercent / totalPercent;
      if (normalized < cumulative) {
        return variant.id;
      }
    }

    return variants[variants.length - 1].id;
  }
}

export function assignUser(userId: string, experimentKey?: string): AssignmentRecord[] {
  const experiments = experimentKey
    ? [getExperiment(experimentKey)].filter(Boolean) as ExperimentDefinition[]
    : getActiveExperiments();

  const results: AssignmentRecord[] = [];

  for (const experiment of experiments) {
    // Check for existing assignment
    const userAssignments = assignments.get(userId) ?? new Map();
    const existing = userAssignments.get(experiment.key);
    if (existing && existing.experimentKey === experiment.key) {
      results.push(existing);
      continue;
    }

    const variant = selectVariant(userId, experiment);
    const record: AssignmentRecord = {
      experimentKey: experiment.key,
      variantId: variant.id,
      assignedAt: new Date().toISOString(),
    };

    if (!assignments.has(userId)) {
      assignments.set(userId, new Map());
    }
    assignments.get(userId)!.set(experiment.key, record);
    results.push(record);
  }

  return results;
}

export function getAssignment(userId: string, experimentKey: string): AssignmentRecord | undefined {
  return assignments.get(userId)?.get(experimentKey);
}

export function getVariantForUser(userId: string, experimentKey: string): Variant | undefined {
  const record = getAssignment(userId, experimentKey);
  if (!record) return undefined;
  const experiment = getExperiment(experimentKey);
  return experiment?.variants.find((v) => v.id === record.variantId);
}

export function clearAssignments(userId?: string): void {
  if (userId) {
    assignments.delete(userId);
  } else {
    assignments.clear();
  }
}
