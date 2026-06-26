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
        background: "linear-gradient(135deg, rgba(255,184,28,0.08) 0%, rgba(45,212,191,0.04) 100%)",
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
          background: "linear-gradient(135deg, rgba(255,184,28,0.15) 0%, rgba(0,0,0,0.3) 100%)",
          border: "2px solid #FFB81C",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 40,
        }}>
          {"\uD83D\uDD12"}
        </div>

        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "white", marginBottom: 4 }}>
            Pro Feature
          </div>
          <div style={{ fontSize: 13, color: "#A0A0A0" }}>
            Unlock with StockStory Pro
          </div>
        </div>

        <button
          onClick={onUnlockClick}
          onMouseOver={e => (e.currentTarget.style.background = "#E6A817")}
          onMouseOut={e => (e.currentTarget.style.background = "#FFB81C")}
          style={{
            padding: "10px 20px",
            background: "#FFB81C",
            color: "#0F0F0F",
            border: "none",
            borderRadius: 8,
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
