/**
 * ExperimentRegistry — Registry of all A/B experiments with typed definitions.
 *
 * Each experiment has:
 *  - Unique key (e.g. "onboarding.v2.flow")
 *  - Variant definitions (control + one or more treatments)
 *  - Assignment strategy
 *  - Success metrics to track
 *  - Status (draft/active/paused/completed)
 */

import { PmfMetricRegistry } from './PmfMetricRegistry';

export type ExperimentStatus = 'draft' | 'active' | 'paused' | 'completed' | 'archived';

export type AssignmentStrategy = 'random' | 'cohort' | 'user_attribute';

export interface Variant {
  id: string; // e.g. "control", "treatment_a"
  name: string;
  description?: string;
  trafficFraction?: number; // 0-1, sum of all variants = 1
  trafficPercent?: number; // 0-100 alias (normalized to trafficFraction)
  config?: Record<string, unknown>;
}

export interface ExperimentDefinition {
  key?: string;
  id?: string; // alias for key
  name: string;
  description: string;
  status?: ExperimentStatus;
  strategy?: AssignmentStrategy;
  variants: Variant[];
  successMetrics?: string[]; // pmf metric keys
  metrics?: string[]; // alias for successMetrics
  startDate?: string;
  endDate?: string;
  hypotheses?: string[];
  owner: string;
}

const experiments = new Map<string, ExperimentDefinition>();

/** Normalize variant aliases: trafficPercent → trafficFraction */
function normalizeVariant(v: Variant): Variant {
  if (v.trafficPercent !== undefined && v.trafficFraction === undefined) {
    return { ...v, trafficFraction: v.trafficPercent / 100 };
  }
  return { ...v, trafficFraction: v.trafficFraction ?? 1 };
}

export function registerExperiment(def: ExperimentDefinition): void {
  const key = def.key ?? def.id;
  if (!key) {
    throw new Error('Experiment must have a key or id');
  }
  if (experiments.has(key)) {
    throw new Error(`Experiment "${key}" is already registered`);
  }

  // Normalize variants
  const variants = def.variants.map(normalizeVariant);

  // Validate traffic fractions sum to ~1 (0-1 range, after normalization)
  const total = variants.reduce((sum, v) => sum + v.trafficFraction!, 0);
  if (Math.abs(total - 1) > 0.01) {
    throw new Error(
      `Experiment "${key}" variant traffic fractions sum to ${total}, expected 1`,
    );
  }

  // Validate metrics exist in PmfMetricRegistry
  const metricKeys = def.metrics ?? def.successMetrics ?? [];
  if (metricKeys.length > 0) {
    const { PmfMetricRegistry } = require('./PmfMetricRegistry');
    for (const m of metricKeys) {
      if (!PmfMetricRegistry.validateKey(m)) {
        throw new Error(`Metric "${m}" is not registered in PmfMetricRegistry`);
      }
    }
  }

  const normalized: ExperimentDefinition = {
    ...def,
    key,
    variants,
    successMetrics: metricKeys,
  };

  experiments.set(key, normalized);
}

export function getExperiment(key: string): ExperimentDefinition | undefined {
  return experiments.get(key);
}

export function getAllExperiments(): ExperimentDefinition[] {
  return Array.from(experiments.values());
}

export function getExperimentsByStatus(status: ExperimentStatus): ExperimentDefinition[] {
  return Array.from(experiments.values()).filter((e) => e.status === status);
}

export function updateExperimentStatus(key: string, status: ExperimentStatus): void {
  const exp = experiments.get(key);
  if (!exp) throw new Error(`Experiment "${key}" not found`);
  exp.status = status;
}

export function getActiveExperiments(): ExperimentDefinition[] {
  return getExperimentsByStatus('active');
}
