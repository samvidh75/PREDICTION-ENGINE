import type { FastifyInstance } from 'fastify';

export async function registerCommercialRoutes(server: FastifyInstance) {
  const { registerCheckoutRoutes } = await import('../../../commercial/api/checkoutRoutes.js');
  await registerCheckoutRoutes(server);

  const { registerAnalyticsRoutes } = await import('../../../commercial/api/analyticsRoutes.js');
  await registerAnalyticsRoutes(server);

  const { agentChatRoutes } = await import('../../../commercial/api/agentChatRoutes.js');
  await agentChatRoutes(server);

  const { registerAlertRoutes } = await import('../../../commercial/api/alertRoutes.js');
  await registerAlertRoutes(server);

  const { registerBrokerRoutes } = await import('../../../commercial/api/brokerRoutes.js');
  await registerBrokerRoutes(server);

  const { registerAlertPreferencesRoutes } = await import('../../../commercial/api/alertPreferencesRoutes.js');
  await registerAlertPreferencesRoutes(server);

  const { registerOptionsRoutes } = await import('../../../commercial/api/optionsRoutes.js');
  await registerOptionsRoutes(server);

  const { registerPortfolioSyncRoutes } = await import('../../../commercial/api/portfolioSyncRoutes.js');
  await registerPortfolioSyncRoutes(server);

  const { registerPortfolioPrecisionRoutes } = await import('../../../commercial/api/portfolioPrecisionRoutes.js');
  await registerPortfolioPrecisionRoutes(server);

  const { registerOpsRoutes } = await import('../../../commercial/api/opsRoutes.js');
  await registerOpsRoutes(server);

  const { registerLedgerRoutes } = await import('../../../commercial/api/ledgerRoutes.js');
  await registerLedgerRoutes(server);

  const { registerInsiderRoutes } = await import('../../../commercial/api/insiderRoutes.js');
  await registerInsiderRoutes(server);

  const { registerSentimentRoutes } = await import('../../../commercial/api/sentimentRoutes.js');
  await registerSentimentRoutes(server);
}
