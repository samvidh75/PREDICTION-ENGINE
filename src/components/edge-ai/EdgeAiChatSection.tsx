import React, { useMemo, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchMarketBrainResearch } from '../../services/marketBrainResearch';
import { toEdgeAiResearchContext } from './edgeAiContextMapper';
import { useEdgeAiChat } from './useEdgeAiChat';
import { EdgeAiChat } from './EdgeAiChat';
import { ClientDataMesh } from './clientDataMesh';
import { StockExWorkerPool } from './StockExWorkerPool';
import type { EdgeAiResearchContext, EdgeAiWorkerInput } from './edgeAiTypes';
import { colors } from '../../design/tokens';

export interface EdgeAiChatSectionProps {
  symbol: string;
  companyName: string;
}

export const EdgeAiChatSection: React.FC<EdgeAiChatSectionProps> = ({
  symbol,
  companyName,
}) => {
  const [dataMode, setDataMode] = useState<string | null>(null);

  const { data: researchData } = useQuery({
    queryKey: ['marketBrainResearch', symbol],
    queryFn: () => fetchMarketBrainResearch(symbol),
    enabled: !!symbol,
    staleTime: 30_000,
    retry: false,
  });

  const { data: meshData } = useQuery({
    queryKey: ['clientDataMesh', symbol],
    queryFn: async () => {
      const result = await ClientDataMesh.fetchUnrestrictedHistory(symbol);
      setDataMode(result.data_mode);
      return result;
    },
    enabled: !!symbol,
    staleTime: 60_000,
    retry: 2,
  });

  const context = useMemo(() => {
    const base = toEdgeAiResearchContext(researchData);
    if (!base) return null;
    const candle = meshData?.candles?.slice(-1)?.[0];
    return {
      ...base,
      narrative: [
        ...base.narrative,
        ...(candle
          ? [`Live mesh close: INR ${candle.close.toFixed(3)} via ${meshData?.source || 'direct'}`]
          : []),
      ],
    } as EdgeAiResearchContext;
  }, [researchData, meshData]);

  const safely = useMemo(() => ({ symbol, companyName }), [symbol, companyName]);

  const fallbackContext: EdgeAiResearchContext = useMemo(
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

  return (
    <div>
      {dataMode === 'DETERMINISTIC_SAFE_ANCHOR' && (
        <div
          style={{
            padding: '8px 12px',
            marginBottom: '8px',
            fontSize: '12px',
            color: colors.warning,
            background: '#1A1500',
            border: `1px solid ${colors.warning}33`,
            borderRadius: '8px',
            textAlign: 'center',
          }}
        >
          Cached asset sync active — data from deterministic anchor
        </div>
      )}
      <EdgeAiChat messages={chat.messages} status={chat.status} onSend={chat.send} />
    </div>
  );
};
