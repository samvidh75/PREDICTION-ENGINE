import { chromium } from "playwright";
import { loadStockEdgeConfig } from "./StockEdgeConfig";
import { STOCKEDGE_CODES, StockEdgeIntegrationError } from "./StockEdgeErrors";
import { stockEdgeSessionStore } from "./StockEdgeSessionStore";
import type { StockEdgeSession } from "./StockEdgeSessionStore";
import type { StockEdgeConfig } from "./StockEdgeTypes";

const ACCOUNT_SELECTORS = [
  "input[type=email]",
  "input[name*=email]",
  "input[name*=user]",
  "input[autocomplete=username]",
  "input[placeholder*=email i]",
  "input[placeholder*=account i]",
  "input[placeholder*=mobile i]",
  "input[placeholder*=user i]",
];

const PASSWORD_SELECTORS = [
  "input[type=password]",
  "input[name*=password]",
  "input[autocomplete=current-password]",
];

const SUBMIT_SELECTORS = [
  "button[type=submit]",
  "button:has-text('Login')",
  "button:has-text('Sign in')",
  "button:has-text('Continue')",
  "button:has-text('Submit')",
];

const MFA_INDICATORS = [
  "input[autocomplete=one-time-code]",
  "input[placeholder*=OTP i]",
  "input[placeholder*=MFA i]",
  "input[placeholder*=2FA i]",
  "text=One Time Password",
  "text=Two Factor",
  "text=2FA",
  "text=Verification Code",
  "text=Authenticator",
  "text=Security Challenge",
  "text=Enter the code",
  "iframe[src*=recaptcha]",
  "iframe[src*=captcha]",
  "div:has-text('captcha')",
];

export class StockEdgePlaywrightAuth {
  private readonly config: StockEdgeConfig;

  constructor(config?: StockEdgeConfig) {
    this.config = config ?? loadStockEdgeConfig();
  }

  async login(): Promise<StockEdgeSession> {
    const loginUrl = this.config.loginUrl || this.config.baseUrl || "https://web.stockedge.com";
    if (!this.config.accountId || !this.config.password) {
      throw new StockEdgeIntegrationError(STOCKEDGE_CODES.authNotConfigured, "StockEdge account credentials not configured");
    }
    const accountId = this.config.accountId;
    const password = this.config.password;

    const browser = await chromium.launch({ headless: true });
    try {
      const context = await browser.newContext({
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      });
      const page = await context.newPage();
      page.setDefaultTimeout(this.config.timeoutMs);

      await page.goto(loginUrl, { waitUntil: "networkidle", timeout: this.config.timeoutMs });

      await this.fillField(page, ACCOUNT_SELECTORS, accountId);
      await this.fillField(page, PASSWORD_SELECTORS, password);

      const submitButton = page.locator(SUBMIT_SELECTORS.join(","));
      if (await submitButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await submitButton.click();
      } else {
        await page.keyboard.press("Enter");
      }

      await page.waitForLoadState("networkidle", { timeout: this.config.timeoutMs }).catch(() => {});

      const mfaDetected = await this.checkMfa(page);
      if (mfaDetected) {
        throw new StockEdgeIntegrationError(STOCKEDGE_CODES.mfaRequired, "MFA/OTP/CAPTCHA challenge detected");
      }

      const cookies = await context.cookies();
      if (cookies.length === 0) {
        throw new StockEdgeIntegrationError(STOCKEDGE_CODES.loginFailed, "No cookies returned after login");
      }

      const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");

      return {
        cookieHeader,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + this.config.sessionTtlSeconds * 1000).toISOString(),
        metadata: {
          loginHost: new URL(loginUrl).host,
        },
      };
    } finally {
      await browser.close();
    }
  }

  private async fillField(page: import("playwright").Page, selectors: string[], value: string): Promise<void> {
    for (const selector of selectors) {
      const field = page.locator(selector).first();
      if (await field.isVisible({ timeout: 3000 }).catch(() => false)) {
        await field.fill(value);
        return;
      }
    }
    throw new StockEdgeIntegrationError(STOCKEDGE_CODES.loginFailed, `Could not find input field matching any known selector`);
  }

  private async checkMfa(page: import("playwright").Page): Promise<boolean> {
    const currentUrl = page.url().toLowerCase();
    if (currentUrl.includes("2fa") || currentUrl.includes("mfa") || currentUrl.includes("otp") || currentUrl.includes("verify") || currentUrl.includes("challenge") || currentUrl.includes("captcha")) {
      return true;
    }
    for (const indicator of MFA_INDICATORS) {
      const element = page.locator(indicator).first();
      if (await element.isVisible({ timeout: 2000 }).catch(() => false)) {
        return true;
      }
    }
    return false;
  }

  async discoverEndpoints(symbol: string): Promise<{
    endpoints: {
      layer: string;
      method: string;
      url: string;
      host: string;
      status: number;
      contentType: string;
      sampleKeys: string[];
    }[];
  }> {
    const loginUrl = this.config.loginUrl || this.config.baseUrl || "https://web.stockedge.com";
    if (!this.config.accountId || !this.config.password) {
      throw new StockEdgeIntegrationError(STOCKEDGE_CODES.authNotConfigured, "StockEdge account credentials not configured");
    }
    const accountId = this.config.accountId;
    const password = this.config.password;

    const browser = await chromium.launch({ headless: true });
    try {
      const context = await browser.newContext();
      const page = await context.newPage();
      page.setDefaultTimeout(this.config.timeoutMs);

      const capturedRequests: Map<string, { status: number; contentType: string; body: unknown }> = new Map();

      page.on("response", async (response) => {
        const url = response.url();
        const ct = response.headers()["content-type"] || "";
        if (ct.includes("json") && response.status() === 200) {
          try {
            const body = await response.json();
            const keys = typeof body === "object" && body !== null ? Object.keys(body as Record<string, unknown>) : [];
            if (keys.length > 0) {
              capturedRequests.set(url, { status: response.status(), contentType: ct, body });
            }
          } catch {
            capturedRequests.set(url, { status: response.status(), contentType: ct, body: null });
          }
        }
      });

      await page.goto(loginUrl, { waitUntil: "networkidle", timeout: this.config.timeoutMs });

      await this.fillField(page, ACCOUNT_SELECTORS, accountId);
      await this.fillField(page, PASSWORD_SELECTORS, password);

      const submitButton = page.locator(SUBMIT_SELECTORS.join(","));
      if (await submitButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await submitButton.click();
      } else {
        await page.keyboard.press("Enter");
      }

      await page.waitForLoadState("networkidle", { timeout: this.config.timeoutMs }).catch(() => {});

      const mfaDetected = await this.checkMfa(page);
      if (mfaDetected) {
        throw new StockEdgeIntegrationError(STOCKEDGE_CODES.mfaRequired, "MFA/OTP/CAPTCHA challenge detected at login");
      }

      await page.goto(`${loginUrl}/stocks/${symbol}`, { waitUntil: "networkidle", timeout: this.config.timeoutMs }).catch(() => {});

      await new Promise((r) => setTimeout(r, 3000));

      const host = new URL(loginUrl).host;
      const endpoints = Array.from(capturedRequests.entries())
        .filter(([url]) => {
          try {
            const u = new URL(url);
            return u.hostname === host || u.hostname.endsWith(".stockedge.com");
          } catch {
            return false;
          }
        })
        .map(([url, info]) => {
          const keys = typeof info.body === "object" && info.body !== null ? Object.keys(info.body as Record<string, unknown>) : [];
          return {
            layer: classifyPlaywrightLayer(url, keys),
            method: "GET",
            url,
            host: new URL(url).host,
            status: info.status,
            contentType: info.contentType,
            sampleKeys: keys.slice(0, 15),
          };
        });

      return { endpoints };
    } finally {
      await browser.close();
    }
  }
}

export function classifyPlaywrightLayer(url: string, keys: string[]): string {
  const u = url.toLowerCase();
  if (u.includes("profile") || u.includes("overview") || keys.includes("companyName") || keys.includes("sector")) return "profile";
  if (u.includes("price") || u.includes("quote") || u.includes("live") || keys.includes("ltp") || keys.includes("changePercent")) return "price";
  if (u.includes("technical") || u.includes("indicator") || keys.includes("rsi") || keys.includes("macd")) return "technicals";
  if (u.includes("fundamental") || u.includes("ratio") || keys.includes("pe") || keys.includes("roe")) return "fundamentals";
  if (u.includes("financial") || u.includes("statement") || u.includes("quarterly") || u.includes("profit") || u.includes("balance")) return "financial_tables";
  if (u.includes("ownership") || u.includes("shareholding") || u.includes("shareholder") || keys.includes("promoter") || keys.includes("fii")) return "ownership";
  if (u.includes("corporate") || u.includes("action") || u.includes("dividend") || keys.includes("dividend")) return "corporate_actions";
  if (u.includes("screener") || u.includes("checklist") || u.includes("scanner") || u.includes("signal")) return "screener_signals";
  if (u.includes("peer") || u.includes("comparison") || keys.includes("peers")) return "screener_signals";
  if (u.includes("news") || u.includes("research") || u.includes("commentary")) return "news";
  return "unknown";
}
