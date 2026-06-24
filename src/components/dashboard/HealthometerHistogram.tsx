// src/components/dashboard/HealthometerHistogram.tsx
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HealthMetric } from '../../types/healthometer';

interface Props {
  metrics: HealthMetric[];
}

export const HealthometerHistogram: React.FC<Props> = ({ metrics }) => {
  // Color mapping logic for the "22nd-century luxury" aesthetic
  const getStatusColor = (value: number) => {
    if (value > 80) return "#22d3ee"; // Cyan - Very Healthy
    if (value > 60) return "#38bdf8"; // Sky Blue - Healthy
    if (value > 40) return "#6B7280"; // Soft slate - Stable
    return "#e879f9";                 // Magenta - Weakening
  };

  return (
    <div className="grid gap-4 w-full p-6 bg-black/40 backdrop-blur-xl border border-white/5 rounded-2xl">
      <AnimatePresence>
        {metrics.map((metric) => (
          <div key={metric.id} className="space-y-1">
            <div className="flex justify-between text-xs font-medium text-white/60 uppercase tracking-widest">
              <span>{metric.label}</span>
              <span>{metric.value.toFixed(1)}%</span>
            </div>
            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${metric.value}%`, backgroundColor: getStatusColor(metric.value) }}
                transition={{ duration: 1.5, ease: "easeInOut" }}
                className="h-full rounded-full shadow-[0_0_10px_rgba(34,211,238,0.5)]"
              />
            </div>
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default HealthometerHistogram;
