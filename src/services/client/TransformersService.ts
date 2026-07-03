import { AutoTokenizer, AutoModelForCausalLM, pipeline } from '@huggingface/transformers';

let _initFailed = false;
let _embeddingPipeline: any = null;
let _textGenModel: any = null;
let _tokenizer: any = null;

async function lazyInit() {
  if (_initFailed || _embeddingPipeline) return;
  try {
    _embeddingPipeline = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    _textGenModel = await AutoModelForCausalLM.from_pretrained('Xenova/gpt2', {
      dtype: 'fp32',
    });
    _tokenizer = await AutoTokenizer.from_pretrained('Xenova/gpt2');
  } catch (err) {
    _initFailed = true;
    console.warn('[TransformersService] Init failed:', err);
  }
}

function isReady(): boolean {
  return !!_embeddingPipeline && !!_textGenModel;
}

export class TransformersService {
  static async embedQuery(query: string): Promise<number[]> {
    await lazyInit();
    if (!_embeddingPipeline) return [];
    try {
      const embeddings = await _embeddingPipeline(query, { pooling: 'mean', normalize: true });
      return Array.from(embeddings.data || []);
    } catch (err) {
      console.warn('[TransformersService] Embed failed:', err);
      return [];
    }
  }

  static async answerQuestion(question: string, context: string): Promise<string> {
    await lazyInit();
    if (!_textGenModel || !_tokenizer) return '';
    try {
      const prompt = `Question: ${question}\nContext: ${context}\nAnswer:`;
      const inputs = await _tokenizer(prompt, { return_tensors: 'pt' });
      const outputs = await _textGenModel.generate({
        ...inputs,
        max_new_tokens: 100,
        do_sample: false,
      });
      const decoded = await _tokenizer.batch_decode(outputs, { skip_special_tokens: true });
      return (decoded[0] || '').replace(prompt, '').trim();
    } catch (err) {
      console.warn('[TransformersService] QA failed:', err);
      return '';
    }
  }

  static async generateText(prompt: string, maxTokens: number = 150): Promise<string> {
    await lazyInit();
    if (!_textGenModel || !_tokenizer) return prompt;
    try {
      const inputs = await _tokenizer(prompt, { return_tensors: 'pt' });
      const outputs = await _textGenModel.generate({
        ...inputs,
        max_new_tokens: maxTokens,
        do_sample: true,
        temperature: 0.7,
      });
      const decoded = await _tokenizer.batch_decode(outputs, { skip_special_tokens: true });
      return decoded[0] || prompt;
    } catch (err) {
      console.warn('[TransformersService] Generate failed:', err);
      return prompt;
    }
  }

  static async classifyIntent(query: string): Promise<string> {
    const intents = ['scanner', 'research', 'portfolio', 'compare', 'watchlist'];
    const keywords: Record<string, string[]> = {
      scanner: ['scan', 'find', 'screen', 'filter', 'top'],
      research: ['analyze', 'research', 'understand', 'explain', 'why'],
      portfolio: ['portfolio', 'holdings', 'position', 'account'],
      compare: ['compare', 'vs', 'versus', 'better', 'difference'],
      watchlist: ['watch', 'track', 'monitor', 'add'],
    };

    for (const [intent, words] of Object.entries(keywords)) {
      if (words.some(word => query.toLowerCase().includes(word))) {
        return intent;
      }
    }
    return 'scanner';
  }

  static async canHandle(query: string): Promise<boolean> {
    await lazyInit();
    return isReady();
  }
}

export const transformersService = new TransformersService();
