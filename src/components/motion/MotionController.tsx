import React, { createContext, useContext, useEffect, useMemo } from "react";
import { MotionValue, useMotionValue, useReducedMotion, useSpring } from "framer-motion";
import { useMediaQuery } from "../../hooks/useMediaQuery";

type MotionControllerValue = {
  mouseX: MotionValue<number>;
  mouseY: MotionValue<number>;
  scrollProgress: MotionValue<number>;
  isCoarsePointer: boolean;
  isMobile: boolean;
};

const MotionControllerContext = createContext<MotionControllerValue | null>(null);

export function useMotionController(): MotionControllerValue {
  const ctx = useContext(MotionControllerContext);
  if (!ctx) throw new Error("useMotionController must be used within <MotionController />");
  return ctx;
}

function getDebugMobile(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get("debugMobile") === "1";
  } catch {
    return false;
  }
}

export default function MotionController({ children }: { children: React.ReactNode }): JSX.Element {
  const prefersReducedMotion = useReducedMotion();
  const isCoarsePointer = useMediaQuery("(pointer: coarse)");
  const isMobileFromMediaQuery = useMediaQuery("(max-width: 639px)");
  const isMobileDebug = getDebugMobile();

  const isMobile = isMobileFromMediaQuery || isMobileDebug;

  const rawMouseX = useMotionValue(0);
  const rawMouseY = useMotionValue(0);

  const rawScroll = useMotionValue(0);

  // Spring to keep motion calm/expensive-safe (no re-render)
  const mouseX = useSpring(rawMouseX, { stiffness: 140, damping: 22, mass: 0.8 });
  const mouseY = useSpring(rawMouseY, { stiffness: 140, damping: 22, mass: 0.8 });
  const scrollProgress = useSpring(rawScroll, { stiffness: 90, damping: 18, mass: 0.9 });

  useEffect(() => {
    if (prefersReducedMotion) return;

    let raf = 0;

    const handleMove = (ev: PointerEvent) => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        const w = window.innerWidth || 1;
        const h = window.innerHeight || 1;
        const nx = (ev.clientX / w) * 2 - 1; // -1..1
        const ny = (ev.clientY / h) * 2 - 1;

        // Clamp to keep parallax restrained
        rawMouseX.set(Math.max(-1, Math.min(1, nx)));
        rawMouseY.set(Math.max(-1, Math.min(1, ny)));
      });
    };

    const handleScroll = () => {
      const doc = document.documentElement;
      const max = Math.max(1, doc.scrollHeight - doc.clientHeight);
      const p = doc.scrollTop / max; // 0..1
      rawScroll.set(Math.max(0, Math.min(1, p)));
    };

    window.addEventListener("pointermove", handleMove, { passive: true });
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("scroll", handleScroll);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [prefersReducedMotion, rawMouseX, rawMouseY, rawScroll]);

  const value = useMemo(
    () => ({
      mouseX,
      mouseY,
      scrollProgress,
      isCoarsePointer,
      isMobile,
    }),
    [mouseX, mouseY, scrollProgress, isCoarsePointer, isMobile],
  );

  return <MotionControllerContext.Provider value={value}>{children}</MotionControllerContext.Provider>;
}
