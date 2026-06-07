import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useDeviceTierFlags } from "../hooks/useDeviceTier";
import { useMasterMotion } from "../components/motion/MasterMotionEngine";

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
   * Optional controlled active step index. When provided, the component
   * will sync its active step to this value.
   */
  activeStepIndex?: number;

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

  /**
   * Fires whenever the active step changes (including initial mount).
   */
  onActiveStepChange?: (step: ProgressiveDisclosureStep, index: number) => void;
};

export default function ProgressiveDisclosure({
  front,
  steps,
  initialStepIndex = 0,
  initialOpen = false,
  activeStepIndex,
  collapsedCtaLabel = "Expand intelligence",
  collapseCtaLabel = "Collapse",
  className,
  debugLabel,
  onActiveStepChange,
}: ProgressiveDisclosureProps): JSX.Element {
  const prefersReducedMotion = useReducedMotion();
  const { isMobile } = useDeviceTierFlags();
  const { signals } = useMasterMotion();
  const safeInitial = Math.max(0, Math.min(initialStepIndex, Math.max(0, steps.length - 1)));
  const durationSec = prefersReducedMotion ? 0.001 : 0.35 * signals.transitionDurationScale;

  const [isOpen, setIsOpen] = useState<boolean>(initialOpen);
  const [activeIdx, setActiveIdx] = useState<number>(safeInitial);

  const active = useMemo(() => {
    return steps[Math.max(0, Math.min(activeIdx, steps.length - 1))] ?? steps[0];
  }, [steps, activeIdx]);

  const toggleOpen = () => setIsOpen((v) => !v);

  useEffect(() => {
    if (activeStepIndex == null) return;
    const safe = Math.max(0, Math.min(activeStepIndex, Math.max(0, steps.length - 1)));
    setActiveIdx((prev) => (prev === safe ? prev : safe));
  }, [activeStepIndex, steps.length]);

  useEffect(() => {
    if (activeStepIndex != null) {
      const safe = Math.max(0, Math.min(activeStepIndex, Math.max(0, steps.length - 1)));
      if (safe !== activeIdx) return;
    }
    onActiveStepChange?.(active, activeIdx);
  }, [active, activeIdx, onActiveStepChange, activeStepIndex, steps.length]);

  return (
    <div className={className ?? ""} data-ss-progressive-disclosure={debugLabel ?? undefined}>
      <div>{front}</div>

      {!isOpen && (
        <div className="mt-4">
          <button
            type="button"
            onClick={toggleOpen}
            className="h-[44px] rounded-[999px] border border-white/10 bg-black/25 px-[18px] text-[10px] uppercase tracking-[0.22em] text-white/75 hover:text-white/95 transition ss-focus-outline"
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
            transition={{ duration: durationSec, ease: [0.22, 1, 0.36, 1] as const }}
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
                      "h-[34px] rounded-full border px-[14px] text-[10px] uppercase tracking-[0.22em] transition ss-focus-outline",
                      active ? "border-white/20 bg-white/[0.05] text-white/92" : "border-white/10 bg-black/20 text-white/65 hover:text-white/85",
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
                  className="h-[34px] rounded-full border border-white/10 bg-black/20 px-[14px] text-[10px] uppercase tracking-[0.22em] text-white/65 hover:text-white/85 transition ss-focus-outline"
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
