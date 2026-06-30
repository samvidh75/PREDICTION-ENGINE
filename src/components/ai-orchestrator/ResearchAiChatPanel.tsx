// src/components/ai-orchestrator/ResearchAiChatPanel.tsx
// Phase 18 — Chat panel UI that replaces/supersedes EdgeAiChat.
//
// Uses the orchestrator hook to dispatch queries across the fallback chain.
// Runtime badge shows which engine is answering.
// =========================================================================

import React, { useRef, useEffect, useCallback, useState } from 'react';
import type { ResearchAiContext, ResearchAiRuntime } from './researchAiTypes';
import { useResearchAiOrchestrator } from './useResearchAiOrchestrator';
import { initRuntimeRegistry } from './researchAiRuntimeRegistry';

/* ── Props ──────────────────────────────────────────────────── */

interface ResearchAiChatPanelProps {
  context: ResearchAiContext | null;
  placeholderLabel?: string;
}

/* ── Runtime label map ──────────────────────────────────────── */

const RUNTIME_LABEL: Partial<Record<ResearchAiRuntime, string>> = {
  'browser-edge': 'Edge AI',
  'user-local': 'Local LLM',
  'server-local': 'Server AI',
  'deterministic': 'Algorithmic',
};

const RUNTIME_COLOR: Partial<Record<ResearchAiRuntime, string>> = {
  'browser-edge': '#2979FF',
  'user-local': '#7C3AED',
  'server-local': '#059669',
  'deterministic': '#888',
};

/* ── Component ──────────────────────────────────────────────── */

export const ResearchAiChatPanel: React.FC<ResearchAiChatPanelProps> = ({
  context,
  placeholderLabel = 'Ask about this stock…',
}) => {
  const {
    messages,
    processing,
    activeRuntime,
    send,
    reset,
  } = useResearchAiOrchestrator(context);

  const [inputValue, setInputValue] = useState('');
  const listEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Init runtime registry on mount
  useEffect(() => {
    initRuntimeRegistry();
  }, []);

  // Auto-scroll
  useEffect(() => {
    if (typeof listEndRef.current?.scrollIntoView === "function") {
      listEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, processing]);

  // Focus input when not processing
  useEffect(() => {
    if (!processing) {
      inputRef.current?.focus();
    }
  }, [processing]);

  const handleSubmit = useCallback(() => {
    const query = inputValue.trim();
    if (!query || processing) return;
    setInputValue('');
    send(query);
  }, [inputValue, processing, send]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div style={styles.container} data-testid="chat-panel">
      {/* ── Header ─────────────────────────────────────────── */}
      <div style={styles.header}>
        <span style={styles.headerTitle}>Research Chat</span>
        {activeRuntime && (
          <span
            data-testid="runtime-badge"
            style={{
              ...styles.runtimeBadge,
              color: RUNTIME_COLOR[activeRuntime] ?? '#888',
              borderColor: (RUNTIME_COLOR[activeRuntime] ?? '#888') + '44',
              background: (RUNTIME_COLOR[activeRuntime] ?? '#888') + '11',
            }}
          >
            {RUNTIME_LABEL[activeRuntime] ?? 'Algorithmic'}
          </span>
        )}
        {messages.length > 0 && (
          <button
            onClick={reset}
            style={styles.resetButton}
            aria-label="Reset conversation"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
          </button>
        )}
      </div>

      {/* ── Messages list ──────────────────────────────────── */}
      <div style={styles.messageList} data-testid="message-list">
        {messages.length === 0 && (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                <line x1="12" y1="8" x2="12" y2="14" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <p style={styles.emptyTitle}>Research Chat</p>
            <p style={styles.emptySubtitle}>
              Ask about fundamentals, risks, or metrics for this stock.
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
              <p style={styles.bubbleText}>{msg.text}</p>
            </div>
          </div>
        ))}

        {processing && (
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
          data-testid="chat-input"
          ref={inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={context ? placeholderLabel : 'Open a stock to start asking…'}
          rows={1}
          disabled={processing || !context}
          style={{
            ...styles.input,
            ...((processing || !context) ? styles.inputDisabled : {}),
          }}
        />
        <button
          onClick={handleSubmit}
          disabled={!inputValue.trim() || processing || !context}
          style={{
            ...styles.sendButton,
            ...(inputValue.trim() && !processing && context ? styles.sendButtonActive : {}),
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

export default ResearchAiChatPanel;

/* ── Styles ─────────────────────────────────────────────────── */

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    background: 'transparent',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 12px',
    borderBottom: '1px solid #2A2A2A',
  },
  headerTitle: {
    color: '#E8E8E8',
    fontSize: '14px',
    fontWeight: 600,
    flex: 1,
  },
  runtimeBadge: {
    fontSize: '11px',
    fontWeight: 500,
    padding: '2px 8px',
    borderRadius: '12px',
    border: '1px solid',
    whiteSpace: 'nowrap',
  },
  resetButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.6,
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
    marginBottom: '10px',
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
    maxWidth: '240px',
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
    borderRadius: '10px',
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
