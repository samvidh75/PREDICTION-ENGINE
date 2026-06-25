interface SignalLightProps {
  signal: "bullish" | "neutral" | "bearish" | null;
  size?: "sm" | "lg";
}

const configs = {
  bullish: {
    color: "#00FF88",
    glow: "0 0 8px #00FF88, 0 0 16px rgba(0,255,136,0.4)",
    label: "Bullish",
    bg: "rgba(0,255,136,0.1)",
  },
  neutral: {
    color: "#FFB800",
    glow: "0 0 8px #FFB800, 0 0 16px rgba(255,184,0,0.4)",
    label: "Neutral",
    bg: "rgba(255,184,0,0.1)",
  },
  bearish: {
    color: "#FF4444",
    glow: "0 0 8px #FF4444, 0 0 16px rgba(255,68,68,0.4)",
    label: "Bearish",
    bg: "rgba(255,68,68,0.1)",
  },
};

export default function SignalLight({ signal, size = "sm" }: SignalLightProps) {
  if (!signal) return <span className="text-[11px] text-[#bbb]">Signal unavailable</span>;
  const cfg = configs[signal];
  const dotSize = size === "lg" ? 10 : 7;

  return (
    <div
      className="inline-flex items-center gap-[7px] rounded-full"
      style={{
        background: cfg.bg,
        padding: size === "lg" ? "6px 14px" : "4px 10px",
      }}
    >
      <div
        className="animate-[pulse_2s_infinite] rounded-full"
        style={{ width: dotSize, height: dotSize, background: cfg.color, boxShadow: cfg.glow, flexShrink: 0 }}
      />
      <span
        style={{
          fontSize: size === "lg" ? 13 : 11,
          fontWeight: 700,
          color: cfg.color,
          letterSpacing: "0.02em",
        }}
      >
        {cfg.label}
      </span>
    </div>
  );
}
