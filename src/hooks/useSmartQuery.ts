import { useState, useCallback } from 'react';
import { SmartQueryParser } from '@/services/SmartQueryParser';
import { TransformersService } from '@/services/client/TransformersService';
import { groqFallback } from '@/services/client/GroqFallback';

export function useSmartQuery() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [method, setMethod] = useState('');

  const processQuery = useCallback(async (query: string) => {
    setLoading(true);
    try {
      if (SmartQueryParser.canHandleWithRegexOnly(query)) {
        const parsed = SmartQueryParser.parseQuery(query);
        setResult(parsed);
        setMethod('regex');
        setLoading(false);
        return;
      }

      if (await TransformersService.canHandle(query)) {
        const intent = await TransformersService.classifyIntent(query);
        setResult({ intent, confidence: 0.8 });
        setMethod('transformers');
        setLoading(false);
        return;
      }

      const groqResponse = await groqFallback.fallbackToGroq(query);
      setResult({ response: groqResponse });
      setMethod('groq');
    } catch (error) {
      console.error('Query processing failed:', error);
      setResult({ error: 'Failed to process query' });
      setMethod('error');
    } finally {
      setLoading(false);
    }
  }, []);

  return { processQuery, loading, result, method };
}
