import { useEffect, useState } from 'react';
import styles from './IntelligentAnalysis.module.css';

interface AnalysisData {
  symbol: string;
  analysis: {
    quality: { score: number; reasoning: string; factors: string[] };
    valuation: { score: number; reasoning: string; factors: string[] };
    growth: { score: number; reasoning: string; factors: string[] };
    technicals: { score: number; reasoning: string; factors: string[] };
    risk: { score: number; reasoning: string; factors: string[] };
  };
  thesis: {
    bullCase: string;
    bearCase: string;
    investmentHorizon: string;
    keyRisks: string[];
    catalysts: string[];
  };
  recommendation: {
    action: 'BUY' | 'HOLD' | 'SELL';
    rating: number;
    conviction: number;
    timeframe: string;
    riskReward: string;
  };
}

export function IntelligentAnalysis({ symbol }: { symbol: string }) {
  const [data, setData] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [depth, setDepth] = useState<'quick' | 'detailed'>('quick');
  const [activeTab, setActiveTab] = useState<'overview' | 'thesis' | 'risks'>(
    'overview'
  );

  useEffect(() => {
    analyzeStock();
  }, [symbol, depth]);

  const analyzeStock = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/intelligence/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol, depth }),
      });

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.statusText}`);
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
      console.error('Analysis error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner}>🧠</div>
          <p>AI is analyzing {symbol}...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <p>❌ {error}</p>
          <button onClick={analyzeStock}>Try Again</button>
        </div>
      </div>
    );
  }

  if (!data) {
    return <div className={styles.container}>No analysis available</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>AI Intelligence Analysis</h2>
        <div className={styles.controls}>
          <button
            className={depth === 'quick' ? styles.active : ''}
            onClick={() => setDepth('quick')}
          >
            Quick
          </button>
          <button
            className={depth === 'detailed' ? styles.active : ''}
            onClick={() => setDepth('detailed')}
          >
            Detailed
          </button>
        </div>
      </div>

      <div className={styles.tabs}>
        <button
          className={activeTab === 'overview' ? styles.active : ''}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={activeTab === 'thesis' ? styles.active : ''}
          onClick={() => setActiveTab('thesis')}
        >
          Thesis
        </button>
        <button
          className={activeTab === 'risks' ? styles.active : ''}
          onClick={() => setActiveTab('risks')}
        >
          Risks
        </button>
      </div>

      {activeTab === 'overview' && (
        <div className={styles.content}>
          <div className={styles.scores}>
            <ScoreCard
              label="Quality"
              score={data.analysis.quality.score}
              reasoning={data.analysis.quality.reasoning}
              factors={data.analysis.quality.factors}
            />
            <ScoreCard
              label="Valuation"
              score={data.analysis.valuation.score}
              reasoning={data.analysis.valuation.reasoning}
              factors={data.analysis.valuation.factors}
            />
            <ScoreCard
              label="Growth"
              score={data.analysis.growth.score}
              reasoning={data.analysis.growth.reasoning}
              factors={data.analysis.growth.factors}
            />
            <ScoreCard
              label="Technicals"
              score={data.analysis.technicals.score}
              reasoning={data.analysis.technicals.reasoning}
              factors={data.analysis.technicals.factors}
            />
          </div>

          <div className={styles.recommendation}>
            <div className={styles.action}>
              <span className={`${styles.badge} ${styles[data.recommendation.action.toLowerCase()]}`}>
                {data.recommendation.action}
              </span>
              <div className={styles.metrics}>
                <div>Rating: {data.recommendation.rating}/100</div>
                <div>Conviction: {data.recommendation.conviction}%</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'thesis' && (
        <div className={styles.content}>
          <div className={styles.thesisSection}>
            <div className={styles.bullBear}>
              <div className={styles.bull}>
                <h4>Bull Case</h4>
                <p>{data.thesis.bullCase}</p>
              </div>
              <div className={styles.bear}>
                <h4>Bear Case</h4>
                <p>{data.thesis.bearCase}</p>
              </div>
            </div>

            <div className={styles.catalysts}>
              <h4>Catalysts</h4>
              <ul>
                {data.thesis.catalysts.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </div>

            <div className={styles.horizon}>
              <strong>Investment Horizon:</strong> {data.thesis.investmentHorizon}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'risks' && (
        <div className={styles.content}>
          <div className={styles.risks}>
            <h4>Key Risks</h4>
            <ul>
              {data.thesis.keyRisks.map((risk) => (
                <li key={risk}>{risk}</li>
              ))}
            </ul>

            <div className={styles.riskScore}>
              <div>Risk Score: {data.analysis.risk.score}/100</div>
              <div className={styles.reasoning}>
                {data.analysis.risk.reasoning}
              </div>
            </div>

            <div className={styles.riskReward}>
              <strong>Risk/Reward:</strong> {data.recommendation.riskReward}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ScoreCard({
  label,
  score,
  reasoning,
  factors,
}: {
  label: string;
  score: number;
  reasoning: string;
  factors: string[];
}) {
  const getScoreColor = (score: number) => {
    if (score >= 75) return 'var(--green-text)';
    if (score >= 50) return 'var(--amber-text)';
    return 'var(--red-text)';
  };

  return (
    <div className={styles.scoreCard}>
      <div className={styles.scoreHeader}>
        <span className={styles.label}>{label}</span>
        <span
          className={styles.score}
          style={{ color: getScoreColor(score) }}
        >
          {score}
        </span>
      </div>
      <p className={styles.reasoning}>{reasoning}</p>
      <div className={styles.factors}>
        {factors.slice(0, 2).map((f) => (
          <span key={f} className={styles.factor}>
            {f}
          </span>
        ))}
      </div>
    </div>
  );
}
