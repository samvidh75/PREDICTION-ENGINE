/**
 * Tests: ResearchAiChatPanel — chat UI rendering and message display.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ResearchAiChatPanel from './ResearchAiChatPanel';
import type { ResearchAiChatMessage, ResearchAiContext } from './researchAiTypes';

/* ── Fixtures ────────────────────────────────────────────────── */

const sampleContext: ResearchAiContext = {
  surface: 'stock-detail',
  symbol: 'TEST',
  companyName: 'TestCorp',
  narrative: ['Revenue grew 15% this quarter.'],
  risksToReview: ['High debt levels.'],
  whatToWatch: ['Upcoming earnings.'],
  sector: 'Technology',
  currentPrice: 1450,
  changeAbs: 23,
  changePercent: 1.64,
};

/* ── Rendering ───────────────────────────────────────────────── */

describe('ResearchAiChatPanel rendering', () => {
  it('renders the chat panel with context header', () => {
    const messages: ResearchAiChatMessage[] = [];
    const onSend = () => {};

    render(
      <ResearchAiChatPanel
        messages={messages}
        context={sampleContext}
        onSend={onSend}
        loading={false}
      />,
    );

    expect(document.querySelector('[data-testid="chat-panel"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="chat-input"]')).toBeTruthy();
  });

  it('displays a user message in the list', () => {
    const messages: ResearchAiChatMessage[] = [
      { role: 'user', text: 'How are the finances?', id: '1' },
    ];

    render(
      <ResearchAiChatPanel
        messages={messages}
        context={sampleContext}
        onSend={() => {}}
        loading={false}
      />,
    );

    expect(document.querySelector('[data-testid="message-list"]')).toBeTruthy();
  });

  it('displays an assistant message', () => {
    const messages: ResearchAiChatMessage[] = [
      { role: 'assistant', text: 'Revenue is looking strong.', id: '2', runtime: 'deterministic' },
    ];

    render(
      <ResearchAiChatPanel
        messages={messages}
        context={sampleContext}
        onSend={() => {}}
        loading={false}
      />,
    );

    expect(document.querySelector('[data-testid="message-list"]')).toBeTruthy();
  });

  it('renders the runtime badge for assistant messages', () => {
    const messages: ResearchAiChatMessage[] = [
      { role: 'assistant', text: 'Analysis.', id: '3', runtime: 'deterministic' },
    ];

    render(
      <ResearchAiChatPanel
        messages={messages}
        context={sampleContext}
        onSend={() => {}}
        loading={false}
      />,
    );

    expect(document.querySelector('[data-testid="runtime-badge"]')).toBeTruthy();
  });

  it('handles empty messages gracefully', () => {
    render(
      <ResearchAiChatPanel
        messages={[]}
        context={sampleContext}
        onSend={() => {}}
        loading={false}
      />,
    );

    expect(document.querySelector('[data-testid="chat-panel"]')).toBeTruthy();
  });
});
