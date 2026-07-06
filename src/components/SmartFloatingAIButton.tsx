/**
 * Smart Floating AI Button
 * Routes questions to optimal model (0.5B, 1B, or Groq API)
 * Shows complexity analysis and model selection
 */

import { useState, useRef, useEffect } from 'react';
import { simpleChat } from '../services/ai/SimpleChat';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  messageId?: string;
}

export default function SmartFloatingAIButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);


  const handleSend = () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage, messageId: `user_${Date.now()}` }]);
    setIsLoading(true);

    try {
      // Get response from SimpleChat (instant, rule-based)
      const response = simpleChat(userMessage);

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: response,
          messageId: `assistant_${Date.now()}_${Math.random()}`,
        },
      ]);
      setIsLoading(false);
    } catch (error) {
      console.error('[Chat Error]', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: '⚠️ Error processing your question. Please try again.',
          messageId: `error_${Date.now()}`,
        },
      ]);
      setIsLoading(false);
    }
  };

  return (
    <div className="smart-floating-ai-button">
      {/* Floating button */}
      <button
        className="ai-button"
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        title="AI Assistant - Ask about stocks!"
      >
        <span className="ai-icon">✨</span>
        {isHovering && <span className="ai-label">StockEx AI</span>}
      </button>

      {/* Chat window */}
      {isOpen && (
        <div className="ai-chat-window">
          <div className="ai-header">
            <h3>StockEx AI Assistant</h3>
            <div className="ai-header-actions">
              {messages.length > 2 && (
                <button
                  className="clear-btn"
                  onClick={() => {
                    setMessages([]);
                  }}
                  title="Clear conversation history"
                >
                  🔄
                </button>
              )}
              <button
                className="close-btn"
                onClick={() => setIsOpen(false)}
                aria-label="Close chat"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Status indicator - hidden for cleaner UI */}
          <div className="ai-status" style={{ display: 'none' }}>
            <span className="status-indicator">{status}</span>
          </div>

          {/* Messages */}
          <div className="ai-messages">
            {messages.length === 0 ? (
              <div className="ai-welcome">
                <h4>StockEx AI 👋</h4>
                <p>Ask about stocks, markets, and investment analysis. I'll help with everything from basics to deep research.</p>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div key={idx} className={`ai-message ai-message-${msg.role}`}>
                  <div className="message-content">
                    {msg.content}
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div className="ai-message ai-message-assistant">
                <div className="message-content">
                  <span className="loading-dots">Thinking</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="ai-input-area">
            <div className="ai-input-group">
              <input
                type="text"
                className="ai-input"
                placeholder="Ask about stocks..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                disabled={isLoading}
              />
              <button
                className="ai-send-btn"
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
              >
                {isLoading ? '...' : '→'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .smart-floating-ai-button {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 1000;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .ai-button {
          width: 48px;
          height: 48px;
          border-radius: 16px;
          background: linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 100%);
          border: 1px solid rgba(255,255,255,0.06);
          color: #ffffff;
          font-size: 20px;
          cursor: pointer;
          box-shadow: 0 0 0 1px rgba(255,255,255,0.03) inset, 0 18px 40px rgba(0,0,0,0.28);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }

        .ai-button:hover {
          transform: scale(1.08);
          background: linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.06) 100%);
          border-color: rgba(255,255,255,0.08);
        }

        .ai-icon {
          display: inline-block;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }

        .ai-label {
          position: absolute;
          right: 60px;
          background: rgba(0,0,0,0.6);
          color: #ffffff;
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 12px;
          white-space: nowrap;
          animation: slideIn 0.2s ease;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }

        @keyframes slideIn {
          from { opacity: 0; transform: translateX(10px); }
          to { opacity: 1; transform: translateX(0); }
        }

        .ai-chat-window {
          position: absolute;
          bottom: 70px;
          right: 0;
          width: min(420px, calc(100vw - 24px));
          height: 520px;
          background: linear-gradient(180deg, rgba(18,18,18,0.92) 0%, rgba(8,8,8,0.96) 100%);
          border-radius: 20px;
          border: 1px solid rgba(255,255,255,0.03);
          box-shadow: 0 0 0 1px rgba(255,255,255,0.03) inset, 0 36px 100px rgba(0,0,0,0.45);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          animation: slideUp 0.3s ease;
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .ai-header {
          padding: 16px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .ai-header h3 {
          margin: 0;
          font-size: 15px;
          font-weight: 600;
          color: #ffffff;
        }

        .ai-header-actions {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .clear-btn {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.06);
          color: #a0a0a0;
          cursor: pointer;
          font-size: 14px;
          padding: 6px 8px;
          border-radius: 8px;
          transition: all 0.2s;
        }

        .clear-btn:hover {
          background: rgba(255, 255, 255, 0.08);
          color: #ffffff;
        }

        .close-btn {
          background: none;
          border: none;
          color: #a0a0a0;
          cursor: pointer;
          font-size: 16px;
          padding: 0;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.2s;
        }

        .close-btn:hover {
          color: #ffffff;
        }

        .ai-status {
          padding: 8px 16px;
          background: rgba(255, 255, 255, 0.02);
          border-bottom: 1px solid rgba(255, 255, 255, 0.03);
          font-size: 11px;
          color: #999999;
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .status-indicator {
          color: #999999;
        }

        .complexity-badge {
          display: none;
        }

        .ai-messages {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .ai-messages::-webkit-scrollbar {
          width: 6px;
        }

        .ai-messages::-webkit-scrollbar-track {
          background: transparent;
        }

        .ai-messages::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
        }

        .ai-messages::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.15);
        }

        .ai-welcome {
          text-align: center;
          color: #a0a0a0;
          padding: 20px;
        }

        .ai-welcome h4 {
          margin: 0 0 8px 0;
          font-size: 14px;
          color: #ffffff;
        }

        .ai-welcome ul {
          list-style: none;
          padding: 0;
          margin: 0;
          font-size: 12px;
        }

        .ai-welcome li {
          margin: 4px 0;
          color: #a0a0a0;
        }

        .ai-message {
          display: flex;
          animation: messageIn 0.2s ease;
        }

        @keyframes messageIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .ai-message-user {
          justify-content: flex-end;
        }

        .ai-message-assistant {
          justify-content: flex-start;
        }

        .message-content {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.06);
          padding: 12px;
          border-radius: 12px;
          max-width: 85%;
          word-wrap: break-word;
          font-size: 13px;
          line-height: 1.5;
          position: relative;
          color: #ffffff;
        }

        .ai-message-user .message-content {
          background: linear-gradient(135deg, rgba(255,107,107,0.2) 0%, rgba(255,107,107,0.1) 100%);
          border-color: rgba(255,107,107,0.4);
          color: #ffffff;
        }

        .message-model {
          display: none;
        }

        .message-feedback {
          display: flex;
          gap: 8px;
          margin-top: 6px;
          padding-top: 6px;
          border-top: 1px solid rgba(255,255,255,0.03);
        }

        .feedback-btn {
          background: none;
          border: 1px solid transparent;
          font-size: 14px;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 4px;
          transition: all 0.2s;
          opacity: 0.5;
          color: #a0a0a0;
        }

        .feedback-btn:hover {
          opacity: 0.8;
          background: rgba(255, 255, 255, 0.04);
        }

        .feedback-btn.active {
          opacity: 1;
          background: rgba(255,107,107,0.15);
          border-color: rgba(255,107,107,0.4);
          color: #ffffff;
        }

        .loading-dots::after {
          content: '.';
          animation: dots 1.5s steps(3, end) infinite;
          color: #a0a0a0;
        }

        @keyframes dots {
          0%, 20% { content: '.'; }
          40% { content: '..'; }
          60% { content: '...'; }
        }

        .ai-input-area {
          padding: 12px;
          border-top: 1px solid rgba(255,255,255,0.06);
          background: transparent;
        }

        .ai-input-group {
          display: flex;
          gap: 8px;
        }

        .ai-input {
          flex: 1;
          border: 1px solid rgba(255,255,255,0.06);
          background: rgba(255,255,255,0.03);
          border-radius: 8px;
          padding: 10px 12px;
          font-size: 13px;
          font-family: inherit;
          color: #ffffff;
          transition: all 0.2s;
        }

        .ai-input::placeholder {
          color: #585858;
        }

        .ai-input:focus {
          outline: none;
          border-color: rgba(255,255,255,0.12);
          background: rgba(255,255,255,0.05);
        }

        .ai-input:disabled {
          background: rgba(255,255,255,0.02);
          cursor: not-allowed;
          opacity: 0.5;
        }

        .ai-send-btn {
          width: 36px;
          height: 36px;
          border: none;
          background: linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 100%);
          border: 1px solid rgba(255,255,255,0.06);
          color: #ffffff;
          border-radius: 8px;
          cursor: pointer;
          font-size: 16px;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .ai-send-btn:hover:not(:disabled) {
          background: linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.06) 100%);
          border-color: rgba(255,255,255,0.08);
        }

        .ai-send-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        @media (max-width: 600px) {
          .ai-chat-window {
            width: calc(100vw - 40px);
            height: 60vh;
          }
        }
      `}</style>
    </div>
  );
}
