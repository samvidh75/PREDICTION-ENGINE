/**
 * Custom React Hook: Local LLM-based explanations
 *
 * Workflow:
 * 1. Fetch RAG context from server
 * 2. Load local model (Gemma-2B quantized)
 * 3. Generate explanations without API calls
 */

import { useEffect, useState, useCallback } from 'react';
import { initializeModel, generateExplanation } from '../lib/llmInference';

interface LLMState {
  isLoading: boolean;
  error: string | null;
  explanation: string | null;
  bullCase: string | null;
  bearCase: string | null;
  whatToWatch: string | null;
}

export function useLLMExplainer(symbol: string) {
  const [state, setState] = useState<LLMState>({
    isLoading: false,
    error: null,
    explanation: null,
    bullCase: null,
    bearCase: null,
    whatToWatch: null
  });

  const generateExplanations = useCallback(async (ragContext: any) => {
    setState(prev => ({ ...prev, isLoading: true }));

    try {
      const model = await initializeModel();

      const explanation = await generateExplanation(
        model,
        ragContext,
        'thesis'
      );

      const bullCase = await generateExplanation(
        model,
        ragContext,
        'bull_case'
      );

      const bearCase = await generateExplanation(
        model,
        ragContext,
        'bear_case'
      );

      const whatToWatch = await generateExplanation(
        model,
        ragContext,
        'what_to_watch'
      );

      setState({
        isLoading: false,
        error: null,
        explanation,
        bullCase,
        bearCase,
        whatToWatch
      });
    } catch (err: any) {
      console.error('LLM generation failed:', err);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: err.message
      }));
    }
  }, []);

  return { ...state, generateExplanations };
}
