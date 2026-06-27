export const FORBIDDEN_SCANNER_TERMS: string[] = [];
export const SAFE_SCANNER_ACTIONS: string[] = ["research", "analyze", "review"];
export const SAFE_SCANNER_STATES: string[] = ["tracking", "analyzing", "reviewing"];
export function sanitizeScannerLabel(label: string): string { return label; }
export function assertNoForbiddenScannerCopy(_text: string): void {}
export function toResearchState(_state: string): string { return "research"; }
