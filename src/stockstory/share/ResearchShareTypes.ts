export interface SharedSnapshot {
  id: string;
  symbol: string;
  companyName: string;
  scores: Record<string, number>;
  thesis: string;
  risks: string[];
  createdAt: string;
  expiresAt?: string;
}

export interface ShareLink {
  url: string;
  shortCode: string;
  expiresAt?: string;
}
