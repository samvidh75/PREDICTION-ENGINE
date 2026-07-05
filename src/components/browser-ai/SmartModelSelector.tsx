/**
 * Smart Model Selector
 * Automatically routes questions to optimal model based on complexity
 * Shows user which model is being used and why
 */

import { useEffect, useState } from 'react';
import { modelRouter, type ModelTier } from '../../utils/modelRouter';

interface SmartModelSelectorProps {
  userQuestion: string;
  isLoading?: boolean;
  onModelChange?: (tier: ModelTier) => void;
}

export default function SmartModelSelector({
  userQuestion,
  isLoading = false,
  onModelChange,
}: SmartModelSelectorProps) {
  const [complexity, setComplexity] = useState<ReturnType<typeof modelRouter.analyzeComplexity> | null>(null);
  const [selectedTier, setSelectedTier] = useState<ModelTier>('tier1-qwen-05b');

  useEffect(() => {
    if (!userQuestion.trim()) return;

    const analysis = modelRouter.analyzeComplexity(userQuestion);
    setComplexity(analysis);
    setSelectedTier(analysis.tier);
    onModelChange?.(analysis.tier);
  }, [userQuestion, onModelChange]);

  if (!complexity) return null;

  const config = modelRouter.getModelConfig(complexity.tier);

  return (
    <div className="smart-model-selector">
      {/* Model indicator badge */}
      <div className="model-badge" data-tier={complexity.tier}>
        <span className="model-icon">{getIcon(complexity.tier)}</span>
        <span className="model-name">{config.displayName}</span>
        <span className="complexity-score">{complexity.score.toFixed(0)}/100</span>
      </div>

      {/* Detailed info (expandable) */}
      <details className="model-details">
        <summary>Why this model?</summary>
        <div className="details-content">
          <p className="reason">
            <strong>Reasoning:</strong> {complexity.reasoning}
          </p>
          <p className="keywords">
            <strong>Detected patterns:</strong>{' '}
            {complexity.keywords.length > 0 ? complexity.keywords.join(', ') : 'None'}
          </p>
          <table className="model-comparison">
            <tbody>
              <tr>
                <td>Model</td>
                <td>{config.name}</td>
              </tr>
              <tr>
                <td>Response Time</td>
                <td>{config.expectedSpeed}</td>
              </tr>
              <tr>
                <td>Accuracy</td>
                <td>{config.accuracy}</td>
              </tr>
              <tr>
                <td>Location</td>
                <td>{config.location}</td>
              </tr>
              <tr>
                <td>Cost</td>
                <td>{config.cost}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </details>

      <style>{`
        .smart-model-selector {
          margin: 12px 0;
          padding: 8px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          font-size: 12px;
        }

        .model-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: rgba(255, 255, 255, 0.08);
          border-radius: 6px;
          font-weight: 500;
          cursor: default;
        }

        .model-badge[data-tier="tier1-qwen-05b"] {
          border-left: 3px solid #3b82f6;
        }

        .model-badge[data-tier="tier2-qwen-1b"] {
          border-left: 3px solid #8b5cf6;
        }

        .model-badge[data-tier="tier3-groq-api"] {
          border-left: 3px solid #ec4899;
        }

        .model-icon {
          font-size: 14px;
        }

        .model-name {
          flex: 1;
        }

        .complexity-score {
          font-size: 11px;
          opacity: 0.7;
          padding: 2px 6px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
        }

        .model-details {
          margin-top: 8px;
          cursor: pointer;
          user-select: none;
        }

        .model-details summary {
          padding: 6px 8px;
          opacity: 0.7;
          transition: opacity 0.2s;
        }

        .model-details summary:hover {
          opacity: 1;
        }

        .details-content {
          padding: 8px;
          margin-top: 8px;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 4px;
          font-size: 11px;
          line-height: 1.5;
        }

        .reason,
        .keywords {
          margin: 0 0 8px 0;
        }

        .model-comparison {
          width: 100%;
          border-collapse: collapse;
          margin-top: 8px;
        }

        .model-comparison td {
          padding: 4px 6px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .model-comparison td:first-child {
          font-weight: 500;
          color: rgba(255, 255, 255, 0.7);
          width: 40%;
        }
      `}</style>
    </div>
  );
}

/**
 * Get emoji icon for each tier
 */
function getIcon(tier: ModelTier): string {
  const icons = {
    'tier1-qwen-05b': '⚡',
    'tier2-qwen-1b': '🧠',
    'tier3-groq-api': '🔥',
  };
  return icons[tier] || '🤖';
}

/**
 * Helper hook to use smart model selection in components
 */
export function useSmartModelSelection(userQuestion: string) {
  const [selectedTier, setSelectedTier] = useState<ModelTier>('tier1-qwen-05b');
  const [complexity, setComplexity] = useState<ReturnType<typeof modelRouter.analyzeComplexity> | null>(null);

  useEffect(() => {
    if (!userQuestion.trim()) return;
    const analysis = modelRouter.analyzeComplexity(userQuestion);
    setComplexity(analysis);
    setSelectedTier(analysis.tier);
  }, [userQuestion]);

  return {
    selectedTier,
    complexity,
    modelConfig: modelRouter.getModelConfig(selectedTier),
  };
}
