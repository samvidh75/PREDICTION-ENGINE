import type { FastifyInstance } from 'fastify';
import { registerBacktestRoutes } from './backtestRoutes.js';
import { registerEarningsSentimentRoutes } from './earningsSentimentRoutes.js';
import { registerPortfolioOptimizationRoutes } from './portfolioOptimization.js';
import { registerUnifiedAlertsRoutes } from './unifiedAlertsRoutes.js';

export async function registerFeatureRoutes(server: FastifyInstance) {
  await registerBacktestRoutes(server);
  await registerPortfolioOptimizationRoutes(server);
  await registerUnifiedAlertsRoutes(server);
  await registerEarningsSentimentRoutes(server);
}
