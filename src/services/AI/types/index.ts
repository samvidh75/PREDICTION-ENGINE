export interface SGLangResponse {
  text: string;
  tokens: number;
  latencyMs: number;
}

export interface ResearchBotResponse {
  answer: string;
  confidence: number;
}

export interface StockAnalysis {
  quality: string;
  valuation: string;
  growth: string;
  risk: string;
}

export interface LLMMetrics {
  totalQueries: number;
  avgLatencyMs: number;
  costPerQuery: number;
}

export interface LLMResponseRow {
  id?: number;
  cache_key: string;
  response_type: string;
  content: any;
  token_count: number;
  cost_estimate: number;
  created_at?: string;
  expires_at?: string;
}
