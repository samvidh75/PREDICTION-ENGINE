export interface FeatureFlagDef {
  key: string;
  envVar: string;
  defaultValue: boolean;
  description: string;
}

export type FeatureFlagSource = Record<string, string | undefined>;

export interface FeatureFlagsState {
  isEnabled: (key: string) => boolean;
  getAll: () => Record<string, boolean>;
  getFlag: (flag: FeatureFlagDef, source?: FeatureFlagSource) => boolean;
}
