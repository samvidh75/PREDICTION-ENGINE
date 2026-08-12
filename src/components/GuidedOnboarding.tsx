import type { CSSProperties } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, CheckCircle2, Search, Sparkles, TrendingUp, Wallet } from "lucide-react";
import { radius, space, typography } from "../design/tokens";

// ── Glassmorphism design helpers ────────────────────────────────────────────
const glassBorder = `1px solid rgba(255,255,255,0.08)`;
const glassBorderLight = `1px solid rgba(255,255,255,0.04)`;
const glassBg = 'rgba(18,18,18,0.6)';           // frosted card surface
const glassBgLight = 'rgba(255,255,255,0.03)'; // subtle glass fill
const glassBgIcon = 'rgba(255,255,255,0.05)';  // icon container bg
const glassAccent = '#FF6B4A';                 // theme accent for icons
const ink = '#ffffff';
const body = '#a3a3a3';
const mute = '#6f6f6f';
const charcoal = '#c8c8c8';
const stone = '#404040';

const monoFont = typography.fontFamily;

interface GuidedOnboardingProps {
  onComplete: () => void;
}

type Step = 1 | 2;

const DEFAULT_TICKERS = ["BDO", "JFC", "AC", "SM", "TEL"];
const STORAGE_KEY = "ss_guided_onboarding_config_v1";

interface ScannerConfig {
  bollingerSensitivity: "normal" | "high" | "low";
  volumeDivergenceEnabled: boolean;
  macdEnabled: boolean;
}

const DEFAULT_CONFIG: ScannerConfig = {
  bollingerSensitivity: "normal",
  volumeDivergenceEnabled: true,
  macdEnabled: true,
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
  const panelRef = useRef<HTMLElement | null>(null);

  const handleNext = useCallback(() => {
    setCurrentStep((prev) => (prev < 2 ? ((prev + 1) as Step) : prev));
  }, []);

  const handleLaunch = useCallback(() => {
    saveConfig(config);
    onComplete();
    window.location.href = "/watchlist";
  }, [onComplete, config]);

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
  }, [currentStep]);

  const buttonStyle: CSSProperties = {
    minHeight: "clamp(48px, 8vw, 54px)",
    width: "100%",
    borderRadius: radius.lg,
    border: "1px solid rgba(255,255,255,0.12)",
    background: 'linear-gradient(135deg, #FFFFFF 0%, #ECECEC 100%)',
    color: "#0A0A0A",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: space[2],
    padding: `clamp(10px, 2.2vw, 12px) ${space[4]}`,
    fontSize: "clamp(14px, 2.4vw, 15px)",
    fontWeight: 600,
    cursor: "pointer",
    transition: "transform 180ms ease, opacity 180ms ease",
    fontFamily: monoFont,
  };

  const toggleStyle = (active: boolean): CSSProperties => ({
    width: 40,
    height: 22,
    borderRadius: 11,
    background: active ? glassAccent : 'rgba(255,255,255,0.08)',
    border: glassBorderLight,
    cursor: "pointer",
    position: "relative",
    flexShrink: 0,
    transition: "background 180ms ease",
  });

  const toggleKnob = (active: boolean): CSSProperties => ({
    width: 16,
    height: 16,
    borderRadius: "50%",
    background: active ? '#ffffff' : stone,
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
      background: 'rgba(0,0,0,0.7)',
      fontFamily: monoFont,
      padding: 16,
    }}>
      <section ref={panelRef} style={{
        position: "relative", zIndex: 1,
        width: "min(100%, 560px)",
        maxHeight: "min(calc(100dvh - 32px), 720px)",
        borderRadius: 24,
        border: glassBorder,
        background: glassBg,
        boxShadow: 'rgba(255,255,255,0.04) 0px 0px 0px 1px inset, rgba(0,0,0,0.5) 0px 32px 100px',
        boxSizing: "border-box",
        padding: "clamp(20px, 4vw, 32px)",
        display: "grid",
        gap: "clamp(16px, 3vw, 22px)",
        overflowY: "auto",
        color: ink,
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: space[3] }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {[1, 2].map((step) => (
              <div key={step} style={{
                width: step === currentStep ? 20 : 6, height: 6, borderRadius: 3,
                background: step <= currentStep ? glassAccent : 'rgba(255,255,255,0.14)',
                transition: "width 220ms ease, background 220ms ease",
              }} />
            ))}
          </div>
          <button
            onClick={handleLaunch}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: mute, fontSize: 12, fontFamily: monoFont,
              textDecoration: "underline", textUnderlineOffset: 2,
              padding: 0,
            }}
          >
            Skip
          </button>
        </div>

        {/* Step 1: Welcome + scanner preferences */}
        {currentStep === 1 && (
          <div style={{ display: "grid", gap: space[4] }}>
            <div>
              <h1 style={{
                margin: 0, fontSize: "clamp(24px, 4.5vw, 34px)", lineHeight: 1.1,
                fontWeight: 650, color: ink,
              }}>
                Welcome to StockEx.
              </h1>
              <p style={{
                margin: `${space[2]} 0 0 0`, color: body,
                fontSize: 14, lineHeight: 1.55,
              }}>
                A research desk for the Philippine Stock Exchange. Tune how the scanner
                reads price action — you can change this anytime.
              </p>
            </div>

            <div style={{
              padding: space[4], borderRadius: radius.lg,
              background: glassBgLight, border: glassBorder,
              display: "grid", gap: space[3],
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: charcoal }}>Signal sensitivity</span>
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
                      background: config.bollingerSensitivity === level ? glassAccent : "transparent",
                      color: config.bollingerSensitivity === level ? "#fff" : body,
                      fontSize: 11, fontWeight: config.bollingerSensitivity === level ? 600 : 400,
                      transition: "all 160ms ease",
                      fontFamily: monoFont,
                    }}
                  >
                    {level === "low" ? "Wide" : level === "normal" ? "Standard" : "Tight"}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: "grid", gap: space[2] }}>
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: space[3], borderRadius: radius.md,
                background: glassBgLight, border: glassBorder,
              }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: charcoal }}>Volume divergence flags</span>
                <button
                  onClick={() => setConfig((c) => ({ ...c, volumeDivergenceEnabled: !c.volumeDivergenceEnabled }))}
                  style={toggleStyle(config.volumeDivergenceEnabled)}
                >
                  <div style={toggleKnob(config.volumeDivergenceEnabled)} />
                </button>
              </div>

              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: space[3], borderRadius: radius.md,
                background: glassBgLight, border: glassBorder,
              }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: charcoal }}>MACD trend signals</span>
                <button
                  onClick={() => setConfig((c) => ({ ...c, macdEnabled: !c.macdEnabled }))}
                  style={toggleStyle(config.macdEnabled)}
                >
                  <div style={toggleKnob(config.macdEnabled)} />
                </button>
              </div>
            </div>

            <button onClick={handleNext} style={buttonStyle}>
              Continue <ArrowRight size={16} />
            </button>
          </div>
        )}

        {/* Step 2: Starting watchlist + launch */}
        {currentStep === 2 && (
          <div style={{ display: "grid", gap: space[4] }}>
            <div style={{
              display: "grid", gridTemplateColumns: "auto 1fr", gap: space[3], alignItems: "center",
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 14,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: glassBgIcon, border: glassBorderLight,
                color: glassAccent, flexShrink: 0,
              }}>
                <Sparkles size={20} />
              </div>
              <div>
                <h1 style={{ margin: 0, color: ink, fontSize: "clamp(22px, 4vw, 28px)", fontWeight: 650, lineHeight: 1.15 }}>
                  You're set. Here's your first watchlist.
                </h1>
                <p style={{ margin: "4px 0 0 0", color: body, fontSize: 13.5, lineHeight: 1.5 }}>
                  A focused starting list so your first view is useful right away.
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

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: space[2] }}>
              {[
                { icon: Search, label: "Scanner", desc: "Quality, growth & value screens" },
                { icon: TrendingUp, label: "Stock pages", desc: "Price, fundamentals, peers" },
                { icon: Wallet, label: "Watchlist", desc: "Live prices as they move" },
              ].map((item) => (
                <div key={item.label} style={{
                  display: "grid", gap: 6,
                  padding: space[3], borderRadius: radius.md,
                  background: glassBgLight, border: glassBorder,
                }}>
                  <item.icon size={16} style={{ color: glassAccent }} />
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: charcoal }}>{item.label}</span>
                  <span style={{ fontSize: 11, color: mute, lineHeight: 1.4 }}>{item.desc}</span>
                </div>
              ))}
            </div>

            <button onClick={handleLaunch} style={buttonStyle}>
              Launch StockEx <CheckCircle2 size={16} />
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
