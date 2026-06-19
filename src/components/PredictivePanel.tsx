import React, { useMemo } from 'react';
import { Brain, AlertCircle } from 'lucide-react';
import { useCompanyIntelligence } from '../core/hooks/useMarketTelemetryPrediction';
import { usePredictiveAnalysis } from '../engine/hooks/usePredictiveWorker';
import PredictiveHologram from './PredictiveHologram';
import ErrorBoundary from './ErrorBoundary';

interface PredictivePanelProps {
  symbol: string | null;
  compact?: boolean;
  showMetadata?: boolean;
}

/**
 * PredictivePanel - Integrated holographic probabilistic overlay
 * Combines Stage 11 telemetry with Stage 12 predictive worker analysis
 * Displays probability distribution, risk metrics, and trend analysis
 */
const PredictivePanel: React.FC<PredictivePanelProps> = ({
  symbol,
  compact = false,
  showMetadata = true,
}) => {
  // Fetch telemetry from Stage 11
  const { telemetry, isLoadingTelemetry, telemetryError } =
    useCompanyIntelligence(symbol);

  // Process through predictive worker
  const { result: predictiveResult, isProcessing, error: predictiveError } =
    usePredictiveAnalysis(telemetry || null);

  const isLoading = isLoadingTelemetry || isProcessing;
  const hasError = !!telemetryError || !!predictiveError;
  const errorMessage = 'Health analysis pending';

  // Confidence indicator styling
  const confidenceColor = useMemo(() => {
    if (!predictiveResult) return '#A3A3A3';

    const score = predictiveResult.confidenceScore;
    if (score >= 0.8) return '#06B6D4'; // Cyan - high confidence
    if (score >= 0.6) return '#0EA5E9'; // Light Cyan - medium
    if (score >= 0.4) return '#A3A3A3'; // Gray - low
    return '#D946EF'; // Magenta - very low
  }, [predictiveResult?.confidenceScore]);

  return (
    <ErrorBoundary componentName="PredictivePanel">
      <div
        className={`flex flex-col gap-4 ${
          compact
            ? ''
            : 'bg-white border border-[#E5E5E5] rounded-none p-6'
        }`}
      >
        {/* Header with Engine Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-[#0A0A0A]" strokeWidth={2} />
            <span className="font-mono text-[11px] font-medium tracking-wider text-[#525252] uppercase">
              Company Health Analysis
            </span>
          </div>

          {/* Processing Indicator */}
          {isLoading && (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#06B6D4] animate-pulse" />
              <span className="font-mono text-[9px] text-[#A3A3A3] uppercase">
                Processing
              </span>
            </div>
          )}
        </div>

        {/* Error State */}
        {hasError && (
          <div className="bg-[#FAFAFA] border border-[#E5E5E5] rounded-none p-3 flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-[#D946EF] flex-shrink-0 mt-0.5" />
            <div className="flex flex-col gap-1">
              <span className="font-mono text-[10px] font-medium text-[#D946EF] uppercase">
                Analysis Error
              </span>
              <span className="text-[11px] text-[#525252]">{errorMessage}</span>
            </div>
          </div>
        )}

        {/* Metadata (if not compact) */}
        {showMetadata && !compact && (
          <div className="flex items-center justify-between pt-2 border-t border-[#E5E5E5]">
            <div className="flex flex-col gap-1">
              <span className="font-mono text-[9px] text-[#A3A3A3] uppercase">
                Symbol
              </span>
              <span className="font-mono text-sm font-bold text-[#0A0A0A]">
                {symbol || '—'}
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <span className="font-mono text-[9px] text-[#A3A3A3] uppercase">
                Status
              </span>
              <span className="font-mono text-[10px] text-[#525252]">
                {telemetry?.dataSource ? 'Research signals pending' : 'Research signals pending'}
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <span className="font-mono text-[9px] text-[#A3A3A3] uppercase">
                Last Updated
              </span>
              <span className="font-mono text-[10px] text-[#525252]">
                {telemetry
                  ? new Date(telemetry.timestamp).toLocaleTimeString()
                  : 'Awaiting...'}
              </span>
            </div>
          </div>
        )}

        {/* Confidence Score Badge */}
        {predictiveResult && (
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-none border-2 flex items-center justify-center"
              style={{ borderColor: confidenceColor }}
            >
              <span className="font-mono font-bold text-sm" style={{ color: confidenceColor }}>
                {Math.round(predictiveResult.confidenceScore * 100)}%
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <span className="font-mono text-[10px] font-medium text-[#A3A3A3] uppercase">
                Confidence
              </span>
              <p className="text-[11px] text-[#525252] leading-relaxed">
                Engine indicates{' '}
                <span style={{ color: confidenceColor }} className="font-semibold">
                  {Math.round(predictiveResult.confidenceScore * 100)}% confidence
                </span>{' '}
                in this company health assessment.
              </p>
            </div>
          </div>
        )}

        {/* Analysis visualization */}
        <PredictiveHologram
          result={predictiveResult}
          isLoading={isLoading}
          compact={compact}
        />

        {/* SEBI Disclaimer */}
        {!compact && (
          <div className="bg-[#FAFAFA] border border-[#E5E5E5] rounded-none p-3 mt-2">
            <p className="text-[9px] text-[#525252] leading-relaxed italic">
              StockStory provides research intelligence and health assessments.
              It does not provide personalised investment advice.
            </p>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
};

export default PredictivePanel;
