import type { FastifyInstance } from 'fastify';
import { registerBacktestRoutes } from './backtestRoutes.js';
import { registerEarningsSentimentRoutes } from './earningsSentimentRoutes.js';
import { registerPortfolioOptimizationRoutes } from './portfolioOptimization.js';
import { registerUnifiedAlertsRoutes } from './unifiedAlertsRoutes.js';
import { registerMLSignalRoutes } from './mlSignalsRoutes.js';
import { registerRiskRoutes } from './riskRoutes.js';
import { registerCommunityRoutes } from './communityRoutes.js';
import { registerEarningsRoutes } from './earningsRoutes.js';
import { registerDataWarehouseRoutes } from './dataWarehouseRoutes.js';
import { registerMarketDepthRoutes } from './marketDepthRoutes.js';
import { registerAlertsRoutes } from './alertsRoutes.js';

export async function registerFeatureRoutes(server: FastifyInstance) {
  await registerBacktestRoutes(server);
  await registerPortfolioOptimizationRoutes(server);
  await registerUnifiedAlertsRoutes(server);
  await registerEarningsSentimentRoutes(server);
  await registerMLSignalRoutes(server);
  await registerRiskRoutes(server);
  await registerCommunityRoutes(server);
  await registerEarningsRoutes(server);
  await registerDataWarehouseRoutes(server);
  await registerMarketDepthRoutes(server);
  await registerAlertsRoutes(server);
}
