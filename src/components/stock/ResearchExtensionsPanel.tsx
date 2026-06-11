import React, { useMemo, useState } from "react";
import { buildHindiSummary, loadLocale, saveLocale, speakLocalSummary, type SupportedLocale } from "../../services/localisation/localisation";
import { verifyWhatsAppTip } from "../../services/research/fraudShield";
import { runScenario } from "../../services/research/scenarioSandbox";
import { evaluateThesisDrift, loadThesis, saveThesis, type UserThesis } from "../../services/research/userThesis";

interface Props {
  symbol: string;
  companyName: string;
  story: any;
}

export default function ResearchExtensionsPanel({ symbol, companyName, story }: Props): JSX.Element {
  const [locale, setLocale] = useState<SupportedLocale>(() => loadLocale());
  const [thesis, setThesis] = useState<UserThesis>(() => loadThesis(symbol));
  const [tipText, setTipText] = useState("");
  const [revenueShockPct, setRevenueShockPct] = useState(0);
  const [marginShockPct, setMarginShockPct] = useState(0);
  const [rateShockBps, setRateShockBps] = useState(0);
  const [audioNotice, setAudioNotice] = useState("");

  const metrics = useMemo(() => ({
    healthScore: story.healthScore ?? null,
    growth: story.growth ?? null,
    quality: story.quality ?? null,
    stability: story.stability ?? null,
    valuation: story.valuation ?? null,
    momentum: story.momentum ?? null,
    risk: story.risk ?? null,
  }), [story]);

  const driftAlerts = useMemo(() => evaluateThesisDrift(thesis, metrics), [metrics, thesis]);
  const hindiSummary = useMemo(() => buildHindiSummary({
    companyName,
    classification: story.classification,
    confidence: story.confidence,
    narrative: story.narrative,
  }), [companyName, story.classification, story.confidence, story.narrative]);
  const scenario = runScenario({
    growthScore: story.growth,
    qualityScore: story.quality,
    stabilityScore: story.stability,
    valuationScore: story.valuation,
    momentumScore: story.momentum,
    riskScore: story.risk,
    revenueShockPct,
    marginShockPct,
    rateShockBps,
  });
  const tip = verifyWhatsAppTip(tipText);

  const updateLocale = (next: SupportedLocale) => {
    setLocale(next);
    saveLocale(next);
  };

  const updateThesisText = (value: string) => {
    setThesis(saveThesis({ ...thesis, thesis: value, driftAlerts }));
  };

  const addBreaker = () => {
    const next = {
      ...thesis,
      breakers: [
        ...thesis.breakers,
        {
          id: `${Date.now()}`,
          condition: "Health score below thesis threshold",
          metricKey: "healthScore",
          operator: "lt" as const,
          threshold: 60,
          active: true,
        },
      ],
    };
    setThesis(saveThesis(next));
  };

  const englishSummary = `Local summary: ${story.classification ?? "Data unavailable"} classification with ${story.confidence ?? "Data unavailable"} confidence.`;

  const playAudio = () => {
    const spoken = speakLocalSummary(locale === "hi-IN" ? hindiSummary : englishSummary, locale);
    setAudioNotice(spoken ? "Audio summary started." : "Audio unavailable in this browser.");
  };

  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-xl border border-white/5 bg-white/[0.015] p-5">
        <div className="mb-3 text-[10px] font-bold uppercase tracking-wider text-cyan-400">User Thesis & Drift Alerts</div>
        <textarea
          value={thesis.thesis}
          onChange={(event) => updateThesisText(event.target.value)}
          placeholder="Write your thesis for this company..."
          className="h-24 w-full resize-none rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-white placeholder-white/25 outline-none focus:border-cyan-400"
        />
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="text-[10px] text-white/40">{thesis.breakers.length} breaker condition(s)</span>
          <button onClick={addBreaker} className="rounded-lg border border-cyan-500/30 px-3 py-2 text-[10px] font-bold uppercase text-cyan-300">Add Breaker</button>
        </div>
        <div className="mt-3 space-y-2">
          {driftAlerts.length > 0 ? driftAlerts.map((alert) => (
            <div key={alert} className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-2 text-[11px] text-amber-200">{alert}</div>
          )) : (
            <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2 text-[11px] text-white/45">No thesis drift alerts from active breaker conditions.</div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-white/5 bg-white/[0.015] p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">Hindi & Audio Summary</div>
          <div className="flex gap-2">
            {(["en-IN", "hi-IN"] as SupportedLocale[]).map((item) => (
              <button key={item} onClick={() => updateLocale(item)} className={`rounded border px-2 py-1 text-[10px] ${locale === item ? "border-cyan-400 text-cyan-300" : "border-white/10 text-white/45"}`}>{item}</button>
            ))}
          </div>
        </div>
        <p className="text-xs leading-6 text-white/70">{locale === "hi-IN" ? hindiSummary : englishSummary}</p>
        <button onClick={playAudio} className="mt-3 rounded-lg border border-white/10 px-3 py-2 text-[10px] font-bold uppercase text-white/70">Play Audio</button>
        {audioNotice && <span className="ml-3 text-[10px] text-white/40">{audioNotice}</span>}
      </div>

      <div className="rounded-xl border border-white/5 bg-white/[0.015] p-5">
        <div className="mb-3 text-[10px] font-bold uppercase tracking-wider text-cyan-400">Scenario Sandbox</div>
        <div className="grid gap-3 sm:grid-cols-3">
          <NumberInput label="Revenue shock %" value={revenueShockPct} onChange={setRevenueShockPct} />
          <NumberInput label="Margin shock %" value={marginShockPct} onChange={setMarginShockPct} />
          <NumberInput label="Rate shock bps" value={rateShockBps} onChange={setRateShockBps} />
        </div>
        <div className="mt-4 rounded-lg border border-white/5 bg-white/[0.02] p-3 text-xs text-white/65">
          Adjusted score: <span className="font-mono font-bold text-white">{scenario.adjustedScore ?? "Data unavailable"}</span>
          {scenario.changedBy !== null && <span className="ml-2 text-white/40">({scenario.changedBy >= 0 ? "+" : ""}{scenario.changedBy})</span>}
          <p className="mt-2 text-[11px] text-white/45">{scenario.explanation}</p>
        </div>
      </div>

      <div className="rounded-xl border border-white/5 bg-white/[0.015] p-5">
        <div className="mb-3 text-[10px] font-bold uppercase tracking-wider text-cyan-400">Fraud Shield & WhatsApp Tip Verifier</div>
        <textarea
          value={tipText}
          onChange={(event) => setTipText(event.target.value)}
          placeholder="Paste a forwarded tip to check for risk language..."
          className="h-20 w-full resize-none rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-white placeholder-white/25 outline-none focus:border-cyan-400"
        />
        <div className="mt-3 rounded-lg border border-white/5 bg-white/[0.02] p-3 text-xs text-white/65">
          Status: <span className="font-bold uppercase text-cyan-300">{tip.status}</span>
          <p className="mt-1 text-[11px] text-white/45">Flags: {tip.flags.length > 0 ? tip.flags.join(", ") : "None"}</p>
          <p className="mt-2 text-[11px] text-white/55">{tip.safeText}</p>
        </div>
      </div>
    </section>
  );
}

function NumberInput({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase text-white/35">{label}</span>
      <input
        type="number"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 p-2 text-xs text-white outline-none"
      />
    </label>
  );
}
