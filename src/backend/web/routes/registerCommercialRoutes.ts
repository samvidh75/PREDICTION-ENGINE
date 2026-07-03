import type { FastifyInstance } from 'fastify';

export async function registerCommercialRoutes(server: FastifyInstance) {
  const { registerCheckoutRoutes } = await import('../../../src/commercial/api/checkoutRoutes.js');
  await registerCheckoutRoutes(server);

  const { registerAnalyticsRoutes } = await import('../../../src/commercial/api/analyticsRoutes.js');
  await registerAnalyticsRoutes(server);

  const { agentChatRoutes } = await import('../../../src/commercial/api/agentChatRoutes');
  await agentChatRoutes(server);

  const { registerAlertRoutes } = await import('../../../src/commercial/api/alertRoutes.js');
  await registerAlertRoutes(server);

  const { registerBrokerRoutes } = await import('../../../src/commercial/api/brokerRoutes.js');
  await registerBrokerRoutes(server);

  const { registerAlertPreferencesRoutes } = await import('../../../src/commercial/api/alertPreferencesRoutes.js');
  await registerAlertPreferencesRoutes(server);

  const { registerOptionsRoutes } = await import('../../../src/commercial/api/optionsRoutes.js');
  await registerOptionsRoutes(server);

  const { registerPortfolioSyncRoutes } = await import('../../../src/commercial/api/portfolioSyncRoutes.js');
  await registerPortfolioSyncRoutes(server);

  const { registerPortfolioPrecisionRoutes } = await import('../../../src/commercial/api/portfolioPrecisionRoutes.js');
  await registerPortfolioPrecisionRoutes(server);

  const { registerOpsRoutes } = await import('../../../src/commercial/api/opsRoutes.js');
  await registerOpsRoutes(server);

  const { registerLedgerRoutes } = await import('../../../src/commercial/api/ledgerRoutes.js');
  await registerLedgerRoutes(server);

  const { registerInsiderRoutes } = await import('../../../src/commercial/api/insiderRoutes.js');
  await registerInsiderRoutes(server);

  const { registerSentimentRoutes } = await import('../../../src/commercial/api/sentimentRoutes.js');
  await registerSentimentRoutes(server);
}
