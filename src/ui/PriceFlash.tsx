import { useEffect, useState, useRef, type ReactNode } from "react";
import "../styles/raycast-animations.css";

interface PriceFlashProps {
  value: string | number;
  children: ReactNode;
  className?: string;
}

/**
 * PriceFlash wraps a value and triggers a 0.5s green flash
 * animation whenever the value prop changes.
 */
export function PriceFlash({ value, children, className = "" }: PriceFlashProps) {
  const prev = useRef(value);
  const [flashing, setFlashing] = useState(false);

  useEffect(() => {
    if (prev.current !== value) {
      prev.current = value;
      setFlashing(true);
      const timer = setTimeout(() => setFlashing(false), 500);
      return () => clearTimeout(timer);
    }
  }, [value]);

  return (
    <span
      className={`${className}${flashing ? " raycast-greenFlash" : ""}`}
      style={{ borderRadius: "4px", transition: "background-color 0.15s ease" }}
    >
      {children}
    </span>
  );
}
