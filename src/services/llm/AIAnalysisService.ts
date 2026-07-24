
export interface AIAnalysis {
  thesis: string;
  bullCase: string;
  bearCase: string;
  whatToWatch: string;
  confidence: number;
  state: "High Conviction" | "Watch" | "Needs Review" | "Risk Rising" | "Avoid for Now";
}

interface ScoreInput {
  quality: number;
  valuation: number;
  growth: number;
  risk: number;
  technical: number;
}

interface MetricInput {
  pe: number;
  roe: number;
  revenueGrowth: number;
  profitGrowth: number;
  debtEquity: number;
}

const LLM_ENDPOINT = import.meta.env.VITE_LLM_ENDPOINT || "http://localhost:8000/generate";
const LLM_TIMEOUT = 10000;

export async function generateStockAnalysis(
  symbol: string,
  companyName: string,
  price: number,
  scores: ScoreInput,
  existingThesis?: string,
): Promise<AIAnalysis | null> {
  const prompt = buildAnalysisPrompt(symbol, companyName, price, scores, existingThesis);

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), LLM_TIMEOUT);

    const response = await fetch(LLM_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: prompt,
        sampling_params: {
          temperature: 0.7,
          max_new_tokens: 500,
          top_p: 0.95,
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) {
      throw new Error(`LLM service returned ${response.status}`);
    }

    const result = await response.json();
    const parsed = JSON.parse(result.text);

    if (!parsed.thesis || !parsed.bullCase || !parsed.bearCase) {
      throw new Error("Invalid LLM response structure");
    }

    const health = (scores.quality + scores.risk) / 2;
    const state = getInvestmentState(health, scores.valuation);

    return {
      thesis: parsed.thesis,
      bullCase: parsed.bullCase,
      bearCase: parsed.bearCase,
      whatToWatch: parsed.whatToWatch || "Monitor quarterly results and sector trends",
      confidence: parsed.confidence || 0.7,
      state,
    };
  } catch (error) {
    console.error("AI analysis generation failed:", { symbol, error: (error as Error).message });
    return null;
  }
}

function buildAnalysisPrompt(
  symbol: string,
  companyName: string,
  price: number,
  scores: ScoreInput,
  existingThesis?: string,
): string {
  return `You are a professional equity research analyst. Analyze ${symbol} (${companyName}, ₱${price}) based on this data:

Scores (0-100):
- Quality: ${scores.quality} (ROE, capital efficiency, operating margins)
- Valuation: ${scores.valuation} (PE, PB relative to industry)
- Growth: ${scores.growth} (Revenue and profit growth)
- Risk: ${scores.risk} (Debt, balance sheet, market cap)
- Technical: ${scores.technical} (RSI, MACD, price momentum)
${existingThesis ? `\nExisting thesis context: ${existingThesis}\n` : ""}
Generate a JSON response with:
{
  "thesis": "2-3 sentence investment thesis explaining the stock's core opportunity or challenge",
  "bullCase": "2-3 specific reasons to be optimistic (avoid 'strong fundamentals', be specific)",
  "bearCase": "2-3 key risks or concerns to monitor",
  "whatToWatch": "What could change this thesis (earnings, sector trends, macro)",
  "confidence": 0.0-1.0 score reflecting data completeness and conviction
}

Be precise. Avoid generic statements. Reference specific metrics.`;
}

function getInvestmentState(health: number, valuation: number): AIAnalysis["state"] {
  if (health >= 80 && valuation >= 70) return "High Conviction";
  if (health >= 70 && valuation >= 50) return "Watch";
  if (health >= 60 && valuation >= 40) return "Needs Review";
  if (health >= 50 && valuation < 40) return "Risk Rising";
  return "Avoid for Now";
}

export function fallbackAnalysis(scores: ScoreInput): AIAnalysis {
  const health = (scores.quality + scores.risk) / 2;
  const state = getInvestmentState(health, scores.valuation);

  const templates: Record<AIAnalysis["state"], { thesis: string; bullCase: string; bearCase: string }> = {
    "High Conviction": {
      thesis: "Strong quality metrics and reasonable valuation suggest durable competitive advantages. The company demonstrates consistent capital efficiency and disciplined growth, positioning it well within its sector.",
      bullCase: "1. Quality score above 80 indicates superior operational execution. 2. Favorable valuation relative to peers. 3. Strong balance sheet with manageable leverage.",
      bearCase: "1. Sector headwinds could compress margins. 2. Valuation may be stretched if growth decelerates. 3. Macro risks could impact demand.",
    },
    Watch: {
      thesis: "The company shows solid fundamentals with room for improvement in certain areas. Monitor key metrics for directional changes that could strengthen or weaken the investment case.",
      bullCase: "1. Improving quality metrics suggest operational momentum. 2. Growth trajectory is positive. 3. Reasonable valuation provides margin of safety.",
      bearCase: "1. Some metrics lag sector peers. 2. Growth rates may be decelerating. 3. External factors could pressure performance.",
    },
    "Needs Review": {
      thesis: "Mixed signals across quality, valuation, and growth metrics warrant deeper analysis. Several factors need to improve before conviction can increase.",
      bullCase: "1. Select metrics show strength relative to sector. 2. Potential catalysts on the horizon. 3. Valuation may be discounting too much pessimism.",
      bearCase: "1. Below-average returns on capital. 2. Earnings visibility is limited. 3. Competitive position may be weakening.",
    },
    "Risk Rising": {
      thesis: "Deteriorating fundamentals combined with an unfavorable valuation create an asymmetric risk profile. Caution is warranted until the trend reverses.",
      bullCase: "1. Deep value opportunity if turnaround materializes. 2. Sector tailwinds could provide relief. 3. Management may be taking corrective action.",
      bearCase: "1. Quality metrics trending lower. 2. Elevated debt levels increase financial risk. 3. Earnings downgrades possible.",
    },
    "Avoid for Now": {
      thesis: "Fundamental weaknesses across multiple dimensions suggest this stock carries unacceptable risk at current levels. Wait for measurable improvement before reconsidering.",
      bullCase: "1. Contrarian opportunity at extremely depressed levels. 2. Restructuring could unlock value. 3. Industry consolidation may benefit survivors.",
      bearCase: "1. Persistent quality deterioration. 2. Unsustainable debt burden. 3. Limited catalysts for re-rating.",
    },
  };

  const template = templates[state];
  return {
    thesis: template.thesis,
    bullCase: template.bullCase,
    bearCase: template.bearCase,
    whatToWatch: "Monitor quarterly results, management commentary, and sector trends for directional changes.",
    confidence: 0.65,
    state,
  };
}
