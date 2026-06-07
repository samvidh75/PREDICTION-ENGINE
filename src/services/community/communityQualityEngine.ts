/**
 * Community Quality Engine
 * ---------------------------------------
 * Deterministic heuristics-only analysis of user/community messages.
 * - No network calls
 * - No investment/trade recommendations
 * - SEBI-safe educational framing: focuses on verification, risk awareness,
 *   and respectful discussion.
 */

export type CommunityQualityCategory =
  | 'SPAM'
  | 'HYPE'
  | 'ABUSE'
  | 'MANIPULATION'
  | 'EDUCATIONAL'
  | 'GENERAL';

export type CommunityRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export type CommunityQualityAnalysis = {
  /**
   * Overall risk/quality score in range [0..1]
   * Higher means higher likelihood of problematic/harmful content.
   */
  score: number;
  /** Human-readable detection tags for UI/debugging */
  flags: string[];
  /** Primary classification (chosen from highest-risk signals) */
  category: CommunityQualityCategory;
  /** Coarse risk bucket derived from score and signal strength */
  riskLevel: CommunityRiskLevel;
  /** Optional key for integration with confidence/telemetry layers */
  confidenceKey?: string;
};

const clamp01 = (n: number): number => Math.max(0, Math.min(1, n));

/**
 * A very small, "SEBI-safe" abusive regex list.
 * Note: intentionally avoids protected-class slurs; focuses on generic insults.
 */
const abusiveRegex = /\b(idiot|moron|stupid|dumb|loser|trash|clown|fool)\b/i;

const punctuationEmojiRegex =
  /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu;

/**
 * Extract a rough "ALL CAPS" ratio to help detect hype marketing.
 */
function allCapsRatio(text: string): number {
  const letters = text.match(/[A-Za-z]/g) ?? [];
  if (letters.length === 0) return 0;
  const upper = text.match(/[A-Z]/g) ?? [];
  return upper.length / letters.length;
}

/**
 * Count repeated words/tokens to detect copy-paste spam.
 */
function maxTokenFrequency(text: string): number {
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  const freq = new Map<string, number>();
  for (const t of tokens) freq.set(t, (freq.get(t) ?? 0) + 1);

  let max = 0;
  for (const v of freq.values()) max = Math.max(max, v);
  return max;
}

/**
 * Deterministic analysis with heuristic scoring.
 *
 * Flags + category are selected from highest-risk signals:
 * ABUSE > MANIPULATION > HYPE > SPAM > EDUCATIONAL > GENERAL
 */
export function analyzeCommunityMessage(text: string): CommunityQualityAnalysis {
  const safeText = (text ?? '').toString();
  const trimmed = safeText.trim();
  const lower = trimmed.toLowerCase();

  const flags: string[] = [];
  let score = 0;

  // Track which category has strongest signals.
  const signals: Partial<Record<CommunityQualityCategory, number>> = {};

  const add = (category: CommunityQualityCategory, points: number, flag: string) => {
    score += points;
    signals[category] = Math.max(signals[category] ?? 0, points);
    flags.push(flag);
  };

  // ---------- HYPE heuristics ----------
  // 🚀 and similar emoji usage as hype marketing indicator
  if (trimmed.includes('🚀') || lower.includes('rocket')) {
    // Rocket emoji can be used naturally, but combined with other signals it's a strong hype hint.
    add('HYPE', 0.22, 'HYPE_ROCKET_EMOJI');
  }

  // "to the moon" phrase
  if (lower.includes('to the moon') || lower.includes('tothemoon')) {
    add('HYPE', 0.3, 'HYPE_TO_THE_MOON');
  }

  // Guaranteed language (especially with financial-like nouns)
  // Heuristic: absolute certainty + money/profit/returns framing.
  if (/\b(guaranteed|guarantee|no risk|risk free)\b/i.test(lower)) {
    if (/\b(returns|profit|money|roi|growth|percent|percentage)\b/i.test(lower)) {
      add('HYPE', 0.35, 'HYPE_GUARANTEED_LANGUAGE');
      add('MANIPULATION', 0.25, 'MANIP_GUARANTEED_LANGUAGE');
    } else {
      add('HYPE', 0.18, 'HYPE_ABSOLUTE_LANGUAGE');
    }
  }

  // 100% sure / 100% certain / (common) absolute probability claims
  if (/\b100\s*%?\s*(sure|certain)\b/i.test(lower)) {
    add('HYPE', 0.25, 'HYPE_100_PERCENT_SURE');
  }

  // Pump/dump language is strongly associated with manipulation schemes.
  if (/\b(pump|dump)\b/.test(lower)) {
    add('HYPE', 0.45, 'HYPE_PUMP_DUMP');
    add('MANIPULATION', 0.35, 'MANIP_PUMP_DUMP_LANGUAGE');
  }

  // "free money" / "get rich" style hype
  if (/\bfree\s+money\b/i.test(lower) || /\bget\s+rich\b/i.test(lower) || /\bmake\s+money\s+fast\b/i.test(lower)) {
    add('HYPE', 0.32, 'HYPE_FREE_MONEY');
    add('MANIPULATION', 0.25, 'MANIP_FREE_MONEY_PATTERN');
  }

  // Urgency language with "now"
  // Heuristic: "now" in combination with imperative / limited-time / CTA words.
  if (/\bnow\b/i.test(lower)) {
    if (/\b(act|buy|join|grab|start|donate|invest)\b/i.test(lower) || /\blimited\s+time\b/i.test(lower) || /\bdeadline\b/i.test(lower)) {
      add('HYPE', 0.22, 'HYPE_URGENCY_NOW');
    }
  }

  // High ALL CAPS ratio (often used in aggressive marketing)
  const ratio = allCapsRatio(trimmed);
  // Require a reasonable amount of letters to reduce false positives.
  if (trimmed.length > 10 && ratio >= 0.7) {
    add('HYPE', 0.2, 'HYPE_ALL_CAPS');
  }

  // Additional hype signal: lots of exclamation marks with CTA words
  const exCount = (trimmed.match(/!/g) ?? []).length;
  if (exCount >= 6 && /\b(now|act|buy|join|limited|urgent)\b/i.test(lower)) {
    add('HYPE', 0.18, 'HYPE_EXCESSIVE_EXCLAMATION');
  }

  // ---------- Manipulation / scam heuristics ----------
  // Common scam indicators
  if (/\b(scam|scams|fraud|fake)\b/i.test(lower)) {
    add('MANIPULATION', 0.6, 'MANIP_SCAM_FAKE_WORDS');
  }

  // Guaranteed returns / guaranteed profit
  if (/\bguaranteed\s+returns?\b/i.test(lower)) {
    add('MANIPULATION', 0.65, 'MANIP_GUARANTEED_RETURNS');
  }
  if (/\bguaranteed\s+profit(s)?\b/i.test(lower)) {
    add('MANIPULATION', 0.7, 'MANIP_GUARANTEED_PROFIT');
  }

  // "Double your money" patterns
  if (/\bdouble\s+(your\s+)?money\b/i.test(lower) || /\b(doubler|doubles)\s+your\s+money\b/i.test(lower)) {
    add('MANIPULATION', 0.6, 'MANIP_DOUBLE_YOUR_MONEY');
  }

  // ---------- Abuse heuristics ----------
  // Generic insulting language
  if (abusiveRegex.test(lower)) {
    add('ABUSE', 0.65, 'ABUSE_INSULT_LANGUAGE');
  }

  // ---------- Spam heuristics ----------
  const urls = trimmed.match(/https?:\/\/[^\s]+/gi) ?? [];
  if (urls.length >= 2) {
    add('SPAM', 0.7, 'SPAM_MULTIPLE_URLS');
  } else if (urls.length === 1 && trimmed.split(/\s+/).filter(Boolean).length <= 8) {
    add('SPAM', 0.5, 'SPAM_SINGLE_URL_SHORT_TEXT');
  }

  const emojiCount = (trimmed.match(punctuationEmojiRegex) ?? []).length;
  if (emojiCount >= 10) {
    add('SPAM', 0.35, 'SPAM_EXCESSIVE_EMOJIS');
  }

  if (maxTokenFrequency(trimmed) >= 6) {
    add('SPAM', 0.35, 'SPAM_REPEATED_TEXT');
  }

  // ---------- Educational heuristics ----------
  // Heuristic for "how/guide" style without hype/manipulation.
  const educationalSignals =
    /\b(how\s+to|guide|learn|learning|explain|explainer|what\s+is|beginner|fundamentals)\b/i.test(lower) ||
    /\b(steps?:|step\s+\d+|checklist)\b/i.test(lower);

  // ---------- Category resolution based on highest-risk signals ----------
  // Priority: ABUSE > MANIPULATION > HYPE > SPAM > EDUCATIONAL > GENERAL
  let category: CommunityQualityCategory = 'GENERAL';

  const has = (c: CommunityQualityCategory) => (signals[c] ?? 0) > 0;

  if (has('ABUSE')) category = 'ABUSE';
  else if (has('MANIPULATION')) category = 'MANIPULATION';
  else if (has('HYPE')) category = 'HYPE';
  else if (has('SPAM')) category = 'SPAM';
  else if (educationalSignals) category = 'EDUCATIONAL';

  // If message is educational-only, keep score low.
  if (category === 'EDUCATIONAL' && flags.length === 0) {
    score = 0.1;
    flags.push('EDUCATIONAL_GUIDE_LANGUAGE');
  }

  // Compute risk level from score.
  const s = clamp01(score);

  // If we found no signals at all, keep minimal risk.
  const finalScore = flags.length ? s : 0.05;

  let riskLevel: CommunityRiskLevel = 'LOW';
  if (finalScore >= 0.75) riskLevel = 'HIGH';
  else if (finalScore >= 0.4) riskLevel = 'MEDIUM';

  // Safety guardrails: category mapping shouldn't be "HIGH" without real flags.
  if (flags.length === 0) {
    riskLevel = 'LOW';
  }

  const confidenceKey = `community-quality:${category}:${riskLevel}`;

  return {
    score: finalScore,
    flags,
    category,
    riskLevel,
    confidenceKey,
  };
}

/**
 * Builds an SEBI-safe educational reframe from the analysis.
 * Never recommends trades or specific buy/sell actions.
 */
export function buildEducationalReframe(
  text: string,
  analysis: CommunityQualityAnalysis,
  experienceLevel: 'beginner' | 'intermediate'
): { reframed: string; rationale: string } {
  const safeText = (text ?? '').toString().trim();
  const flags = analysis.flags;

  const levelPreamble =
    experienceLevel === 'beginner'
      ? 'Quick note for beginners:'
      : 'Deeper note:';

  const disclaimer =
    'This is general information—not investment advice.';

  const detected = flags.length ? flags.join(', ') : 'No strong risk signals detected';

  const baseRationale = `Detected category "${analysis.category}" with risk "${analysis.riskLevel}". Flags: ${detected}.`;

  // Keep output deterministic and avoid including trade recommendations.
  switch (analysis.category) {
    case 'HYPE': {
      const reframed =
        experienceLevel === 'beginner'
          ? `${levelPreamble} The message uses hype/absolute language (e.g., rockets, “to the moon”, “guaranteed”, “now”). Treat such claims as unverified marketing. ${disclaimer} Instead of acting on urgency, pause and verify: What evidence is provided? What are the risks/assumptions? Is the statement a forecast or a promise?`
          : `${levelPreamble} The post leans on hype patterns (absolute certainty, urgency, and attention-grabbing phrasing). ${disclaimer} A practical check: separate predictions from guarantees, look for concrete evidence (data, sources, methodology), and explicitly ask what could go wrong. If the message discourages scrutiny (“guaranteed”, “no risk”), that’s a red flag.`;
      return { reframed, rationale: baseRationale };
    }

    case 'MANIPULATION': {
      const reframed =
        experienceLevel === 'beginner'
          ? `${levelPreamble} This looks like manipulation or scam-like phrasing (e.g., guaranteed returns/profit, “double your money”, “scam/fake”). ${disclaimer} Be cautious with claims that promise outcomes with near certainty. Verify with primary sources, check for disclosures, and avoid sharing personal details or following urgent instructions from unknown accounts.`
          : `${levelPreamble} The language strongly resembles manipulation patterns (guarantees, “double your money”, scam/fake cues, or pump/dump framing). ${disclaimer} For due diligence: look for verifiable documentation, identify incentives, and assess whether claims are probabilistic or effectively promised. If someone cannot explain methodology and risks clearly, treat it as untrustworthy.`;
      return { reframed, rationale: baseRationale };
    }

    case 'ABUSE': {
      const reframed =
        experienceLevel === 'beginner'
          ? `${levelPreamble} The message contains personal insults. Healthy discussion focuses on ideas and evidence—not attacks. ${disclaimer} If you disagree, keep it respectful and stick to verifiable information. Consider reporting content that uses abusive language.`
          : `${levelPreamble} The post includes abusive/insult language, which makes real learning harder. ${disclaimer} Shift the conversation toward evidence: ask for sources, explain your reasoning calmly, and avoid escalating. Reporting can help keep the community constructive.`;
      return { reframed, rationale: baseRationale };
    }

    case 'SPAM': {
      const reframed =
        experienceLevel === 'beginner'
          ? `${levelPreamble} This appears to be spam (e.g., suspicious links and/or repetitive emoji/text). ${disclaimer} Don’t click unknown links or share personal information. If a claim matters, look for it in reputable primary sources first.`
          : `${levelPreamble} The content shows spam signals (such as multiple URLs, heavy emoji use, or repetitive tokens). ${disclaimer} Treat external links as untrusted until you verify domains and provenance. When evaluating claims, use primary documentation rather than reposted hype.`;
      return { reframed, rationale: baseRationale };
    }

    case 'EDUCATIONAL': {
      // Reframe educational content to be more SEBI-safe and uncertainty-aware.
      const reframed =
        experienceLevel === 'beginner'
          ? `${levelPreamble} Thanks for sharing—this reads like educational material. ${disclaimer} To make it even safer for learners: include uncertainty (what you know vs what you’re guessing), mention risks, and avoid absolute promises. Encourage readers to verify with reliable sources.`
          : `${levelPreamble} This message appears educational. ${disclaimer} Consider strengthening it by stating assumptions, clarifying what would change your view, and acknowledging uncertainty/probabilities instead of using guarantees. Invite readers to validate against primary sources and risk disclosures.`;
      return { reframed, rationale: baseRationale };
    }

    case 'GENERAL':
    default: {
      const reframed =
        experienceLevel === 'beginner'
          ? `${levelPreamble} If you’re sharing or evaluating community claims, aim for clarity: what’s the evidence, what’s the assumption, and what are the risks? ${disclaimer} Avoid “guaranteed” language and be wary of urgency that pressures quick action.`
          : `${levelPreamble} For higher-quality discussion, ask for evidence, uncertainty bounds, and explicit risk factors. ${disclaimer} Distinguish opinion from verifiable claims and treat absolute certainty statements as lower-quality unless backed by robust documentation.`;
      return { reframed, rationale: baseRationale };
    }
  }
}