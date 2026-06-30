// src/components/edge-ai/useEdgeAiChat.test.ts
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEdgeAiChat } from './useEdgeAiChat';
import type { EdgeAiResearchContext } from './edgeAiTypes';

const sampleContext: EdgeAiResearchContext = {
  symbol: 'TCS',
  companyName: 'Tata Consultancy Services',
  narrative: [
    'TCS has shown consistent revenue growth driven by digital transformation deals.',
    'Margins remain healthy despite wage inflation pressures.',
  ],
  risksToReview: ['Client concentration in BFSI vertical', 'Rupee appreciation risk'],
  whatToWatch: ['Q3 earnings for demand commentary', 'Hiring trends as a leading indicator'],
  sector: 'Information Technology',
  currentPrice: 3890.5,
  changeAbs: 45.2,
  changePercent: 1.18,
};

describe('useEdgeAiChat', () => {
  it('starts in ready state with valid context', () => {
    const { result } = renderHook(() => useEdgeAiChat(sampleContext));
    expect(result.current.status).toBe('ready');
    expect(result.current.messages).toEqual([]);
  });

  it('starts uninitialised when symbol is empty', () => {
    const emptyContext = { ...sampleContext, symbol: '' };
    const { result } = renderHook(() => useEdgeAiChat(emptyContext));
    expect(result.current.status).toBe('uninitialised');
  });

  it('adds a user message and transitions to processing on send', async () => {
    const { result } = renderHook(() => useEdgeAiChat(sampleContext));

    await act(async () => {
      await result.current.send('What are the risks?');
    });

    expect(result.current.messages.length).toBeGreaterThanOrEqual(1);
    const userMessages = result.current.messages.filter((m) => m.role === 'user');
    expect(userMessages.length).toBe(1);
    expect(userMessages[0].content).toBe('What are the risks?');
    expect(userMessages[0].id).toMatch(/^chat-/);
  });

  it('adds an assistant reply after processing', async () => {
    const { result } = renderHook(() => useEdgeAiChat(sampleContext));

    await act(async () => {
      await result.current.send('What are the risks?');
    });

    const assistantMessages = result.current.messages.filter((m) => m.role === 'assistant');
    expect(assistantMessages.length).toBeGreaterThanOrEqual(1);

    const lastAssistant = assistantMessages[assistantMessages.length - 1];
    expect(lastAssistant.content.length).toBeGreaterThan(0);
    // Must be sanitised — no forbidden terms
    expect(lastAssistant.content.toLowerCase()).not.toContain('strong buy');
    expect(lastAssistant.content.toLowerCase()).not.toContain('target price');
    expect(lastAssistant.content.toLowerCase()).not.toContain('guaranteed');
  });

  it('returns to ready after processing', async () => {
    const { result } = renderHook(() => useEdgeAiChat(sampleContext));

    await act(async () => {
      await result.current.send('What are the risks?');
    });

    expect(result.current.status).toBe('ready');
  });

  it('resets messages and status', async () => {
    const { result } = renderHook(() => useEdgeAiChat(sampleContext));

    await act(async () => {
      await result.current.send('Hello');
    });

    expect(result.current.messages.length).toBeGreaterThan(0);

    act(() => {
      result.current.reset();
    });

    expect(result.current.messages).toEqual([]);
    expect(result.current.status).toBe('ready');
  });

  it('does not send empty queries', async () => {
    const { result } = renderHook(() => useEdgeAiChat(sampleContext));

    await act(async () => {
      await result.current.send('');
    });

    expect(result.current.messages).toEqual([]);
  });

  it('does not send while processing', async () => {
    const { result } = renderHook(() => useEdgeAiChat(sampleContext));

    // Start first send synchronously inside act — the sync part
    // (setMessages, setStatus) is flushed; the async continuation runs later.
    let sendPromise: Promise<void>;
    act(() => {
      sendPromise = result.current.send('First query');
    });

    // Try sending while still processing — should be ignored
    result.current.send('Second query');

    // Wait for first send to finish
    await act(async () => {
      await sendPromise!;
    });

    // Should only have one user message (first one)
    const userMessages = result.current.messages.filter((m) => m.role === 'user');
    expect(userMessages.length).toBe(1);
    expect(userMessages[0].content).toBe('First query');
  });
});
