import { QdrantClient } from '@qdrant/js-client-rest';

const QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333';

export class FreeVectorDBService {
  private client: QdrantClient;

  constructor() {
    this.client = new QdrantClient({ url: QDRANT_URL });
  }

  async searchStocks(queryVector: number[], limit = 10): Promise<any> {
    const collections = await this.client.getCollections();
    const hasStocks = collections.collections.some(c => c.name === 'stocks');
    if (!hasStocks) return [];

    const results = await this.client.search('stocks', {
      vector: queryVector,
      limit,
    });
    return results;
  }

  async storeStock(symbol: string, vector: number[], payload: Record<string, any> = {}): Promise<void> {
    const collections = await this.client.getCollections();
    const hasStocks = collections.collections.some(c => c.name === 'stocks');
    if (!hasStocks) {
      await this.client.createCollection('stocks', {
        vectors: { size: vector.length, distance: 'Cosine' },
      });
    }

    await this.client.upsert('stocks', {
      points: [
        {
          id: Date.now(),
          vector,
          payload: { symbol, ...payload, timestamp: new Date().toISOString() },
        },
      ],
    });
  }

  async health(): Promise<boolean> {
    try {
      await this.client.getCollections();
      return true;
    } catch {
      return false;
    }
  }
}

export const freeVectorDBService = new FreeVectorDBService();
