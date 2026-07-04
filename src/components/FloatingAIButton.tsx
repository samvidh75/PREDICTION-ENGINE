/**
 * Floating AI Button
 * Appears on every page in bottom-right corner
 * Launches offline Stockex LLM chat with browser-based inference
 */

import { useState, useEffect } from 'react';
import { colors } from '../design/tokens';
import { browserLLM } from '../services/ai/BrowserLLM';

export default function FloatingAIButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [llmReady, setLlmReady] = useState(false);

  useEffect(() => {
    // Initialize LLM on component mount
    browserLLM.initialize().then(setLlmReady);
  }, []);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = input;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      // Try browser LLM first
      if (llmReady) {
        const response = await browserLLM.generateResponse(userMessage);
        if (response) {
          setMessages((prev) => [...prev, { role: 'assistant', content: response.text }]);
          setIsLoading(false);
          return;
        }
      }

      // Fallback to server
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, context: 'stock-analysis' }),
      });

      if (response.ok) {
        const data = await response.json();
        setMessages((prev) => [...prev, { role: 'assistant', content: data.response }]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: 'Unable to generate response. Please try again.',
          },
        ]);
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Error generating response. Powered by StockEx AI.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Chat Popup */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: '80px',
            right: '16px',
            width: 'min(400px, 90vw)',
            height: '500px',
            backgroundColor: colors.surface,
            borderRadius: '12px',
            border: `1px solid ${colors.border}`,
            boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
            zIndex: 999,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '12px 16px',
              borderBottom: `1px solid ${colors.border}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>StockEx AI</h3>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: 'none',
                border: 'none',
                color: colors.textSecondary,
                fontSize: '20px',
                cursor: 'pointer',
              }}
            >
              ×
            </button>
          </div>

          {/* Messages */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            {messages.length === 0 && (
              <div
                style={{
                  textAlign: 'center',
                  color: colors.textSecondary,
                  padding: '20px 0',
                  fontSize: '14px',
                }}
              >
                Ask about stocks, P/E, ROE, debt ratios, valuations.
                <div style={{ fontSize: '12px', marginTop: '8px', opacity: 0.7 }}>
                  🤖 {llmReady ? 'AI Ready - Running on browser' : 'Loading AI...'}
                </div>
              </div>
            )}
            {messages.map((msg, idx) => (
              <div
                key={idx}
                style={{
                  alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  backgroundColor: msg.role === 'user' ? (colors.primary || '#3b82f6') : colors.canvas,
                  color: msg.role === 'user' ? '#fff' : colors.textPrimary,
                  padding: '8px 12px',
                  borderRadius: '8px',
                  maxWidth: '85%',
                  fontSize: '13px',
                  wordBreak: 'break-word',
                }}
              >
                {msg.content}
              </div>
            ))}
            {isLoading && (
              <div
                style={{
                  fontSize: '13px',
                  color: colors.textSecondary,
                  fontStyle: 'italic',
                }}
              >
                Thinking...
              </div>
            )}
          </div>

          {/* Input */}
          <div
            style={{
              padding: '12px',
              borderTop: `1px solid ${colors.border}`,
              display: 'flex',
              gap: '8px',
            }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask something..."
              style={{
                flex: 1,
                backgroundColor: colors.canvas,
                color: colors.textPrimary,
                border: `1px solid ${colors.border}`,
                padding: '8px 12px',
                borderRadius: '6px',
                fontSize: '13px',
                outline: 'none',
              }}
              disabled={isLoading}
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              style={{
                padding: '8px 12px',
                backgroundColor: colors.primary || '#3b82f6',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.5 : 1,
                fontSize: '12px',
                fontWeight: '600',
              }}
            >
              Send
            </button>
          </div>
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed',
          bottom: '16px',
          right: '16px',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          backgroundColor: colors.primary || '#3b82f6',
          color: '#fff',
          border: 'none',
          fontSize: '24px',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 998,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'transform 0.2s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.1)')}
        onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        title="Ask StockEx AI"
      >
        {isOpen ? '✕' : '💬'}
      </button>
    </>
  );
}
