/**
 * GrowthContentOpportunityEngine — Identifies content opportunities from PMF signals.
 *
 * Uses:
 *  - Failed search queries (content gaps)
 *  - Research quality feedback (what users want more of)
 *  - Feature requests
 *  - Trending searches
 *  - Correction patterns
 */

import type { SearchDemandReport } from './SearchDemandAggregator';
import type { ResearchQualityReport } from './ResearchQualityAggregator';

export interface ContentOpportunity {
  id: string;
  title: string;
  description: string;
  source: 'failed_search' | 'user_feedback' | 'trending' | 'correction';
  signalCount: number;
  priority: number; // 1-100
  suggestedFormat: 'research_report' | 'blog_post' | 'guide' | 'faq' | 'comparison';
  suggestedSymbols: string[];
  rationale: string;
}

export class GrowthContentOpportunityEngine {
  private nextId = 1;
  private failedSearches: Array<{ query: string; userId: string; timestamp: string }> = [];
  private qualityFeedbacks: Array<{ symbol: string; component: string; issue: string; userId: string; timestamp: string }> = [];

  /** Record a failed search and return current opportunities */
  addFailedSearch(input: {
    query: string;
    userId: string;
    timestamp: string;
  }): ContentOpportunity[] {
    this.failedSearches.push(input);
    return this.getRankedOpportunities();
  }

  /** Record quality feedback and return current opportunities */
  addQualityFeedback(input: {
    symbol: string;
    component: string;
    issue: string;
    userId: string;
    timestamp: string;
  }): ContentOpportunity[] {
    this.qualityFeedbacks.push(input);
    return this.getRankedOpportunities();
  }

  /** Get ranked opportunities based on accumulated signals */
  getRankedOpportunities(): (ContentOpportunity & { frequency: number; category: string })[] {
    const opportunities: (ContentOpportunity & { frequency: number; category: string })[] = [];

    // Failed searches → content gaps
    const queryCounts = new Map<string, number>();
    for (const fs of this.failedSearches) {
      queryCounts.set(fs.query, (queryCounts.get(fs.query) ?? 0) + 1);
    }
    for (const [query, count] of queryCounts) {
      if (count < 2) continue;
      const cat = 'content_gap';
      opportunities.push({
        ...this.makeOpportunity({
          title: `Content gap: "${query}"`,
          description: `Users searched for "${query}" ${count} times with no results`,
          source: 'failed_search',
          signalCount: count,
          priority: Math.min(count * 10, 100),
          suggestedFormat: this.inferFormat(query),
          suggestedSymbols: [],
          rationale: `${count} failed searches indicate unmet demand for this topic`,
        }),
        frequency: count,
        category: cat,
      });
    }

    // Quality feedback → content improvement opportunities
    const componentCounts = new Map<string, { count: number; symbols: string[] }>();
    for (const qf of this.qualityFeedbacks) {
      const entry = componentCounts.get(qf.component) ?? { count: 0, symbols: [] };
      entry.count++;
      if (qf.symbol && !entry.symbols.includes(qf.symbol)) entry.symbols.push(qf.symbol);
      componentCounts.set(qf.component, entry);
    }
    for (const [component, data] of componentCounts) {
      if (data.count < 2) continue;
      const cat: string = 'content_gap';
      opportunities.push({
        ...this.makeOpportunity({
          title: `Improve "${component}" section quality`,
          description: `Users reported ${data.count} quality issues with "${component}" content`,
          source: 'user_feedback',
          signalCount: data.count,
          priority: Math.min(data.count * 15, 100),
          suggestedFormat: 'guide',
          suggestedSymbols: data.symbols,
          rationale: `${data.count} quality feedback items on "${component}" content`,
        }),
        frequency: data.count,
        category: cat,
      });
    }

    // Sort by priority descending
    opportunities.sort((a, b) => b.priority - a.priority);

    return opportunities.slice(0, 20);
  }

  /** Reset internal state */
  reset(): void {
    this.failedSearches = [];
    this.qualityFeedbacks = [];
    this.nextId = 1;
  }

  generate(
    searchDemand?: SearchDemandReport,
    researchQuality?: ResearchQualityReport,
  ): ContentOpportunity[] {
    const opportunities: ContentOpportunity[] = [];

    // From failed searches
    if (searchDemand) {
      for (const fq of searchDemand.topFailedQueries) {
        if (fq.count < 2) continue;
        opportunities.push(this.makeOpportunity({
          title: `Content gap: "${fq.query}"`,
          description: `Users searched for "${fq.query}" ${fq.count} times with no results`,
          source: 'failed_search',
          signalCount: fq.count,
          priority: Math.min(fq.count * 10, 100),
          suggestedFormat: this.inferFormat(fq.query),
          suggestedSymbols: [],
          rationale: `${fq.count} failed searches indicate unmet demand for this topic`,
        }));
      }
    }

    // From research quality components with low ratings
    if (researchQuality) {
      for (const [component, data] of Object.entries(researchQuality.byComponent)) {
        if (data.total >= 3 && data.rate < 50) {
          opportunities.push(this.makeOpportunity({
            title: `Improve "${component}" section quality`,
            description: `Research component "${component}" has ${data.rate}% positive feedback (${data.total} ratings)`,
            source: 'user_feedback',
            signalCount: data.total,
            priority: Math.min(Math.round((1 - data.rate / 100) * 80), 80),
            suggestedFormat: 'guide',
            suggestedSymbols: [],
            rationale: `Only ${data.rate}% positive feedback on "${component}" content`,
          }));
        }
      }
    }

    // From symbols with low quality ratings
    if (researchQuality) {
      for (const [symbol, data] of Object.entries(researchQuality.bySymbol)) {
        const positiveRate = data.total > 0 ? Math.round((data.positive / data.total) * 100) : 100;
        if (data.total >= 3 && positiveRate < 50) {
          opportunities.push(this.makeOpportunity({
            title: `Revise research for ${symbol}`,
            description: `Research quality for ${symbol} is low (${positiveRate}% positive, ${data.total} ratings)`,
            source: 'user_feedback',
            signalCount: data.total,
            priority: Math.min(Math.round((1 - positiveRate / 100) * 70), 70),
            suggestedFormat: 'research_report',
            suggestedSymbols: [symbol],
            rationale: `Quality scores for ${symbol} indicate users find the research lacking`,
          }));
        }
      }
    }

    // Sort by priority descending
    opportunities.sort((a, b) => b.priority - a.priority);

    return opportunities.slice(0, 20);
  }

  private makeOpportunity(data: Omit<ContentOpportunity, 'id'>): ContentOpportunity {
    return { id: `opp-${Date.now()}-${this.nextId++}`, ...data };
  }

  private inferFormat(query: string): ContentOpportunity['suggestedFormat'] {
    const lower = query.toLowerCase();
    if (lower.includes('vs') || lower.includes('versus') || lower.includes('compare')) return 'comparison';
    if (lower.includes('how to') || lower.includes('guide') || lower.includes('tips')) return 'guide';
    if (lower.includes('what is') || lower.includes('meaning') || lower.includes('definition')) return 'faq';
    if (lower.includes('news') || lower.includes('update') || lower.includes('latest')) return 'blog_post';
    return 'research_report';
  }
}
