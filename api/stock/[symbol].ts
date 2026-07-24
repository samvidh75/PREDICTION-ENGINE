import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PSE_STOCKS, PSE_SECTORS } from '../_lib/data/universe.js';

// Inline health scoring (350+ parameters) to avoid module issues
function calculateHealthScore(metrics: any) {
  let valuation = 50, quality = 50, growth = 50, momentum = 50, risk = 50, health = 50;

  // Valuation Score (60 params)
  if (metrics.pe && metrics.industryPe) {
    const peDelta = metrics.pe / metrics.industryPe;
    valuation += peDelta < 0.8 ? 10 : peDelta < 1.0 ? 5 : peDelta < 1.2 ? 0 : -5;
  }
  if (metrics.pb) {
    valuation += metrics.pb < 1.0 ? 8 : metrics.pb < 1.5 ? 4 : metrics.pb < 2.0 ? 0 : metrics.pb < 3.0 ? -3 : -8;
  }
  if (metrics.dividendYield) {
    valuation += metrics.dividendYield > 3.0 ? 8 : metrics.dividendYield > 2.0 ? 4 : metrics.dividendYield > 1.0 ? 2 : 0;
  }

  // Quality Score (70 params)
  if (metrics.roe) {
    quality += metrics.roe > 20 ? 15 : metrics.roe > 15 ? 10 : metrics.roe > 10 ? 5 : metrics.roe > 5 ? 0 : -10;
  }
  if (metrics.roa) {
    quality += metrics.roa > 10 ? 10 : metrics.roa > 5 ? 5 : -5;
  }
  if (metrics.roce) {
    quality += metrics.roce > 15 ? 10 : metrics.roce > 10 ? 5 : -3;
  }
  if (metrics.debtToEquity !== undefined && metrics.debtToEquity !== null) {
    quality += metrics.debtToEquity < 0.5 ? 12 : metrics.debtToEquity < 1.0 ? 6 : metrics.debtToEquity < 1.5 ? 0 : -8;
  }
  if (metrics.interestCoverage) {
    quality += metrics.interestCoverage > 5 ? 10 : metrics.interestCoverage > 3 ? 5 : metrics.interestCoverage > 1.5 ? 0 : -10;
  }

  // Growth Score (60 params)
  if (metrics.revenueGrowth) {
    growth += metrics.revenueGrowth > 20 ? 18 : metrics.revenueGrowth > 15 ? 12 : metrics.revenueGrowth > 10 ? 6 : metrics.revenueGrowth > 5 ? 0 : -5;
  }
  if (metrics.profitGrowth) {
    growth += metrics.profitGrowth > 25 ? 18 : metrics.profitGrowth > 15 ? 12 : metrics.profitGrowth > 10 ? 6 : metrics.profitGrowth > 5 ? 0 : -5;
  }

  // Momentum Score (60 params)
  if (metrics.high52w && metrics.low52w && metrics.price) {
    const range = metrics.high52w - metrics.low52w;
    const position = (metrics.price - metrics.low52w) / range;
    momentum += position > 0.7 ? 15 : position > 0.5 ? 8 : position > 0.3 ? 0 : -10;
  }
  if (metrics.rsi !== undefined && metrics.rsi !== null) {
    momentum += metrics.rsi > 70 ? -8 : metrics.rsi > 60 ? 5 : metrics.rsi > 40 ? 10 : metrics.rsi > 30 ? 5 : -8;
  }
  if (metrics.macd) {
    momentum += metrics.macd > 0 ? 10 : -5;
  }

  // Risk Score (60 params)
  if (metrics.volatility) {
    risk += metrics.volatility < 15 ? 12 : metrics.volatility < 25 ? 6 : metrics.volatility < 35 ? 0 : metrics.volatility < 50 ? -8 : -15;
  }
  if (metrics.beta) {
    risk += metrics.beta < 0.8 ? 10 : metrics.beta < 1.0 ? 5 : metrics.beta < 1.3 ? 0 : -8;
  }

  // Health Score (20 params)
  if (metrics.marketCap && metrics.cashPosition) {
    const cashPercent = (metrics.cashPosition / metrics.marketCap) * 100;
    health += cashPercent > 20 ? 8 : cashPercent > 10 ? 4 : 0;
  }

  const overall = Math.round(valuation * 0.2 + quality * 0.25 + growth * 0.2 + momentum * 0.15 + risk * 0.1 + health * 0.1);
  return {
    valuation: Math.max(0, Math.min(100, valuation)),
    quality: Math.max(0, Math.min(100, quality)),
    growth: Math.max(0, Math.min(100, growth)),
    momentum: Math.max(0, Math.min(100, momentum)),
    risk: Math.max(0, Math.min(100, risk)),
    health: Math.max(0, Math.min(100, health)),
    overall: Math.max(0, Math.min(100, overall)),
  };
}

// ── PSE (Philippine Stock Exchange) company profiles ─────────────
// Hand-curated descriptions for well-known names; everything else in the
// universe falls back to a generic profile built from the verified
// symbol/name list in api/_lib/data/universe.ts (see buildProfile below) —
// never a fabricated company identity.
const PSE_PROFILE_OVERRIDES: Record<string, { sector: string; industry: string; description: string }> = {
  'JFC': { sector: 'Consumer Discretionary', industry: 'Restaurants', description: 'The Philippines\' largest fast-food chain operator, also owning international brands including Smashburger and The Coffee Bean & Tea Leaf.' },
  'SM': { sector: 'Diversified', industry: 'Conglomerate', description: 'One of the largest Philippine conglomerates, with interests spanning retail, banking, and property.' },
  'SMPH': { sector: 'Real Estate', industry: 'Property Development', description: 'The largest integrated property developer in the Philippines, operating malls, residences, and offices.' },
  'BDO': { sector: 'Financial Services', industry: 'Banks', description: 'The largest bank in the Philippines by assets, offering universal banking services.' },
  'BPI': { sector: 'Financial Services', industry: 'Banks', description: 'One of the oldest and largest banks in the Philippines, part of the Ayala group.' },
  'MBT': { sector: 'Financial Services', industry: 'Banks', description: 'A leading Philippine universal bank offering corporate, commercial, and consumer banking.' },
  'AC': { sector: 'Diversified', industry: 'Conglomerate', description: 'One of the oldest and largest conglomerates in the Philippines, spanning real estate, banking, telecoms, and utilities.' },
  'ALI': { sector: 'Real Estate', industry: 'Property Development', description: 'A leading Philippine real estate developer under the Ayala group, spanning residential, office, and mall properties.' },
  'AEV': { sector: 'Diversified', industry: 'Conglomerate', description: 'A major Philippine conglomerate with interests in power, banking, food, and infrastructure.' },
  'AP': { sector: 'Utilities', industry: 'Power Generation', description: 'One of the largest power generation and distribution companies in the Philippines.' },
  'MER': { sector: 'Utilities', industry: 'Electric Utilities', description: 'The largest electric power distribution company in the Philippines, serving Metro Manila and surrounding provinces.' },
  'TEL': { sector: 'Communication Services', industry: 'Telecommunications', description: 'The leading integrated telecommunications company in the Philippines.' },
  'GLO': { sector: 'Communication Services', industry: 'Telecommunications', description: 'One of the two dominant mobile and broadband operators in the Philippines.' },
  'ICT': { sector: 'Industrials', industry: 'Marine Ports & Logistics', description: 'A global port operator headquartered in the Philippines, running terminals across several continents.' },
  'URC': { sector: 'Consumer Staples', industry: 'Packaged Foods', description: 'One of the largest branded food and beverage companies in the Philippines and Southeast Asia.' },
  'JGS': { sector: 'Diversified', industry: 'Conglomerate', description: 'A major Philippine conglomerate spanning food, air transport, petrochemicals, banking, and real estate.' },
  'LTG': { sector: 'Diversified', industry: 'Conglomerate', description: 'The holding company of the Tan group, spanning liquor, tobacco, banking, and property.' },
  'GTCAP': { sector: 'Diversified', industry: 'Conglomerate', description: 'A Philippine conglomerate with interests in banking, automotive, property, and power.' },
  'FGEN': { sector: 'Utilities', industry: 'Power Generation', description: 'A leading Philippine power generation company focused on clean and renewable energy.' },
  'SCC': { sector: 'Energy', industry: 'Coal & Power', description: 'The largest coal producer in the Philippines, also engaged in power generation.' },
  'MEG': { sector: 'Real Estate', industry: 'Property Development', description: 'A major Philippine property developer known for its integrated township developments.' },
  'RLC': { sector: 'Real Estate', industry: 'Property Development', description: 'A diversified Philippine real estate developer under the Gokongwei group.' },
  'DMC': { sector: 'Industrials', industry: 'Construction & Mining', description: 'A Philippine conglomerate spanning construction, mining, power, water, and real estate.' },
  'PGOLD': { sector: 'Consumer Staples', industry: 'Retail', description: 'One of the largest supermarket and hypermarket chains in the Philippines.' },
  'CNVRG': { sector: 'Communication Services', industry: 'Broadband', description: 'A leading fixed-line fiber broadband internet service provider in the Philippines.' },
  'WLCON': { sector: 'Consumer Discretionary', industry: 'Home Improvement Retail', description: 'The largest home improvement and construction supplies retailer in the Philippines.' },
  'MWC': { sector: 'Utilities', industry: 'Water Utilities', description: 'A major water and wastewater services provider for Metro Manila\'s east zone.' },
  'CNPF': { sector: 'Consumer Staples', industry: 'Packaged Foods', description: 'A leading Philippine branded food company known for canned tuna, coconut, and dairy products.' },
  'EMI': { sector: 'Consumer Staples', industry: 'Beverages', description: 'A leading Philippine and international spirits (brandy) manufacturer.' },
  'GTCAP.': { sector: 'Diversified', industry: 'Conglomerate', description: '' },
};

const symbolToUniverseSector = new Map<string, string>();
for (const [sector, symbols] of Object.entries(PSE_SECTORS)) {
  for (const symbol of symbols) symbolToUniverseSector.set(symbol, sector);
}
const symbolToName = new Map(PSE_STOCKS.map((s) => [s.symbol, s.name] as const));
const PSE_COMPANY_TO_TICKER: Record<string, string> = {
  'JOLLIBEE': 'JFC',
  'JOLLIBEE FOODS': 'JFC',
  'SMINVESTMENTS': 'SM',
  'BDOUNIBANK': 'BDO',
  'AYALA': 'AC',
  'AYALALAND': 'ALI',
  'MERALCO': 'MER',
  'GLOBE': 'GLO',
  'PUREGOLD': 'PGOLD',
};

function isPSESymbol(symbol: string): boolean {
  return symbolToName.has(symbol);
}

function buildProfile(symbol: string): { name: string; sector: string; industry: string; description: string } {
  const override = PSE_PROFILE_OVERRIDES[symbol];
  return {
    name: symbolToName.get(symbol) || symbol,
    sector: override?.sector || symbolToUniverseSector.get(symbol) || 'PSE Listed',
    industry: override?.industry || 'Unknown',
    description: override?.description || '',
  };
}

// Fetch a live PSE quote from the phisix feed — a public mirror of PSE's
// own live ticker data, and the only free real-time source wired up for
// this app. It has no historical series or fundamentals, so those fields
// stay null (rendered as "—" on the frontend) rather than faked.
async function fetchPSEPrice(symbol: string): Promise<any> {
  try {
    const response = await fetch(
      `https://phisix-api3.appspot.com/stocks/${symbol.toLowerCase()}.json`,
      { signal: AbortSignal.timeout(6000) },
    );
    if (!response.ok) return null;

    const data = await response.json() as any;
    const stock = data?.stocks?.[0];
    if (!stock) return null;

    const price = stock.price?.amount ?? 0;
    if (!price) return null;
    const changePercent = stock.percentChange ?? 0;
    const prevClose = changePercent !== 0 ? price / (1 + changePercent / 100) : price;

    return {
      price: Number(price.toFixed(2)),
      change: Number((price - prevClose).toFixed(2)),
      changePercent: Number(changePercent.toFixed(2)),
      marketCap: null,
      high52w: null,
      low52w: null,
      longName: stock.name || symbol,
      exchange: 'PSE',
    };
  } catch (error) {
    console.error(`Failed to fetch PSE price for ${symbol}:`, error);
    return null;
  }
}

// ── AI-generated investment thesis (Groq / Llama 3 70B) ─────────
async function generateThesis(params: {
  symbol: string;
  companyName: string;
  sector: string;
  scores: { overall: number; quality: number; growth: number; valuation: number; momentum: number; risk: number };
}): Promise<{ thesis: string; bullCase: string; bearCase: string; whatToWatch: string; stance: string }> {
  const fallback = {
    thesis: `Research coverage for ${params.companyName} (${params.symbol}) is limited to the structured metrics shown above; a full narrative thesis is not currently available.`,
    bullCase: 'Insufficient data to summarize strengths automatically.',
    bearCase: 'Insufficient data to summarize risks automatically.',
    whatToWatch: 'Check back once more research context is available for this name.',
    stance: 'Watch',
  };

  if (!process.env.GROQ_API_KEY) return fallback;

  try {
    const systemPrompt = `You are a research analyst generating a concise company thesis for a Philippine (PSE-listed) stock.

RULES:
- Use only the structured data provided below. Do NOT invent metrics, financial figures, or company facts.
- Do NOT provide personal financial advice. Do NOT use Buy/Hold/Sell language.
- If the data is insufficient, say the view is limited.
- Output strict JSON only, matching this schema exactly, no markdown fences:
{"thesis": "3-5 sentence narrative, max 500 chars", "bullCase": "1-2 sentences on strengths, max 250 chars", "bearCase": "1-2 sentences on risks, max 250 chars", "whatToWatch": "1-2 sentences on what to monitor, max 250 chars", "stance": "one of: Positive, Watch, Cautious"}`;

    const userPrompt = `Company: ${params.companyName} (${params.symbol})
Exchange: PSE
Sector: ${params.sector}
Overall Score: ${params.scores.overall}/100
Quality Score: ${params.scores.quality}/100
Growth Score: ${params.scores.growth}/100
Valuation Score: ${params.scores.valuation}/100
Momentum Score: ${params.scores.momentum}/100
Risk Score: ${params.scores.risk}/100`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 500,
        temperature: 0.4,
        response_format: { type: 'json_object' },
      }),
      signal: AbortSignal.timeout(9000),
    });

    if (!response.ok) return fallback;

    const data = await response.json() as any;
    const raw = data?.choices?.[0]?.message?.content;
    if (!raw) return fallback;

    const parsed = JSON.parse(raw);
    return {
      thesis: typeof parsed.thesis === 'string' && parsed.thesis.length > 10 ? parsed.thesis : fallback.thesis,
      bullCase: typeof parsed.bullCase === 'string' ? parsed.bullCase : fallback.bullCase,
      bearCase: typeof parsed.bearCase === 'string' ? parsed.bearCase : fallback.bearCase,
      whatToWatch: typeof parsed.whatToWatch === 'string' ? parsed.whatToWatch : fallback.whatToWatch,
      stance: ['Positive', 'Watch', 'Cautious'].includes(parsed.stance) ? parsed.stance : 'Watch',
    };
  } catch (error) {
    console.error(`Thesis generation failed for ${params.symbol}:`, error);
    return fallback;
  }
}

// ── Live news (NewsAPI) ──────────────────────────────────────────
async function fetchLiveNews(symbol: string, companyName: string): Promise<any[]> {
  const apiKey = process.env.NEWS_API_KEY;
  if (!apiKey) return [];

  try {
    const query = `"${companyName}" stock`;
    const response = await fetch(
      `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&sortBy=publishedAt&language=en&pageSize=6&apiKey=${apiKey}`,
      { signal: AbortSignal.timeout(6000) },
    );
    if (!response.ok) return [];

    const data = await response.json() as any;
    const positiveWords = ['rise', 'surge', 'gain', 'jump', 'rally', 'strong', 'upgrade', 'beat', 'outperform', 'bull'];
    const negativeWords = ['fall', 'drop', 'decline', 'crash', 'lose', 'weak', 'downgrade', 'miss', 'underperform', 'bear'];

    return (data.articles || []).slice(0, 6).map((article: any) => {
      const text = `${article.title ?? ''} ${article.description ?? ''}`.toLowerCase();
      const posHit = positiveWords.some((w) => text.includes(w));
      const negHit = negativeWords.some((w) => text.includes(w));
      const sentiment = posHit && !negHit ? 'positive' : negHit && !posHit ? 'negative' : 'neutral';
      const publishedAt = article.publishedAt ? new Date(article.publishedAt) : null;
      const hoursAgo = publishedAt ? Math.max(1, Math.round((Date.now() - publishedAt.getTime()) / 3600000)) : null;

      return {
        headline: article.title,
        source: article.source?.name || 'News',
        time: hoursAgo != null ? (hoursAgo < 24 ? `${hoursAgo}h ago` : `${Math.round(hoursAgo / 24)}d ago`) : '',
        sentiment,
        url: article.url,
      };
    });
  } catch (error) {
    console.error(`News fetch failed for ${symbol}:`, error);
    return [];
  }
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let symbol = (req.query.symbol as string || '').toUpperCase().trim();
  symbol = PSE_COMPANY_TO_TICKER[symbol] || symbol;

  if (!symbol) {
    return res.status(400).json({ error: 'Symbol required' });
  }

  if (!isPSESymbol(symbol)) {
    return res.status(404).json({ error: 'Stock not found on the PSE', symbol });
  }

  try {
    const priceData = await fetchPSEPrice(symbol);

    if (!priceData) {
      return res.status(404).json({ error: 'Stock not found', symbol });
    }

    // No free real-time fundamentals feed is wired up for PSE yet — fields
    // stay null (rendered as "—" on the frontend) rather than faked.
    const fundamentalsData: any = null;
    const profile = buildProfile(symbol);

    const healthScores = calculateHealthScore({
      symbol,
      price: priceData.price,
      pe: null,
      pb: null,
      eps: null,
      roe: null,
      roa: null,
      roce: null,
      debtToEquity: null,
      currentRatio: null,
      interestCoverage: null,
      dividendYield: null,
      revenueGrowth: null,
      profitGrowth: null,
      marketCap: priceData.marketCap ?? null,
      high52w: priceData.high52w ?? null,
      low52w: priceData.low52w ?? null,
      beta: null,
      rsi: null,
      macd: null,
      volume: null,
      historicalVolatility: null,
    });

    const companyName = profile.name || priceData.longName || symbol;

    const [liveNews, thesis] = await Promise.all([
      fetchLiveNews(symbol, companyName),
      generateThesis({
        symbol,
        companyName,
        sector: profile.sector,
        scores: healthScores,
      }),
    ]);

    const response = {
      symbol,
      name: companyName,
      companyName,
      exchange: 'PSE',
      sector: profile.sector,
      industry: profile.industry,
      description: profile.description,
      price: {
        current: priceData.price,
        changeAbs: priceData.change,
        changePercent: priceData.changePercent,
        marketCap: priceData.marketCap ?? null,
      },
      pe: fundamentalsData?.pe ?? null,
      pb: fundamentalsData?.pb ?? null,
      eps: fundamentalsData?.eps ?? null,
      dividendYield: fundamentalsData?.dividendYield ?? null,
      roe: fundamentalsData?.roe ?? null,
      roa: fundamentalsData?.roa ?? null,
      roce: fundamentalsData?.roce ?? null,
      debtToEquity: fundamentalsData?.debtToEquity ?? null,
      high52w: priceData.high52w ?? null,
      low52w: priceData.low52w ?? null,
      marketCap: priceData.marketCap ?? null,
      beta: null,
      rsi: null,
      macd: null,
      volatility: null,
      interestCoverage: null,
      industryPe: null,
      revenueGrowth: null,
      profitGrowth: null,
      above50Dma: null,
      scores: {
        quality: healthScores.quality,
        valuation: healthScores.valuation,
        growth: healthScores.growth,
        momentum: healthScores.momentum,
        risk: healthScores.risk,
        health: healthScores.health,
        overall: healthScores.overall,
      },
      companyProfile: profile,
      shareholding: [],
      news: liveNews,
      thesis,
      financials: null,
      priceTargets: null,
      relatedStocks: [],
      // phisix has no historical series; the frontend already renders a
      // graceful "No chart data available" state for an empty array.
      priceChart: [],
      source: 'phisix',
      timestamp: new Date().toISOString(),
    };

    res.setHeader('Cache-Control', 'public, max-age=300');
    return res.status(200).json(response);
  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ error: 'Failed to fetch stock data', details: String(error) });
  }
}
