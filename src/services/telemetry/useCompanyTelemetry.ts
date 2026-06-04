import { useMemo } from 'react';
import { CompanyTelemetry, TelemetrySnapshot } from '../../types/stock';
import { TelemetrySnapshotFactory } from './TelemetrySnapshotFactory';

/**
 * Custom hook to translate raw company telemetry into our standardized,
 * high-fidelity, and SEBI-safe TelemetrySnapshot shape.
 */
export function useCompanyTelemetry(
  company: CompanyTelemetry | null,
): TelemetrySnapshot | null {
  return useMemo(() => {
    if (!company) return null;
    try {
      return TelemetrySnapshotFactory.create(company);
    } catch (err) {
      console.error('Failed to synthesize telemetry snapshot:', err);
      return null;
    }
  }, [company]);
}

export default useCompanyTelemetry;
