/**
 * Smart Floating AI Button
 * Routes questions to optimal model (0.5B, 1B, or Groq API)
 * Shows complexity analysis and model selection
 */

import { useState, useRef, useEffect } from 'react';
import { colors } from '../design/tokens';
import { modelRouter, type ModelTier } from '../utils/modelRouter';
import SmartModelSelector, { useSmartModelSelection } from './browser-ai/SmartModelSelector';
import { smartWorkerManager } from './browser-ai/SmartWorkerManager';
import { responseCache } from '../utils/responseCache';
import { conversationContext } from '../utils/conversationContext';
import { portfolioAIContext } from '../utils/portfolioAIContext';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  modelUsed?: ModelTier;
  rating?: 'helpful' | 'not-helpful' | null;
  messageId?: string;
}

export default function SmartFloatingAIButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [status, setStatus] = useState('⚡ Ready');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { complexity } = useSmartModelSelection(input);

  useEffect(() => {
    smartWorkerManager.onStatus(setStatus);
    smartWorkerManager.onMessage(handleWorkerMessage);

    return () => {
      smartWorkerManager.destroy();
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleWorkerMessage = (data: any) => {
    if (data.type === 'GENERATION_COMPLETE') {
      const response = data.response;
      // Add to conversation context for follow-ups
      conversationContext.addMessage('assistant', response);

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: response,
          modelUsed: smartWorkerManager.getActiveTier(),
          messageId: `msg_${Date.now()}_${Math.random()}`,
          rating: null,
        },
      ]);
      setIsLoading(false);
    } else if (data.type === 'GENERATION_FAILED') {
      const errorMsg = `❌ Error: ${data.error}. Using Tier 1 model...`;
      conversationContext.addMessage('assistant', errorMsg);

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: errorMsg,
          messageId: `msg_${Date.now()}_${Math.random()}`,
          rating: null,
        },
      ]);
      setIsLoading(false);
    }
  };

  const handleRating = (messageId: string, rating: 'helpful' | 'not-helpful') => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.messageId === messageId ? { ...msg, rating } : msg
      )
    );

    // Log rating to backend
    const message = messages.find((m) => m.messageId === messageId);
    if (message) {
      fetch('/api/log-rating', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId,
          question: messages[messages.findIndex((m) => m.messageId === messageId) - 1]?.content,
          response: message.content,
          modelUsed: message.modelUsed,
          rating,
          timestamp: new Date().toISOString(),
        }),
      }).catch((err) => console.error('[Rating Log Error]', err));
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = input;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    // Add to conversation context
    conversationContext.addMessage('user', userMessage);

    try {
      // Analyze complexity and determine best model
      const analysis = modelRouter.analyzeComplexity(userMessage);

      // Build enhanced prompt with conversation context + portfolio context
      let enhancedPrompt = userMessage;

      // Add portfolio context if it's a portfolio-related question
      const isPortfolioQuestion = portfolioAIContext.isPortfolioQuestion(userMessage);
      if (isPortfolioQuestion) {
        enhancedPrompt = await portfolioAIContext.buildPortfolioAwarePrompt(enhancedPrompt);
      }

      // Add conversation context for follow-ups
      const isFollowUp = conversationContext.isFollowUp(userMessage);
      if (isFollowUp) {
        enhancedPrompt = conversationContext.buildEnhancedPrompt(enhancedPrompt);
      }

      if (analysis.tier === 'tier3-groq-api') {
        // Check cache first before calling Groq API
        const cachedResponse = await responseCache.getIfSimilar(userMessage);
        if (cachedResponse) {
          const cachedMsg = `${cachedResponse.response}\n\n_📦 Cached response (similar question: "${cachedResponse.question}")_`;
          conversationContext.addMessage('assistant', cachedMsg);

          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: cachedMsg,
              modelUsed: analysis.tier,
              messageId: `msg_${Date.now()}_${Math.random()}`,
              rating: null,
            },
          ]);
          setIsLoading(false);
        } else {
          // No cache hit, call Groq API with context
          await handleGroqRequest(enhancedPrompt);
        }
      } else {
        // Use local models (0.5B or 1B) with context-aware prompt
        await smartWorkerManager.switchModel(userMessage);
        smartWorkerManager.sendMessage({
          type: 'GENERATE_ON_GPU',
          payload: {
            systemPrompt: 'You are a professional stock market analyst specializing in Indian stocks. Provide clear, actionable insights for stock market questions. Focus on fundamentals, technical patterns, and practical recommendations.',
            userPrompt: enhancedPrompt,
          },
        });
      }
    } catch (error) {
      console.error('[Smart AI Error]', error);
      const errorMsg = `⚠️ Error: ${error instanceof Error ? error.message : 'Unknown error'}. Try again or ask a simpler question.`;
      conversationContext.addMessage('assistant', errorMsg);

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: errorMsg,
        },
      ]);
      setIsLoading(false);
    }
  };

  const handleGroqRequest = async (userMessage: string) => {
    try {
      const response = await fetch('/api/groq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: userMessage }),
      });

      if (!response.ok) throw new Error(`API error: ${response.status}`);

      const data = await response.json();
      const responseText = data.response;

      // Cache the response for future similar questions
      await responseCache.set(userMessage, responseText, 'tier3-groq-api');

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: responseText,
          modelUsed: 'tier3-groq-api',
          messageId: `msg_${Date.now()}_${Math.random()}`,
          rating: null,
        },
      ]);
    } catch (error) {
      console.error('[Groq Error]', error);
      throw error;
    } finally {
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
                    conversationContext.clear();
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

          {/* Status indicator */}
          <div className="ai-status">
            <span className="status-indicator">{status}</span>
            {complexity && (
              <span className="complexity-badge">
                Complexity: {complexity.score.toFixed(0)}/100
              </span>
            )}
          </div>

          {/* Messages */}
          <div className="ai-messages">
            {messages.length === 0 ? (
              <div className="ai-welcome">
                <h4>Welcome to StockEx AI! 👋</h4>
                <p>Ask me anything about stocks:</p>
                <ul>
                  <li>📚 "What is P/E ratio?" (Fast)</li>
                  <li>📊 "Compare HDFC vs ICICI" (Balanced)</li>
                  <li>🔥 "Analyze earnings report" (Deep)</li>
                </ul>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div key={idx} className={`ai-message ai-message-${msg.role}`}>
                  <div className="message-content">
                    {msg.content}
                    {msg.modelUsed && (
                      <span className="message-model">
                        {modelRouter.getModelConfig(msg.modelUsed).displayName}
                      </span>
                    )}
                  </div>
                  {msg.role === 'assistant' && msg.messageId && (
                    <div className="message-feedback">
                      <button
                        className={`feedback-btn ${msg.rating === 'helpful' ? 'active' : ''}`}
                        onClick={() => handleRating(msg.messageId!, 'helpful')}
                        title="Helpful"
                      >
                        👍
                      </button>
                      <button
                        className={`feedback-btn ${msg.rating === 'not-helpful' ? 'active' : ''}`}
                        onClick={() => handleRating(msg.messageId!, 'not-helpful')}
                        title="Not helpful"
                      >
                        👎
                      </button>
                    </div>
                  )}
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
            {complexity && <SmartModelSelector userQuestion={input} isLoading={isLoading} />}
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
          bottom: 20px;
          right: 20px;
          z-index: 1000;
          font-family: system-ui, -apple-system, sans-serif;
        }

        .ai-button {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border: none;
          color: white;
          font-size: 24px;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }

        .ai-button:hover {
          transform: scale(1.1);
          box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
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
          right: 70px;
          background: rgba(0, 0, 0, 0.8);
          color: white;
          padding: 6px 12px;
          border-radius: 4px;
          font-size: 12px;
          white-space: nowrap;
          animation: slideIn 0.2s ease;
        }

        @keyframes slideIn {
          from { opacity: 0; transform: translateX(10px); }
          to { opacity: 1; transform: translateX(0); }
        }

        .ai-chat-window {
          position: absolute;
          bottom: 80px;
          right: 0;
          width: 400px;
          height: 500px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 5px 40px rgba(0, 0, 0, 0.16);
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
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .ai-header h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
        }

        .ai-header-actions {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .clear-btn {
          background: rgba(255, 255, 255, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.3);
          color: white;
          cursor: pointer;
          font-size: 14px;
          padding: 4px 8px;
          border-radius: 4px;
          transition: all 0.2s;
        }

        .clear-btn:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        .close-btn {
          background: none;
          border: none;
          color: white;
          cursor: pointer;
          font-size: 18px;
          padding: 0;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .ai-status {
          padding: 8px 16px;
          background: rgba(0, 0, 0, 0.02);
          border-bottom: 1px solid rgba(0, 0, 0, 0.05);
          font-size: 11px;
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .status-indicator {
          color: #666;
        }

        .complexity-badge {
          background: rgba(102, 126, 234, 0.1);
          color: #667eea;
          padding: 2px 8px;
          border-radius: 3px;
          margin-left: auto;
        }

        .ai-messages {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .ai-welcome {
          text-align: center;
          color: #666;
          padding: 20px;
        }

        .ai-welcome h4 {
          margin: 0 0 8px 0;
          font-size: 14px;
        }

        .ai-welcome ul {
          list-style: none;
          padding: 0;
          margin: 0;
          font-size: 12px;
        }

        .ai-welcome li {
          margin: 4px 0;
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
          background: #f0f0f0;
          padding: 12px;
          border-radius: 8px;
          max-width: 80%;
          word-wrap: break-word;
          font-size: 13px;
          line-height: 1.4;
          position: relative;
        }

        .ai-message-user .message-content {
          background: #667eea;
          color: white;
        }

        .message-model {
          font-size: 10px;
          opacity: 0.7;
          display: block;
          margin-top: 4px;
        }

        .message-feedback {
          display: flex;
          gap: 8px;
          margin-top: 6px;
          padding-top: 6px;
          border-top: 1px solid rgba(0, 0, 0, 0.05);
        }

        .feedback-btn {
          background: none;
          border: 1px solid transparent;
          font-size: 14px;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 4px;
          transition: all 0.2s;
          opacity: 0.6;
        }

        .feedback-btn:hover {
          opacity: 1;
          background: rgba(0, 0, 0, 0.05);
        }

        .feedback-btn.active {
          opacity: 1;
          background: rgba(102, 126, 234, 0.1);
          border-color: #667eea;
        }

        .loading-dots::after {
          content: '.';
          animation: dots 1.5s steps(3, end) infinite;
        }

        @keyframes dots {
          0%, 20% { content: '.'; }
          40% { content: '..'; }
          60% { content: '...'; }
        }

        .ai-input-area {
          padding: 12px;
          border-top: 1px solid rgba(0, 0, 0, 0.1);
          background: white;
        }

        .ai-input-group {
          display: flex;
          gap: 8px;
        }

        .ai-input {
          flex: 1;
          border: 1px solid #ddd;
          border-radius: 6px;
          padding: 10px;
          font-size: 13px;
          font-family: inherit;
        }

        .ai-input:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.1);
        }

        .ai-input:disabled {
          background: #f5f5f5;
          cursor: not-allowed;
        }

        .ai-send-btn {
          width: 36px;
          height: 36px;
          border: none;
          background: #667eea;
          color: white;
          border-radius: 6px;
          cursor: pointer;
          font-size: 16px;
          transition: all 0.2s;
        }

        .ai-send-btn:hover:not(:disabled) {
          background: #764ba2;
        }

        .ai-send-btn:disabled {
          background: #ccc;
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
