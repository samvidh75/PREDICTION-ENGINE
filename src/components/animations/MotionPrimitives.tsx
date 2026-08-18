/**
 * MotionPrimitives — shared Framer Motion building blocks for the ledger
 * design system: staggered data-card entrances, animated ticker flow,
 * and number-tick transitions for price/volume figures.
 */

import { useEffect, useRef, useState } from "react";
import { motion, useAnimationFrame, type Variants } from "framer-motion";

// ── Stagger container for grids of data cards ────────────────────────

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.045, delayChildren: 0.05 },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 380, damping: 32, mass: 0.6 },
  },
};

interface StaggerGridProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function StaggerGrid({ children, className, style }: StaggerGridProps) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  );
}

export function StaggerCard({
  children,
  style,
  className,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}) {
  return (
    <motion.div variants={staggerItem} style={style} className={className}>
      {children}
    </motion.div>
  );
}

// ── Animated number tick (for live price/volume figures) ─────────────

interface TickerNumberProps {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  positiveColor?: string;
  negativeColor?: string;
  neutralColor?: string;
  style?: React.CSSProperties;
}

export function TickerNumber({
  value,
  decimals = 2,
  prefix = "",
  suffix = "",
  positiveColor = "#1A7F37",
  negativeColor = "#D93025",
  neutralColor = "#0A0A0A",
  style,
}: TickerNumberProps) {
  const prevValue = useRef(value);
  const [flash, setFlash] = useState<"up" | "down" | null>(null);

  useEffect(() => {
    if (value > prevValue.current) setFlash("up");
    else if (value < prevValue.current) setFlash("down");
    prevValue.current = value;
    if (value !== prevValue.current) return;
  }, [value]);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 500);
    return () => clearTimeout(t);
  }, [flash]);

  const color = flash === "up" ? positiveColor : flash === "down" ? negativeColor : neutralColor;

  return (
    <motion.span
      key={value}
      initial={{ backgroundColor: flash ? (flash === "up" ? "rgba(26,127,55,0.14)" : "rgba(217,48,37,0.14)") : "transparent" }}
      animate={{ backgroundColor: "rgba(0,0,0,0)" }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      style={{
        fontFamily: "'IBM Plex Mono', monospace",
        color,
        transition: "color 0.3s ease",
        borderRadius: 2,
        padding: "0 2px",
        ...style,
      }}
    >
      {prefix}
      {value.toFixed(decimals)}
      {suffix}
    </motion.span>
  );
}

// ── Continuous ticker-tape marquee ────────────────────────────────────

interface TickerTapeItem {
  symbol: string;
  price: number;
  changePct: number;
}

interface TickerTapeProps {
  items: TickerTapeItem[];
  speed?: number; // px per second
}

export function TickerTape({ items, speed = 40 }: TickerTapeProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const offset = useRef(0);

  useAnimationFrame((_, delta) => {
    const track = trackRef.current;
    if (!track) return;
    offset.current -= (speed * delta) / 1000;
    const halfWidth = track.scrollWidth / 2;
    if (Math.abs(offset.current) >= halfWidth) offset.current = 0;
    track.style.transform = `translateX(${offset.current}px)`;
  });

  if (items.length === 0) return null;

  const renderRow = (keyPrefix: string) => (
    <div style={{ display: "flex", gap: 24 }}>
      {items.map((item, i) => (
        <div
          key={`${keyPrefix}-${item.symbol}-${i}`}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 12,
            whiteSpace: "nowrap",
          }}
        >
          <span style={{ color: "#0A0A0A", fontWeight: 600 }}>{item.symbol}</span>
          <span style={{ color: "#3A3A36" }}>{item.price.toFixed(2)}</span>
          <span style={{ color: item.changePct >= 0 ? "#1A7F37" : "#D93025" }}>
            {item.changePct >= 0 ? "+" : ""}
            {item.changePct.toFixed(2)}%
          </span>
        </div>
      ))}
    </div>
  );

  return (
    <div style={{ overflow: "hidden", width: "100%", background: "#F4F4EF", borderBottom: "1px solid #E8E8E3" }}>
      <div ref={trackRef} style={{ display: "flex", padding: "6px 0" }}>
        {renderRow("a")}
        {renderRow("b")}
      </div>
    </div>
  );
}

// ── Gauge fill (generic circular progress used for scores/sentiment) ──

interface GaugeFillProps {
  percent: number; // 0-100
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  label?: string;
}

export function GaugeFill({
  percent,
  size = 64,
  strokeWidth = 5,
  color = "#1A7F37",
  trackColor = "rgba(10,10,10,0.08)",
  label,
}: GaugeFillProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percent));

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={radius} stroke={trackColor} strokeWidth={strokeWidth} fill="none" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - (clamped / 100) * circumference }}
          transition={{ duration: 0.8, ease: [0.34, 1.56, 0.64, 1] }}
        />
      </svg>
      {label != null && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: size * 0.22,
            fontWeight: 600,
            color: "#0A0A0A",
          }}
        >
          {label}
        </div>
      )}
    </div>
  );
}
