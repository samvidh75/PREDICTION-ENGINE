/**
 * Pill — toggleable filter pill / period tab (Raycast pill-tab)
 *
 * Single-select with pill-tab / pill-tab-active styling.
 */

import { colors, radius } from "../design/tokens";
import { useState } from "react";

interface PillOption {
  value: string;
  label: string;
}

interface PillProps {
  options: PillOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  size?: "sm" | "md";
}

export function Pill({
  options,
  value: controlledValue,
  defaultValue,
  onChange,
  size = "sm",
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

  return (
    <div style={{ display: "inline-flex", gap: 4, flexWrap: "wrap" }}>
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
              fontWeight: 500,
              fontFamily: "inherit",
              border: `1px solid ${isActive ? "transparent" : colors.hairline}`,
              borderRadius: radius.md,
              background: isActive ? colors.surfaceElevated : "transparent",
              color: isActive ? colors.onDark : colors.mute,
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
