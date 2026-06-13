import { UnifiedFeatureValue } from '../types';
import { FeatureDefinition } from '../features/FeatureRegistry';
import { FACTOR_GROUP_DEFINITIONS } from './FactorGroupScorer';

export interface MissingDataImpact {
  rejectedGroupIds: string[];
  confidenceReduction: number;
  unavailableFeatures: string[];
  warnings: string[];
}

export function evaluateMissingData(
  features: UnifiedFeatureValue[],
  definitions: FeatureDefinition[]
): MissingDataImpact {
  const rejectedGroupIds: string[] = [];
  const unavailableFeatures: string[] = [];
  const warnings: string[] = [];

  const defMap = new Map<string, FeatureDefinition>();
  for (const d of definitions) {
    defMap.set(d.id, d);
  }

  const featureMap = new Map<string, UnifiedFeatureValue>();
  for (const f of features) {
    featureMap.set(f.id, f);
  }

  for (const def of definitions) {
    const fv = featureMap.get(def.id);
    const isNull = fv === undefined || (fv.raw === null && fv.transformed === null);
    const isUnavailable = def.activationStatus === 'unavailable' || def.transform === 'unavailable';

    if (isUnavailable) {
      unavailableFeatures.push(def.id);
      continue;
    }

    if (isNull && def.nullPolicy === 'reject_group' && def.required) {
      if (!rejectedGroupIds.includes(def.factorGroup)) {
        rejectedGroupIds.push(def.factorGroup);
      }
      warnings.push(`Required feature "${def.id}" is missing — rejecting group "${def.factorGroup}"`);
    }

    if (isNull && def.nullPolicy === 'reject_group' && !def.required) {
      const groupDef = FACTOR_GROUP_DEFINITIONS.find((g) => g.group === def.factorGroup);
      if (groupDef) {
        const groupFeatures = groupDef.featureIds.filter((fid) => defMap.has(fid));
        const allGroupNull = groupFeatures.every((fid) => {
          const gv = featureMap.get(fid);
          return gv === undefined || (gv.raw === null && gv.transformed === null);
        });
        if (allGroupNull) {
          if (!rejectedGroupIds.includes(def.factorGroup)) {
            rejectedGroupIds.push(def.factorGroup);
          }
          warnings.push(`All features missing in non-required group "${def.factorGroup}" — rejecting group`);
        }
      }
    }
  }

  const totalGroupWeight = FACTOR_GROUP_DEFINITIONS.reduce(
    (sum, g) => sum + g.weight,
    0
  );
  const rejectedWeight = FACTOR_GROUP_DEFINITIONS.filter((g) =>
    rejectedGroupIds.includes(g.group)
  ).reduce((sum, g) => sum + g.weight, 0);

  const confidenceReduction = totalGroupWeight > 0
    ? Math.min(1, rejectedWeight / totalGroupWeight)
    : 0;

  return {
    rejectedGroupIds: Array.from(new Set(rejectedGroupIds)),
    confidenceReduction,
    unavailableFeatures,
    warnings,
  };
}
