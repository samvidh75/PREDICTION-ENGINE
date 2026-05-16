import React, { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

export type ProgressiveDisclosureStep = {
  id: string;
  label: string;
  content: React.ReactNode;
};

type ProgressiveDisclosureProps = {
  front: React.ReactNode;
  steps: ProgressiveDisclosureStep[];

  /**
   * What step to show when expanded initially.
   * Defaults to 0.
   */
  initialStepIndex?: number;

  /**
   * Whether the disclosure starts expanded (auto-open).
   * Defaults to false.
   */
  initialOpen?: boolean;

  /**
   * Label for the CTA shown while collapsed.
   * Defaults to "Expand intelligence".
   */
  collapsedCtaLabel?: string;

  /**
   * Label for the CTA shown to close/collapse.
   * Defaults to "Collapse".
   */
  collapseCtaLabel?: string;

  className?: string;
  debugLabel?: string;
};

export default function ProgressiveDisclosure({
  front,
  steps,
  initialStepIndex = 0,
  initialOpen = false,
  collapsedCtaLabel = "Expand intelligence",
  collapseCtaLabel = "Collapse",
  className,
  debugLabel,
}: ProgressiveDisclosureProps): JSX.Element {
  const prefersReducedMotion = useReducedMotion();
  const safeInitial = Math.max(0, Math.min(initialStepIndex, Math.max(0, steps.length - 1)));

  const [isOpen, setIsOpen] = useState<boolean>(initialOpen);
  const [activeIdx, setActiveIdx] = useState<number>(safeInitial);

  const active = useMemo(() => {
    return steps[Math.max(0, Math.min(activeIdx, steps.length - 1))] ?? steps[0];
  }, [steps, activeIdx]);

  const toggleOpen = () => setIsOpen((v) => !v);

  return (
    <div className={className ?? ""} data-ss-progressive-disclosure={debugLabel ?? undefined}>
      <div>{front}</div>

      {!isOpen && (
        <div className="mt-4">
          <button
            type="button"
            onClick={toggleOpen}
            className="h-[44px] rounded-[999px] border border-white/10 bg-black/30 px-[18px] text-[11px] uppercase tracking-[0.18em] text-white/80 hover:text-white/95 transition ss-focus-outline"
          >
            {collapsedCtaLabel}
          </button>
        </div>
      )}

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="pd_open"
            initial={{ opacity: 0, y: 8, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: 6, filter: "blur(6px)" }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.35, ease: [0.22, 1, 0.36, 1] as const }}
          >
            <div className="mt-4 flex flex-wrap gap-2 items-center">
              {steps.map((s, idx) => {
                const active = idx === activeIdx;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setActiveIdx(idx)}
                    className={[
                      "h-[34px] rounded-full border px-[14px] text-[11px] uppercase tracking-[0.18em] transition ss-focus-outline",
                      active ? "border-white/20 bg-white/[0.05] text-white/90" : "border-white/10 bg-black/20 text-white/65 hover:text-white/85",
                    ].join(" ")}
                    aria-pressed={active}
                  >
                    {s.label}
                  </button>
                );
              })}
              <div className="ml-auto">
                <button
                  type="button"
                  onClick={toggleOpen}
                  className="h-[34px] rounded-full border border-white/10 bg-black/20 px-[14px] text-[11px] uppercase tracking-[0.18em] text-white/65 hover:text-white/85 transition ss-focus-outline"
                >
                  {collapseCtaLabel}
                </button>
              </div>
            </div>

            <div className="mt-4">{active?.content}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
