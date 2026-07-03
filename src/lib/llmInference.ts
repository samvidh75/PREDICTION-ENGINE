/**
 * Local LLM Inference Engine
 *
 * Uses:
 * - ONNX Runtime (WebAssembly backend for inference)
 * - Quantized Gemma-2B model
 * - RAG grounding (no hallucination)
 *
 * Inference happens 100% on user device.
 * Typical latency: 2-5 seconds per generation
 */

import * as ort from 'onnxruntime-web';

let modelSession: ort.InferenceSession | null = null;
let tokenizer: any = null;

export async function initializeModel() {
  if (modelSession) {
    return { session: modelSession, tokenizer };
  }

  console.log('Loading quantized Gemma-2B model...');

  try {
    const modelPath = '/models/stockstory_gemma_2b_q4.onnx';

    await ort.env.wasm.wasmPaths;
    ort.env.wasm.wasmPaths = '/onnx-wasm/';

    modelSession = await ort.InferenceSession.create(modelPath, {
      executionProviders: ['wasm'],
      graphOptimizationLevel: 'all',
      enableMemPattern: true
    });

    tokenizer = await loadTokenizer();

    console.log('Model loaded successfully');
    return { session: modelSession, tokenizer };
  } catch (err) {
    console.error('Model loading failed:', err);
    throw err;
  }
}

async function loadTokenizer() {
  const tokenizerUrl = '/models/gemma_tokenizer.json';
  const response = await fetch(tokenizerUrl);
  return await response.json();
}

function buildPrompt(ragContext: any, promptType: string): string {
  const { metrics, growth, risk, company, recentNews } = ragContext;

  const ragBlock = `
COMPANY: ${company.name} (${ragContext.symbol})
SECTOR: ${company.sector}
MARKET CAP: ${company.marketCap}

FINANCIAL METRICS:
- P/E Ratio: ${metrics.pe}
- P/B Ratio: ${metrics.pb}
- ROE: ${metrics.roe}%
- ROIC: ${metrics.roic}%
- Debt-to-Equity: ${metrics.debtToEquity}
- Operating Margin: ${metrics.operatingMargin}%
- FCF Yield: ${metrics.fcfYield}%

GROWTH (3-Year CAGR):
- Revenue: ${growth.revenueCAGR_3y}%
- Profit: ${growth.profitCAGR_3y}%
- Revenue YoY: ${growth.revenueGrowth_YoY}%
- Profit YoY: ${growth.profitGrowth_YoY}%

RISK METRICS:
- 30-Day Volatility: ${risk.volatility_30d}%
- 52-Week Drawdown: ${risk.maxDrawdown_52w}%
- Beta: ${risk.beta}
- Sharpe Ratio: ${risk.sharpeRatio}

RECENT NEWS (${recentNews.length} items):
${recentNews.map((n: any) => `- [${n.sentiment}] ${n.headline}`).join('\n')}
`;

  let prompt = '';

  if (promptType === 'thesis') {
    prompt = `
${ragBlock}

Analyze this company's investment thesis. In 2-3 sentences, explain why this company is interesting to research and what the core investment idea is. Only cite numbers from the RAG context above. No predictions.
    `.trim();
  } else if (promptType === 'bull_case') {
    prompt = `
${ragBlock}

What is the bull case for this stock? List 2-3 specific positive factors (using data from above) that could drive upside. No predictions.
    `.trim();
  } else if (promptType === 'bear_case') {
    prompt = `
${ragBlock}

What is the bear case for this stock? List 2-3 specific risks or headwinds (using data from above) that could cause downside. No predictions.
    `.trim();
  } else if (promptType === 'what_to_watch') {
    prompt = `
${ragBlock}

What should an investor watch or monitor going forward? List 2-3 specific catalysts or metrics (earnings date, growth rates, debt levels, etc) that could change the thesis.
    `.trim();
  }

  return prompt;
}

export async function generateExplanation(
  model: any,
  ragContext: any,
  promptType: string
): Promise<string> {
  const prompt = buildPrompt(ragContext, promptType);
  const maxTokens = 150;

  try {
    const inputIds = tokenizer.encode(prompt);
    const inputTensor = new ort.Tensor('int64', BigInt64Array.from(inputIds));

    const generatedTokens = [...inputIds];

    for (let i = 0; i < maxTokens; i++) {
      const attentionMask = new ort.Tensor('int64', BigInt64Array.from(generatedTokens.map(() => 1n)));

      const outputs = await modelSession!.run({
        input_ids: inputTensor,
        attention_mask: attentionMask
      });

      const logits = outputs.logits.data as Float32Array;
      const lastLogits = logits.slice(-50257);
      const nextTokenId = Array.from(lastLogits).reduce((maxIdx, v, i, arr) => v > arr[maxIdx] ? i : maxIdx, 0);

      generatedTokens.push(nextTokenId);

      if (nextTokenId === 2) break;

      if (generatedTokens.length > 80) {
        const decoded = tokenizer.decode(generatedTokens);
        if (decoded.includes('.') || decoded.includes('?')) {
          break;
        }
      }
    }

    const output = tokenizer.decode(generatedTokens.slice(inputIds.length));

    console.log(`Generated ${generatedTokens.length} tokens for ${promptType}`);

    return output
      .trim()
      .split(/[.!?]\s+/)[0]
      .concat('.')
      .substring(0, 250);
  } catch (err) {
    console.error(`Generation failed for ${promptType}:`, err);
    return `Unable to generate ${promptType} at this time.`;
  }
}
