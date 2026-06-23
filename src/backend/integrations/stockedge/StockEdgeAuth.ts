import { loadStockEdgeConfig } from "./StockEdgeConfig";
import { STOCKEDGE_CODES, StockEdgeIntegrationError } from "./StockEdgeErrors";
import { stockEdgeSessionStore } from "./StockEdgeSessionStore";
import type { StockEdgeSession } from "./StockEdgeSessionStore";
import type { StockEdgeConfig } from "./StockEdgeTypes";

export type StockEdgeLoginStrategy = "http_form" | "none";

function now(): string {
  return new Date().toISOString();
}

function expiresIn(seconds: number): string {
  return new Date(Date.now() + seconds * 1000).toISOString();
}

export interface StockEdgeLoginResult {
  ok: boolean;
  strategy: StockEdgeLoginStrategy;
  sessionCreated: boolean;
  mfaRequired: boolean;
  errorCode?: string;
}

export class StockEdgeAuth {
  private readonly config: StockEdgeConfig;

  constructor(config?: StockEdgeConfig) {
    this.config = config ?? loadStockEdgeConfig();
  }

  configSummary(): Record<string, boolean | number> {
    return {
      enabled: this.config.enabled,
      hasAccountId: Boolean(this.config.accountId),
      hasPassword: Boolean(this.config.password),
      hasBaseUrl: Boolean(this.config.baseUrl),
      hasLoginUrl: Boolean(this.config.loginUrl),
      loginUrlExplicit: this.config.loginUrlExplicit,
      hasLoginFormAction: Boolean(this.config.loginFormAction),
      timeoutMs: this.config.timeoutMs,
      rateLimitPerMinute: this.config.rateLimitPerMinute,
      sessionTtlSeconds: this.config.sessionTtlSeconds,
    };
  }

  async ensureSession(): Promise<StockEdgeSession> {
    const existing = stockEdgeSessionStore.getSession();
    if (existing) return existing;

    const result = await this.login();
    if (!result.ok || !result.sessionCreated) {
      throw new StockEdgeIntegrationError(
        result.errorCode ?? STOCKEDGE_CODES.loginFailed,
        "StockEdge login failed",
      );
    }

    const session = stockEdgeSessionStore.getSession();
    if (!session) {
      throw new StockEdgeIntegrationError(
        STOCKEDGE_CODES.loginFailed,
        "Session not created after login",
      );
    }

    return session;
  }

  async login(): Promise<StockEdgeLoginResult> {
    if (!this.config.enabled) {
      return { ok: false, strategy: "none", sessionCreated: false, mfaRequired: false, errorCode: STOCKEDGE_CODES.disabled };
    }

    if (!this.config.accountId || !this.config.password) {
      return { ok: false, strategy: "none", sessionCreated: false, mfaRequired: false, errorCode: STOCKEDGE_CODES.authNotConfigured };
    }

    try {
      const session = await this.attemptHttpFormLogin();
      stockEdgeSessionStore.setSession(session);
      return { ok: true, strategy: "http_form", sessionCreated: true, mfaRequired: false };
    } catch (error) {
      if (error instanceof StockEdgeIntegrationError) {
        return { ok: false, strategy: "http_form", sessionCreated: false, mfaRequired: error.code === STOCKEDGE_CODES.mfaRequired, errorCode: error.code };
      }
      return { ok: false, strategy: "http_form", sessionCreated: false, mfaRequired: false, errorCode: STOCKEDGE_CODES.loginFailed };
    }
  }

  private async attemptHttpFormLogin(): Promise<StockEdgeSession> {
    const baseUrl = this.config.baseUrl || "https://web.stockedge.com";

    if (!this.config.loginUrlExplicit && !this.config.loginFormAction) {
      throw new StockEdgeIntegrationError(
        STOCKEDGE_CODES.discoveryRequired,
        "StockEdge login endpoint not configured. Set STOCKEDGE_LOGIN_URL or STOCKEDGE_LOGIN_FORM_ACTION, or run endpoint discovery first.",
      );
    }

    const loginUrl = this.config.loginUrl || baseUrl;
    const formAction = this.config.loginFormAction || `${loginUrl}/api/login`;
    const verifyUrl = `${baseUrl}/api/user/profile`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const fetchImpl = globalThis.fetch;

      const loginPageResponse = await fetchImpl(loginUrl, {
        signal: controller.signal,
        redirect: "follow",
      });
      const setCookie = loginPageResponse.headers.get("set-cookie");
      const initialCookies = setCookie || "";

      const formBody = new URLSearchParams();
      formBody.set("email", this.config.accountId!);
      formBody.set("password", this.config.password!);

      const loginResponse = await fetchImpl(formAction, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Cookie: initialCookies,
          "User-Agent": "Mozilla/5.0",
        },
        body: formBody,
        signal: controller.signal,
        redirect: "follow",
      });

      const finalCookies = loginResponse.headers.get("set-cookie") || initialCookies;

      if (!finalCookies || finalCookies.length < 10) {
        throw new StockEdgeIntegrationError(
          STOCKEDGE_CODES.loginFailed,
          "No session cookies returned from login — endpoint may need discovery",
        );
      }

      const verifyResponse = await fetchImpl(verifyUrl, {
        headers: { Cookie: finalCookies, Accept: "application/json" },
        signal: controller.signal,
      });

      if (!verifyResponse.ok) {
        if (verifyResponse.status === 401) {
          throw new StockEdgeIntegrationError(STOCKEDGE_CODES.loginFailed, "Login verification returned 401");
        }
        throw new StockEdgeIntegrationError(
          STOCKEDGE_CODES.loginFailed,
          `Login verification returned ${verifyResponse.status}`,
        );
      }

      return {
        cookieHeader: finalCookies,
        createdAt: now(),
        expiresAt: expiresIn(this.config.sessionTtlSeconds),
        metadata: { loginHost: new URL(baseUrl).host },
      };
    } catch (error) {
      if (error instanceof StockEdgeIntegrationError) throw error;
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new StockEdgeIntegrationError(STOCKEDGE_CODES.timeout, "Login request timed out");
      }
      throw new StockEdgeIntegrationError(STOCKEDGE_CODES.loginFailed, "Login network error");
    } finally {
      clearTimeout(timeout);
    }
  }
}

export const stockEdgeAuth = new StockEdgeAuth();
