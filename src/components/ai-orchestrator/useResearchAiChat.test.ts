/**
 * useResearchAiChat.test — Unit tests for the chat hook.
 * =========================================================================
 */

import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useResearchAiChat } from './useResearchAiChat';

/* ─── Basic rendering ───────────────────────────────────────── */

describe('useResearchAiChat', () => {
  it('returns state and controller', () => {
    const { result } = renderHook(() => useResearchAiChat());
    expect(result.current.state).toBeDefined();
    expect(result.current.controller).toBeDefined();
    expect(result.current.state.session.messages).toHaveLength(0);
    expect(result.current.state.session.processing).toBe(false);
  });

  it('starts with a fresh session id', () => {
    const { result } = renderHook(() => useResearchAiChat());
    expect(result.current.state.session.id).toBeTruthy();
    expect(result.current.state.session.createdAt).toBeGreaterThan(0);
  });

  /* ─── send() ──────────────────────────────────────────────── */

  it('adds user and assistant messages on send', async () => {
    const { result } = renderHook(() => useResearchAiChat());

    await act(async () => {
      await result.current.controller.send('What is P/E ratio?');
    });

    const msgs = result.current.state.session.messages;
    expect(msgs).toHaveLength(2);
    expect(msgs[0].role).toBe('user');
    expect(msgs[0].text).toBe('What is P/E ratio?');
    expect(msgs[1].role).toBe('assistant');
  });

  it('blocks trading queries', async () => {
    const { result } = renderHook(() => useResearchAiChat());

    await act(async () => {
      const reply = await result.current.controller.send('Should I buy this stock?');
      expect(reply).toContain('recommendation');
    });

    // Only assistant message (blocked), no user message recorded
    expect(result.current.state.session.messages).toHaveLength(1);
  });

  it('handles send errors gracefully', async () => {
    const controller = {
      send: vi.fn().mockRejectedValue(new Error('Network error')),
      getSession: () => ({ messages: [], id: 'x', activeRuntime: null, processing: false, createdAt: 0 }),
      reset: () => {},
      onEvent: () => () => {},
    };

    const { result } = renderHook(() => useResearchAiChat({ controller }));

    await act(async () => {
      const reply = await result.current.controller.send('What is revenue?');
      expect(reply).toContain('error');
    });

    expect(result.current.state.session.messages).toHaveLength(2);
  });

  /* ─── reset() ─────────────────────────────────────────────── */

  it('reset clears messages and generates new id', async () => {
    const { result } = renderHook(() => useResearchAiChat());

    await act(async () => {
      await result.current.controller.send('Hello');
    });

    const oldId = result.current.state.session.id;
    expect(result.current.state.session.messages.length).toBeGreaterThan(0);

    act(() => {
      result.current.controller.reset();
    });

    expect(result.current.state.session.id).not.toBe(oldId);
    expect(result.current.state.session.messages).toHaveLength(0);
  });

  /* ─── onEvent ─────────────────────────────────────────────── */

  it('emits events during send', async () => {
    const { result } = renderHook(() => useResearchAiChat());
    const events: string[] = [];

    act(() => {
      result.current.controller.onEvent((evt) => {
        events.push(evt.type);
      });
    });

    await act(async () => {
      await result.current.controller.send('What is revenue?');
    });

    expect(events).toContain('status');
    expect(events).toContain('done');
  });

  /* ─── Turn limit ──────────────────────────────────────────── */

  it('blocks after max turns', async () => {
    const { result } = renderHook(() =>
      useResearchAiChat({ config: { maxTurns: 2 } }),
    );

    // Send first query
    await act(async () => {
      await result.current.controller.send('Q1');
    });

    // Send second query
    await act(async () => {
      await result.current.controller.send('Q2');
    });

    // Third should be blocked
    await act(async () => {
      const reply = await result.current.controller.send('Q3');
      expect(reply).toContain('limit');
    });
  });

  /* ─── processing state ────────────────────────────────────── */

  it('sets processing true during send', async () => {
    const controller = {
      send: vi.fn().mockImplementation(
        () => new Promise((r) => setTimeout(() => r('Reply'), 100)),
      ),
      getSession: () => ({ messages: [], id: 'x', activeRuntime: null, processing: false, createdAt: 0 }),
      reset: () => {},
      onEvent: () => () => {},
    };

    const { result } = renderHook(() => useResearchAiChat({ controller }));

    let sendPromise!: Promise<string>;
    act(() => {
      sendPromise = result.current.controller.send('Test');
    });

    // After the first async tick, processing should be true
    await vi.waitFor(() => {
      expect(result.current.state.session.processing).toBe(true);
    }, { timeout: 2000 });

    await act(async () => {
      await sendPromise;
    });

    expect(result.current.state.session.processing).toBe(false);
  });
});
