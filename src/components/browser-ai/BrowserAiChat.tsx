import { useEffect, useState, useRef } from 'react';
import { chatHistoryStorage, type ChatMessage } from '../../utils/chatHistoryStorage';
import { buildAIContext, type MarketContext } from '../../utils/aiContextBuilder';
import { liveMarketDataService } from '../../utils/liveMarketDataService';

interface BrowserAiChatProps {
  ticker: string;
}

interface DisplayMessage extends ChatMessage {
  complianceWarning?: string;
}

export default function BrowserAiChat({ ticker }: BrowserAiChatProps) {
  const [worker, setWorker] = useState<Worker | null>(null);
  const [status, setStatus] = useState('Click to load WebGPU model...');
  const [isReady, setIsReady] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [marketData, setMarketData] = useState<MarketContext>({ ticker });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const llmWorker = new Worker(
      new URL('./edgeAiLlmWorkerFineTuned.ts', import.meta.url),
      { type: 'module' },
    );

    llmWorker.onmessage = (e: MessageEvent) => {
      const { type, message, response: slmOut, error } = e.data;

      if (type === 'STATUS_UPDATE') setStatus(message);
      if (type === 'INITIALIZED_SUCCESS') {
        setStatus('✅ WebGPU Ready. Fine-tuned model loaded.');
        setIsReady(true);
      }
      if (type === 'INITIALIZATION_FAILED') setStatus(`❌ Error: ${error}`);
      if (type === 'GENERATION_COMPLETE') {
        handleResponseReceived(slmOut);
        setLoading(false);
      }
      if (type === 'GENERATION_FAILED') {
        setStatus(`❌ Error: ${error}`);
        setLoading(false);
      }
    };

    setWorker(llmWorker);

    // Initialize chat storage and session
    const initSession = async () => {
      await chatHistoryStorage.init();
      const newSessionId = await chatHistoryStorage.createSession(ticker);
      setSessionId(newSessionId);
    };
    initSession();

    // Subscribe to real-time market data
    const unsubscribe = liveMarketDataService.subscribeToRealtime(ticker, (context) => {
      setMarketData(context);
    });

    // Get initial market context
    liveMarketDataService.getMarketContext(ticker).then(setMarketData);

    return () => {
      llmWorker.terminate();
      unsubscribe();
    };
  }, [ticker]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleResponseReceived = async (response: string) => {
    if (!sessionId) return;

    const assistantMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'assistant',
      content: response,
      timestamp: Date.now(),
      ticker,
    };

    await chatHistoryStorage.addMessage(sessionId, assistantMessage);
    setMessages((prev) => [...prev, assistantMessage]);
  };

  const wakeUpLocalEngine = () => {
    if (worker) worker.postMessage({ type: 'INITIALIZE_BROWSER_LLM' });
  };

  const executeBrowserInference = async () => {
    if (!worker || !prompt.trim() || !isReady || !sessionId) return;

    setLoading(true);
    const userQuery = prompt;
    setPrompt('');

    // Add user message to history
    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: userQuery,
      timestamp: Date.now(),
      ticker,
    };

    await chatHistoryStorage.addMessage(sessionId, userMessage);
    setMessages((prev) => [...prev, userMessage]);

    // Build context with history and market data
    const aiContext = buildAIContext(userQuery, ticker, messages, marketData);

    // Send to worker
    worker.postMessage({
      type: 'GENERATE_ON_GPU',
      payload: {
        systemPrompt: aiContext.systemPrompt,
        userPrompt: aiContext.userPrompt,
      },
    });

    // Show compliance warning if needed
    if (aiContext.complianceWarning) {
      const warningMessage: DisplayMessage = {
        id: `warning-${Date.now()}`,
        role: 'assistant',
        content: aiContext.complianceWarning,
        timestamp: Date.now(),
        ticker,
        complianceWarning: aiContext.complianceWarning,
      };
      setMessages((prev) => [...prev, warningMessage]);
    }
  };

  const clearHistory = async () => {
    if (!sessionId) return;
    await chatHistoryStorage.deleteSession(sessionId);
    setMessages([]);
    const newSessionId = await chatHistoryStorage.createSession(ticker);
    setSessionId(newSessionId);
    setStatus('✅ Chat history cleared');
  };

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '8px', maxWidth: '600px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h3>💬 AI Chat ({ticker})</h3>
        <small style={{ color: '#666' }}>{status}</small>
      </div>

      {marketData.currentPrice && (
        <div style={{ fontSize: '12px', color: '#666', marginBottom: '12px', padding: '8px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
          📊 {ticker} @ ₹{marketData.currentPrice.toFixed(2)}{marketData.changePercent && ` (${marketData.changePercent > 0 ? '↑' : '↓'}${Math.abs(marketData.changePercent).toFixed(2)}%)`}
        </div>
      )}

      {!isReady && (
        <button onClick={wakeUpLocalEngine} style={{ marginBottom: '12px', padding: '8px 16px', cursor: 'pointer' }}>
          🚀 Load Local AI
        </button>
      )}

      {isReady && (
        <>
          <div
            style={{
              height: '300px',
              overflowY: 'auto',
              border: '1px solid #ddd',
              borderRadius: '4px',
              padding: '12px',
              marginBottom: '12px',
              backgroundColor: '#fafafa',
            }}
          >
            {messages.length === 0 && <p style={{ color: '#999', fontSize: '12px' }}>No messages yet. Start by asking a question about {ticker}.</p>}
            {messages.map((msg) => (
              <div key={msg.id} style={{ marginBottom: '12px', display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div
                  style={{
                    maxWidth: '80%',
                    padding: '10px',
                    borderRadius: '8px',
                    backgroundColor: msg.role === 'user' ? '#0084ff' : msg.complianceWarning ? '#fff3cd' : '#e5e5ea',
                    color: msg.role === 'user' ? 'white' : 'black',
                    fontSize: '14px',
                    wordWrap: 'break-word',
                  }}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && executeBrowserInference()}
              placeholder="Ask about P/E, ROE, debt..."
              disabled={loading}
              style={{
                flex: 1,
                padding: '8px 12px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '14px',
              }}
            />
            <button onClick={executeBrowserInference} disabled={loading} style={{ padding: '8px 16px', cursor: 'pointer' }}>
              {loading ? '⏳' : '→'}
            </button>
          </div>

          <button onClick={clearHistory} style={{ fontSize: '12px', padding: '4px 8px', cursor: 'pointer', opacity: 0.6 }}>
            Clear Chat
          </button>
        </>
      )}
    </div>
  );
}
