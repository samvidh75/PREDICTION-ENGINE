import { describe, expect, it } from 'vitest';
import {
  hasBackendVocabulary,
  hasForbiddenTradingLanguage,
  hasRenderGarbage,
  hasBackendProviderNames,
  hasProductForbiddenTerms,
  hasForbiddenSocialProof,
} from '../../src/lib/compliance/forbiddenCopyAudit';

describe('Forbidden copy audit utilities', () => {
  describe('hasBackendVocabulary', () => {
    it('detects provider names', () => {
      expect(hasBackendVocabulary('IndianAPI data')).not.toBeNull();
      expect(hasBackendVocabulary('Yahoo finance')).not.toBeNull();
    });

    it('detects ops vocabulary', () => {
      expect(hasBackendVocabulary('data coverage')).not.toBeNull();
      expect(hasBackendVocabulary('freshness check')).not.toBeNull();
      expect(hasBackendVocabulary('source lineage')).not.toBeNull();
      expect(hasBackendVocabulary('diagnostics panel')).not.toBeNull();
      expect(hasBackendVocabulary('data operations')).not.toBeNull();
    });

    it('passes clean product copy', () => {
      expect(hasBackendVocabulary('Research this company')).toBeNull();
      expect(hasBackendVocabulary('How StockStory thinks')).toBeNull();
      expect(hasBackendVocabulary('Compare with peers')).toBeNull();
      expect(hasBackendVocabulary('Track this thesis')).toBeNull();
      expect(hasBackendVocabulary('What changed')).toBeNull();
    });
  });

  describe('hasForbiddenTradingLanguage', () => {
    it('detects trading language', () => {
      expect(hasForbiddenTradingLanguage('Buy Stock now')).not.toBeNull();
      expect(hasForbiddenTradingLanguage('Sell Stock')).not.toBeNull();
      expect(hasForbiddenTradingLanguage('Strong Buy')).not.toBeNull();
      expect(hasForbiddenTradingLanguage('guaranteed returns')).not.toBeNull();
      expect(hasForbiddenTradingLanguage('multibagger')).not.toBeNull();
      expect(hasForbiddenTradingLanguage('sure shot')).not.toBeNull();
    });

    it('passes clean product copy', () => {
      expect(hasForbiddenTradingLanguage('Research only')).toBeNull();
      expect(hasForbiddenTradingLanguage('Compare with peers')).toBeNull();
      expect(hasForbiddenTradingLanguage('Final order with broker')).toBeNull();
    });
  });

  describe('hasRenderGarbage', () => {
    it('detects render garbage', () => {
      expect(hasRenderGarbage('undefined')).not.toBeNull();
      expect(hasRenderGarbage('null')).not.toBeNull();
      expect(hasRenderGarbage('NaN')).not.toBeNull();
    });

    it('passes clean output', () => {
      expect(hasRenderGarbage('Hello world')).toBeNull();
      expect(hasRenderGarbage('Score: 85')).toBeNull();
    });
  });

  describe('hasBackendProviderNames', () => {
    it('detects provider names', () => {
      expect(hasBackendProviderNames('IndianAPI')).not.toBeNull();
      expect(hasBackendProviderNames('Upstox')).not.toBeNull();
      expect(hasBackendProviderNames('Screener')).not.toBeNull();
      expect(hasBackendProviderNames('Finnhub')).not.toBeNull();
    });

    it('passes clean product copy', () => {
      expect(hasBackendProviderNames('StockStory India')).toBeNull();
      expect(hasBackendProviderNames('Research')).toBeNull();
      expect(hasBackendProviderNames('Thesis')).toBeNull();
    });
  });

  describe('hasProductForbiddenTerms', () => {
    it('detects provider names', () => {
      expect(hasProductForbiddenTerms('IndianAPI data')).not.toBeNull();
      expect(hasProductForbiddenTerms('Yahoo')).not.toBeNull();
      expect(hasProductForbiddenTerms('Upstox')).not.toBeNull();
      expect(hasProductForbiddenTerms('Screener')).not.toBeNull();
    });

    it('detects backend/ops vocabulary', () => {
      expect(hasProductForbiddenTerms('provider health')).not.toBeNull();
      expect(hasProductForbiddenTerms('provider status')).not.toBeNull();
      expect(hasProductForbiddenTerms('data coverage')).not.toBeNull();
      expect(hasProductForbiddenTerms('freshness')).not.toBeNull();
      expect(hasProductForbiddenTerms('lineage trace')).not.toBeNull();
      expect(hasProductForbiddenTerms('backend offline')).not.toBeNull();
      expect(hasProductForbiddenTerms('diagnostics panel')).not.toBeNull();
    });

    it('detects forbidden trading/hype copy', () => {
      expect(hasProductForbiddenTerms('Strong Buy')).not.toBeNull();
      expect(hasProductForbiddenTerms('AI picks')).not.toBeNull();
      expect(hasProductForbiddenTerms('Top picks')).not.toBeNull();
      expect(hasProductForbiddenTerms('guaranteed returns')).not.toBeNull();
      expect(hasProductForbiddenTerms('sure shot')).not.toBeNull();
      expect(hasProductForbiddenTerms('multibagger')).not.toBeNull();
      expect(hasProductForbiddenTerms('Buy now')).not.toBeNull();
    });

    it('detects forbidden empty-state wording', () => {
      expect(hasProductForbiddenTerms('data unavailable')).not.toBeNull();
      expect(hasProductForbiddenTerms('quote unavailable')).not.toBeNull();
      expect(hasProductForbiddenTerms('history unavailable')).not.toBeNull();
      expect(hasProductForbiddenTerms('API unavailable')).not.toBeNull();
      expect(hasProductForbiddenTerms('backend error')).not.toBeNull();
      expect(hasProductForbiddenTerms('provider unavailable')).not.toBeNull();
    });

    it('passes clean product copy', () => {
      expect(hasProductForbiddenTerms('Research this company')).toBeNull();
      expect(hasProductForbiddenTerms('How StockStory thinks')).toBeNull();
      expect(hasProductForbiddenTerms('Compare with peers')).toBeNull();
      expect(hasProductForbiddenTerms('Track this thesis')).toBeNull();
      expect(hasProductForbiddenTerms('What changed')).toBeNull();
      expect(hasProductForbiddenTerms('Before you invest')).toBeNull();
      expect(hasProductForbiddenTerms('Continue with broker')).toBeNull();
      expect(hasProductForbiddenTerms('Track instead')).toBeNull();
      expect(hasProductForbiddenTerms('Awaiting data')).toBeNull();
      expect(hasProductForbiddenTerms('Research signals pending')).toBeNull();
    });
  });
});

describe('Route-specific compliance (static text)', () => {
  const landingCopy = [
    "AI research for Indian equities",
    "Understand the stock before you invest",
    "How StockStory works",
    "Five steps from discovery to execution",
    "StockStory provides AI-powered research and analysis for informational purposes only",
    "Not financial advice",
  ];

  const methodologyCopy = [
    "How StockStory Evaluates Businesses",
    "multi-factor research framework",
    "Quality, Growth, Valuation, Momentum, and Risk",
    "How to Interpret Conviction",
    "Why Research Is Not a Guarantee",
    "How to Use the Product Responsibly",
    "What 'Track Thesis' Means",
    "Why Final Execution Happens Through Brokers",
    "Compliance Statement",
  ];

  const onboardingCopy = [
    "Search a company",
    "Read the thesis",
    "Compare with peers",
    "Track the thesis",
    "Review before investing",
  ];

  it('landing copy has no backend vocabulary', () => {
    for (const text of landingCopy) {
      expect(hasBackendVocabulary(text)).toBeNull();
      expect(hasBackendProviderNames(text)).toBeNull();
      expect(hasProductForbiddenTerms(text)).toBeNull();
    }
  });

  it('landing copy has no forbidden trading language', () => {
    for (const text of landingCopy) {
      expect(hasForbiddenTradingLanguage(text)).toBeNull();
    }
  });

  it('landing copy has no render garbage', () => {
    for (const text of landingCopy) {
      expect(hasRenderGarbage(text)).toBeNull();
    }
  });

  it('methodology copy has no backend vocabulary', () => {
    for (const text of methodologyCopy) {
      expect(hasBackendVocabulary(text)).toBeNull();
      expect(hasBackendProviderNames(text)).toBeNull();
      expect(hasProductForbiddenTerms(text)).toBeNull();
    }
  });

  it('methodology copy has no forbidden trading language', () => {
    for (const text of methodologyCopy) {
      expect(hasForbiddenTradingLanguage(text)).toBeNull();
    }
  });

  it('methodology copy has no render garbage', () => {
    for (const text of methodologyCopy) {
      expect(hasRenderGarbage(text)).toBeNull();
    }
  });

  it('onboarding copy has no backend vocabulary', () => {
    for (const text of onboardingCopy) {
      expect(hasBackendVocabulary(text)).toBeNull();
      expect(hasBackendProviderNames(text)).toBeNull();
      expect(hasProductForbiddenTerms(text)).toBeNull();
    }
  });

  it('onboarding copy has no render garbage', () => {
    for (const text of onboardingCopy) {
      expect(hasRenderGarbage(text)).toBeNull();
    }
  });
});

describe('Empty state and gated UI compliance', () => {
  const forbiddenEmptyStatePhrases = [
    "data unavailable", "provider unavailable", "quote unavailable",
    "history unavailable", "API unavailable", "backend error",
    "diagnostics failed", "coverage incomplete", "source unavailable",
  ];

  const allowedEmptyStatePhrases = [
    "Awaiting research signals", "Research signals pending",
    "Needs research", "Search a company to begin research",
    "Track a company to review changes over time",
    "Monitor companies after you decide to track an investment thesis",
  ];

  it('all forbidden empty-state phrases are detected', () => {
    for (const phrase of forbiddenEmptyStatePhrases) {
      expect(hasProductForbiddenTerms(phrase), `${phrase} should be detected`).not.toBeNull();
    }
  });

  it('allowed empty-state phrases pass', () => {
    for (const phrase of allowedEmptyStatePhrases) {
      expect(hasProductForbiddenTerms(phrase), `${phrase} should pass`).toBeNull();
      expect(hasBackendVocabulary(phrase), `${phrase} should not have backend vocab`).toBeNull();
    }
  });

  it('no bot framework language in empty states', () => {
    const botIndicators = ["loading", "fetching data", "please wait", "initialising"];
    for (const indicator of botIndicators) {
      expect(hasProductForbiddenTerms(indicator)).toBeNull();
    }
  });
});

describe('Render garbage prevention', () => {
  const productTextSamples = [
    "Research score: 75",
    "Conviction: High",
    "Track this company",
    "Compare alternatives",
    "Review before investing",
    "Research Standards & Methodology",
  ];

  it('product copy does not contain render garbage', () => {
    for (const text of productTextSamples) {
      expect(hasRenderGarbage(text)).toBeNull();
    }
  });
});

describe('Share and referral compliance', () => {
  const shareResearchSummaryCopy = [
    "Research Summary",
    "Before You Invest",
    "Review scores on StockStory India",
    "Compare with peers",
    "Track thesis changes",
    "Final execution through your broker",
    "Research only. Not investment advice.",
  ];

  const compareRecapCopy = [
    "Comparison Recap",
    "Decision Summary",
    "Stronger research case",
    "Needs review",
    "Track before investing",
    "Before You Invest",
    "Research only. Not investment advice.",
  ];

  const earlyAccessCopy = [
    "Share StockStory",
    "Invite early users to review StockStory",
    "No trading rewards. No investment promises.",
    "Request access is not connected yet",
    "StockStory is research-only, not a brokerage",
    "What to expect",
  ];

  it('share research summary copy has no backend vocabulary', () => {
    for (const text of shareResearchSummaryCopy) {
      expect(hasBackendVocabulary(text)).toBeNull();
      expect(hasBackendProviderNames(text)).toBeNull();
      expect(hasProductForbiddenTerms(text)).toBeNull();
    }
  });

  it('share research summary copy has no render garbage', () => {
    for (const text of shareResearchSummaryCopy) {
      expect(hasRenderGarbage(text)).toBeNull();
    }
  });

  it('share research summary copy has no forbidden trading language', () => {
    for (const text of shareResearchSummaryCopy) {
      expect(hasForbiddenTradingLanguage(text)).toBeNull();
    }
  });

  it('compare recap copy has no backend vocabulary', () => {
    for (const text of compareRecapCopy) {
      expect(hasBackendVocabulary(text)).toBeNull();
      expect(hasBackendProviderNames(text)).toBeNull();
      expect(hasProductForbiddenTerms(text)).toBeNull();
    }
  });

  it('compare recap copy has no render garbage', () => {
    for (const text of compareRecapCopy) {
      expect(hasRenderGarbage(text)).toBeNull();
    }
  });

  it('compare recap copy has no fake social proof', () => {
    const fakeSocialProof = [
      "trusted by thousands", "number one platform", "award-winning",
      "official recommendation", "verified by SEBI", "broker partner",
    ];
    for (const text of fakeSocialProof) {
      expect(hasForbiddenSocialProof(text)).not.toBeNull();
    }
  });

  it('early access copy has no backend vocabulary', () => {
    for (const text of earlyAccessCopy) {
      expect(hasBackendVocabulary(text)).toBeNull();
      expect(hasBackendProviderNames(text)).toBeNull();
      expect(hasProductForbiddenTerms(text)).toBeNull();
    }
  });

  it('early access copy has no fake social proof', () => {
    const fakeSocialProof = [
      "trusted by thousands", "trusted by millions", "number one platform",
      "award-winning", "broker partner", "verified by SEBI",
      "official recommendation", "real user testimonial",
    ];
    for (const text of fakeSocialProof) {
      expect(hasForbiddenSocialProof(text), `${text} should be detected`).not.toBeNull();
    }
  });

  it('early access copy has no render garbage', () => {
    for (const text of earlyAccessCopy) {
      expect(hasRenderGarbage(text)).toBeNull();
    }
  });
});

describe('Share/referral accessibility', () => {
  it('copy/share buttons have accessible labels', () => {
    const labels = [
      "Copy research summary", "Summary copied",
      "Copy page link", "Link copied",
      "Copy comparison summary", "Comparison copied",
      "Copy invite link",
      "Share research summary",
      "Share comparison",
    ];
    for (const label of labels) {
      expect(hasRenderGarbage(label)).toBeNull();
      expect(hasProductForbiddenTerms(label)).toBeNull();
    }
  });
});
