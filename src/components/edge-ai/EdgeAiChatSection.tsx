// src/components/edge-ai/EdgeAiChatSection.tsx
// Phase 8 — Integrates research fetch, context mapping, and chat hook
// into a single section ready for placement in StockPage.
// =========================================================================

import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchMarketBrainResearch } from '../../services/marketBrainResearch';
import { toEdgeAiResearchContext } from './edgeAiContextMapper';
import { useEdgeAiChat } from './useEdgeAiChat';
import { EdgeAiChat } from './EdgeAiChat';

/* ── Props ── */

export interface EdgeAiChatSectionProps {
  symbol: string;
  companyName: string;
}

/* ── Component ── */

export const EdgeAiChatSection: React.FC<EdgeAiChatSectionProps> = ({
  symbol,
  companyName,
}) => {
  // Fetch the same research data as MarketBrainPanel — React Query dedupes
  const { data } = useQuery({
    queryKey: ['marketBrainResearch', symbol],
    queryFn: () => fetchMarketBrainResearch(symbol),
    enabled: !!symbol,
    staleTime: 30_000,
    retry: false,
  });

  // Map research response into chat context
  const context = useMemo(() => toEdgeAiResearchContext(data), [data]);

  // Manage chat state via the hook (hook only runs when context is non-null)
  const safely: { symbol: string; companyName: string } = useMemo(
    () => ({ symbol, companyName }),
    [symbol, companyName],
  );
  const fallbackContext = useMemo(
    () => ({
      symbol: safely.symbol,
      companyName: safely.companyName,
      narrative: [] as string[],
      risksToReview: [] as string[],
      whatToWatch: [] as string[],
      sector: '',
      currentPrice: 0,
      changeAbs: 0,
      changePercent: 0,
    }),
    [safely],
  );

  const chat = useEdgeAiChat(context ?? fallbackContext);

  return <EdgeAiChat messages={chat.messages} status={chat.status} onSend={chat.send} />;
};
