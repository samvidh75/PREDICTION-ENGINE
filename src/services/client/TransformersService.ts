import { pipeline } from '@xenova/transformers';

let extractor: any = null;
let qaModel: any = null;

async function initializeModels() {
  if (!extractor) {
    console.log('Loading feature extractor (one-time, cached)...');
    extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }

  if (!qaModel) {
    console.log('Loading QA model (one-time, cached)...');
    qaModel = await pipeline('question-answering', 'Xenova/distilbert-base-uncased-distilled-squad');
  }
}

export class TransformersService {
  static async embedQuery(query: string): Promise<number[]> {
    await initializeModels();

    const embedding = await extractor(query, {
      pooling: 'mean',
      normalize: true,
    });

    return Array.from(embedding.data);
  }

  static async answerQuestion(question: string, context: string): Promise<string> {
    await initializeModels();

    const answer = await qaModel(question, context);

    return answer.answer;
  }

  static async classifyIntent(query: string): Promise<string> {
    const classifier = await pipeline('zero-shot-classification', 'Xenova/distilbert-base-uncased');

    const result = await classifier(query, [
      'stock_scanner',
      'price_lookup',
      'fundamental_analysis',
      'technical_analysis',
      'comparison',
      'news_search',
    ]);

    const output = Array.isArray(result) ? result[0] : result;
    return output.labels[0];
  }

  static async canHandle(query: string): Promise<boolean> {
    try {
      if (query.length < 10) return false;

      await initializeModels();
      return true;
    } catch {
      return false;
    }
  }
}

export const transformersService = new TransformersService();
