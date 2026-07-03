import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { randomUUID } from 'crypto';
import { UpstoxOAuth } from '../../../services/brokers/UpstoxOAuth';
import { ZerodhaProvider } from '../../../services/brokers/ZerodhaProvider';

interface BrokerHandler {
  name: string;
  displayName: string;
  tier: 1 | 2 | 3;
  initiateAuth(redirectUri: string, state: string): Promise<string>;
  exchangeCode(code: string, redirectUri: string): Promise<{ accessToken: string; refreshToken?: string; expiresAt?: number; tokenType?: string; brokerUserId?: string }>;
}

function makeGenericOAuthHandler(config: {
  name: string;
  displayName: string;
  tier: 1 | 2 | 3;
  clientIdKey: string;
  authUrl: string;
  tokenUrl: string;
  scope?: string;
}): BrokerHandler {
  return {
    name: config.name,
    displayName: config.displayName,
    tier: config.tier,
    async initiateAuth(redirectUri, state) {
      const clientId = process.env[config.clientIdKey] || '';
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        state,
      });
      if (config.scope) params.set('scope', config.scope);
      return `${config.authUrl}?${params.toString()}`;
    },
    async exchangeCode(code, redirectUri) {
      const clientId = process.env[config.clientIdKey] || '';
      const clientSecret = process.env[`${config.name.toUpperCase()}_CLIENT_SECRET`] || '';
      const resp = await fetch(config.tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }).toString(),
      });
      if (!resp.ok) throw new Error(`${config.name} token exchange failed: ${resp.status}`);
      const data: any = await resp.json();
      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: data.expires_in ? Date.now() + data.expires_in * 1000 : undefined,
        tokenType: data.token_type || 'Bearer',
        brokerUserId: data.user_id || data.account_id || undefined,
      };
    },
  };
}

function makeZerodhaHandler(): BrokerHandler {
  return {
    name: 'zerodha',
    displayName: 'Zerodha',
    tier: 1,
    async initiateAuth(redirectUri, state) {
      return new ZerodhaProvider().initiateAuth(redirectUri, state);
    },
    async exchangeCode(code, redirectUri) {
      return new ZerodhaProvider().exchangeCode(code, redirectUri);
    },
  };
}

function makeUpstoxHandler(): BrokerHandler {
  const clientId = process.env.UPSTOX_CLIENT_ID || '';
  return {
    name: 'upstox',
    displayName: 'Upstox',
    tier: 1,
    async initiateAuth(_redirectUri, state) {
      const pkce = UpstoxOAuth.generatePKCE();
      return UpstoxOAuth.buildAuthUrl({ clientId, redirectUri: _redirectUri, state, codeChallenge: pkce.challenge });
    },
    async exchangeCode(code, redirectUri) {
      const result = await UpstoxOAuth.exchangeCode({ code, redirectUri, codeVerifier: '', uid: '' });
      return result;
    },
  };
}

const BROKER_HANDLERS: Record<string, BrokerHandler> = {
  zerodha: makeZerodhaHandler(),
  upstox: makeUpstoxHandler(),
  groww: makeGenericOAuthHandler({
    name: 'groww', displayName: 'Groww', tier: 1,
    clientIdKey: 'GROWW_CLIENT_ID', scope: 'full_access',
    authUrl: 'https://api.groww.in/oauth/authorize',
    tokenUrl: 'https://api.groww.in/oauth/token',
  }),
  '5paisa': makeGenericOAuthHandler({
    name: '5paisa', displayName: '5paisa', tier: 2,
    clientIdKey: 'FIVEPAISA_CLIENT_ID',
    authUrl: 'https://openapi.5paisa.com/V1/Login',
    tokenUrl: 'https://openapi.5paisa.com/V1/Login/RequestToken',
  }),
  shoonya: makeGenericOAuthHandler({
    name: 'shoonya', displayName: 'Shoonya', tier: 2,
    clientIdKey: 'SHOONYA_CLIENT_ID',
    authUrl: 'https://api.shoonya.com/NorenW/NorenWBridge/Login',
    tokenUrl: 'https://api.shoonya.com/NorenW/NorenWBridge/Token',
  }),
  finvasia: makeGenericOAuthHandler({
    name: 'finvasia', displayName: 'Finvasia', tier: 2,
    clientIdKey: 'FINVASIA_CLIENT_ID',
    authUrl: 'https://auth.finvasia.com/connect/authorize',
    tokenUrl: 'https://auth.finvasia.com/connect/token',
  }),
  angelone: makeGenericOAuthHandler({
    name: 'angelone', displayName: 'Angel One', tier: 3,
    clientIdKey: 'ANGELONE_CLIENT_ID',
    authUrl: 'https://smartapi.angelbroking.com/auth/login',
    tokenUrl: 'https://smartapi.angelbroking.com/auth/token',
  }),
};

export async function registerBrokerAuthRoutes(app: FastifyInstance) {
  app.post<{ Params: { brokerName: string } }>(
    '/api/auth/broker/:brokerName/login',
    async (request: FastifyRequest<{ Params: { brokerName: string } }>, reply: FastifyReply) => {
      const { brokerName } = request.params;
      const handler = BROKER_HANDLERS[brokerName];

      if (!handler) {
        return reply.status(400).send({
          error: `Broker '${brokerName}' not supported`,
          supported: Object.keys(BROKER_HANDLERS),
        });
      }

      const state = randomUUID();
      const redirectUri = `${process.env.VITE_APP_ORIGIN || 'https://stockstory-india.com'}/auth/${brokerName}/callback`;
      const authUrl = await handler.initiateAuth(redirectUri, state);

      return reply.send({ authUrl, state, broker: brokerName });
    }
  );

  app.get<{ Params: { brokerName: string }; Querystring: { code: string; state: string } }>(
    '/api/auth/broker/:brokerName/callback',
    async (request: FastifyRequest<{ Params: { brokerName: string }; Querystring: { code: string; state: string } }>, reply: FastifyReply) => {
      const { brokerName } = request.params;
      const { code } = request.query;
      const handler = BROKER_HANDLERS[brokerName];

      if (!handler) {
        return reply.status(400).send({ error: 'Broker not supported' });
      }
      if (!code) {
        return reply.status(400).send({ error: 'Authorization code required' });
      }

      try {
        const redirectUri = `${process.env.VITE_APP_ORIGIN || 'https://stockstory-india.com'}/auth/${brokerName}/callback`;
        const authResult = await handler.exchangeCode(code, redirectUri);
        const userId = (request as any).uid || 'anonymous';

        const { dbAdapter } = await import('../../../db/DatabaseAdapter');
        await dbAdapter.query(
          `INSERT INTO broker_connections (user_id, broker, access_token_enc, refresh_token_enc, token_type, expires_at, broker_user_id, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
           ON CONFLICT (user_id, broker, status) WHERE status = 'active'
           DO UPDATE SET access_token_enc = EXCLUDED.access_token_enc, refresh_token_enc = EXCLUDED.refresh_token_enc, expires_at = EXCLUDED.expires_at, updated_at = NOW()`,
          [
            userId,
            brokerName,
            authResult.accessToken,
            authResult.refreshToken || null,
            authResult.tokenType || 'Bearer',
            authResult.expiresAt ? new Date(authResult.expiresAt) : null,
            authResult.brokerUserId || null,
          ]
        );

        return reply.redirect(`/invest/broker-connected?broker=${brokerName}`);
      } catch (err: any) {
        request.log.error({ err }, `OAuth exchange failed for ${brokerName}`);
        return reply.status(500).send({ error: `Token exchange failed: ${err.message}` });
      }
    }
  );

  app.get(
    '/api/auth/broker/accounts',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).uid;
      if (!userId) {
        return reply.status(401).send({ error: 'Not authenticated' });
      }

      const { dbAdapter } = await import('../../../db/DatabaseAdapter');
      const result = await dbAdapter.query(
        `SELECT broker, label, status, expires_at, created_at
         FROM broker_connections
         WHERE user_id = $1
         ORDER BY created_at DESC`,
        [userId]
      );

      return reply.send({
        accounts: result.rows.map((row: any) => ({
          broker: row.broker,
          label: row.label,
          status: row.status,
          linkedAt: row.created_at,
          expiresAt: row.expires_at,
        })),
      });
    }
  );

  app.post<{ Body: { brokerName: string } }>(
    '/api/auth/broker/unlink',
    async (request: FastifyRequest<{ Body: { brokerName: string } }>, reply: FastifyReply) => {
      const { brokerName } = request.body;
      const userId = (request as any).uid;

      if (!userId) {
        return reply.status(401).send({ error: 'Not authenticated' });
      }

      const { dbAdapter } = await import('../../../db/DatabaseAdapter');
      await dbAdapter.query(
        `UPDATE broker_connections SET status = 'revoked', updated_at = NOW()
         WHERE user_id = $1 AND broker = $2 AND status = 'active'`,
        [userId, brokerName]
      );

      return reply.send({ success: true, message: `Unlinked ${brokerName}` });
    }
  );

  app.get('/api/auth/broker/list', async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({
      brokers: Object.entries(BROKER_HANDLERS).map(([name, h]) => ({
        name,
        displayName: h.displayName,
        tier: h.tier,
      })),
    });
  });
}
