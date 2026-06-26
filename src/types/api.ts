export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
  timestamp: Date;
}
