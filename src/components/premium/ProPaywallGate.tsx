import { type ReactNode } from "react";

interface ProPaywallGateProps {
  isLocked: boolean;
  children: ReactNode;
  onUnlockClick: () => void;
}

export default function ProPaywallGate({ isLocked, children, onUnlockClick }: ProPaywallGateProps) {
  if (!isLocked) return <>{children}</>;

  return (
    <div style={{ position: "relative" }}>
      <div style={{ filter: "blur(6px)", pointerEvents: "none", userSelect: "none" }}>
        {children}
      </div>

      <div style={{
        position: "absolute",
        inset: 0,
        background: "var(--pro-gradient)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        borderRadius: "inherit",
      }}>
        <div style={{
          width: 80,
          height: 80,
          borderRadius: "50%",
          background: "linear-gradient(135deg, var(--brand-tint) 0%, rgba(0,0,0,0.05) 100%)",
          border: "2px solid var(--brand)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 40,
        }}>
          {"\uD83D\uDD12"}
        </div>

        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-900)", marginBottom: 4 }}>
            Pro Feature
          </div>
          <div style={{ fontSize: 13, color: "var(--text-500)" }}>
            Unlock with StockStory Pro
          </div>
        </div>

        <button
          onClick={onUnlockClick}
          onMouseOver={e => (e.currentTarget.style.background = "var(--brand-hover)")}
          onMouseOut={e => (e.currentTarget.style.background = "var(--brand)")}
          style={{
            padding: "10px 20px",
            background: "var(--brand)",
            color: "var(--text-inverse)",
            border: "none",
            borderRadius: "var(--r-pill)",
            fontSize: 14,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "var(--font)",
            display: "flex",
            alignItems: "center",
            gap: 6,
            transition: "background 100ms",
          }}
        >
          Join now \u2192
        </button>
      </div>
    </div>
  );
}
