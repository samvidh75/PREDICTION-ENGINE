import type { AlertContext, IntelligenceNotification, NotificationKind, NotificationPriority } from "./notificationTypes";

type EngineOptions = {
  // Max visible notifications handled by UI; engine controls frequency only.
  // How often the engine should emit notifications (global + priority-based).
  globalMinIntervalMs?: number;
};

type LastDispatch = {
  at: number;
  signature: string;
};

function nowMs(): number {
  return Date.now();
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function priorityToMinIntervalMs(priority: NotificationPriority): number {
  // Rare and meaningful (avoid noise)
  switch (priority) {
    case 1:
    case 2:
      return 20_000;
    case 3:
      return 28_000;
    case 4:
      return 38_000;
    case 5:
    default:
      return 55_000;
  }
}

function kindForConfidence(conf: AlertContext["confidenceState"]): NotificationKind {
  switch (conf) {
    case "ELEVATED_RISK":
      // keep calm but meaningful: avoid anxiety mechanics
      return "institutional_activity";
    case "MOMENTUM_WEAKENING":
      return "behavioural_reflection";
    case "CONFIDENCE_RISING":
      return "institutional_activity";
    case "NEUTRAL_ENVIRONMENT":
      return "market_environment";
    case "STABLE_CONVICTION":
    default:
      return "learning_summary";
  }
}

function priorityForKind(kind: NotificationKind, conf: AlertContext["confidenceState"]): NotificationPriority {
  // Lower number = higher priority
  switch (kind) {
    case "institutional_activity":
      return conf === "ELEVATED_RISK" ? 2 : 3;
    case "behavioural_reflection":
      return conf === "ELEVATED_RISK" ? 3 : 4;
    case "market_environment":
      return conf === "NEUTRAL_ENVIRONMENT" ? 4 : 3;
    case "daily_market_briefing":
      return 1;
    case "portfolio_intelligence":
      return 4;
    case "learning_summary":
    default:
      return conf === "STABLE_CONVICTION" ? 5 : 4;
  }
}

function signatureFor(notification: Omit<IntelligenceNotification, "id" | "createdAt">): string {
  return `${notification.kind}|${notification.title}|${notification.signature}`;
}

function calmMarketTitle(kind: NotificationKind): string {
  switch (kind) {
    case "market_environment":
      return "Market structure adapting";
    case "institutional_activity":
      return "Institutional activity increasing";
    case "behavioural_reflection":
      return "Pacing note for behavioural reflection";
    case "learning_summary":
      return "Learning intelligence summary";
    case "daily_market_briefing":
      return "Morning intelligence briefing";
    case "portfolio_intelligence":
      return "Portfolio environment update";
    default:
      return "Conditions evolving";
  }
}

function calmMarketBody(kind: NotificationKind, ctx: AlertContext): string {
  // Must avoid emotional manipulation: no urgency language, no certainty.
  const conf = ctx.confidenceState;
  const stateLabel = ctx.marketStateLabel;

  const prefix = (() => {
    if (kind === "institutional_activity") return "Institutional posture is updating in a calm, structured way.";
    if (kind === "behavioural_reflection") return "Behavioural interpretation is shifting toward pacing discipline.";
    if (kind === "market_environment") return "Conditions evolving: participation texture is changing through the current structure.";
    if (kind === "portfolio_intelligence") return "Portfolio intelligence environment is recalibrating with calm continuity.";
    return "Learning intelligence: a small interpretive update for clarity.";
  })();

  const environmentLine = (() => {
    switch (conf) {
      case "ELEVATED_RISK":
        return `Confidence remains elevated-risk; narratives stay probabilistic, and sensitivity rises without assuming outcomes.`;
      case "MOMENTUM_WEAKENING":
        return `Momentum is weakening; follow-through is treated as selective, not unstable.`;
      case "CONFIDENCE_RISING":
        return `Confidence is rising; the engine interprets improvements as structural evolution with disciplined framing.`;
      case "NEUTRAL_ENVIRONMENT":
        return `Participation is balanced across the current structure; attention is guided by context rather than certainty.`;
      case "STABLE_CONVICTION":
      default:
        return `Confidence is stable; market interpretation remains continuity-first across the tracked environment.`;
    }
  })();

  const marketStateLine = (() => {
    // Use stateLabel for educational context
    return `Current structure label: ${stateLabel}. Interpretation focuses on context change, not predictions.`;
  })();

  // Keep it concise and editorial
  if (kind === "behavioural_reflection") {
    return `${prefix} Recent context suggests more sensitivity to pacing discipline. ${environmentLine} ${marketStateLine}`;
  }

  if (kind === "institutional_activity") {
    return `${prefix} Institutional cues are treated as a stability/context lens. ${environmentLine} ${marketStateLine}`;
  }

  if (kind === "market_environment") {
    return `${prefix} ${environmentLine} ${marketStateLine}`;
  }

  if (kind === "daily_market_briefing") {
    return `${prefix} In this morning window, we observe confidence context, structure adaptation, and participation quality. ${environmentLine} ${marketStateLine}`;
  }

  if (kind === "portfolio_intelligence") {
    return `${prefix} Portfolio context stays educational and structurally grounded. ${environmentLine} ${marketStateLine}`;
  }

  // learning_summary
  return `${prefix} ${environmentLine} ${marketStateLine}`;
}

export class AdaptiveAlertEngine {
  private globalLastAt: number = 0;
  private lastNarrativeKey: number | null = null;

  private lastByKind: Map<NotificationKind, LastDispatch> = new Map();

  private options: EngineOptions;

  constructor(options: EngineOptions = {}) {
    this.options = options;
  }

  evaluate(ctx: AlertContext): IntelligenceNotification[] {
    const now = nowMs();

    // Avoid emitting on every recalibration tick
    if (this.lastNarrativeKey === ctx.narrativeKey) return [];

    const globalMin = this.options.globalMinIntervalMs ?? 18_000;
    if (now - this.globalLastAt < globalMin) return [];

    const kind = kindForConfidence(ctx.confidenceState);

    const priority = priorityForKind(kind, ctx.confidenceState);

    const minForPriority = priorityToMinIntervalMs(priority);
    const prev = this.lastByKind.get(kind);

    // De-dup based on signature & time
    const title = calmMarketTitle(kind);
    const body = calmMarketBody(kind, ctx);

    const signature = `${ctx.marketStateLabel}|${ctx.confidenceState}|${ctx.narrativeKey % 6}`;

    const candidateWithoutMeta: Omit<IntelligenceNotification, "id" | "createdAt"> = {
      kind,
      title,
      body,
      priority,
      confidenceState: ctx.confidenceState,
      narrativeKey: ctx.narrativeKey,
      signature,
    };

    const sig = signatureFor(candidateWithoutMeta);

    if (prev) {
      if (prev.signature === sig && now - prev.at < minForPriority) return [];
      if (now - prev.at < minForPriority) return [];
    }

    this.globalLastAt = now;
    this.lastNarrativeKey = ctx.narrativeKey;
    this.lastByKind.set(kind, { at: now, signature: sig });

    const notif: IntelligenceNotification = {
      id: `${kind}_${ctx.narrativeKey}_${now}`,
      kind,
      title,
      body,
      priority,
      createdAt: now,
      confidenceState: ctx.confidenceState,
      narrativeKey: ctx.narrativeKey,
      signature: sig,
    };

    // Max 1 per evaluation (rare and meaningful). UI may allow 2 visible.
    return [notif];
  }
}
