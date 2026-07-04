/**
 * Model Selector UI Component
 * Allows users to switch between Qwen0.5B and Qwen7B models
 */

import { useEffect, useState } from 'react';
import { modelSelector, type ModelConfig } from '../../utils/modelSelector';

interface ModelSelectorProps {
  currentModel: 'qwen-0.5b' | 'qwen-7b';
  onModelChange: (modelId: 'qwen-0.5b' | 'qwen-7b') => void;
  isLoading?: boolean;
}

export default function ModelSelector({ currentModel, onModelChange, isLoading = false }: ModelSelectorProps) {
  const [models, setModels] = useState<ModelConfig[]>([]);
  const [showDetails, setShowDetails] = useState(false);
  const [capabilities, setCapabilities] = useState<Record<string, 'yes' | 'maybe' | 'no'>>({});

  useEffect(() => {
    const available = modelSelector.getAvailableModels();
    setModels(available);

    // Check device capabilities
    const caps: Record<string, 'yes' | 'maybe' | 'no'> = {};
    available.forEach((model) => {
      caps[model.id] = modelSelector.canRunModel(model.id);
    });
    setCapabilities(caps);
  }, []);

  const handleModelSwitch = (modelId: string) => {
    if (isLoading) return;
    onModelChange(modelId as 'qwen-0.5b' | 'qwen-7b');
  };

  const getCapabilityBadge = (modelId: string): string => {
    const cap = capabilities[modelId];
    if (cap === 'yes') return '✅ Compatible';
    if (cap === 'maybe') return '⚠️ Borderline';
    return '❌ Not Enough RAM';
  };

  const getCapabilityColor = (modelId: string): string => {
    const cap = capabilities[modelId];
    if (cap === 'yes') return '#10b981'; // Green
    if (cap === 'maybe') return '#f59e0b'; // Amber
    return '#ef4444'; // Red
  };

  return (
    <div
      style={{
        padding: '12px',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        backgroundColor: '#f9fafb',
        marginTop: '12px',
      }}
    >
      {/* Quick Toggle */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
        {models.map((model) => (
          <button
            key={model.id}
            onClick={() => handleModelSwitch(model.id)}
            disabled={isLoading || capabilities[model.id] === 'no'}
            style={{
              flex: 1,
              padding: '10px 12px',
              border: currentModel === model.id ? '2px solid #0084ff' : '1px solid #d1d5db',
              borderRadius: '6px',
              backgroundColor: currentModel === model.id ? '#eff6ff' : 'white',
              color: currentModel === model.id ? '#0084ff' : '#4b5563',
              fontWeight: currentModel === model.id ? 'bold' : 'normal',
              cursor: isLoading || capabilities[model.id] === 'no' ? 'not-allowed' : 'pointer',
              opacity: isLoading || capabilities[model.id] === 'no' ? 0.5 : 1,
              fontSize: '13px',
            }}
          >
            {model.size === 'small' ? '⚡' : '🧠'} {model.name}
          </button>
        ))}
      </div>

      {/* Expandable Details */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        style={{
          background: 'none',
          border: 'none',
          color: '#0084ff',
          cursor: 'pointer',
          fontSize: '12px',
          textDecoration: 'underline',
          padding: 0,
        }}
      >
        {showDetails ? '▼' : '▶'} Model Comparison
      </button>

      {showDetails && (
        <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e5e7eb' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '12px' }}>
            {models.map((model) => (
              <div key={model.id} style={{ padding: '10px', backgroundColor: 'white', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {model.size === 'small' ? '⚡' : '🧠'} {model.name}
                  <span
                    style={{
                      fontSize: '10px',
                      padding: '2px 6px',
                      borderRadius: '3px',
                      backgroundColor: getCapabilityColor(model.id),
                      color: 'white',
                    }}
                  >
                    {getCapabilityBadge(model.id)}
                  </span>
                </div>

                <div style={{ display: 'grid', gap: '6px', color: '#6b7280' }}>
                  <div>
                    <strong>Size:</strong> {model.downloadSize}
                  </div>
                  <div>
                    <strong>Load:</strong> {model.loadTime}
                  </div>
                  <div>
                    <strong>Response:</strong> {model.latency}
                  </div>
                  <div>
                    <strong>RAM:</strong> {model.memoryRequired}
                  </div>
                  <div>
                    <strong>Reasoning:</strong> {model.reasoning === 'basic' ? '📝 Basic' : '🧠 Advanced'}
                  </div>
                  <div>
                    <strong>Max Tokens:</strong> {model.maxTokens}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Recommendation */}
          <div
            style={{
              marginTop: '12px',
              padding: '10px',
              backgroundColor: '#f0fdf4',
              border: '1px solid #86efac',
              borderRadius: '6px',
              fontSize: '12px',
              color: '#166534',
            }}
          >
            <strong>💡 Recommendation:</strong> Use <strong>{modelSelector.getRecommendedModel() === 'qwen-7b' ? 'Qwen 7B (Powerful)' : 'Qwen 0.5B (Fast)'}</strong> for your device.
            {modelSelector.canRunModel('qwen-7b') === 'yes'
              ? ' Your device has enough memory for advanced reasoning.'
              : ' Your device memory is limited; using the fast model for best experience.'}
          </div>
        </div>
      )}
    </div>
  );
}
