/**
 * Floating AI Button
 * Appears on every page in bottom-right corner
 * ChatGPT-like market intelligence with real stock analysis
 */

import { useState } from 'react';
import { colors } from '../design/tokens';
import { stockExAI } from '../services/ai/StockExAI';

export default function FloatingAIButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = input;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      // Use StockEx AI - ChatGPT of Philippine stock market
      const aiResponse = await stockExAI.chat(userMessage);
      if (aiResponse && aiResponse.response) {
        setMessages((prev) => [...prev, { role: 'assistant', content: aiResponse.response }]);
      } else {
        throw new Error('Empty response from AI');
      }
    } catch (error) {
      console.error('[StockEx AI] Error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `⚠️ **Oops!**\n\nHad trouble with that request (${errorMsg}).\n\n💡 Try asking:\n• "Analyze HDFC"\n• "Best stocks now"\n• "Explain P/E ratio"\n• "Market update"`,
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
                  padding: '16px',
                  fontSize: '13px',
                  lineHeight: '1.6',
                }}
              >
                <div style={{ fontWeight: '600', marginBottom: '8px' }}>🤖 StockEx AI</div>
                <div style={{ fontSize: '12px', opacity: 0.8, marginBottom: '12px' }}>
                  ChatGPT of Indian Stock Market - Deep Analysis Included
                </div>
                <div style={{ fontSize: '11px', opacity: 0.7, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span>📊 "Best tech stocks now"</span>
                  <span>📈 "Analyze HDFC" - Deep dive</span>
                  <span>💼 "Portfolio analysis"</span>
                  <span>📈 "Technical INFY"</span>
                  <span>🎓 "Explain P/E ratio"</span>
                  <span>💡 "Market update"</span>
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
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
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
      <style>{`
        @keyframes pulse-premium {
          0%, 100% { box-shadow: 0 8px 24px rgba(59, 130, 246, 0.35), 0 0 0 0 rgba(59, 130, 246, 0.4); }
          50% { box-shadow: 0 8px 24px rgba(59, 130, 246, 0.25), 0 0 0 8px rgba(59, 130, 246, 0); }
        }
        .stockex-ai-button {
          animation: pulse-premium 2s infinite;
        }
      `}</style>
      <button
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        className={isOpen ? '' : 'stockex-ai-button'}
        style={{
          position: 'fixed',
          bottom: '16px',
          right: '16px',
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: isOpen
            ? colors.primary || '#3b82f6'
            : `linear-gradient(135deg, ${colors.primary || '#3b82f6'} 0%, #2563eb 100%)`,
          color: '#fff',
          border: '2px solid rgba(255,255,255,0.2)',
          fontSize: '28px',
          cursor: 'pointer',
          boxShadow: isHovering
            ? '0 12px 32px rgba(59, 130, 246, 0.4), 0 0 20px rgba(59, 130, 246, 0.2)'
            : '0 8px 24px rgba(59, 130, 246, 0.3)',
          zIndex: 998,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
          transform: isHovering ? 'scale(1.15)' : 'scale(1)',
          backdropFilter: 'blur(10px)',
        }}
        title="StockEx AI - Ask about stocks"
      >
        <span style={{
          fontSize: '24px',
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
        }}>
          {isOpen ? '✕' : '✨'}
        </span>
      </button>
    </>
  );
}
