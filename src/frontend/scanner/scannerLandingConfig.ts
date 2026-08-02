export interface ScannerPresetConfig {
  id: string;
  label: string;
  description: string;
  scanType: string;
  icon?: string;
}

export const SCANNER_PRESETS: ScannerPresetConfig[] = [
  { id: "quality", label: "Quality Compounders", description: "High-return businesses with durable operating discipline.", scanType: "quality" },
  { id: "value", label: "Undervalued Opportunities", description: "Companies trading below their sector context.", scanType: "value" },
  { id: "momentum", label: "Momentum Leaders", description: "Strong price action with improving participation.", scanType: "momentum" },
  { id: "stable", label: "Low Risk", description: "Steadier balance sheets and calmer price behavior.", scanType: "stable" },
  { id: "growth", label: "Growth Stories", description: "Companies with strong revenue and earnings growth trends.", scanType: "growth" },
  { id: "high-risk", label: "High Risk / High Reward", description: "Speculative opportunities with elevated risk scores.", scanType: "high-risk" },
  { id: "dividend", label: "Dividend Yield", description: "Companies with consistent dividend payouts and yield.", scanType: "dividend" },
  { id: "turnaround", label: "Turnaround Candidates", description: "Companies showing early signs of operational recovery.", scanType: "turnaround" },
];

export function getScannerPreset(id: string): ScannerPresetConfig | undefined {
  return SCANNER_PRESETS.find((p) => p.id === id);
}
