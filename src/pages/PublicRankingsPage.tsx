import { useEffect, useState } from "react";
import { Bell, ChevronUp, Search, Sparkles } from "lucide-react";
import AppShell from "../components/layout/AppShell";
import { getScoreColor, getSignalFromScore, MiniSparkline, ConfidenceRing } from "../components/ui/ScoreRing";
import { runCompanyDataPipeline, PipelineResult } from "../services/data/CompanyDataPipeline";
import { fChange, fPrice } from "../lib/format";
import { productNavigate } from "../components/product/ProductUI";

const symbols = ["TCS","HDFCBANK","RELIANCE","INFY","ICICIBANK","SUNPHARMA","BHARTIARTL","ITC","LT","SBIN"];

function Row({ r, rank }: { r: PipelineResult; rank: number }) {
  const p = r.prediction; const score = p?.rankingScore ?? null; const sig = getSignalFromScore(score);
  const gfv = (k: string) => p?.factorScores.find(x => x.group === k)?.value ?? 0;
  const colors = ['#533afd','#4434d4','#665efd','#5856d6','#af52de','#ea2261','#f96bee','#ffcc02','#34c759','#007aff'];
  const ini = r.symbol.slice(0,2);
  return (
    <div onClick={() => productNavigate("stock",r.symbol)}
      className="grid grid-cols-[36px_2fr_1fr_64px_72px_64px_100px_64px] items-center px-4 py-2 border-b border-[#e3e8ee] hover:bg-[#f6f9fc] cursor-pointer transition-colors">
      <span className="text-[11px] font-[400] text-[#64748d]">{rank}</span>
      <div className="flex items-center gap-2">
        <div className="w-[26px] h-[26px] rounded-[6px] flex items-center justify-center text-white text-[9px] font-[400]" style={{background:colors[rank%colors.length]}}>{ini}</div>
        <div>
          <div className="text-[13px] font-[400] text-[#0d253d] tracking-[-0.2px]">{r.symbol}</div>
          <div className="text-[10px] text-[#64748d]">{r.companyName??'—'}</div>
        </div>
      </div>
      <span className="text-[10px] text-[#64748d]">{r.sector??'—'}</span>
      <div className="flex items-center gap-1">
        <span className="text-[14px] font-[300] tabular" style={{color:score?getScoreColor(score):'#e3e8ee'}}>{score??'—'}</span>
        <MiniSparkline data={r.technicals.closePrices.slice(-20)} color="#533afd" width={32} height={14} />
      </div>
      <span className="text-[11px] font-[400] text-[#0d253d] tabular">{fPrice(r.price.current)}</span>
      <span className={`text-[11px] font-[300] ${(r.price.change??0)>=0?'text-[#1a7f4b]':'text-[#c0392b]'}`}>
        {r.price.change!==null ? fChange(r.price.change)+'%' : '—'}
      </span>
      <div className="flex gap-1 items-center">
        {['Q','G','V','M','R'].map((l,i) => {
          const keys = ['quality','growth','valuation','momentum','risk'];
          const val = gfv(keys[i]);
          return (
            <div key={l} className="flex flex-col items-center gap-[1px]">
              <span className="text-[7px] font-[400] text-[#64748d]">{l}</span>
              <div className="w-[12px] h-[2px] rounded-full bg-[#f6f9fc]"><div className="h-full rounded-full" style={{width:`${val}%`,background:getScoreColor(val)}}/></div>
              <span className="text-[6px] font-[300]" style={{color:getScoreColor(val)}}>{Math.round(val)}</span>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-1">
        <span className="text-[10px] font-[400]" style={{color:sig.color}}>{sig.text}</span>
        <ConfidenceRing pct={r.dataCompleteness} size={20} />
      </div>
    </div>
  );
}

function Skel({ rank }: { rank: number }) {
  return (
    <div className="grid grid-cols-[36px_2fr_1fr_64px_72px_64px_100px_64px] items-center px-4 py-2 border-b border-[#e3e8ee]">
      <span className="text-[11px] text-[#64748d]">{rank}</span>
      <div className="flex items-center gap-2"><div className="w-[26px] h-[26px] rounded-[6px] bg-[#f6f9fc] animate-pulse"/><div className="w-24 h-3 bg-[#f6f9fc] animate-pulse rounded"/></div>
      {[...Array(6)].map((_,i) => <div key={i} className="w-10 h-3 bg-[#f6f9fc] animate-pulse rounded"/>)}
    </div>
  );
}

export default function PublicRankingsPage() {
  const [rows, setRows] = useState<Record<string,PipelineResult|null>>({});
  const [query, setQuery] = useState("");
  useEffect(() => {
    let active = true;
    Promise.all(symbols.map(async s => [s, await runCompanyDataPipeline(s)] as const))
      .then(items => { if (active) setRows(Object.fromEntries(items)); }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  const loaded = Object.values(rows).filter((r): r is PipelineResult => r !== null);
  const visible = symbols.filter(s => `${s} ${rows[s]?.companyName??''} ${rows[s]?.sector??''}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a,b) => (rows[b]?.prediction?.rankingScore??-Infinity)-(rows[a]?.prediction?.rankingScore??-Infinity));
  const high = loaded.filter(r => (r.prediction?.rankingScore??0) >= 80).length;
  const sectors = [...new Set(loaded.map(r => r.sector).filter(Boolean) as string[])]
    .map(s => ({ name: s, score: Math.round(loaded.filter(r => r.sector === s).reduce((a,r) => a+(r.prediction?.rankingScore??0),0)/loaded.filter(r => r.sector === s).length) }))
    .sort((a,b) => b.score - a.score).slice(0, 5);

  return (
    <AppShell active="scanner">
      <div className="flex h-[calc(100vh-104px)]">
        {/* LEFT */}
        <div className="w-[200px] flex-shrink-0 bg-white border-r border-[#e3e8ee] overflow-y-auto p-5">
          <h2 className="text-[18px] font-[300] text-[#0d253d] tracking-[-0.2px] mb-1">AI Stock Scanner</h2>
          <p className="text-[11px] font-[300] text-[#64748d] mb-3">Find high-quality stocks using AI.</p>
          <span className="inline-flex items-center gap-1 text-[9px] font-[400] text-[#533afd] bg-[#b9b9f9] px-2 py-0.5 rounded-[9999px] mb-4 uppercase tracking-[0.1px]">✦ AI-Powered</span>
          <button className="w-full h-[28px] text-[10px] text-[#64748d] border border-[#e3e8ee] rounded-[8px] mb-3 active:scale-[0.97]">🗂 Saved Screens</button>
          <div className="flex items-center justify-between mb-2"><span className="text-[9px] font-[400] text-[#64748d] uppercase tracking-[0.08em]">Filters</span><button className="text-[9px] text-[#533afd]">Reset All</button></div>
          <Filter icon="🌐" label="Universe" value="NSE & BSE" />
          <div className="mb-2">
            <div className="text-[10px] text-[#64748d] mb-1 flex items-center justify-between"><span>Score Range</span><ChevronUp size={10} className="text-[#bbb]"/></div>
            <input type="range" min="0" max="100" defaultValue={50} className="w-full accent-[#533afd]"/>
            <div className="flex justify-between text-[8px] text-[#bbb] mt-1"><span>50</span><span>100</span></div>
          </div>
          <Filter icon="🏢" label="Sector" value="All" />
          <Filter icon="⭐" label="Quality" value="ROE > 15%" />
          <Filter icon="📈" label="Growth" value="CAGR > 10%" />
          <Filter icon="💰" label="Valuation" value="PE < 25" />
          <Filter icon="⚡" label="Momentum" value="> 20DMA" />
          <Filter icon="🏛" label="Mkt Cap" value="Lg & Mid" />
          <Filter icon="🛡" label="Risk" value="Drawdown <25%" />
          <button className="w-full h-[32px] bg-[#533afd] text-white text-[12px] font-[400] rounded-[9999px] mt-3 active:scale-[0.97] hover:bg-[#4434d4]">Run Scan ✦</button>
        </div>

        {/* MAIN */}
        <div className="flex-1 overflow-y-auto flex flex-col">
          <div className="flex items-center gap-2.5 px-4 py-2 border-b border-[#e3e8ee]">
            <div className="flex items-center gap-2 flex-1 h-[30px] bg-[#f6f9fc] border border-[#e3e8ee] rounded-[9999px] px-3">
              <Search size={11} className="text-[#64748d]" />
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search companies..." className="flex-1 bg-transparent text-[11px] outline-none text-[#0d253d] placeholder:text-[#bbb] font-[300]" />
            </div>
            <button className="text-[10px] text-[#64748d] border border-[#e3e8ee] rounded-[8px] px-2 py-1 active:scale-[0.97]">↓ Export</button>
          </div>
          <div className="flex gap-2 px-4 py-1.5 border-b border-[#e3e8ee] flex-wrap">
            {['AI Score ≥ 50','Market: NSE & BSE'].map(l => (
              <span key={l} className="text-[9px] text-[#533afd] bg-[#b9b9f9] rounded-[9999px] px-2 py-0.5">{l} ×</span>
            ))}
            <button className="text-[9px] text-[#c0392b]">Clear All</button>
          </div>
          <div className="flex items-center gap-3 px-4 py-1.5 border-b border-[#e3e8ee] text-[10px] text-[#64748d]">
            {[['Companies','1,258'],['High Conviction',String(high),'#533afd'],['Watchlist','24'],['Live','Now','#533afd']].map(([l,v,c]) => (
              <div key={l} className="flex items-center gap-1.5 pr-3 border-r border-[#e3e8ee] last:border-r-0">
                <span>{l}</span><span className="text-[12px] font-[400]" style={{color:c??'#0d253d'}}>{v}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-[36px_2fr_1fr_64px_72px_64px_100px_64px] px-4 py-1 border-b border-[#e3e8ee] text-[8px] font-[400] text-[#64748d] uppercase tracking-[0.08em]">
            {['Rank','Company','Sector','Score','Price','1D','Factors','Signal'].map(h => <span key={h}>{h}</span>)}
          </div>
          {visible.map((s,i) => { const r = rows[s]; return r ? <Row key={s} r={r} rank={i+1} /> : <Skel key={s} rank={i+1} />; })}
          <div className="flex items-center justify-between px-4 py-2 border-t border-[#e3e8ee] mt-auto text-[10px] text-[#64748d]">
            <span>Showing 1 to {visible.length} of 1,258</span>
            <div className="flex items-center gap-1">{[1,2,3,'...',210].map((p,i) => (
              <button key={i} className={`w-5 h-5 text-[9px] rounded-[4px] active:scale-[0.97] ${p===1?'bg-[#0d253d] text-white':'text-[#64748d]'}`}>{p}</button>
            ))}</div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="w-[200px] flex-shrink-0 bg-white border-l border-[#e3e8ee] overflow-y-auto p-5">
          <div className="mb-4">
            <div className="flex items-center gap-1.5 mb-2"><Sparkles size={12} className="text-[#533afd]" /><span className="text-[14px] font-[300] text-[#0d253d] tracking-[-0.2px]">AI Insights</span></div>
            {[
              {i:'↗',t:'Improving Earnings',d:'Consistent revenue growth scores higher.'},
              {i:'%',t:'Valuation Edge',d:'Below historical PE bands rank higher.'},
              {i:'⌁',t:'Momentum Strength',d:'Price momentum boosts quality names.'},
            ].map((item,idx) => (
              <div key={idx} className="flex gap-2 mb-2 pb-2 border-b border-[#e3e8ee] last:border-0">
                <div className="w-6 h-6 rounded-[6px] bg-[#f6f9fc] flex items-center justify-center text-[9px] flex-shrink-0">{item.i}</div>
                <div>
                  <div className="text-[10px] font-[400] text-[#0d253d]">{item.t}</div>
                  <div className="text-[9px] text-[#64748d]">{item.d}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="mb-4">
            <div className="text-[10px] font-[400] text-[#0d253d] mb-0.5">Top Sectors</div>
            <div className="text-[9px] text-[#64748d] mb-2">by Avg AI Score</div>
            {sectors.map(s => (
              <div key={s.name} className="flex items-center gap-1.5 mb-1">
                <span className="text-[9px] text-[#64748d] w-[55px] truncate">{s.name}</span>
                <div className="flex-1 h-[2px] bg-[#f6f9fc] rounded-full overflow-hidden"><div className="h-full bg-[#533afd] rounded-full" style={{width:`${s.score}%`}}/></div>
                <span className="text-[9px] font-[400] text-[#0d253d] w-[14px] text-right">{s.score}</span>
              </div>
            ))}
          </div>
          <div className="pt-3 border-t border-[#e3e8ee]">
            <div className="flex items-center justify-between mb-1"><span className="text-[11px] font-[400] text-[#0d253d]">Make it Yours</span><Bell size={12} className="text-[#64748d]" /></div>
            <p className="text-[9px] text-[#64748d] mb-2">Save scan & get alerts.</p>
            <button className="w-full h-[28px] border border-[#e3e8ee] rounded-[8px] text-[10px] text-[#64748d] active:scale-[0.97]">🗂 Save This Scan</button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Filter({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-[#f6f9fc] cursor-pointer hover:bg-[#f6f9fc] px-1 -mx-1 rounded-[4px] transition-colors">
      <div className="flex items-center gap-1.5"><span className="text-[10px]">{icon}</span><span className="text-[9px] text-[#64748d]">{label}</span></div>
      <div className="flex items-center gap-1"><span className="text-[8px] text-[#bbb]">{value}</span><span className="text-[7px] text-[#ccc]">›</span></div>
    </div>
  );
}
