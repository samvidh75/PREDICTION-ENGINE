// TransformersService — local NLP inference via @xenova/transformers
// Models are loaded lazily and errors are caught gracefully.
// Falls back to simple string-based heuristics when CDN/models unavailable.

let extractor: any = null;
let qaModel: any = null;
let textGenModel: any = null;

let _initialized = false;
let _initFailed = false;
let _initPromise: Promise<void> | null = null;

async function tryLoad<T>(loader: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await loader();
  } catch {
    return fallback;
  }
}

async function lazyInit() {
  if (_initialized || _initFailed) return;
  if (_initPromise) return _initPromise;

  _initPromise = (async () => {
    try {
      const { pipeline } = await import('@xenova/transformers');

      const [ext, qa] = await Promise.all([
        tryLoad(() => pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2'), null),
        tryLoad(() => pipeline('question-answering', 'Xenova/distilbert-base-uncased-distilled-squad'), null),
      ]);

      extractor = ext;
      qaModel = qa;
      _initialized = true;
    } catch {
      // Models could not be loaded (CDN rate limit, no internet, etc.)
      // All methods will fall back gracefully.
      _initFailed = true;
    }
  })();

  return _initPromise;
}

function isReady(): boolean {
  return _initialized && !!extractor;
}

export class TransformersService {
  static async embedQuery(query: string): Promise<number[]> {
    await lazyInit();
    if (!isReady()) return [];

    try {
      const embedding = await extractor(query, {
        pooling: 'mean',
        normalize: true,
      });
      return Array.from(embedding.data);
    } catch {
      return [];
    }
  }

  static async answerQuestion(question: string, context: string): Promise<string> {
    await lazyInit();
    if (!isReady() || !qaModel) return '';

    try {
      const answer = await qaModel(question, context);
      return answer.answer;
    } catch {
      return '';
    }
  }

  static async generateText(prompt: string, maxTokens: number = 150): Promise<string> {
    await lazyInit();
    if (!isReady()) return '';

    try {
      if (!textGenModel) {
        const { pipeline } = await import('@xenova/transformers');
        textGenModel = await tryLoad(
          () => pipeline('text-generation', 'Xenova/distilgpt2'),
          null
        );
      }
      if (!textGenModel) return prompt;

      const result = await textGenModel(prompt, {
        max_new_tokens: maxTokens,
        do_sample: true,
        temperature: 0.7,
      });

      const output = Array.isArray(result) ? result[0] : result;
      return output.generated_text;
    } catch {
      return prompt;
    }
  }

  static async classifyIntent(query: string): Promise<string> {
    await lazyInit();
    if (!isReady()) return 'stock_scanner';

    try {
      const { pipeline } = await import('@xenova/transformers');
      const classifier = await tryLoad(
        () => pipeline('zero-shot-classification', 'Xenova/distilbert-base-uncased'),
        null
      );
      if (!classifier) return 'stock_scanner';

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
    } catch {
      return 'stock_scanner';
    }
  }

  static async canHandle(query: string): Promise<boolean> {
    if (query.length < 10) return false;
    await lazyInit();
    return isReady();
  }
}

export const transformersService = new TransformersService();
