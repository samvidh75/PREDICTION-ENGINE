export type LLMGatewayMode = 'deterministic' | 'disabled' | 'mock';

export interface LLMGatewayConfig {
  mode: LLMGatewayMode;
}

let currentConfig: LLMGatewayConfig = {
  mode: (process.env.LLM_GATEWAY_MODE as LLMGatewayMode) || 'deterministic',
};

export function getLLMGatewayConfig(): LLMGatewayConfig {
  return { ...currentConfig };
}

export function setLLMGatewayConfig(config: Partial<LLMGatewayConfig>): void {
  currentConfig = { ...currentConfig, ...config };
}
