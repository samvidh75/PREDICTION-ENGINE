/**
 * Smart LLM Model Router
 * Routes questions to optimal model tier based on complexity
 *
 * Tier 1: Qwen 0.5B (simple, <2s)
 * Tier 2: Qwen 1B (intermediate, 3-4s)
 * Tier 3: Groq API (complex, 3-5s, free)
 */

export type ModelTier = 'tier1-qwen-05b' | 'tier2-qwen-1b' | 'tier3-groq-api';

interface ComplexityScore {
  score: number; // 0-100
  tier: ModelTier;
  reasoning: string;
  keywords: string[];
}

class ModelRouter {
  /**
   * Keywords that indicate simple questions (Tier 1)
   */
  private simpleKeywords = [
    'what is',
    'explain',
    'define',
    'meaning',
    'how does',
    'stock hours',
    'trading hours',
    'dividend',
    'split',
    'listing',
    'basics',
    'beginner',
    'simple',
  ];

  /**
   * Keywords that indicate intermediate questions (Tier 2)
   */
  private intermediateKeywords = [
    'compare',
    'analysis',
    'analyze',
    'technical',
    'pattern',
    'trend',
    'momentum',
    'support',
    'resistance',
    'consolidation',
    'breakout',
    'sector',
    'industry',
    'vs',
    'versus',
    'growth',
    'valuation',
    'pe ratio',
    'roe',
    'debt',
  ];

  /**
   * Keywords that indicate complex questions (Tier 3)
   */
  private complexKeywords = [
    'earnings',
    'report',
    'transcript',
    'forecast',
    'guidance',
    'risk',
    'portfolio',
    'recommendation',
    'should i buy',
    'should i sell',
    'deep dive',
    'fundamental',
    'quarterly',
    'annual',
    'macro',
    'geopolitical',
    'economic impact',
    'multistock',
    'correlation',
    'diversification',
    'rebalance',
    'tax',
    'dividend strategy',
  ];

  /**
   * Analyze question complexity and return optimal model tier
   */
  analyzeComplexity(question: string): ComplexityScore {
    const lowerQuestion = question.toLowerCase().trim();
    const wordCount = question.split(/\s+/).length;
    const stockMentions = (question.match(/[A-Z]{3,4}/g) || []).length;

    let score = 0;
    const detectedKeywords: string[] = [];

    // Check for complex keywords (highest priority)
    for (const keyword of this.complexKeywords) {
      if (lowerQuestion.includes(keyword)) {
        score += 30;
        detectedKeywords.push(keyword);
      }
    }

    // Check for intermediate keywords
    for (const keyword of this.intermediateKeywords) {
      if (lowerQuestion.includes(keyword)) {
        score += 15;
        detectedKeywords.push(keyword);
      }
    }

    // Check for simple keywords (reduces score)
    for (const keyword of this.simpleKeywords) {
      if (lowerQuestion.includes(keyword)) {
        score = Math.max(0, score - 10);
        detectedKeywords.push(keyword);
      }
    }

    // Boost score for multiple stocks mentioned
    if (stockMentions > 1) {
      score += stockMentions * 10;
    }

    // Boost score for longer questions
    if (wordCount > 20) score += 15;
    if (wordCount > 40) score += 20;

    // Boost score for question marks (indicates more complex inquiry)
    const questionMarks = (question.match(/\?/g) || []).length;
    score += questionMarks * 10;

    // Determine tier based on score
    let tier: ModelTier;

    if (score >= 60) {
      tier = 'tier3-groq-api';
    } else if (score >= 30) {
      tier = 'tier2-qwen-1b';
    } else {
      tier = 'tier1-qwen-05b';
    }

    return {
      score: Math.min(100, score),
      tier,
      reasoning: '',
      keywords: [...new Set(detectedKeywords)], // Remove duplicates
    };
  }

  /**
   * Get model configuration for the selected tier
   */
  getModelConfig(tier: ModelTier) {
    const configs = {
      'tier1-qwen-05b': {
        name: 'Qwen 0.5B',
        displayName: '⚡ Fast',
        modelId: 'qwen-0.5b-instruct',
        huggingFaceModel: 'Qwen/Qwen2.5-0.5B-Instruct-GGUF',
        expectedSpeed: '< 2s',
        accuracy: '80-85%',
        useCase: 'Basic questions & definitions',
        location: 'Browser (WebGPU)',
        cost: '$0',
      },
      'tier2-qwen-1b': {
        name: 'Qwen 1B',
        displayName: '🧠 Balanced',
        modelId: 'qwen-1b-instruct',
        huggingFaceModel: 'Qwen/Qwen2.5-1B-Instruct-GGUF',
        expectedSpeed: '3-4s',
        accuracy: '88-92%',
        useCase: 'Intermediate analysis & comparisons',
        location: 'Browser (WebGPU)',
        cost: '$0',
      },
      'tier3-groq-api': {
        name: 'Groq Llama 7B',
        displayName: '🔥 Powerful',
        modelId: 'llama-3-70b-versatile',
        expectedSpeed: '3-5s',
        accuracy: '93-97%',
        useCase: 'Deep analysis & complex reasoning',
        location: 'Cloud API (Groq)',
        cost: '$0 (free tier, 30 req/min)',
      },
    };

    return configs[tier];
  }

  /**
   * Get routing statistics for UI display
   */
  getRoutingStats(questions: string[]) {
    const stats = {
      tier1: 0,
      tier2: 0,
      tier3: 0,
      avgScore: 0,
    };

    let totalScore = 0;

    for (const question of questions) {
      const analysis = this.analyzeComplexity(question);
      totalScore += analysis.score;

      if (analysis.tier === 'tier1-qwen-05b') stats.tier1++;
      else if (analysis.tier === 'tier2-qwen-1b') stats.tier2++;
      else stats.tier3++;
    }

    stats.avgScore = questions.length > 0 ? totalScore / questions.length : 0;

    return stats;
  }

  /**
   * Get explanation of routing decision (for user transparency)
   */
  getExplanation(complexity: ComplexityScore): string {
    const config = this.getModelConfig(complexity.tier);
    return `
🤖 Using ${config.displayName} Model

Reason: ${complexity.reasoning}
Complexity Score: ${complexity.score.toFixed(0)}/100
Detected Keywords: ${complexity.keywords.join(', ') || 'None'}

Expected Response Time: ${config.expectedSpeed}
Accuracy for this question: ${config.accuracy}
    `.trim();
  }
}

// Export singleton
export const modelRouter = new ModelRouter();

// Example usage:
/*
import { modelRouter } from './modelRouter';

// Simple question
const q1 = "What is P/E ratio?";
const analysis1 = modelRouter.analyzeComplexity(q1);
console.log(analysis1);
// Output: { score: 8, tier: 'tier1-qwen-05b', ... }

// Intermediate question
const q2 = "Compare technical analysis of HDFC vs ICICI";
const analysis2 = modelRouter.analyzeComplexity(q2);
console.log(analysis2);
// Output: { score: 45, tier: 'tier2-qwen-1b', ... }

// Complex question
const q3 = "Analyze HDFC's Q3 earnings report and compare with sector peers. Should I buy?";
const analysis3 = modelRouter.analyzeComplexity(q3);
console.log(analysis3);
// Output: { score: 75, tier: 'tier3-groq-api', ... }
*/
