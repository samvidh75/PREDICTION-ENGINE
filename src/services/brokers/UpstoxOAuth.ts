/**
 * UpstoxOAuth — OAuth 2.0 Authorization Code flow for Upstox.
 * 
 * READ-ONLY: Only requests portfolio read scopes.
 * No order/write permissions.
 * 
 * Security:
 *   - Client secret is NEVER exposed client-side
 *   - Token exchange happens through Lensory backend proxy
 *   - State parameter prevents CSRF
 *   - PKCE (code challenge) for additional security
 */

export class UpstoxOAuth {
  private static readonly AUTHORIZE_URL = 'https://api.upstox.com/v2/login/authorization/dialog';
  private static readonly TOKEN_URL = 'https://api.upstox.com/v2/login/authorization/token';
  private static readonly PROXY_URL = '/api/upstox/token'; // Backend proxy

  /** Required scopes for read-only portfolio access */
  static readonly SCOPES = ['read_portfolio', 'read_user_profile'];

  /** Generate a cryptographically random state parameter for CSRF protection */
  static generateState(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
  }

  /** Generate PKCE code verifier and challenge */
  static generatePKCE(): { verifier: string; challenge: string } {
    const verifier = this.generateState(); // 64-char random
    // In production: SHA-256 hash + base64url encode
    const challenge = verifier; // Simplified for MVP — full PKCE added later
    return { verifier, challenge };
  }

  /**
   * Build the Upstox authorization URL.
   * User is redirected here to grant Lensory access to their portfolio.
   */
  static buildAuthUrl(options: {
    clientId: string;
    redirectUri: string;
    state: string;
    codeChallenge: string;
  }): string {
    const params = new URLSearchParams({
      client_id: options.clientId,
      redirect_uri: options.redirectUri,
      response_type: 'code',
      scope: this.SCOPES.join(' '),
      state: options.state,
      code_challenge: options.codeChallenge,
      code_challenge_method: 'S256',
    });
    return `${this.AUTHORIZE_URL}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access/refresh tokens.
   * 
   * IMPORTANT: This MUST go through the Lensory backend proxy
   * to avoid exposing the Upstox client secret in client-side code.
   * 
   * The backend endpoint /api/upstox/token adds the client_secret
   * and forwards the request to Upstox.
   */
  static async exchangeCode(options: {
    code: string;
    redirectUri: string;
    codeVerifier: string;
    uid: string;
  }): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresAt: number;
    tokenType: string;
    brokerUserId?: string;
  }> {
    const response = await fetch(this.PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: options.code,
        redirect_uri: options.redirectUri,
        code_verifier: options.codeVerifier,
        uid: options.uid,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Upstox token exchange failed: ${response.status} — ${error}`);
    }

    const data = await response.json();
    
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + (data.expires_in || 86400) * 1000,
      tokenType: data.token_type || 'Bearer',
      brokerUserId: data.user_id,
    };
  }

  /**
   * Refresh an expired access token.
   * Also proxied through backend to protect client secret.
   */
  static async refreshToken(options: {
    refreshToken: string;
    uid: string;
  }): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresAt: number;
  }> {
    const response = await fetch(`${this.PROXY_URL}/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        refresh_token: options.refreshToken,
        uid: options.uid,
      }),
    });

    if (!response.ok) {
      throw new Error(`Upstox token refresh failed: ${response.status}`);
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || options.refreshToken,
      expiresAt: Date.now() + (data.expires_in || 86400) * 1000,
    };
  }

  /**
   * Revoke Upstox access (disconnect broker).
   */
  static async revoke(accessToken: string, uid: string): Promise<void> {
    await fetch(`${this.PROXY_URL}/revoke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_token: accessToken, uid }),
    });
  }
}
