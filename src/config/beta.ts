/**
 * src/config/beta.ts
 *
 * Beta mode configuration for Lensory.
 * Controls public access, feature gates, and beta lifecycle.
 *
 * Modes:
 *   closed     — Only whitelisted users can access (development)
 *   waitlist   — Anyone can join waitlist; active users via invite
 *   open       — Anyone can sign in and use the app
 *   public     — Open + full SEO/landing pages visible (launch)
 */

export type BetaMode = "closed" | "waitlist" | "open" | "public";

export interface BetaConfig {
  /** Current beta mode */
  mode: BetaMode;

  /** Display name shown in the UI (e.g. "Private Beta") */
  label: string;

  /** If true, show "Beta" badge in the nav bar */
  showBetaBadge: boolean;

  /** If true, landing page shows waitlist CTA instead of "Get Started" */
  showWaitlistCta: boolean;

  /** If true, search engines are allowed to index public pages */
  allowIndexing: boolean;

  /** If true, all users can sign in without invite code */
  allowSelfSignUp: boolean;

  /** If true, the WaitlistPage route is mounted */
  enableWaitlistPage: boolean;

  /** Feature gates — granular control per area */
  features: {
    analytics: boolean;
    feedbackCollection: boolean;
    errorTelemetry: boolean;
    researchHistory: boolean;
    scanner: boolean;
    watchlist: boolean;
    exportActions: boolean;
    changelog: boolean;
    userInterviewSignup: boolean;
  };
}

// ─── Mode presets ────────────────────────────────────────────────────

const MODE_PRESETS: Record<BetaMode, Omit<BetaConfig, "mode" | "label">> = {
  closed: {
    showBetaBadge: true,
    showWaitlistCta: true,
    allowIndexing: false,
    allowSelfSignUp: false,
    enableWaitlistPage: true,
    features: {
      analytics: false,
      feedbackCollection: true,
      errorTelemetry: true,
      researchHistory: true,
      scanner: true,
      watchlist: true,
      exportActions: false,
      changelog: true,
      userInterviewSignup: true,
    },
  },
  waitlist: {
    showBetaBadge: true,
    showWaitlistCta: true,
    allowIndexing: false,
    allowSelfSignUp: false,
    enableWaitlistPage: true,
    features: {
      analytics: true,
      feedbackCollection: true,
      errorTelemetry: true,
      researchHistory: true,
      scanner: true,
      watchlist: true,
      exportActions: false,
      changelog: true,
      userInterviewSignup: true,
    },
  },
  open: {
    showBetaBadge: true,
    showWaitlistCta: false,
    allowIndexing: false,
    allowSelfSignUp: true,
    enableWaitlistPage: false,
    features: {
      analytics: true,
      feedbackCollection: true,
      errorTelemetry: true,
      researchHistory: true,
      scanner: true,
      watchlist: true,
      exportActions: true,
      changelog: true,
      userInterviewSignup: true,
    },
  },
  public: {
    showBetaBadge: false,
    showWaitlistCta: false,
    allowIndexing: true,
    allowSelfSignUp: true,
    enableWaitlistPage: false,
    features: {
      analytics: true,
      feedbackCollection: true,
      errorTelemetry: true,
      researchHistory: true,
      scanner: true,
      watchlist: true,
      exportActions: true,
      changelog: true,
      userInterviewSignup: true,
    },
  },
};

// ─── Runtime config ──────────────────────────────────────────────────

function readMode(): BetaMode {
  const raw = (typeof process !== "undefined"
    ? process.env.BETA_MODE
    : import.meta.env.VITE_BETA_MODE) as string | undefined;

  if (raw && ["closed", "waitlist", "open", "public"].includes(raw)) {
    return raw as BetaMode;
  }
  // Default: open in dev, waitlist in production
  if (typeof process !== "undefined" && process.env.NODE_ENV === "production") {
    return "waitlist";
  }
  return "closed";
}

const MODE_LABELS: Record<BetaMode, string> = {
  closed: "Development",
  waitlist: "Private Beta",
  open: "Open Beta",
  public: "Lensory",
};

/**
 * Resolve the active beta configuration.
 */
export function getBetaConfig(): BetaConfig {
  const mode = readMode();
  const preset = MODE_PRESETS[mode];
  return {
    mode,
    label: MODE_LABELS[mode],
    ...preset,
  };
}

/**
 * Check whether a given feature is enabled in the current beta mode.
 */
export function isFeatureEnabled(feature: keyof BetaConfig["features"]): boolean {
  return getBetaConfig().features[feature];
}

/**
 * Check whether the current mode allows a user in.
 */
export function isAccessAllowed(hasInvite: boolean, isAuthenticated: boolean): boolean {
  const config = getBetaConfig();
  if (config.mode === "closed") return hasInvite;
  if (config.mode === "waitlist") return hasInvite || isAuthenticated;
  return true; // open / public
}
