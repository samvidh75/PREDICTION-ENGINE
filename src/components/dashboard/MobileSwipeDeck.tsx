import React, { useMemo, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

type DeckPage = {
  id: string;
  title?: string;
  content: React.ReactNode;
};

type MobileSwipeDeckProps = {
  debugLabel?: string;
  pages: DeckPage[];
  initialIndex?: number;
  disableSwipe?: boolean;
};

function clampInt(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;

  return Math.max(min, Math.min(max, Math.round(n)));
}

export default function MobileSwipeDeck({
  debugLabel,
  pages,
  initialIndex = 0,
  disableSwipe = false,
}: MobileSwipeDeckProps): JSX.Element {
  const prefersReducedMotion = useReducedMotion();

  const maxIdx = Math.max(0, pages.length - 1);

  const [activeIndex, setActiveIndex] = useState<number>(() =>
    clampInt(initialIndex, 0, maxIdx),
  );

  const gestureStartRef = useRef<{ x: number; y: number } | null>(null);

  const active = pages[activeIndex];

  const dots = useMemo(() => {
    if (pages.length <= 1) return null;

    return (
      <div className="mt-4 flex items-center justify-center gap-2" aria-hidden="true">
        {pages.map((p, idx) => {
          const isActive = idx === activeIndex;

          return (
            <div
              key={p.id}
              className={[
                "rounded-full border transition-all duration-300",
                isActive
                  ? "h-[7px] w-[26px] border-cyan-300/30 bg-cyan-200/80"
                  : "h-[7px] w-[7px] border-white/10 bg-white/15",
              ].join(" ")}
            />
          );
        })}
      </div>
    );
  }, [activeIndex, pages]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (disableSwipe) return;

    gestureStartRef.current = {
      x: e.clientX,
      y: e.clientY,
    };
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (disableSwipe) return;

    const start = gestureStartRef.current;

    gestureStartRef.current = null;

    if (!start) return;

    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;

    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    const thresholdX = 60;

    if (absX < thresholdX) return;
    if (absX < absY) return;

    if (dx < 0) {
      setActiveIndex((prev) => Math.min(maxIdx, prev + 1));
    } else {
      setActiveIndex((prev) => Math.max(0, prev - 1));
    }
  };

  return (
    <div data-ss-mobile-swipe-deck={debugLabel ?? undefined}>
      <div
        className="overflow-hidden rounded-[32px] border border-white/10 bg-[#050607]/90 shadow-[0_0_80px_rgba(0,0,0,0.42)] backdrop-blur-2xl"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        style={{
          touchAction: "pan-y",
        }}
      >
        <div className="border-b border-white/5 px-5 py-4">
          {active?.title ? (
            <div className="text-[11px] uppercase tracking-[0.22em] text-cyan-200/70">
              {active.title}
            </div>
          ) : null}
        </div>

        <div className="p-5">
          {active?.content}
        </div>

        <div className="px-5 pb-5">
          {dots}
        </div>
      </div>

      {!prefersReducedMotion && pages.length > 1 ? (
        <div className="mt-3 text-center text-[11px] uppercase tracking-[0.18em] text-white/35">
          Swipe between dashboard modules
        </div>
      ) : null}
    </div>
  );
}
