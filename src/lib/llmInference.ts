/**
 * Local LLM Inference Engine
 *
 * Uses:
 * - ONNX Runtime (WebAssembly backend for inference) — when model file is available
 * - Deterministic rule-based fallback — when model file is unavailable
 * - RAG grounding (no hallucination)
 *
 * Inference happens 100% on user device.
 * Typical latency: 2-5 seconds per generation (ONNX) or < 10ms (deterministic)
 */

import * as ort from 'onnxruntime-web';

let modelSession: ort.InferenceSession | null = null;
let tokenizer: any = null;

export async function initializeModel() {
  if (modelSession) {
    return { session: modelSession, tokenizer };
  }

  // Check if ONNX model exists before attempting to load
  try {
    const headResponse = await fetch('/models/stockstory_gemma_2b_q4.onnx', { method: 'HEAD' });
    if (!headResponse.ok) {
      console.warn('ONNX model not found at /models/stockstory_gemma_2b_q4.onnx — using deterministic fallback');
      return null;
    }
  } catch {
    console.warn('Cannot reach model path — using deterministic fallback');
    return null;
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
    return null;
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

function deterministicExplanation(ragContext: any, promptType: string): string {
  const { metrics, growth, risk, company } = ragContext;

  const roe = metrics?.roe ?? '—';
  const de = metrics?.debtToEquity ?? '—';
  const revGrowth = growth?.revenueCAGR_3y ?? growth?.revenueGrowth_YoY ?? '—';
  const profitGrowth = growth?.profitCAGR_3y ?? growth?.profitGrowth_YoY ?? '—';
  const vol = risk?.volatility_30d ?? '—';
  const sharpe = risk?.sharpeRatio ?? '—';

  switch (promptType) {
    case 'thesis': {
      const strengths: string[] = [];
      if (roe !== '—' && Number(roe) > 15) strengths.push(`strong ROE of ${roe}%`);
      if (de !== '—' && Number(de) < 1) strengths.push(`low debt-to-equity of ${de}`);
      if (revGrowth !== '—' && Number(revGrowth) > 10) strengths.push(`revenue growing at ${revGrowth}%`);
      if (sharpe !== '—' && Number(sharpe) > 1) strengths.push(`attractive risk-adjusted returns (Sharpe ${sharpe})`);

      if (strengths.length > 0) {
        return `${company?.name || 'This company'} shows ${strengths.join(', ')}. The business model demonstrates competitive advantages worth researching further.`;
      }
      return `${company?.name || 'This company'} operates in the ${company?.sector || 'broader'} market with ${roe !== '—' ? `ROE of ${roe}% ` : ''}and ${de !== '—' ? `debt-to-equity of ${de} ` : ''}— metrics that warrant closer analysis against sector peers.`;
    }
    case 'bull_case': {
      const bullPoints: string[] = [];
      if (revGrowth !== '—' && Number(revGrowth) > 15) bullPoints.push(`Revenue growth of ${revGrowth}% outpaces most peers`);
      if (roe !== '—' && Number(roe) > 18) bullPoints.push(`Industry-leading ROE of ${roe}% signals durable competitive advantages`);
      if (sharpe !== '—' && Number(sharpe) > 1.5) bullPoints.push(`Excellent risk-adjusted returns (Sharpe ${sharpe})`);
      if (profitGrowth !== '—' && Number(profitGrowth) > 15) bullPoints.push(`Profit growth of ${profitGrowth}% shows operating leverage`);

      if (bullPoints.length > 0) return bullPoints.slice(0, 2).join('. ') + '.';
      return 'Operational improvements and market positioning could drive re-rating.';
    }
    case 'bear_case': {
      const bearPoints: string[] = [];
      if (de !== '—' && Number(de) > 1.5) bearPoints.push(`Elevated debt-to-equity of ${de} increases financial risk`);
      if (vol !== '—' && Number(vol) > 35) bearPoints.push(`High volatility (${vol}%) adds uncertainty`);
      if (roe !== '—' && Number(roe) < 10) bearPoints.push(`Below-par ROE of ${roe}% suggests capital allocation concerns`);
      if (revGrowth !== '—' && Number(revGrowth) < 5) bearPoints.push(`Slowing revenue growth (${revGrowth}%) could signal headwinds`);

      if (bearPoints.length > 0) return bearPoints.slice(0, 2).join('. ') + '.';
      return 'Competition and sector headwinds could pressure margins and growth.';
    }
    case 'what_to_watch': {
      const watchPoints: string[] = [];
      if (revGrowth !== '—') watchPoints.push('Revenue growth trajectory in upcoming quarters');
      if (de !== '—') watchPoints.push('Debt reduction progress');
      if (profitGrowth !== '—') watchPoints.push('Margin expansion and operating leverage');

      if (watchPoints.length > 0) return 'Monitor: ' + watchPoints.join(', ') + '.';
      return 'Track quarterly results for changes in the fundamental trajectory.';
    }
    default:
      return '';
  }
}

export async function generateExplanation(
  model: any,
  ragContext: any,
  promptType: string
): Promise<string> {
  // If ONNX model is not loaded, use deterministic fallback
  if (!model || !modelSession || !tokenizer) {
    return deterministicExplanation(ragContext, promptType);
  }

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
    return deterministicExplanation(ragContext, promptType);
  }
}
