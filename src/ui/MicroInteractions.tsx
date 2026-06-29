import { useRef, useState, useEffect, type ReactNode } from "react";
import { colors, shadows } from "../design/tokens";

/* =============================================================
   PART 3.2: MICRO-INTERACTIONS
   Raycast-style interactive components from blueprint spec
   ============================================================= */

// ── Interactive Button (scale press) ──────────────────────────
interface InteractiveButtonProps {
  children: ReactNode;
  onClick?: () => void;
  style?: React.CSSProperties;
  className?: string;
  disabled?: boolean;
  variant?: "primary" | "secondary";
}

export function InteractiveButton({
  children,
  onClick,
  style,
  className,
  disabled,
  variant = "primary",
}: InteractiveButtonProps) {
  const [isPressed, setIsPressed] = useState(false);

  const base: React.CSSProperties = {
    border: "none",
    borderRadius: "12px",
    padding: "10px 20px",
    fontSize: "14px",
    fontWeight: 600,
    cursor: disabled ? "not-allowed" : "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
  };

  const filled: React.CSSProperties = {
    ...base,
    background: colors.primary,
    color: colors.onPrimary,
  };

  const outline: React.CSSProperties = {
    ...base,
    background: "transparent",
    color: colors.primary,
    border: `1px solid ${colors.border}`,
  };

  return (
    <button
      className={className}
      onClick={onClick}
      disabled={disabled}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      style={{
        ...(variant === "primary" ? filled : outline),
        ...style,
        transform: isPressed ? "scale(0.97)" : "scale(1)",
        transition: "all 0.1s cubic-bezier(0.34, 1.56, 0.64, 1)",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  );
}

// ── Hover Card (elevate on hover) ─────────────────────────────
interface HoverCardProps {
  children: ReactNode;
  onClick?: () => void;
  cardStyle?: React.CSSProperties;
  className?: string;
  hoverColor?: string;
}

export function HoverCard({
  children,
  onClick,
  cardStyle,
  className,
  hoverColor,
}: HoverCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={className}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        background: isHovered ? hoverColor || colors.fill : colors.card,
        borderColor: isHovered ? `${colors.border}80` : colors.border,
        transform: isHovered ? "translateY(-2px)" : "translateY(0)",
        boxShadow: isHovered ? shadows.elevated : shadows.card,
        transition: "all 0.2s cubic-bezier(0.25, 0.1, 0.25, 1)",
        cursor: onClick ? "pointer" : "default",
        borderRadius: "8px",
        border: "1px solid",
        ...cardStyle,
      }}
    >
      {children}
    </div>
  );
}

// ── Animated Number Counter ───────────────────────────────────
interface AnimatedNumberProps {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  style?: React.CSSProperties;
  duration?: number;
}

export function AnimatedNumber({
  value,
  decimals = 0,
  prefix = "",
  suffix = "",
  style,
  duration = 30,
}: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const animationRef = useRef<number>();
  const prevValueRef = useRef(0);

  useEffect(() => {
    if (value === prevValueRef.current) return;
    const startValue = prevValueRef.current;
    const difference = value - startValue;
    let frame = 0;
    const totalFrames = duration;

    const animate = () => {
      frame++;
      const progress = Math.min(frame / totalFrames, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const newValue = startValue + difference * easeOut;

      setDisplayValue(parseFloat(newValue.toFixed(decimals)));

      if (frame < totalFrames) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    prevValueRef.current = value;
    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, decimals, duration]);

  return (
    <span style={style}>
      {prefix}
      {displayValue.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </span>
  );
}

// ── Expanding Detail Panel ────────────────────────────────────
interface ExpandingPanelProps {
  isOpen: boolean;
  children: ReactNode;
  maxHeight?: string;
  style?: React.CSSProperties;
}

export function ExpandingPanel({
  isOpen,
  children,
  maxHeight = "500px",
  style,
}: ExpandingPanelProps) {
  return (
    <div
      style={{
        maxHeight: isOpen ? maxHeight : "0px",
        opacity: isOpen ? 1 : 0,
        overflow: "hidden",
        transition: "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ── Smooth Scroll Hook ────────────────────────────────────────
export function useSmoothScroll() {
  return (elementId: string) => {
    const el = document.getElementById(elementId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };
}

// ── Staggered Entrance Container ──────────────────────────────
interface StaggerContainerProps {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  baseDelay?: number;
  staggerMs?: number;
  count?: number;
}

export function StaggerContainer({
  children,
  className,
  style,
  baseDelay = 0,
  staggerMs = 50,
  count,
}: StaggerContainerProps) {
  return (
    <div className={className} style={style}>
      {children}
    </div>
  );
}

// ── Metric Card with slide-up animation ───────────────────────
interface MetricCardProps {
  label: string;
  value: string | number;
  trend?: "up" | "down" | "neutral";
  subtitle?: string;
  index?: number;
  style?: React.CSSProperties;
}

export function MetricCard({
  label,
  value,
  trend,
  subtitle,
  index = 0,
  style,
}: MetricCardProps) {
  const animationName = `raycast-slideUp`;
  const delay = (index + 1) * 0.05;

  return (
    <div
      className={animationName}
      style={{
        animationDelay: `${delay}s`,
        animationFillMode: "both",
        padding: "12px",
        borderRadius: "8px",
        border: `1px solid ${colors.border}`,
        background: colors.card,
        ...style,
      }}
    >
      <div
        style={{
          fontSize: "12px",
          color: colors.textSecondary,
          fontWeight: 500,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: "18px",
          fontWeight: 700,
          marginTop: 4,
          color:
            trend === "up"
              ? colors.success
              : trend === "down"
                ? colors.danger
                : colors.textPrimary,
        }}
      >
        {value}
      </div>
      {subtitle && (
        <div
          style={{
            fontSize: "11px",
            color: colors.textTertiary,
            marginTop: 2,
          }}
        >
          {subtitle}
        </div>
      )}
    </div>
  );
}

// ── Skeleton Loading Shimmer ──────────────────────────────────
interface ShimmerProps {
  width?: string;
  height?: string;
  borderRadius?: string;
  style?: React.CSSProperties;
}

export function Shimmer({
  width = "100%",
  height = "16px",
  borderRadius = "6px",
  style,
}: ShimmerProps) {
  return (
    <div
      className="raycast-shimmer"
      style={{
        width,
        height,
        borderRadius,
        ...style,
      }}
    />
  );
}
