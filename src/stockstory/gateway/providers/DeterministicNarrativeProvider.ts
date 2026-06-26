import type { StockStoryResearchInput, StockStoryNarrativeOutput } from '../../research/types';
import { researchNarrativeService } from '../../research/ResearchNarrativeService';
import type { ScannerQueryPlan, ScannerFilter, AlertExplanationInput, CompareSummaryInput, LLMProvider } from '../types';
import type { LLMGatewayMode } from '../config';

export class DeterministicNarrativeProvider implements LLMProvider {
  name = 'DeterministicNarrativeProvider';
  mode: LLMGatewayMode = 'deterministic';

  generateThesis(input: StockStoryResearchInput): StockStoryNarrativeOutput {
    return researchNarrativeService.generateFullNarrative(input);
  }

  parseScannerQuery(query: string): ScannerQueryPlan {
    const filters: ScannerFilter[] = [];
    const unsupportedTerms: string[] = [];
    const lower = query.toLowerCase();

    const presets: Record<string, { preset: string; explanation: string; filters: ScannerFilter[] }> = {
      'quality compounders': {
        preset: 'quality_compounders', explanation: 'High-quality businesses with sustainable competitive advantages.',
        filters: [{ field: 'quality', operator: 'gte', value: 70, label: 'Quality ≥ 70' }],
      },
      'undervalued quality': {
        preset: 'undervalued_quality', explanation: 'Quality businesses trading at reasonable valuations.',
        filters: [
          { field: 'quality', operator: 'gte', value: 60, label: 'Quality ≥ 60' },
          { field: 'valuation', operator: 'gte', value: 60, label: 'Valuation ≥ 60' },
        ],
      },
      'improving momentum': {
        preset: 'improving_momentum', explanation: 'Stocks showing strengthening price momentum.',
        filters: [{ field: 'momentum', operator: 'gte', value: 60, label: 'Momentum ≥ 60' }],
      },
      'low debt leaders': {
        preset: 'low_debt_leaders', explanation: 'Companies with strong balance sheets and minimal leverage.',
        filters: [{ field: 'stability', operator: 'gte', value: 65, label: 'Stability ≥ 65' }],
      },
      'earnings acceleration': {
        preset: 'earnings_acceleration', explanation: 'Companies with accelerating earnings growth.',
        filters: [{ field: 'growth', operator: 'gte', value: 60, label: 'Growth ≥ 60' }],
      },
      'dividend stability': {
        preset: 'dividend_stability', explanation: 'Companies with sustainable dividend profiles.',
        filters: [{ field: 'stability', operator: 'gte', value: 55, label: 'Stability ≥ 55' }],
      },
      'turnaround watch': {
        preset: 'turnaround_watch', explanation: 'Companies showing early signs of operational recovery.',
        filters: [
          { field: 'quality', operator: 'gte', value: 35, label: 'Quality ≥ 35' },
          { field: 'quality', operator: 'lt', value: 55, label: 'Quality < 55' },
          { field: 'momentum', operator: 'gte', value: 55, label: 'Momentum ≥ 55' },
        ],
      },
      'risk rising': {
        preset: 'risk_rising', explanation: 'Companies with deteriorating risk indicators.',
        filters: [{ field: 'risk', operator: 'gte', value: 60, label: 'Risk ≥ 60' }],
      },
      'good businesses out of favour': {
        preset: 'good_businesses_out_of_favour', explanation: 'Strong businesses temporarily out of market favour.',
        filters: [
          { field: 'quality', operator: 'gte', value: 65, label: 'Quality ≥ 65' },
          { field: 'valuation', operator: 'gte', value: 60, label: 'Valuation ≥ 60' },
          { field: 'momentum', operator: 'lt', value: 45, label: 'Momentum < 45' },
        ],
      },
    };

    if (presets[lower]) {
      return {
        filters: presets[lower].filters,
        sort: 'score',
        preset: presets[lower].preset,
        explanation: presets[lower].explanation,
        unsupportedTerms: [],
        confidence: 1,
      };
    }

    const phraseFilters: ScannerFilter[] = [];
    let sort: ScannerQueryPlan['sort'] = 'score';
    let explanation = 'Custom filters applied.';
    let preset: string | undefined;

    if (/low debt|low leverage|debt[\s-]?free|zero debt/.test(lower)) {
      phraseFilters.push({ field: 'stability', operator: 'gte', value: 60, label: 'Low debt' });
    }
    if (/high roe|strong roe|roe.*>|roe.*high/.test(lower)) {
      phraseFilters.push({ field: 'quality', operator: 'gte', value: 60, label: 'High ROE' });
    }
    if (/high roic|strong roic/.test(lower)) {
      phraseFilters.push({ field: 'quality', operator: 'gte', value: 60, label: 'High ROIC' });
    }
    if (/high roa|strong roa/.test(lower)) {
      phraseFilters.push({ field: 'quality', operator: 'gte', value: 55, label: 'High ROA' });
    }
    if (/cheap|undervalued|low pe|low pb|bargain/.test(lower)) {
      phraseFilters.push({ field: 'valuation', operator: 'gte', value: 60, label: 'Cheap valuation' });
    }
    if (/low pe/.test(lower)) {
      phraseFilters.push({ field: 'valuation', operator: 'gte', value: 65, label: 'Low PE' });
    }
    if (/low pb/.test(lower)) {
      phraseFilters.push({ field: 'valuation', operator: 'gte', value: 60, label: 'Low PB' });
    }
    if (/high growth|fast growth|growing|growth.*high/.test(lower)) {
      phraseFilters.push({ field: 'growth', operator: 'gte', value: 60, label: 'High growth' });
    }
    if (/improving margin|margin expansion/.test(lower)) {
      phraseFilters.push({ field: 'quality', operator: 'gte', value: 50, label: 'Improving margins' });
    }
    if (/high dividend|dividend yield|good dividend/.test(lower)) {
      phraseFilters.push({ field: 'valuation', operator: 'gte', value: 50, label: 'High dividend' });
    }
    if (/strong momentum|bullish|uptrend/.test(lower)) {
      phraseFilters.push({ field: 'momentum', operator: 'gte', value: 60, label: 'Strong momentum' });
    }
    if (/low volatility|stable|low risk/.test(lower)) {
      phraseFilters.push({ field: 'stability', operator: 'gte', value: 60, label: 'Low volatility' });
    }
    if (/large cap|largecap/.test(lower)) {
      phraseFilters.push({ field: 'marketCap', operator: 'gte', value: 20000, label: 'Large cap' });
    }
    if (/mid cap|midcap/.test(lower)) {
      phraseFilters.push({ field: 'marketCap', operator: 'between', value: [5000, 20000], label: 'Mid cap' });
    }
    if (/small cap|smallcap/.test(lower)) {
      phraseFilters.push({ field: 'marketCap', operator: 'lt', value: 5000, label: 'Small cap' });
    }

    const sectorNames = ['banking', 'technology', 'it', 'fmcg', 'pharma', 'auto', 'insurance', 'utilities', 'oil', 'metal', 'consumption'];
    for (const name of sectorNames) {
      if (lower.includes(name)) {
        phraseFilters.push({ field: 'sector', operator: 'eq', value: name, label: `Sector: ${name}` });
      }
    }

    if (phraseFilters.length === 0) {
      const knownKeys = Object.keys(presets);
      return {
        filters: [],
        sort: 'score',
        explanation: `No recognised scanner preset or filter pattern found. Try one of the available presets: ${knownKeys.join(', ')}. Or use phrases like "low debt", "high growth", "large cap", "technology".`,
        unsupportedTerms: [query],
        confidence: 0,
      };
    }

    if (/momentum|improving|rising/.test(lower) && !/risk rising/.test(lower)) {
      sort = 'momentum';
    } else if (/cheap|value|undervalued/.test(lower)) {
      sort = 'valuation';
    }

    if (/banks?$|banking/.test(lower) && /quality/.test(lower) && /undervalued/.test(lower)) {
      preset = 'undervalued_quality';
      explanation = 'Quality banking stocks at reasonable valuation levels.';
    }

    return {
      filters: phraseFilters,
      sort,
      preset,
      explanation,
      unsupportedTerms,
      confidence: phraseFilters.length > 0 ? 0.8 : 0.5,
    };
  }

  explainScoreChange(input: AlertExplanationInput): string {
    const { symbol, changeType, oldValue, newValue, context } = input;
    if (changeType === 'score_change') {
      const direction = (newValue ?? 0) > (oldValue ?? 0) ? 'improved' : 'declined';
      return `${symbol}'s research score has ${direction} from ${oldValue ?? 'N/A'} to ${newValue ?? 'N/A'}. ${context}`;
    }
    return `${symbol} — ${changeType}. ${context}`;
  }

  summarizeNewsContext(input: { symbol: string; news: string[] }): string {
    if (!input.news || input.news.length === 0) {
      return `No recent news items available for ${input.symbol}.`;
    }
    return `${input.symbol} has ${input.news.length} recent news items. Review news feed for details.`;
  }

  generateAlertExplanation(input: AlertExplanationInput): string {
    return this.explainScoreChange(input);
  }

  generateCompareSummary(input: CompareSummaryInput): string {
    const { symbols, scores, factorComparison } = input;
    if (symbols.length < 2) return 'Select at least two companies for comparison.';

    const sorted = symbols.sort((a, b) => (scores[b] ?? 0) - (scores[a] ?? 0));
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];

    return `Among ${symbols.join(', ')}, ${best} scores highest (${scores[best]}/100) and ${worst} scores lowest (${scores[worst]}/100). Review factor-by-factor comparison for detailed analysis.`;
  }
}

export const deterministicNarrativeProvider = new DeterministicNarrativeProvider();
