import type { ScannerQueryPlan, ScannerFilter } from '../gateway/types';

const KNOWN_PRESETS: Record<string, { preset: string; explanation: string; filters: ScannerFilter[] }> = {
  'quality compounders': {
    preset: 'quality_compounders',
    explanation: 'High-quality businesses with sustainable competitive advantages.',
    filters: [{ field: 'quality', operator: 'gte', value: 70, label: 'Quality ≥ 70' }],
  },
  'undervalued quality': {
    preset: 'undervalued_quality',
    explanation: 'Quality businesses trading at reasonable valuations.',
    filters: [
      { field: 'quality', operator: 'gte', value: 60, label: 'Quality ≥ 60' },
      { field: 'valuation', operator: 'gte', value: 60, label: 'Valuation ≥ 60' },
    ],
  },
  'improving momentum': {
    preset: 'improving_momentum',
    explanation: 'Stocks showing strengthening price momentum.',
    filters: [{ field: 'momentum', operator: 'gte', value: 60, label: 'Momentum ≥ 60' }],
  },
  'low debt leaders': {
    preset: 'low_debt_leaders',
    explanation: 'Companies with strong balance sheets and minimal leverage.',
    filters: [{ field: 'stability', operator: 'gte', value: 65, label: 'Stability ≥ 65' }],
  },
  'earnings acceleration': {
    preset: 'earnings_acceleration',
    explanation: 'Companies with accelerating earnings growth.',
    filters: [{ field: 'growth', operator: 'gte', value: 60, label: 'Growth ≥ 60' }],
  },
  'dividend stability': {
    preset: 'dividend_stability',
    explanation: 'Companies with sustainable dividend profiles.',
    filters: [{ field: 'stability', operator: 'gte', value: 55, label: 'Stability ≥ 55' }],
  },
  'turnaround watch': {
    preset: 'turnaround_watch',
    explanation: 'Companies showing early signs of operational recovery.',
    filters: [
      { field: 'quality', operator: 'gte', value: 35, label: 'Quality ≥ 35' },
      { field: 'quality', operator: 'lt', value: 55, label: 'Quality < 55' },
      { field: 'momentum', operator: 'gte', value: 55, label: 'Momentum ≥ 55' },
    ],
  },
  'risk rising': {
    preset: 'risk_rising',
    explanation: 'Companies with deteriorating risk indicators.',
    filters: [{ field: 'risk', operator: 'gte', value: 60, label: 'Risk ≥ 60' }],
  },
  'good businesses out of favour': {
    preset: 'good_businesses_out_of_favour',
    explanation: 'Strong businesses temporarily out of market favour.',
    filters: [
      { field: 'quality', operator: 'gte', value: 65, label: 'Quality ≥ 65' },
      { field: 'valuation', operator: 'gte', value: 60, label: 'Valuation ≥ 60' },
      { field: 'momentum', operator: 'lt', value: 45, label: 'Momentum < 45' },
    ],
  },
};

export class ScannerQueryParser {
  parse(query: string): ScannerQueryPlan {
    const lower = query.toLowerCase().trim();
    const unsupportedTerms: string[] = [];

    if (!lower) {
      return {
        filters: [],
        sort: 'score',
        explanation: 'Enter a search query to filter stocks. Try "quality compounders", "low debt midcaps", or "undervalued quality".',
        unsupportedTerms: [],
        confidence: 0,
      };
    }

    const exactPreset = KNOWN_PRESETS[lower];
    if (exactPreset) {
      return {
        filters: [...exactPreset.filters],
        sort: 'score',
        preset: exactPreset.preset,
        explanation: exactPreset.explanation,
        unsupportedTerms: [],
        confidence: 1,
      };
    }

    const filters: ScannerFilter[] = [];
    let sort: ScannerQueryPlan['sort'] = 'score';
    let explanation = 'Custom filters applied based on your query.';
    const matchedPhrases: string[] = [];

    if (/low debt|low leverage|debt[\s-]?free|zero debt|low d\/e/.test(lower)) {
      filters.push({ field: 'stability', operator: 'gte', value: 60, label: 'Low debt' });
      matchedPhrases.push('low debt');
    }

    if (/high roe|strong roe/.test(lower)) {
      filters.push({ field: 'quality', operator: 'gte', value: 60, label: 'High ROE' });
      matchedPhrases.push('high ROE');
    }

    if (/high roic|strong roic/.test(lower)) {
      filters.push({ field: 'quality', operator: 'gte', value: 60, label: 'High ROIC' });
      matchedPhrases.push('high ROIC');
    }

    if (/high roa|strong roa/.test(lower)) {
      filters.push({ field: 'quality', operator: 'gte', value: 55, label: 'High ROA' });
      matchedPhrases.push('high ROA');
    }

    if (/cheap|undervalued|low pe|low pb|bargain|value/.test(lower)) {
      filters.push({ field: 'valuation', operator: 'gte', value: 60, label: 'Cheap valuation' });
      matchedPhrases.push('cheap valuation');
    }

    if (/low pe/.test(lower)) {
      filters.push({ field: 'valuation', operator: 'gte', value: 65, label: 'Low PE' });
    }

    if (/low pb/.test(lower)) {
      filters.push({ field: 'valuation', operator: 'gte', value: 60, label: 'Low PB' });
    }

    if (/high growth|fast growth|growing|growth|accelerat/.test(lower)) {
      filters.push({ field: 'growth', operator: 'gte', value: 60, label: 'High growth' });
      matchedPhrases.push('high growth');
    }

    if (/improving margin|margin expansion|margin improvement/.test(lower)) {
      filters.push({ field: 'quality', operator: 'gte', value: 50, label: 'Improving margins' });
      matchedPhrases.push('improving margins');
    }

    if (/high dividend|dividend yield|good dividend|dividend stability/.test(lower)) {
      filters.push({ field: 'valuation', operator: 'gte', value: 50, label: 'High dividend' });
      matchedPhrases.push('high dividend');
    }

    if (/strong momentum|bullish|uptrend|positive momentum/.test(lower)) {
      filters.push({ field: 'momentum', operator: 'gte', value: 60, label: 'Strong momentum' });
      matchedPhrases.push('strong momentum');
    }

    if (/low volatility|low risk|stable|defensive/.test(lower)) {
      filters.push({ field: 'stability', operator: 'gte', value: 60, label: 'Low volatility' });
      matchedPhrases.push('low volatility');
    }

    if (/large cap|largecap|large-cap/.test(lower)) {
      filters.push({ field: 'marketCap', operator: 'gte', value: 20000, label: 'Large cap' });
      matchedPhrases.push('large cap');
    }

    if (/mid cap|midcap|mid-cap/.test(lower)) {
      filters.push({ field: 'marketCap', operator: 'between', value: [5000, 20000], label: 'Mid cap' });
      matchedPhrases.push('mid cap');
    }

    if (/small cap|smallcap|small-cap/.test(lower)) {
      filters.push({ field: 'marketCap', operator: 'lt', value: 5000, label: 'Small cap' });
      matchedPhrases.push('small cap');
    }

    const sectorMappings: Record<string, string[]> = {
      banking: ['bank', 'banking', 'financial'],
      technology: ['technology', 'tech', 'it', 'software'],
      fmcg: ['fmcg', 'consumer', 'consumption'],
      pharma: ['pharma', 'pharmaceutical', 'healthcare'],
      insurance: ['insurance'],
      auto: ['auto', 'automobile', 'automotive'],
      utilities: ['utilities', 'utility', 'power', 'energy'],
    };

    for (const [sector, keywords] of Object.entries(sectorMappings)) {
      for (const kw of keywords) {
        if (lower.includes(kw)) {
          filters.push({ field: 'sector', operator: 'eq', value: sector, label: `Sector: ${sector}` });
          matchedPhrases.push(`${sector} sector`);
          break;
        }
      }
    }

    if (/companies like|similar to|comparable/.test(lower)) {
      unsupportedTerms.push('companies-like-query');
    }

    if (/avoid|overheated|expensive|bubble/.test(lower)) {
      if (/avoid|overheated|bubble/.test(lower)) {
        filters.push({ field: 'risk', operator: 'gte', value: 60, label: 'Elevated risk' });
        matchedPhrases.push('elevated risk');
      }
      if (/expensive/.test(lower)) {
        filters.push({ field: 'valuation', operator: 'lt', value: 40, label: 'Expensive valuation' });
        matchedPhrases.push('expensive valuation');
      }
    }

    const unmatched = this.findUnmatchedTerms(lower, matchedPhrases);
    unsupportedTerms.push(...unmatched);

    if (filters.length === 0) {
      const knownKeys = Object.keys(KNOWN_PRESETS);
      if (unsupportedTerms.length === 0) {
        unsupportedTerms.push(query);
      }
      return {
        filters: [],
        sort: 'score',
        explanation: `No recognised filter patterns found in your query. Try one of the available presets: ${knownKeys.join(', ')}. Or use simple phrases like "low debt midcaps" or "high growth technology".`,
        unsupportedTerms,
        confidence: 0,
      };
    }

    if (/momentum|improving|rising|bullish/.test(lower) && !/risk rising/.test(lower)) {
      sort = 'momentum';
    } else if (/cheap|value|undervalued|bargain/.test(lower)) {
      sort = 'valuation';
    } else if (/growth|growing|accelerat/.test(lower)) {
      sort = 'growth';
    } else if (/quality|roe|roic/.test(lower)) {
      sort = 'quality';
    }

    return {
      filters,
      sort,
      explanation,
      unsupportedTerms: unsupportedTerms.filter(t => t.length > 0),
      confidence: 0.8,
    };
  }

  private findUnmatchedTerms(query: string, matched: string[]): string[] {
    const tokens = query.split(/\s+/).filter(t => t.length > 2);
    const knownWords = new Set([
      'low', 'high', 'strong', 'weak', 'good', 'best', 'top',
      'debt', 'roe', 'roic', 'roa', 'pe', 'pb', 'growth', 'margin',
      'momentum', 'volatility', 'dividend', 'quality', 'value',
      'large', 'mid', 'small', 'cap', 'stable', 'cheap', 'expensive',
      'bank', 'banks', 'banking', 'tech', 'technology', 'fmcg',
      'pharma', 'auto', 'insurance', 'utilities', 'sector',
      'with', 'and', 'or', 'the', 'that', 'for', 'stocks',
      'companies', 'shares', 'india', 'nse', 'bse',
      'improving', 'rising', 'compounders', 'leaders',
      'undervalued', 'overvalued', 'avoid', 'risk',
      'earnings', 'acceleration', 'turnaround', 'watch',
      'favour', 'favour', 'business', 'businesses',
      'compounders', 'leaders', 'stability', 'defensive',
      'positive', 'negative', 'bargain', 'accelerating',
      'consumer', 'consumption', 'software', 'power', 'energy',
    ]);

    return tokens.filter(t => !knownWords.has(t));
  }
}

export const scannerQueryParser = new ScannerQueryParser();
