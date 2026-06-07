import React, { useState, useEffect } from 'react';

// --- TypeScript Types ---

interface PredictionRecord {
  prediction_date: string;
  score: number;
  confidence: number;
  outcome: 'CORRECT' | 'INCORRECT' | 'PENDING';
  prediction_id: string;
}

type FetchState = 'idle' | 'loading' | 'success' | 'error';

// --- Styling (cartoon brutalist) ---

const styles: Record<string, React.CSSProperties> = {
  container: {
    fontFamily: "'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif",
    border: '4px solid #000',
    borderRadius: '0',
    padding: '24px',
    background: '#fff',
    boxShadow: '8px 8px 0px #000',
    maxWidth: '860px',
    margin: '0 auto',
  },
  heading: {
    fontSize: '1.5rem',
    fontWeight: 800,
    textTransform: 'uppercase' as const,
    letterSpacing: '-0.5px',
    color: '#000',
    marginBottom: '16px',
    paddingBottom: '8px',
    borderBottom: '4px solid #000',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  accuracyBadge: {
    fontSize: '1rem',
    fontWeight: 700,
    padding: '6px 14px',
    border: '3px solid #000',
    background: '#FFE600',
    color: '#000',
    boxShadow: '3px 3px 0px #000',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    border: '3px solid #000',
  },
  th: {
    border: '3px solid #000',
    padding: '10px 14px',
    background: '#FFE600',
    color: '#000',
    fontWeight: 800,
    fontSize: '0.9rem',
    textTransform: 'uppercase' as const,
    textAlign: 'left' as const,
  },
  td: {
    border: '3px solid #000',
    padding: '10px 14px',
    fontWeight: 600,
    fontSize: '0.9rem',
    color: '#000',
    background: '#fff',
  },
  spinnerContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 0',
    gap: '16px',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '5px solid #E5E5E5',
    borderTop: '5px solid #000',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: '48px 0',
    fontSize: '1.1rem',
    fontWeight: 700,
    color: '#555',
    border: '3px dashed #999',
    background: '#FAFAFA',
  },
  errorState: {
    textAlign: 'center' as const,
    padding: '32px 0',
    fontSize: '1rem',
    fontWeight: 700,
    color: '#D32F2F',
    border: '3px solid #D32F2F',
    background: '#FFF0F0',
  },
  retryButton: {
    marginTop: '12px',
    padding: '8px 20px',
    fontSize: '0.85rem',
    fontWeight: 700,
    border: '3px solid #000',
    background: '#fff',
    color: '#000',
    cursor: 'pointer',
    boxShadow: '3px 3px 0px #000',
    textTransform: 'uppercase' as const,
  },
};

// --- Helpers ---

function formatScore(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatConfidence(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function getOutcomeStyle(outcome: string): React.CSSProperties {
  const base: React.CSSProperties = {
    fontWeight: 800,
    padding: '4px 10px',
    border: '2px solid #000',
    display: 'inline-block',
    textTransform: 'uppercase',
    fontSize: '0.8rem',
    letterSpacing: '0.3px',
  };

  switch (outcome) {
    case 'CORRECT':
      return { ...base, background: '#C8F7C5', color: '#1B5E20' };
    case 'INCORRECT':
      return { ...base, background: '#FFCDD2', color: '#B71C1C' };
    case 'PENDING':
      return { ...base, background: '#FFF3CD', color: '#856404' };
    default:
      return { ...base, background: '#F0F0F0', color: '#555' };
  }
}

// --- Component ---

interface PredictionTrackRecordProps {
  symbol: string;
}

const PredictionTrackRecord: React.FC<PredictionTrackRecordProps> = ({ symbol }) => {
  const [predictions, setPredictions] = useState<PredictionRecord[]>([]);
  const [fetchState, setFetchState] = useState<FetchState>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const fetchPredictions = async () => {
    if (!symbol) return;

    setFetchState('loading');
    setErrorMessage('');

    try {
      const response = await fetch(`/api/intelligence/predictions/${encodeURIComponent(symbol)}`);

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
      }

      const data: PredictionRecord[] = await response.json();
      setPredictions(data);
      setFetchState('success');
    } catch (err: unknown) {
      setFetchState('error');
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('An unexpected error occurred while fetching prediction history.');
      }
    }
  };

  useEffect(() => {
    fetchPredictions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol]);

  // --- Derived stats ---

  const resolvedPredictions = predictions.filter(
    (p) => p.outcome === 'CORRECT' || p.outcome === 'INCORRECT'
  );
  const correctPredictions = resolvedPredictions.filter((p) => p.outcome === 'CORRECT');
  const accuracyPercent =
    resolvedPredictions.length > 0
      ? Math.round((correctPredictions.length / resolvedPredictions.length) * 100)
      : null;

  // --- Render helpers ---

  const renderHeading = () => (
    <div style={styles.heading}>
      <span>📊 Prediction Track Record</span>
      {accuracyPercent !== null && (
        <span style={styles.accuracyBadge}>
          Accuracy: {accuracyPercent}% ({correctPredictions.length}/{resolvedPredictions.length})
        </span>
      )}
    </div>
  );

  const renderTable = () => (
    <table style={styles.table}>
      <thead>
        <tr>
          <th style={styles.th}>Prediction Date</th>
          <th style={styles.th}>Score</th>
          <th style={styles.th}>Confidence</th>
          <th style={styles.th}>Outcome</th>
        </tr>
      </thead>
      <tbody>
        {predictions.map((p) => (
          <tr key={p.prediction_id}>
            <td style={styles.td}>{formatDate(p.prediction_date)}</td>
            <td style={styles.td}>{formatScore(p.score)}</td>
            <td style={styles.td}>{formatConfidence(p.confidence)}</td>
            <td style={styles.td}>
              <span style={getOutcomeStyle(p.outcome)}>{p.outcome}</span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const renderLoading = () => (
    <div style={styles.spinnerContainer}>
      <div style={styles.spinner} />
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#555' }}>
        Loading prediction history...
      </span>
    </div>
  );

  const renderEmpty = () => (
    <div style={styles.emptyState}>No prediction history available</div>
  );

  const renderError = () => (
    <div style={styles.errorState}>
      <div>⚠️ Failed to load prediction history</div>
      <div style={{ fontSize: '0.85rem', marginTop: '6px', fontWeight: 500 }}>
        {errorMessage}
      </div>
      <button style={styles.retryButton} onClick={fetchPredictions}>
        Retry
      </button>
    </div>
  );

  // --- Main render ---

  return (
    <div style={styles.container}>
      {renderHeading()}

      {fetchState === 'loading' && renderLoading()}
      {fetchState === 'error' && renderError()}
      {fetchState === 'success' && predictions.length === 0 && renderEmpty()}
      {fetchState === 'success' && predictions.length > 0 && renderTable()}
    </div>
  );
};

export default PredictionTrackRecord;