/**
 * TRACK-49 Agent I — Daily Intelligence Feed
 * Displays daily intelligence updates with improvers and decliners.
 * Falls back to mock data when API returns empty.
 */
import React, { useState, useEffect } from 'react';

interface IntelligenceItem {
  symbol: string;
  health_delta: number;
  risk_delta: number;
  future_health_delta: number;
  narrative_change: string;
}

interface FetchState {
  improvers: IntelligenceItem[];
  decliners: IntelligenceItem[];
  loading: boolean;
  error: string;
}

function generateMockData(): { improvers: IntelligenceItem[]; decliners: IntelligenceItem[] } {
  const symbols = ['RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY.NS', 'ICICIBANK.NS', 'HINDUNILVR.NS', 'SBIN.NS', 'BHARTIARTL.NS', 'KOTAKBANK.NS', 'BAJFINANCE.NS', 'LT.NS', 'ASIANPAINT.NS', 'MARUTI.NS', 'TITAN.NS', 'SUNPHARMA.NS'];
  const adjectives = ['Strong momentum', 'Valuation expansion', 'Quality improvement', 'Risk reduction', 'Growth acceleration', 'Earnings beat', 'Sector tailwind', 'Technical breakout', 'Fundamental shift', 'Sentiment improvement'];

  const shuffled = [...symbols].sort(() => Math.random() - 0.5);
  return {
    improvers: shuffled.slice(0, 5).map(s => ({
      symbol: s,
      health_delta: Math.round((Math.random() * 0.15 + 0.01) * 100) / 100,
      risk_delta: Math.round(-(Math.random() * 0.08) * 100) / 100,
      future_health_delta: Math.round((Math.random() * 0.12 + 0.01) * 100) / 100,
      narrative_change: adjectives[Math.floor(Math.random() * adjectives.length)],
    })),
    decliners: shuffled.slice(5, 10).map(s => ({
      symbol: s,
      health_delta: Math.round(-(Math.random() * 0.12 + 0.01) * 100) / 100,
      risk_delta: Math.round((Math.random() * 0.1 + 0.01) * 100) / 100,
      future_health_delta: Math.round(-(Math.random() * 0.08 + 0.01) * 100) / 100,
      narrative_change: ['Margin pressure', 'Sector headwind', 'Quality deterioration', 'Risk increase', 'Growth slowdown'][Math.floor(Math.random() * 5)],
    })),
  };
}

function Delta({ value, suffix = '', abs = false }: { value: number; suffix?: string; abs?: boolean }) {
  const display = abs ? Math.abs(value) : value;
  const formatted = `${display > 0 && !abs ? '+' : ''}${(display * 100).toFixed(1)}%${suffix}`;
  const color = value > 0 ? 'text-green-700' : value < 0 ? 'text-red-700' : 'text-gray-500';
  const arrow = value > 0 ? '↑' : value < 0 ? '↓' : '→';
  return <span className={`font-extrabold text-sm ${color}`}>{arrow} {formatted}</span>;
}

function Card({ item, type }: { item: IntelligenceItem; type: 'improver' | 'decliner' }) {
  const bg = type === 'improver' ? 'bg-green-50 border-green-400' : 'bg-red-50 border-red-400';
  return (
    <div className={`p-4 border-4 border-black ${bg}`} style={{ boxShadow: '4px 4px 0px #000' }}>
      <div className="flex items-center justify-between mb-2">
        <span className="font-extrabold text-lg uppercase tracking-wide">{item.symbol}</span>
        <span className={`text-xs font-bold uppercase px-2 py-0.5 border-2 border-black ${type === 'improver' ? 'bg-green-300' : 'bg-red-300'}`}>
          {type === 'improver' ? 'IMPROVING' : 'DECLINING'}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div><span className="font-bold text-xs uppercase text-gray-500">Health</span><br /><Delta value={item.health_delta} /></div>
        <div><span className="font-bold text-xs uppercase text-gray-500">Risk</span><br /><Delta value={item.risk_delta} abs /></div>
        <div><span className="font-bold text-xs uppercase text-gray-500">Future</span><br /><Delta value={item.future_health_delta} /></div>
        <div><span className="font-bold text-xs uppercase text-gray-500">Narrative</span><br /><span className="text-xs font-medium">{item.narrative_change || 'No change'}</span></div>
      </div>
    </div>
  );
}

export default function DailyFeed() {
  const [state, setState] = useState<FetchState>({ improvers: [], decliners: [], loading: true, error: '' });
  const [usingMock, setUsingMock] = useState(false);

  useEffect(() => {
    fetch('/api/intelligence/discovery/rankings')
      .then(res => res.json())
      .then((json: { topImproving?: IntelligenceItem[]; topDeteriorating?: IntelligenceItem[] }) => {
        const improvers = json.topImproving || [];
        const decliners = json.topDeteriorating || [];
        if (improvers.length === 0 && decliners.length === 0) {
          const mock = generateMockData();
          setUsingMock(true);
          setState({ improvers: mock.improvers, decliners: mock.decliners, loading: false, error: '' });
        } else {
          setState({ improvers, decliners, loading: false, error: '' });
        }
      })
      .catch(() => {
        const mock = generateMockData();
        setUsingMock(true);
        setState({ improvers: mock.improvers, decliners: mock.decliners, loading: false, error: '' });
      });
  }, []);

  if (state.loading) {
    return (
      <div className="p-8 text-center">
        <div className="inline-block w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" />
        <p className="mt-4 font-bold uppercase text-sm text-gray-600">Loading daily intelligence...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="border-4 border-black bg-yellow-300 p-4" style={{ boxShadow: '6px 6px 0px #000' }}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-extrabold text-2xl uppercase tracking-wider">📊 Daily Intelligence</h2>
            <p className="text-sm font-bold mt-1">Since yesterday</p>
          </div>
          {usingMock && (
            <span className="text-xs bg-white border-2 border-black px-3 py-1 font-bold uppercase">
              DEMO DATA
            </span>
          )}
        </div>
      </div>

      {/* IMPROVERS */}
      <div>
        <div className="border-l-4 border-green-500 pl-3 mb-3">
          <h3 className="font-extrabold text-lg uppercase text-green-800">Top Improvers ↑</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {state.improvers.map((item, i) => (
            <Card key={`imp-${i}`} item={item} type="improver" />
          ))}
        </div>
      </div>

      {/* DECLINERS */}
      <div>
        <div className="border-l-4 border-red-500 pl-3 mb-3">
          <h3 className="font-extrabold text-lg uppercase text-red-800">Top Decliners ↓</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {state.decliners.map((item, i) => (
            <Card key={`dec-${i}`} item={item} type="decliner" />
          ))}
        </div>
      </div>

      {/* EMPTY STATE */}
      {state.improvers.length === 0 && state.decliners.length === 0 && (
        <div className="p-8 border-4 border-dashed border-black bg-gray-50 text-center">
          <p className="font-extrabold text-xl">No changes today</p>
          <p className="text-sm text-gray-600 mt-1">All tracked companies are stable. Check back tomorrow for intelligence updates.</p>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
