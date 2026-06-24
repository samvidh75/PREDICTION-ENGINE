import { UnifiedFeatureValue } from '../types';

export class FeatureVector {
  private features: Map<string, UnifiedFeatureValue>;

  constructor(features: UnifiedFeatureValue[]) {
    this.features = new Map();
    for (const fv of features) {
      this.features.set(fv.id, fv);
    }
  }

  get(id: string): UnifiedFeatureValue | undefined {
    return this.features.get(id);
  }

  getTransformed(id: string): number | null {
    const fv = this.features.get(id);
    if (!fv) return null;
    return fv.transformed;
  }

  getRaw(id: string): number | null {
    const fv = this.features.get(id);
    if (!fv) return null;
    return fv.raw;
  }

  has(id: string): boolean {
    return this.features.has(id);
  }

  getAll(): UnifiedFeatureValue[] {
    return Array.from(this.features.values());
  }

  getActive(): UnifiedFeatureValue[] {
    return Array.from(this.features.values()).filter(
      (fv) => fv.raw !== null || fv.transformed !== null
    );
  }

  getMissing(): string[] {
    const missing: string[] = [];
    for (const [id, fv] of this.features) {
      if (fv.raw === null) missing.push(id);
    }
    return missing;
  }

  getByFamily(family: string): UnifiedFeatureValue[] {
    return Array.from(this.features.values()).filter(
      (fv) => fv.id.startsWith(family.replace(/_/g, '_'))
    );
  }

  toJSON(): Record<string, unknown> {
    const obj: Record<string, unknown> = {};
    for (const [id, fv] of this.features) {
      obj[id] = {
        raw: fv.raw,
        transformed: fv.transformed,
        unit: fv.unit,
        freshness: fv.freshness,
        confidence: fv.confidence,
        isStale: fv.isStale,
      };
    }
    return obj;
  }

  getCompleteness(): number {
    const total = this.features.size;
    if (total === 0) return 0;
    const present = Array.from(this.features.values()).filter(
      (fv) => fv.raw !== null
    ).length;
    return Math.round((present / total) / 0.01);
  }

  getStaleCount(): number {
    return Array.from(this.features.values()).filter((fv) => fv.isStale).length;
  }
}
