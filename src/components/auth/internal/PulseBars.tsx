import React from "react";
import { motion, useReducedMotion } from "framer-motion";

export default function PulseBars({ active }: { active: boolean }): JSX.Element {
  const reduced = useReducedMotion();
  return (
    <div className="flex items-center gap-2" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-[8px] rounded-full bg-white/30"
          style={{ height: 8 }}
          animate={
            reduced || !active
              ? { height: 8, opacity: 0.6 }
              : {
                  height: [8, 18, 8],
                  opacity: [0.5, 1, 0.55],
                }
          }
          transition={{ duration: 0.9, repeat: active ? Infinity : 0, ease: [0.22, 1, 0.36, 1] }}
        />
      ))}
    </div>
  );
}
