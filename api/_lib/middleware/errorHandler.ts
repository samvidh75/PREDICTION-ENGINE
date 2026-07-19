/**
 * Error Handler Middleware
 * Comprehensive error handling and logging
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";

export interface APIError {
  status: number;
  message: string;
  details?: string;
  timestamp: string;
  requestId?: string;
}

export function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Safe error response that prevents information leakage
 */
export function handleError(
  res: VercelResponse,
  error: Error | string,
  statusCode: number = 500,
  requestId?: string
): APIError {
  const message = typeof error === "string" ? error : error.message;
  const details = typeof error === "string" ? undefined : error.stack;

  const response: APIError = {
    status: statusCode,
    message,
    details: process.env.NODE_ENV === "development" ? details : undefined,
    timestamp: new Date().toISOString(),
    requestId,
  };

  console.error(`[${requestId}] Error (${statusCode}):`, message, details);

  res.status(statusCode).json(response);
  return response;
}

/**
 * Wrapped handler that adds error handling
 */
export function withErrorHandling(
  handler: (req: VercelRequest, res: VercelResponse) => Promise<void>
) {
  return async (req: VercelRequest, res: VercelResponse) => {
    const requestId = generateRequestId();
    const startTime = Date.now();

    try {
      // Add request ID to response headers
      res.setHeader("X-Request-ID", requestId);

      await handler(req, res);

      // Log successful requests
      const duration = Date.now() - startTime;
      if (duration > 3000) {
        console.warn(`[${requestId}] Slow request: ${req.method} ${req.url} took ${duration}ms`);
      }
    } catch (error: any) {
      const statusCode = error.statusCode || error.status || 500;
      handleError(res, error, statusCode, requestId);
    }
  };
}

/**
 * Validation helper for required query parameters
 */
export function validateRequiredParams(
  req: VercelRequest,
  params: string[]
): string | null {
  for (const param of params) {
    if (!req.query[param]) {
      return `Missing required parameter: ${param}`;
    }
  }
  return null;
}

/**
 * Parse numeric query parameters safely
 */
export function parseNumber(value: any, defaultValue: number = 0): number {
  const num = Number(value);
  return Number.isNaN(num) ? defaultValue : num;
}

/**
 * Create a structured error
 */
export class APIException extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public details?: any
  ) {
    super(message);
    this.name = "APIException";
  }
}

/**
 * Common HTTP errors
 */
export const Errors = {
  BadRequest: (message: string) => new APIException(400, message),
  Unauthorized: (message: string = "Unauthorized") => new APIException(401, message),
  Forbidden: (message: string = "Forbidden") => new APIException(403, message),
  NotFound: (message: string = "Not found") => new APIException(404, message),
  Conflict: (message: string) => new APIException(409, message),
  RateLimited: (message: string = "Rate limit exceeded") => new APIException(429, message),
  ServerError: (message: string = "Internal server error") => new APIException(500, message),
};
