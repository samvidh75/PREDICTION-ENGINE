// src/components/edge-ai/EdgeAiChat.tsx
// Phase 6 — Chat UI component for the edge AI research chat.
//
// Displays scrollable conversation between user and assistant styled with
// the project's pure-black design theme. Assistant copy is sanitised
// through the output guardrails module before display.
// =========================================================================

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { colors, typography, radius } from '../../design/tokens';
import { sanitizeChatReply } from './edgeAiOutputGuardrails';
import type { EdgeAiChatMessage, EdgeAiWorkerStatus } from './edgeAiTypes';

/* ── Props ─────────────────────────────────────────────────────────── */

interface EdgeAiChatProps {
  /** Current conversation messages */
  messages: EdgeAiChatMessage[];
  /** Worker status used to show a typing indicator */
  status: EdgeAiWorkerStatus;
  /** Called when the user submits a new query */
  onSend: (query: string) => void;
  /** Label shown on the prompt input placeholder */
  placeholderLabel?: string;
}

/* ── Component ─────────────────────────────────────────────────────── */

export const EdgeAiChat: React.FC<EdgeAiChatProps> = ({
  messages,
  status,
  onSend,
  placeholderLabel = 'Ask about this stock…',
}) => {
  const [inputValue, setInputValue] = useState('');
  const listEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isProcessing = status === 'processing';

  /* Auto-scroll to latest message */
  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, status]);

  /* Focus input when not processing */
  useEffect(() => {
    if (!isProcessing) {
      inputRef.current?.focus();
    }
  }, [isProcessing]);

  const handleSubmit = useCallback(() => {
    const query = inputValue.trim();
    if (!query || isProcessing) return;
    setInputValue('');
    onSend(query);
  }, [inputValue, isProcessing, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div style={styles.container}>
      {/* ── Messages list ──────────────────────────────────── */}
      <div style={styles.messageList}>
        {messages.length === 0 && (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>💬</div>
            <p style={styles.emptyTitle}>Research Chat</p>
            <p style={styles.emptySubtitle}>
              Ask a question about this stock&#39;s fundamentals, risks, or what
              the research suggests to watch.
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              ...styles.messageRow,
              flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
            }}
          >
            <div
              style={{
                ...styles.bubble,
                ...(msg.role === 'user' ? styles.userBubble : styles.assistantBubble),
              }}
            >
              <p style={styles.bubbleText}>{msg.content}</p>
            </div>
          </div>
        ))}

        {/* ── Typing indicator ───────────────────────────────── */}
        {isProcessing && (
          <div style={styles.messageRow}>
            <div style={{ ...styles.bubble, ...styles.assistantBubble }}>
              <div style={styles.typingDots}>
                <span style={styles.dot} />
                <span style={{ ...styles.dot, animationDelay: '0.15s' }} />
                <span style={{ ...styles.dot, animationDelay: '0.3s' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={listEndRef} />
      </div>

      {/* ── Input bar ──────────────────────────────────────── */}
      <div style={styles.inputBar}>
        <textarea
          ref={inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholderLabel}
          rows={1}
          disabled={isProcessing}
          style={{
            ...styles.input,
            ...(isProcessing ? styles.inputDisabled : {}),
          }}
        />
        <button
          onClick={handleSubmit}
          disabled={!inputValue.trim() || isProcessing}
          style={{
            ...styles.sendButton,
            ...(inputValue.trim() && !isProcessing ? styles.sendButtonActive : {}),
          }}
          aria-label="Send message"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </div>
  );
};

/* ── Styles ────────────────────────────────────────────────────────── */

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    background: 'transparent',
    overflow: 'hidden',
  },
  messageList: {
    flex: 1,
    overflowY: 'auto',
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  messageRow: {
    display: 'flex',
    gap: '8px',
    maxWidth: '85%',
  },
  bubble: {
    padding: '8px 14px',
    borderRadius: '14px',
    maxWidth: '100%',
  },
  userBubble: {
    backgroundColor: '#2979FF',
    borderBottomRightRadius: '4px',
  },
  assistantBubble: {
    backgroundColor: '#1A1A1A',
    borderBottomLeftRadius: '4px',
  },
  bubbleText: {
    margin: 0,
    color: '#E8E8E8',
    fontSize: '14px',
    lineHeight: 1.45,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  emptyState: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    padding: '32px 16px',
  },
  emptyIcon: {
    fontSize: '32px',
    marginBottom: '8px',
  },
  emptyTitle: {
    margin: 0,
    color: '#E8E8E8',
    fontSize: '16px',
    fontWeight: 600,
  },
  emptySubtitle: {
    margin: '6px 0 0',
    color: '#888',
    fontSize: '13px',
    lineHeight: 1.4,
    maxWidth: '260px',
  },
  typingDots: {
    display: 'flex',
    gap: '4px',
    alignItems: 'center',
    padding: '2px 0',
  },
  dot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: '#888',
    opacity: 0.3,
  },
  inputBar: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: '8px',
    padding: '12px',
    borderTop: '1px solid #2A2A2A',
  },
  input: {
    flex: 1,
    background: '#0D0D0D',
    border: '1px solid #333',
    borderRadius: radius.lg,
    padding: '10px 14px',
    color: '#E8E8E8',
    fontSize: '14px',
    lineHeight: 1.4,
    resize: 'none',
    fontFamily: 'inherit',
    outline: 'none',
  },
  inputDisabled: {
    opacity: 0.5,
  },
  sendButton: {
    width: '38px',
    height: '38px',
    borderRadius: '50%',
    border: 'none',
    background: '#333',
    color: '#666',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    flexShrink: 0,
    transition: 'all 0.15s ease',
  },
  sendButtonActive: {
    background: '#2979FF',
    color: '#fff',
  },
};
