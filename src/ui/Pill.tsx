/**
 * Pill — toggleable filter pill / period tab
 *
 * Supports single-select with onChange, or uncontrolled via defaultActive.
 * Use for: timeframe toggles (1D/1W/1M/1Y), filter chips, category tabs.
 */

import { colors, radius } from "../design/tokens";

interface PillOption {
  value: string;
  label: string;
}

interface PillProps {
  options: PillOption[];
  /** Controlled active value */
  value?: string;
  /** Uncontrolled default */
  defaultValue?: string;
  onChange?: (value: string) => void;
  size?: "sm" | "md";
  variant?: "outline" | "filled";
}

import { useState } from "react";

export function Pill({
  options,
  value: controlledValue,
  defaultValue,
  onChange,
  size = "sm",
  variant = "outline",
}: PillProps) {
  const [internalValue, setInternalValue] = useState(defaultValue ?? options[0]?.value ?? "");
  const activeValue = controlledValue ?? internalValue;

  const handleClick = (value: string) => {
    if (controlledValue === undefined) setInternalValue(value);
    onChange?.(value);
  };

  const dims = size === "md"
    ? { height: 34, padX: 14, fontSize: 13 }
    : { height: 28, padX: 10, fontSize: 12 };

  const isOutline = variant === "outline";

  return (
    <div
      style={{
        display: "inline-flex",
        gap: 4,
        flexWrap: "wrap",
      }}
    >
      {options.map((opt) => {
        const isActive = opt.value === activeValue;
        return (
          <button
            key={opt.value}
            onClick={() => handleClick(opt.value)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              height: dims.height,
              padding: `0 ${dims.padX}px`,
              fontSize: dims.fontSize,
              fontWeight: isActive ? 600 : 500,
              fontFamily: "inherit",
              border: isOutline
                ? `1px solid ${isActive ? colors.primary : colors.border}`
                : "none",
              borderRadius: radius.md,
              background: isActive
                ? isOutline ? "transparent" : colors.primary
                : isOutline ? "transparent" : colors.bgSecondary,
              color: isActive
                ? isOutline ? colors.primary : "#fff"
                : colors.textSecondary,
              cursor: "pointer",
              transition: "all 0.15s ease",
              whiteSpace: "nowrap",
              lineHeight: 1,
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
