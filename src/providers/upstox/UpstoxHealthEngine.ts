export type UpstoxTokenStatus = 'missing' | 'accepted' | 'rejected' | 'expired' | 'pending_approval' | 'requested';

export interface UpstoxHealthResult {
  configured: boolean;
  tokenStatus: UpstoxTokenStatus;
  apiKeyPresent: boolean;
  clientSecretPresent: boolean;
  redirectUriPresent: boolean;
  sandboxMode: boolean;
  status: 'ok' | 'degraded' | 'unconfigured';
  detail: string;
}

export class UpstoxHealthEngine {
  checkHealth(): UpstoxHealthResult {
    const sandboxMode = process.env.UPSTOX_SANDBOX_ENABLED === 'true' || process.env.UPSTOX_SANDBOX_MODE === 'true';
    const token = sandboxMode ? process.env.UPSTOX_SANDBOX_ACCESS_TOKEN : process.env.UPSTOX_ACCESS_TOKEN;
    const apiKey = process.env.UPSTOX_API_KEY;
    const clientSecret = process.env.UPSTOX_CLIENT_SECRET;
    const redirectUri = process.env.UPSTOX_REDIRECT_URI;

    const apiKeyPresent = Boolean(apiKey);
    const clientSecretPresent = Boolean(clientSecret);
    const redirectUriPresent = Boolean(redirectUri);

    let tokenStatus: UpstoxTokenStatus = 'missing';
    let detail = '';

    const modeLabel = sandboxMode ? 'sandbox' : 'production';

    if (token && token.length > 10) {
      tokenStatus = 'accepted';
      detail = `Upstox ${modeLabel} access token is present and accepted`;
    } else if (token) {
      tokenStatus = 'rejected';
      detail = `Upstox ${modeLabel} access token present but appears invalid (too short)`;
    } else {
      detail = `No Upstox ${modeLabel} access token set`;
    }

    if (!apiKeyPresent) {
      detail += '; UPSTOX_API_KEY missing';
    }
    if (!clientSecretPresent) {
      detail += '; UPSTOX_CLIENT_SECRET missing';
    }
    if (!redirectUriPresent) {
      detail += '; UPSTOX_REDIRECT_URI missing';
    }

    const configured = tokenStatus === 'accepted' && apiKeyPresent && clientSecretPresent;
    const status: UpstoxHealthResult['status'] = configured
      ? 'ok'
      : tokenStatus === 'accepted'
        ? 'degraded'
        : 'unconfigured';

    return {
      configured,
      tokenStatus,
      apiKeyPresent,
      clientSecretPresent,
      redirectUriPresent,
      sandboxMode,
      status,
      detail,
    };
  }
}

export const upstoxHealthEngine = new UpstoxHealthEngine();
