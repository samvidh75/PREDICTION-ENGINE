import React, { useEffect, useState } from 'react';

interface BrowserAiChatProps {
  ticker: string;
}

export default function BrowserAiChat({ ticker }: BrowserAiChatProps) {
  const [worker, setWorker] = useState<Worker | null>(null);
  const [status, setStatus] = useState('Click to load WebGPU model...');
  const [isReady, setIsReady] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const llmWorker = new Worker(
      new URL('./edgeAiLlmWorker.ts', import.meta.url),
      { type: 'module' },
    );

    llmWorker.onmessage = (e: MessageEvent) => {
      const { type, message, response: slmOut, error } = e.data;

      if (type === 'STATUS_UPDATE') setStatus(message);
      if (type === 'INITIALIZED_SUCCESS') {
        setStatus('WebGPU Engine Active. 0% Server Overhead.');
        setIsReady(true);
      }
      if (type === 'INITIALIZATION_FAILED') setStatus(`Error: ${error}`);
      if (type === 'GENERATION_COMPLETE') {
        setResponse(slmOut);
        setLoading(false);
      }
      if (type === 'GENERATION_FAILED') {
        setStatus(`Error: ${error}`);
        setLoading(false);
      }
    };

    setWorker(llmWorker);
    return () => llmWorker.terminate();
  }, []);

  const wakeUpLocalEngine = () => {
    if (worker) worker.postMessage({ type: 'INITIALIZE_BROWSER_LLM' });
  };

  const executeBrowserInference = () => {
    if (!worker || !prompt.trim() || !isReady) return;
    setLoading(true);
    setResponse('');

    const systemPrompt = `You are a helpful AI analyzing ${ticker}.`;

    worker.postMessage({
      type: 'GENERATE_ON_GPU',
      payload: { systemPrompt, userPrompt: prompt },
    });
  };

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
      <h3>Local Browser AI ({ticker})</h3>
      <p>Status: {status}</p>

      {!isReady && (
        <button onClick={wakeUpLocalEngine}>Load Local AI</button>
      )}

      {isReady && (
        <>
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ask anything..."
            disabled={loading}
          />
          <button onClick={executeBrowserInference} disabled={loading}>
            {loading ? 'Thinking...' : 'Run Locally'}
          </button>
        </>
      )}

      {response && (
        <div style={{ marginTop: '16px', padding: '10px', backgroundColor: '#f0f0f0' }}>
          <strong>Response:</strong>
          <p>{response}</p>
        </div>
      )}
    </div>
  );
}
