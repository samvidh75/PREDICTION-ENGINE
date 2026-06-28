/**
 * Job Registry
 *
 * Central registry of all intelligence jobs.
 * Each job is registered with its name and factory function.
 */

import type { IngestionJob } from '../ingestion/IngestionTypes';
import { JobRunner } from './JobRunner';
import { GenerateResearchSnapshotsJob } from './GenerateResearchSnapshotsJob';
import { RefreshRankingsJob } from './RefreshRankingsJob';
import { GenerateWatchlistAlertsJob } from './GenerateWatchlistAlertsJob';

export function createJobRunner(options?: {
  research?: ConstructorParameters<typeof GenerateResearchSnapshotsJob>;
  rankings?: ConstructorParameters<typeof RefreshRankingsJob>;
  alerts?: ConstructorParameters<typeof GenerateWatchlistAlertsJob>;
}): JobRunner {
  const runner = new JobRunner();

  // Register research snapshot job
  if (options?.research) {
    runner.register(new GenerateResearchSnapshotsJob(...options.research));
  }

  // Register rankings refresh job
  if (options?.rankings) {
    runner.register(new RefreshRankingsJob(...options.rankings));
  }

  // Register watchlist alerts job
  if (options?.alerts) {
    runner.register(new GenerateWatchlistAlertsJob(...options.alerts));
  }

  return runner;
}
