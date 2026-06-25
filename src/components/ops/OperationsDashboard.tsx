import React, { useEffect, useState } from 'react';

interface OpsData { timestamp: string; scheduler: { status: string; totalRuns: number }; freshness: { overallStatus: string; checks: Array<{ table: string; latest: string | null; daysStale: number | null; status: string }> }; predictions: { today: number; total: number }; validations: { totalValidated: number; outcomeV2: number }; failures: { errors: number }; alerts: { count: number }; universe: { qualitySymbols: number; priceSymbols: number; nifty100Target: number }; }

export function OperationsDashboard() {
  const [data, setData] = useState<OpsData | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { fetch('/api/ops/dashboard').then(r => r.json()).then(setData).catch(console.error).finally(() => setLoading(false)); }, []);
  if (loading) return <div className="p-4">Loading...</div>;
  if (!data) return <div className="p-4 text-red-600">No data</div>;
  return (<div className="p-6 max-w-6xl mx-auto">
    <h1 className="text-3xl font-black border-b-4 border-black pb-2 mb-6 uppercase">System Overview</h1>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div className="border-4 border-black p-4 shadow-[4px_4px_0px_#000] bg-[#a8e6cf]"><h2 className="font-bold">Scheduler</h2><span className="text-xs bg-black text-white px-2 py-1">{data.scheduler.status}</span><p className="text-sm">Runs: {data.scheduler.totalRuns}</p></div>
      <div className="border-4 border-black p-4 shadow-[4px_4px_0px_#000] bg-[#ffd3b6]"><h2 className="font-bold">Predictions</h2><p className="text-4xl font-black">{data.predictions.total.toLocaleString()}</p></div>
      <div className="border-4 border-black p-4 shadow-[4px_4px_0px_#000] bg-[#dcedc1]"><h2 className="font-bold">Validated</h2><p className="text-4xl font-black">{data.validations.totalValidated.toLocaleString()}</p><p className="text-xs">V2: {data.validations.outcomeV2.toLocaleString()}</p></div>
    </div>
    <div className="border-4 border-black p-4 shadow-[4px_4px_0px_#000] bg-white mb-6">
      <h2 className="font-bold mb-2">Data recency <span className={`ml-2 text-xs px-2 py-1 font-bold ${data.freshness.overallStatus === 'healthy' ? 'bg-green-300' : 'bg-yellow-300'}`}>{data.freshness.overallStatus}</span></h2>
      <table className="w-full text-xs"><thead><tr className="border-b-2 border-black"><th className="text-left p-1">Table</th><th className="text-left p-1">Latest</th><th className="text-left p-1">Stale</th><th className="text-left p-1">Status</th></tr></thead><tbody>{data.freshness.checks.map(c => <tr key={c.table} className="border-b border-gray-300"><td className="p-1 font-mono">{c.table}</td><td className="p-1">{c.latest || 'N/A'}</td><td className="p-1">{c.daysStale != null ? c.daysStale + 'd' : 'N/A'}</td><td className={`p-1 font-bold ${c.status === 'OK' ? 'text-green-600' : 'text-red-600'}`}>{c.status}</td></tr>)}</tbody></table>
    </div>
    {data.alerts.count > 0 && <div className="border-4 border-black p-4 shadow-[4px_4px_0px_#000] bg-[#ff8b94] mb-6"><h2 className="font-bold">⚠ Alerts: {data.alerts.count}</h2></div>}
    <div className="border-4 border-black p-4 shadow-[4px_4px_0px_#000] bg-white"><h2 className="font-bold">Universe: {data.universe.qualitySymbols}/{data.universe.nifty100Target} NIFTY100 ({data.universe.priceSymbols} prices)</h2><div className="w-full bg-gray-200 h-4 mt-1 border-2 border-black"><div className="bg-green-500 h-full" style={{width:`${Math.min(100,(data.universe.qualitySymbols/data.universe.nifty100Target)*100)}%`}}/></div></div>
  </div>);
}
export default OperationsDashboard;
