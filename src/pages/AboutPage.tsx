import { useMemo, useState } from "react";
import { ArrowRight, BarChart3, CheckCircle2, Eye, Shield, Sparkles, Target, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BrandMark } from "../components/BrandMark";
import { useAuth } from "../context/AuthContext";
import { animation, colors, radius, space, typography } from "../design/tokens";
import { mapAuthError } from "../services/auth/authErrorMapper";
import { authService } from "../services/auth/authService";

const featureCards = [
  {
    icon: Sparkles,
    eyebrow: "Research flow",
    title: "Sharper company review",
    body: "Move from price action to thesis, financials, and what changed without jumping between tabs.",
  },
  {
    icon: TrendingUp,
    eyebrow: "Conviction",
    title: "Signals that stay readable",
    body: "Scanner presets, watchlists, and scorecards help you focus on the names that deserve a second look.",
  },
  {
    icon: Shield,
    eyebrow: "Discipline",
    title: "Built for repeatable review",
    body: "Track context, compare peers, and return to the same structure every time you reopen the workspace.",
  },
];

const valuePoints = [
  "Compare business quality, valuation context, and risk in one surface.",
  "Keep watchlists, research notes, and review history aligned.",
  "Turn market noise into a cleaner thesis workflow.",
];

export default function AboutPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const primaryLabel = useMemo(() => {
    if (loading) return "Checking session";
    if (user) return "Open workspace";
    if (signingIn) return "Signing in";
    return "Continue with Google";
  }, [loading, user, signingIn]);

  const handlePrimaryAction = async () => {
    if (user) {
      navigate("/", { replace: true });
      return;
    }

    setAuthError(null);
    setSigningIn(true);
    try {
      await authService.signInWithGoogle();
      navigate("/", { replace: true });
    } catch (error) {
      const message = mapAuthError(error);
      if (message.includes("popup blocked")) {
        try {
          await authService.beginGoogleRedirect();
          return;
        } catch (redirectError) {
          setAuthError(mapAuthError(redirectError));
        }
      } else {
        setAuthError(message);
      }
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: colors.canvas,
        color: colors.ink,
        fontFamily: typography.fontFamily,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: `
            radial-gradient(circle at 18% 18%, rgba(255,107,107,0.14), transparent 28%),
            radial-gradient(circle at 82% 14%, rgba(255,255,255,0.06), transparent 22%),
            radial-gradient(circle at 70% 72%, rgba(255,107,107,0.08), transparent 28%),
            linear-gradient(180deg, rgba(255,255,255,0.02), rgba(0,0,0,0))
          `,
          pointerEvents: "none",
        }}
      />

      <div style={{ position: "relative", maxWidth: 1240, margin: "0 auto", padding: "24px 20px 72px" }}>
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: space[4],
            marginBottom: "56px",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: space[3],
              padding: "10px 16px 10px 10px",
              border: `1px solid ${colors.hairlineStrong}`,
              borderRadius: radius.xl,
              background: "rgba(12,12,12,0.88)",
              backdropFilter: "blur(18px)",
              WebkitBackdropFilter: "blur(18px)",
            }}
          >
            <BrandMark size={48} />
            <div style={{ display: "grid", gap: 2 }}>
              <span style={{ fontSize: 18, fontWeight: 600, color: colors.ink }}>StockEx</span>
              <span style={{ fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: colors.mute }}>
                Premium Indian Equity Research
              </span>
            </div>
          </div>

          <button
            onClick={handlePrimaryAction}
            disabled={loading || signingIn}
            style={{
              minHeight: 48,
              padding: "0 18px",
              borderRadius: radius.full,
              border: `1px solid ${colors.hairlineStrong}`,
              background: "linear-gradient(135deg, rgba(255,255,255,0.14), rgba(255,255,255,0.05))",
              color: colors.ink,
              fontSize: 14,
              fontWeight: 600,
              cursor: loading || signingIn ? "default" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
            }}
          >
            {primaryLabel}
            <ArrowRight size={16} />
          </button>
        </header>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.08fr) minmax(320px, 0.92fr)",
            gap: "28px",
            alignItems: "stretch",
          }}
          className="stockex-about-hero"
        >
          <div
            style={{
              position: "relative",
              padding: "40px clamp(24px, 4vw, 48px)",
              borderRadius: 32,
              border: `1px solid ${colors.hairlineStrong}`,
              background: "linear-gradient(180deg, rgba(18,18,18,0.92), rgba(8,8,8,0.96))",
              backdropFilter: "blur(18px)",
              WebkitBackdropFilter: "blur(18px)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: "auto -12% 32% 18%",
                height: 180,
                background: "linear-gradient(90deg, rgba(255,107,107,0.22), rgba(255,107,107,0.02))",
                transform: "rotate(-6deg)",
                filter: "blur(18px)",
                pointerEvents: "none",
              }}
            />
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 14px",
                borderRadius: radius.full,
                border: `1px solid ${colors.accentRedSoft}`,
                background: "rgba(255,107,107,0.08)",
                color: colors.accentRed,
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 24,
              }}
            >
              <Sparkles size={14} />
              AI-powered stock research
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: "clamp(48px, 7vw, 92px)",
                lineHeight: 0.94,
                letterSpacing: "-0.05em",
                fontWeight: 650,
                maxWidth: 760,
              }}
            >
              Understand the stock
              <br />
              <span style={{ color: colors.accentRed }}>before you invest.</span>
            </h1>

            <p
              style={{
                margin: "24px 0 0",
                maxWidth: 620,
                color: colors.charcoal,
                fontSize: "clamp(16px, 2vw, 20px)",
                lineHeight: 1.65,
              }}
            >
              StockEx brings scanner workflows, business context, scorecards, and thesis review into one
              refined workspace for Indian equities.
            </p>

            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 28 }}>
              <button
                onClick={handlePrimaryAction}
                disabled={loading || signingIn}
                style={{
                  minHeight: 54,
                  padding: "0 22px",
                  borderRadius: radius.full,
                  border: "none",
                  background: colors.primary,
                  color: colors.onPrimary,
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: loading || signingIn ? "default" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                {primaryLabel}
                <ArrowRight size={17} />
              </button>
              <button
                onClick={() => navigate("/about")}
                style={{
                  minHeight: 54,
                  padding: "0 22px",
                  borderRadius: radius.full,
                  border: `1px solid ${colors.hairlineStrong}`,
                  background: "rgba(255,255,255,0.04)",
                  color: colors.ink,
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Explore the product
              </button>
            </div>

            {authError ? (
              <p style={{ margin: "16px 0 0", color: colors.accentRed, fontSize: 13, lineHeight: 1.5 }}>
                {authError}
              </p>
            ) : null}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: 12,
                marginTop: 32,
              }}
              className="stockex-about-proof"
            >
              {[
                { label: "Research flows", value: "Cleaner" },
                { label: "Review speed", value: "Faster" },
                { label: "Workspace feel", value: "Focused" },
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    padding: "16px 16px 18px",
                    borderRadius: 20,
                    border: `1px solid ${colors.hairline}`,
                    background: "rgba(255,255,255,0.03)",
                  }}
                >
                  <div style={{ color: colors.ink, fontSize: 28, fontWeight: 650, letterSpacing: "-0.03em" }}>
                    {item.value}
                  </div>
                  <div style={{ color: colors.mute, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.12em", marginTop: 6 }}>
                    {item.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gap: 18,
            }}
          >
            <div
              style={{
                padding: "24px 24px 22px",
                borderRadius: 28,
                border: `1px solid ${colors.hairlineStrong}`,
                background: "linear-gradient(180deg, rgba(15,15,15,0.88), rgba(8,8,8,0.94))",
                minHeight: 250,
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  right: -40,
                  top: -30,
                  width: 180,
                  height: 180,
                  borderRadius: "50%",
                  background: "radial-gradient(circle, rgba(255,107,107,0.22), transparent 70%)",
                  pointerEvents: "none",
                }}
              />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
                <div>
                  <div style={{ color: colors.mute, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.12em" }}>
                    Preview
                  </div>
                  <div style={{ color: colors.ink, fontSize: 22, fontWeight: 600, marginTop: 6 }}>
                    One workspace for signals and thesis
                  </div>
                </div>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 16,
                    display: "grid",
                    placeItems: "center",
                    background: "rgba(255,255,255,0.05)",
                    border: `1px solid ${colors.hairlineStrong}`,
                  }}
                >
                  <Eye size={20} color={colors.ink} />
                </div>
              </div>

              <div style={{ display: "grid", gap: 12 }}>
                {valuePoints.map((point, index) => (
                  <div
                    key={point}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "12px 14px",
                      borderRadius: 18,
                      background: "rgba(255,255,255,0.03)",
                      border: `1px solid ${colors.hairline}`,
                      animation: `stockexPulse 4s ease-in-out ${index * 0.3}s infinite`,
                    }}
                  >
                    <CheckCircle2 size={16} color={colors.accentRed} />
                    <span style={{ color: colors.charcoal, fontSize: 14, lineHeight: 1.55 }}>{point}</span>
                  </div>
                ))}
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gap: 16,
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              }}
              className="stockex-about-features"
            >
              {featureCards.map((card, index) => (
                <article
                  key={card.title}
                  style={{
                    padding: "20px 18px",
                    borderRadius: 24,
                    border: `1px solid ${colors.hairline}`,
                    background: "rgba(255,255,255,0.03)",
                    minHeight: 220,
                    animation: `stockexFloat 8s ease-in-out ${index * 0.45}s infinite`,
                  }}
                >
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 16,
                      display: "grid",
                      placeItems: "center",
                      background: "rgba(255,255,255,0.05)",
                      border: `1px solid ${colors.hairlineStrong}`,
                      marginBottom: 16,
                    }}
                  >
                    <card.icon size={18} color={colors.ink} />
                  </div>
                  <div style={{ color: colors.mute, fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 10 }}>
                    {card.eyebrow}
                  </div>
                  <h2 style={{ margin: 0, fontSize: 21, lineHeight: 1.15, color: colors.ink, fontWeight: 600 }}>
                    {card.title}
                  </h2>
                  <p style={{ margin: "12px 0 0", color: colors.body, fontSize: 14, lineHeight: 1.65 }}>
                    {card.body}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          style={{
            marginTop: "56px",
            padding: "26px 24px",
            borderRadius: 30,
            border: `1px solid ${colors.hairline}`,
            background: "rgba(255,255,255,0.03)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 20,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={{ color: colors.mute, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.14em" }}>
              StockEx positioning
            </div>
            <div style={{ color: colors.ink, fontSize: "clamp(26px, 4vw, 40px)", lineHeight: 1.05, fontWeight: 620, marginTop: 8 }}>
              Premium research infrastructure for Indian equities.
            </div>
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {[
              { icon: Target, label: "Research-first" },
              { icon: BarChart3, label: "Signal-aware" },
              { icon: Shield, label: "Risk-conscious" },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  minHeight: 46,
                  padding: "0 16px",
                  borderRadius: radius.full,
                  border: `1px solid ${colors.hairlineStrong}`,
                  background: "rgba(255,255,255,0.04)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10,
                  color: colors.charcoal,
                  fontSize: 14,
                  fontWeight: 500,
                }}
              >
                <item.icon size={16} color={colors.ink} />
                {item.label}
              </div>
            ))}
          </div>
        </section>

        <footer
          style={{
            marginTop: "28px",
            padding: "14px 4px 0",
            color: colors.mute,
            fontSize: 12,
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <span>StockEx</span>
          <span>Google sign-in unlocks the full research workspace.</span>
        </footer>
      </div>

      <style>{`
        @keyframes stockexFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }

        @keyframes stockexPulse {
          0%, 100% { border-color: rgba(255,255,255,0.06); }
          50% { border-color: rgba(255,107,107,0.18); }
        }

        @media (max-width: 980px) {
          .stockex-about-hero {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 820px) {
          .stockex-about-features {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 640px) {
          .stockex-about-proof {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
