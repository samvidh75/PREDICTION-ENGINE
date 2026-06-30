/**
 * researchAiChatTypes.test — Type-level and structural tests.
 * =========================================================================
 */

import { describe, it, expect } from 'vitest';
import type { ChatMessage, ChatSession, ChatEvent, ChatController, ChatConfig } from './researchAiChatTypes';
import { DEFAULT_CHAT_CONFIG } from './researchAiChatTypes';

describe('DEFAULT_CHAT_CONFIG', () => {
  it('has reasonable defaults', () => {
    expect(DEFAULT_CHAT_CONFIG.maxQueryLength).toBe(500);
    expect(DEFAULT_CHAT_CONFIG.maxTurns).toBe(20);
    expect(DEFAULT_CHAT_CONFIG.maxMessageLength).toBe(2000);
    expect(DEFAULT_CHAT_CONFIG.debug).toBe(false);
  });
});

describe('type structure checks', () => {
  it('ChatMessage has required fields', () => {
    const msg: ChatMessage = {
      id: 'msg-1',
      role: 'user',
      text: 'Hello',
      timestamp: 1000,
    };
    expect(msg.id).toBe('msg-1');
    expect(msg.role).toBe('user');
    expect(msg.text).toBe('Hello');
  });

  it('ChatSession starts empty', () => {
    const session: ChatSession = {
      id: 'sess-1',
      messages: [],
      activeRuntime: null,
      processing: false,
      createdAt: 1000,
    };
    expect(session.messages).toHaveLength(0);
    expect(session.processing).toBe(false);
  });

  it('ChatEvent discriminated union', () => {
    const evt: ChatEvent = { type: 'done', runtime: 'deterministic' };
    expect(evt.type).toBe('done');
  });
});
