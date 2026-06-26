import type { FastifyInstance, FastifyPluginAsync } from 'fastify';

const STRIPE_PLANS = {
  investor: { priceId: 'price_investor_monthly', amount: 49900, name: 'Investor' },
  pro: { priceId: 'price_pro_monthly', amount: 99900, name: 'Pro' },
  professional: { priceId: 'price_professional_monthly', amount: 199900, name: 'Professional' },
};

const stripeRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get('/api/stripe/plans', async (_request, reply) => {
    return reply.send({
      plans: Object.entries(STRIPE_PLANS).map(([key, plan]) => ({
        id: key,
        ...plan,
        amount: plan.amount / 100,
        currency: 'INR',
      })),
    });
  });

  fastify.post<{ Body: { plan: string; successUrl?: string; cancelUrl?: string } }>(
    '/api/stripe/create-checkout',
    async (request, reply) => {
      const { plan } = request.body;
      const planConfig = STRIPE_PLANS[plan as keyof typeof STRIPE_PLANS];
      if (!planConfig) {
        return reply.status(400).send({ error: 'Invalid plan' });
      }

      return reply.send({
        url: `/pricing?plan=${plan}&redirected=true`,
        plan: planConfig,
      });
    },
  );

  fastify.post('/api/stripe/webhook', async (request, reply) => {
    const sig = request.headers['stripe-signature'] as string | undefined;
    if (!sig) {
      return reply.status(400).send({ error: 'Missing stripe-signature header' });
    }
    return reply.send({ received: true });
  });
};

export default stripeRoutes;
