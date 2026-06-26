import type { Request, Response, NextFunction } from 'express';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  console.error('[API Error]', err.message);
  res.status(500).json({
    success: false,
    error: { code: 'SERVER_ERROR', message: err.message },
    timestamp: new Date(),
  });
}
