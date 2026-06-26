export interface ProviderConfig {
  name: string;
  baseUrl: string;
  apiKey?: string;
  timeout: number;
  retries: number;
}
