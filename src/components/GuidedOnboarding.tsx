import type { CSSProperties } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, CheckCircle2, Cpu, Eye, Radar, ShieldCheck, Sparkles } from "lucide-react";
import { animation, colors, radius, space } from "../design/tokens";

// ── Glassmorphism design helpers ────────────────────────────────────────────
const glassBorder = `1px solid rgba(255,255,255,0.08)`;
const glassBorderLight = `1px solid rgba(255,255,255,0.04)`;
const glassBg = 'rgba(20,20,20,0.55)';        // frosted card surface
const glassBgLight = 'rgba(255,255,255,0.03)'; // subtle glass fill
const glassBgIcon = 'rgba(255,255,255,0.05)';  // icon container bg
const glassAccent = '#818cf8';                 // indigo glass accent for icons
const ink = '#ffffff';
const body = '#a0a0a0';
const mute = '#707070';
const charcoal = '#c0c0c0';
const stone = '#404040';
const accentRed = '#FF6B6B';

// Terminal-style font for the onboarding wizard
const monoFont = "'SF Mono', 'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace";

interface GuidedOnboardingProps {
  onComplete: () => void;
}

type Step = 1 | 2 | 3 | 4 | 5;

const DEFAULT_TICKERS = ["RELIANCE", "TCS", "SBIN", "INFY", "TATAMOTORS"];
const STORAGE_KEY = "ss_guided_onboarding_config_v1";

interface ScannerConfig {
  bollingerSensitivity: "normal" | "high" | "low";
  volumeDivergenceEnabled: boolean;
  macdEnabled: boolean;
  webgpuEnabled: boolean;
}

const DEFAULT_CONFIG: ScannerConfig = {
  bollingerSensitivity: "normal",
  volumeDivergenceEnabled: true,
  macdEnabled: true,
  webgpuEnabled: true,
};

function loadConfig(): ScannerConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CONFIG;
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_CONFIG;
  }
}

function saveConfig(config: ScannerConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // localStorage full — silently degrade
  }
}

export default function GuidedOnboarding({ onComplete }: GuidedOnboardingProps) {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [config, setConfig] = useState<ScannerConfig>(loadConfig);
  const [webgpuStatus, setWebgpuStatus] = useState<"checking" | "available" | "unavailable">("checking");
  const panelRef = useRef<HTMLElement | null>(null);

  // Detect WebGPU
  useEffect(() => {
    const check = async () => {
      if (typeof navigator === "undefined" || !navigator.gpu) {
        setWebgpuStatus("unavailable");
        return;
      }
      try {
        const adapter = await navigator.gpu.requestAdapter();
        setWebgpuStatus(adapter ? "available" : "unavailable");
      } catch {
        setWebgpuStatus("unavailable");
      }
    };
    check();
  }, []);

  const handleNext = useCallback(() => {
    setCurrentStep((prev) => (prev < 5 ? ((prev + 1) as Step) : prev));
  }, []);

  const handleLaunch = useCallback(() => {
    saveConfig({ ...config, webgpuEnabled: webgpuStatus === "available" });
    onComplete();
    window.location.href = "/watchlist";
  }, [onComplete, config, webgpuStatus]);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.body.dataset.onboardingActive = "true";
    return () => {
      document.body.style.overflow = prevOverflow;
      delete document.body.dataset.onboardingActive;
    };
  }, []);

  useEffect(() => {
    panelRef.current?.scrollTo({ top: 0, behavior: "auto" });
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [currentStep]);

  const buttonStyle: CSSProperties = {
    minHeight: "clamp(48px, 8vw, 56px)",
    width: "100%",
    borderRadius: radius.lg,
    border: glassBorder,
    background: 'linear-gradient(135deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 100%)',
    color: ink,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: space[2],
    padding: `clamp(10px, 2.2vw, 12px) ${space[4]}`,
    fontSize: "clamp(14px, 2.4vw, 16px)",
    fontWeight: 500,
    cursor: "pointer",
    transition: `transform ${animation.standard}`,
    fontFamily: monoFont,
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
  };

  const toggleStyle = (active: boolean): CSSProperties => ({
    width: 40,
    height: 22,
    borderRadius: 11,
    background: active ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.08)',
    border: glassBorderLight,
    cursor: "pointer",
    position: "relative",
    flexShrink: 0,
  });

  const toggleKnob = (active: boolean): CSSProperties => ({
    width: 16,
    height: 16,
    borderRadius: "50%",
    background: active ? '#000000' : stone,
    position: "absolute",
    top: 3,
    left: active ? 21 : 3,
    transition: "left 0.2s",
  });

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 60,
      display: "flex", alignItems: "center", justifyContent: "center",
      overflow: "hidden",
      background: 'rgba(0,0,0,0.65)',
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
      fontFamily: monoFont,
    }}>
      <section ref={panelRef} style={{
        position: "relative", zIndex: 1,
        width: "min(100%, 720px)",
        maxHeight: "min(calc(100dvh - 40px), 920px)",
        borderRadius: radius.lg,
        border: glassBorder,
        background: glassBg,
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        boxShadow: 'rgba(255,255,255,0.03) 0px 0px 0px 1px inset, rgba(0,0,0,0.45) 0px 32px 120px',
        boxSizing: "border-box",
        padding: "clamp(16px, 3.5vw, 32px)",
        display: "grid",
        gap: "clamp(12px, 2.5vw, 24px)",
        overflowY: "auto",
        color: ink,
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: space[3], flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, color: body, fontWeight: 500 }}>Welcome to StockEX</span>
          <span style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            minHeight: "30px", padding: `0 ${space[3]}`, borderRadius: radius.full,
            background: glassBgLight, border: glassBorderLight,
            color: ink, fontSize: 11, fontWeight: 600,
            backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
          }}>
            Step {currentStep} of 5
          </span>
        </div>

        {/* Title */}
        <div>
          <h1 style={{
            margin: 0, fontSize: "clamp(26px, 5vw, 48px)", lineHeight: 1.02,
            fontWeight: 650, color: ink,
          }}>
            Your Edge AI terminal.
          </h1>
          <p style={{
            margin: `${space[2]} 0 0 0`, color: body,
            fontSize: "clamp(14px, 2vw, 16px)", lineHeight: 1.55,
          }}>
            Configure your local intelligence engine and get your workspace ready.
          </p>
        </div>

        {/* Progress */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: space[2] }}>
          {[1, 2, 3, 4, 5].map((step) => (
            <div key={step} style={{
              height: 4, borderRadius: radius.full,
              background: step <= currentStep
                ? 'linear-gradient(90deg, rgba(255,107,107,0.92) 0%, rgba(255,255,255,0.72) 100%)'
                : 'rgba(255,255,255,0.08)',
            }} />
          ))}
        </div>

        {/* Step 1: Platform Intro */}
        {currentStep === 1 && (
          <div style={{ display: "grid", gap: space[4] }}>
            <div style={{
              display: "grid", gridTemplateColumns: "auto 1fr", gap: space[4], alignItems: "start",
              padding: "clamp(14px, 2.5vw, 20px)", borderRadius: radius.lg,
              border: glassBorder, background: glassBgLight,
              backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 14,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: glassBgIcon, border: glassBorderLight,
                color: glassAccent, flexShrink: 0,
              }}>
                <ShieldCheck size={18} />
              </div>
              <div>
                <h2 style={{ margin: 0, color: ink, fontSize: 16, fontWeight: 500 }}>
                  Decentralized intelligence, zero data cost
                </h2>
                <p style={{ margin: `${space[1]} 0 0 0`, color: body, fontSize: 13, lineHeight: 1.5 }}>
                  StockEX runs analysis on your device — not on central servers.
                  Your GPU handles Bollinger bands, volume divergences, and order-flow deltas.
                  No data leaves your browser. No API tokens needed.
                </p>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: space[3] }}>
              <div style={{ display: "grid", gap: space[2], padding: space[4], borderRadius: radius.lg, background: glassBgLight, border: glassBorder, backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}>
                <span style={{ fontSize: 10, color: mute, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>
                  What you get
                </span>
                <span style={{ fontSize: 15, fontWeight: 500, color: charcoal }}>Local machine scanning</span>
                <span style={{ fontSize: 12, color: body }}>WebGPU compute shaders for real-time indicators</span>
              </div>
              <div style={{ display: "grid", gap: space[2], padding: space[4], borderRadius: radius.lg, background: glassBgLight, border: glassBorder, backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}>
                <span style={{ fontSize: 10, color: mute, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>
                  Why it matters
                </span>
                <span style={{ fontSize: 15, fontWeight: 500, color: charcoal }}>Zero server costs</span>
                <span style={{ fontSize: 12, color: body }}>Your GPU does the heavy lifting — we never bill for compute</span>
              </div>
            </div>

            <button onClick={handleNext} style={buttonStyle}>
              Configure edge AI engine <ArrowRight size={16} />
            </button>
          </div>
        )}

        {/* Step 2: Edge AI Scanner Config */}
        {currentStep === 2 && (
          <div style={{ display: "grid", gap: space[4] }}>
            <div style={{
              display: "grid", gridTemplateColumns: "auto 1fr", gap: space[4], alignItems: "start",
              padding: "clamp(14px, 2.5vw, 20px)", borderRadius: radius.lg,
              border: glassBorder, background: glassBgLight,
              backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 14,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: glassBgIcon, border: glassBorderLight,
                color: glassAccent, flexShrink: 0,
              }}>
                <Cpu size={18} />
              </div>
              <div>
                <h2 style={{ margin: 0, color: ink, fontSize: 16, fontWeight: 500 }}>
                  Configure your scanner engine
                </h2>
                <p style={{ margin: `${space[1]} 0 0 0`, color: body, fontSize: 13 }}>
                  Choose which indicators run locally on your device.
                </p>
              </div>
            </div>

            {/* Bollinger Sensitivity */}
            <div style={{
              padding: space[4], borderRadius: radius.lg,
              background: glassBgLight, border: glassBorder,
              display: "grid", gap: space[3],
              backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: charcoal }}>Bollinger Band Sensitivity</span>
                <span style={{ fontSize: 11, color: mute, textTransform: "capitalize" }}>{config.bollingerSensitivity}</span>
              </div>
              <div style={{ display: "flex", gap: space[2] }}>
                {(["low", "normal", "high"] as const).map((level) => (
                  <button
                    key={level}
                    onClick={() => setConfig((c) => ({ ...c, bollingerSensitivity: level }))}
                    style={{
                      flex: 1, padding: `${space[2]} ${space[3]}`, borderRadius: radius.sm,
                      border: glassBorder, cursor: "pointer",
                      background: config.bollingerSensitivity === level ? glassAccent : glassBgLight,
                      color: config.bollingerSensitivity === level ? "#fff" : body,
                      fontSize: 11, fontWeight: config.bollingerSensitivity === level ? 600 : 400,
                      transition: `all ${animation.fast}`,
                      fontFamily: monoFont,
                    }}
                  >
                    {level === "low" ? "Wide" : level === "normal" ? "Standard" : "Tight"}
                  </button>
                ))}
              </div>
            </div>

            {/* Toggle: Volume Divergence */}
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: space[4], borderRadius: radius.lg,
              background: glassBgLight, border: glassBorder,
              backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
            }}>
              <div>
                <span style={{ fontSize: 13, fontWeight: 500, color: charcoal }}>Volume Divergence Detection</span>
                <p style={{ margin: `${space[1]} 0 0 0`, fontSize: 11, color: mute }}>
                  Flags accumulation when price drops but volume rises
                </p>
              </div>
              <button
                onClick={() => setConfig((c) => ({ ...c, volumeDivergenceEnabled: !c.volumeDivergenceEnabled }))}
                style={toggleStyle(config.volumeDivergenceEnabled)}
              >
                <div style={toggleKnob(config.volumeDivergenceEnabled)} />
              </button>
            </div>

            {/* Toggle: MACD */}
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: space[4], borderRadius: radius.lg,
              background: glassBgLight, border: glassBorder,
              backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
            }}>
              <div>
                <span style={{ fontSize: 13, fontWeight: 500, color: charcoal }}>MACD Trend Signals</span>
                <p style={{ margin: `${space[1]} 0 0 0`, fontSize: 11, color: mute }}>
                  Moving average convergence-divergence momentum tracker
                </p>
              </div>
              <button
                onClick={() => setConfig((c) => ({ ...c, macdEnabled: !c.macdEnabled }))}
                style={toggleStyle(config.macdEnabled)}
              >
                <div style={toggleKnob(config.macdEnabled)} />
              </button>
            </div>

            <button onClick={handleNext} style={buttonStyle}>
              Check hardware capabilities <ArrowRight size={16} />
            </button>
          </div>
        )}

        {/* Step 3: Hardware Verification */}
        {currentStep === 3 && (
          <div style={{ display: "grid", gap: space[4] }}>
            <div style={{
              display: "grid", gridTemplateColumns: "auto 1fr", gap: space[4], alignItems: "start",
              padding: "clamp(14px, 2.5vw, 20px)", borderRadius: radius.lg,
              border: glassBorder, background: glassBgLight,
              backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 14,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: glassBgIcon, border: glassBorderLight,
                color: glassAccent, flexShrink: 0,
              }}>
                <Radar size={18} />
              </div>
              <div>
                <h2 style={{ margin: 0, color: ink, fontSize: 16, fontWeight: 500 }}>
                  Hardware verification
                </h2>
                <p style={{ margin: `${space[1]} 0 0 0`, color: body, fontSize: 13 }}>
                  {webgpuStatus === "checking" && "Scanning your browser for WebGPU compute capabilities..."}
                  {webgpuStatus === "available" && "WebGPU detected — your GPU will handle local matrix calculations."}
                  {webgpuStatus === "unavailable" && "WebGPU not available. Activating WASM CPU thread fallback."}
                </p>
              </div>
            </div>

            <div style={{
              display: "grid", gap: space[2],
              padding: space[4], borderRadius: radius.lg,
              background: glassBgLight, border: glassBorder,
              backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
            }}>
              {[
                { label: "WebGPU", value: webgpuStatus === "available" ? "Active" : "Fallback", color: webgpuStatus === "available" ? charcoal : mute },
                { label: "Scanner Engine", value: webgpuStatus === "available" ? "GPU Compute Shaders" : "WASM CPU Threads", color: charcoal },
                { label: "Privacy Mode", value: "100% On-Device", color: charcoal },
              ].map((spec) => (
                <div key={spec.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                  <span style={{ color: mute }}>{spec.label}</span>
                  <span style={{ color: spec.color }}>{spec.value}</span>
                </div>
              ))}
            </div>

            <button onClick={handleNext} style={buttonStyle} disabled={webgpuStatus === "checking"}>
              {webgpuStatus === "checking" ? "Scanning..." : "Continue to dashboard tour"} <ArrowRight size={16} />
            </button>
          </div>
        )}

        {/* Step 4: Dashboard Tour */}
        {currentStep === 4 && (
          <div style={{ display: "grid", gap: space[4] }}>
            <div style={{
              display: "grid", gridTemplateColumns: "auto 1fr", gap: space[4], alignItems: "start",
              padding: "clamp(14px, 2.5vw, 20px)", borderRadius: radius.lg,
              border: glassBorder, background: glassBgLight,
              backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 14,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: glassBgIcon, border: glassBorderLight,
                color: glassAccent, flexShrink: 0,
              }}>
                <Eye size={18} />
              </div>
              <div>
                <h2 style={{ margin: 0, color: ink, fontSize: 16, fontWeight: 500 }}>
                  Dashboard quick tour
                </h2>
                <p style={{ margin: `${space[1]} 0 0 0`, color: body, fontSize: 13 }}>
                  Here is where you will spend your time:
                </p>
              </div>
            </div>

            <div style={{ display: "grid", gap: space[3] }}>
              {[
                {
                  title: "Scanner",
                  desc: "Pre-built screens for Quality, Growth, Value. Each preset ranks stocks by composite health scores.",
                  icon: "🔍",
                },
                {
                  title: "Stock Pages",
                  desc: "Detailed view with price charts, fundamentals, peer comparison, and GPU order-flow delta.",
                  icon: "📊",
                },
                {
                  title: "Watchlist",
                  desc: "Your tracked names with real-time prices via WebSocket streaming.",
                  icon: "📋",
                },
                {
                  title: "F&O Scanner",
                  desc: "Put-Call ratio, Max Pain, and OI wall concentrations for options traders (Pro-tier).",
                  icon: "🔥",
                },
              ].map((item) => (
                <div key={item.title} style={{
                  display: "flex", gap: space[3], alignItems: "flex-start",
                  padding: space[3], borderRadius: radius.sm,
                  background: glassBgLight, border: glassBorder,
                  backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
                }}>
                  <span style={{ fontSize: 16, flexShrink: 0 }}>{item.icon}</span>
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: charcoal }}>{item.title}</span>
                    <p style={{ margin: `${space[1]} 0 0 0`, fontSize: 11, color: body, lineHeight: 1.4 }}>
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={handleNext} style={buttonStyle}>
              Set up your watchlist <ArrowRight size={16} />
            </button>
          </div>
        )}

        {/* Step 5: Watchlist Setup */}
        {currentStep === 5 && (
          <div style={{ display: "grid", gap: space[4] }}>
            <div style={{
              display: "grid", gridTemplateColumns: "auto 1fr", gap: space[4], alignItems: "start",
              padding: "clamp(14px, 2.5vw, 20px)", borderRadius: radius.lg,
              border: glassBorder, background: glassBgLight,
              backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 14,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: glassBgIcon, border: glassBorderLight,
                color: glassAccent, flexShrink: 0,
              }}>
                <Sparkles size={18} />
              </div>
              <div>
                <h2 style={{ margin: 0, color: ink, fontSize: 16, fontWeight: 500 }}>
                  Your starting watchlist is ready
                </h2>
                <p style={{ margin: `${space[1]} 0 0 0`, color: body, fontSize: 13 }}>
                  We have pre-loaded a focused India watchlist so your first view is useful immediately.
                </p>
              </div>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: space[2] }}>
              {DEFAULT_TICKERS.map((symbol) => (
                <span key={symbol} style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  minHeight: "34px", padding: `0 ${space[3]}`, borderRadius: radius.full,
                  border: glassBorder, background: glassBgLight,
                  color: charcoal, fontSize: 12, fontWeight: 600, letterSpacing: "0.04em",
                }}>
                  {symbol}
                </span>
              ))}
            </div>

            {/* Summary */}
            <div style={{
              display: "grid", gap: space[2],
              padding: space[4], borderRadius: radius.lg,
              background: glassBgLight, border: glassBorder,
              backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
            }}>
              {[
                { label: "Scanner Engine", value: config.bollingerSensitivity === "normal" ? "Standard" : config.bollingerSensitivity === "high" ? "Tight" : "Wide" },
                { label: "Volume Divergence", value: config.volumeDivergenceEnabled ? "Active" : "Off" },
                { label: "MACD", value: config.macdEnabled ? "Active" : "Off" },
                { label: "Compute", value: webgpuStatus === "available" ? "GPU" : "CPU/WASM" },
              ].map((row) => (
                <div key={row.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                  <span style={{ color: mute }}>{row.label}</span>
                  <span style={{ color: charcoal }}>{row.value}</span>
                </div>
              ))}
            </div>

            <button onClick={handleLaunch} style={buttonStyle}>
              Launch StockEX <CheckCircle2 size={16} />
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
