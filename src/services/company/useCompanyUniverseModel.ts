import { useMemo } from "react";
import { useConfidenceEngine } from "../../components/intelligence/ConfidenceEngine";
import { computeCompanyUniverseModel, type CompanyInputs } from "./companyUniverseEngine";
import type { CompanyUniverseModel } from "../../types/CompanyUniverse";
import { sanitizeCompanyUniverseModelStrings } from "../../lib/compliance/sanitizeIntelligenceStrings";

export function useCompanyUniverseModel(ticker: string): CompanyUniverseModel {
  const { narrativeKey } = useConfidenceEngine();

  const inputs = useMemo<CompanyInputs>(() => {
    return {
      ticker,
      narrativeKey,
      // deterministic “signalSeed” just to keep the model varied across sessions with same ticker
      signalSeed: (narrativeKey * 37) % 101,
    };
  }, [ticker, narrativeKey]);

  const model = useMemo(() => computeCompanyUniverseModel(inputs), [inputs]);

  // Enforce educational-only language at the model boundary (prevents any accidental “advisory” phrasing).
  const compliantModel = useMemo(() => {
    return sanitizeCompanyUniverseModelStrings(model, { level: "educational" });
  }, [model]);

  return compliantModel;
}
