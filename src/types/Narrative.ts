export type Narrative = {
  id: string;
  category:
    | "Institutional activity"
    | "Earnings interpretation"
    | "Volatility analysis"
    | "Sentiment shifts"
    | "Liquidity conditions"
    | "Sector rotation"
    | "Behavioural pattern";

  title: string;
  body: string;

  // Softness score for UI pacing (not exposed as probability)
  intensity: number; // 0..1

  // Timeline placement (for timeline feed)
  createdAt: number;
};
