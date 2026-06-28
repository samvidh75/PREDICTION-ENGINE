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

export type ExperimentStatus = 'draft' | 'active' | 'paused' | 'completed' | 'archived';

export type AssignmentStrategy = 'random' | 'cohort' | 'user_attribute';

export interface Variant {
  id: string; // e.g. "control", "treatment_a"
  name: string;
  description: string;
  trafficFraction: number; // 0-1, sum of all variants = 1
  config: Record<string, unknown>;
}

export interface ExperimentDefinition {
  key: string;
  name: string;
  description: string;
  status: ExperimentStatus;
  strategy: AssignmentStrategy;
  variants: Variant[];
  successMetrics: string[]; // pmf metric keys
  startDate?: string;
  endDate?: string;
  hypotheses: string[];
  owner: string;
}

const experiments = new Map<string, ExperimentDefinition>();

export function registerExperiment(def: ExperimentDefinition): void {
  if (experiments.has(def.key)) {
    throw new Error(`Experiment "${def.key}" is already registered`);
  }
  // Validate traffic fractions sum to ~1
  const total = def.variants.reduce((sum, v) => sum + v.trafficFraction, 0);
  if (Math.abs(total - 1) > 0.01) {
    throw new Error(
      `Experiment "${def.key}" variant traffic fractions sum to ${total}, expected 1`,
    );
  }
  experiments.set(def.key, def);
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
