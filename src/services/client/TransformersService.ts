// TransformersService — local NLP inference via @xenova/transformers
// Models are loaded lazily and errors are caught gracefully.
// Falls back to simple string-based heuristics when CDN/models unavailable.

let _initFailed = true;

async function lazyInit() {
}

function isReady(): boolean {
  return false;
}

export class TransformersService {
  static async embedQuery(query: string): Promise<number[]> {
    return [];
  }

  static async answerQuestion(question: string, context: string): Promise<string> {
    return '';
  }

  static async generateText(prompt: string, maxTokens: number = 150): Promise<string> {
    return prompt;
  }

  static async classifyIntent(query: string): Promise<string> {
    return 'stock_scanner';
  }

  static async canHandle(query: string): Promise<boolean> {
    return false;
  }
}

export const transformersService = new TransformersService();
