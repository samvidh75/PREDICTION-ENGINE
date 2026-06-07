import React from 'react';
import { Healthometer } from './Healthometer';
import { ConfidenceMeter } from './ConfidenceMeter';
import { ValuationSignal } from './ValuationSignal';
import { MomentumSignal } from './MomentumSignal';
import { TelemetrySnapshot } from '../../types/stock';

interface TelemetryPanelProps {
  telemetry: TelemetrySnapshot;
}

export const TelemetryPanel: React.FC<TelemetryPanelProps> = ({ telemetry }) => {
  return (
    <div className="telemetry-panel-container flex flex-col gap-6 w-full">
      
      {/* Primary Healthometer Telemetry Card */}
      <div className="vos-card overflow-hidden">
        <Healthometer 
          score={telemetry.healthScore} 
          status={telemetry.healthStatus} 
        />
      </div>

      {/* 
        Unified 2 x 2 Grid on Desktop / Vertical Stack on Mobile (Step 8 Layout spec)
      */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        
        <div className="vos-card overflow-hidden">
          <ConfidenceMeter 
            score={telemetry.confidenceScore} 
            status={telemetry.confidenceStatus} 
          />
        </div>

        <div className="vos-card overflow-hidden">
          <ValuationSignal 
            score={telemetry.valuationScore} 
            status={telemetry.valuationStatus} 
          />
        </div>

        <div className="col-span-1 sm:col-span-2 vos-card overflow-hidden">
          <MomentumSignal 
            score={telemetry.momentumScore} 
            status={telemetry.momentumStatus} 
          />
        </div>

      </div>

    </div>
  );
};

export default TelemetryPanel;
