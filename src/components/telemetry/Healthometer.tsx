import React from 'react';
import { HealthStatus } from '../../types/stock';

interface HealthometerProps {
  score: number;
  status: HealthStatus;
}

export const Healthometer: React.FC<HealthometerProps> = ({ score, status }) => {
  // Visual mapping for health classification
  const statusColors = {
    veryHealthy: 'text-cyan-400 border-cyan-400',
    healthy: 'text-emerald-400 border-emerald-400',
    stable: 'text-amber-400 border-amber-400',
    weakening: 'text-orange-400 border-orange-400',
    unhealthy: 'text-rose-500 border-rose-500',
  };

  const statusLabels = {
    veryHealthy: 'Very Healthy',
    healthy: 'Healthy',
    stable: 'Stable',
    weakening: 'Weakening',
    unhealthy: 'Unhealthy',
  };

  return (
    <div className="p-6 font-vos-interface">
      <h3 className="vos-caption uppercase tracking-[0.2em] text-gray-500 mb-4 font-vos-interface">Market Health Assessment</h3>
      
      {/* Primary Classification */}
      <div className={`vos-co-name font-bold border-b border-white/10 pb-4 mb-4 ${statusColors[status] || 'text-cyan-400 border-cyan-400'} font-vos-display`}>
        {(statusLabels[status] || status).toUpperCase()}
      </div>

      {/* Telemetry Grid */}
      <div className="grid grid-cols-2 gap-4 vos-body font-vos-interface">
        <div>
          <span className="block text-gray-500 mb-1 text-[11px] uppercase tracking-wider">Health Score</span>
          <span className="text-white font-vos-display vos-sec-title">{score.toFixed(1)}/100</span>
        </div>
        <div>
          <span className="block text-gray-500 mb-1 text-[11px] uppercase tracking-wider">Operational Node</span>
          <span className="text-white font-vos-display vos-sec-title">ACTIVE</span>
        </div>
      </div>
    </div>
  );
};

export default Healthometer;
