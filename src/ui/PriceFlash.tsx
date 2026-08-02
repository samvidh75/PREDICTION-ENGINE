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
  const [flashClass, setFlashClass] = useState<"" | "raycast-greenFlash" | "raycast-redFlash">("");

  useEffect(() => {
    if (prev.current !== value) {
      const prevNum = typeof prev.current === "number" ? prev.current : parseFloat(String(prev.current));
      const nextNum = typeof value === "number" ? value : parseFloat(String(value));
      const isUp = !Number.isNaN(prevNum) && !Number.isNaN(nextNum) ? nextNum >= prevNum : true;
      prev.current = value;
      setFlashClass(isUp ? "raycast-greenFlash" : "raycast-redFlash");
      const timer = setTimeout(() => setFlashClass(""), 500);
      return () => clearTimeout(timer);
    }
  }, [value]);

  return (
    <span
      className={`${className}${flashClass ? ` ${flashClass}` : ""}`}
      style={{ borderRadius: "4px", transition: "background-color 0.15s ease" }}
    >
      {children}
    </span>
  );
}
