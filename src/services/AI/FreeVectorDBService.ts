interface StockPoint {
  id: number;
  vector: number[];
  payload: Record<string, any>;
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB) || 1);
}

export class FreeVectorDBService {
  private stocks: StockPoint[] = [];

  async searchStocks(queryVector: number[], limit = 10): Promise<any> {
    const scored = this.stocks
      .map(point => ({
        ...point,
        score: cosineSimilarity(queryVector, point.vector),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return scored.map(s => ({
      id: s.id,
      score: s.score,
      payload: s.payload,
    }));
  }

  async storeStock(symbol: string, vector: number[], payload: Record<string, any> = {}): Promise<void> {
    this.stocks.push({
      id: Date.now(),
      vector,
      payload: { symbol, ...payload, timestamp: new Date().toISOString() },
    });
  }

  async health(): Promise<boolean> {
    return true;
  }
}

export const freeVectorDBService = new FreeVectorDBService();
