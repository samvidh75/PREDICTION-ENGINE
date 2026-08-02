import { Request, Response, NextFunction } from 'express';

interface RateLimitConfig {
  windowMs: number; // time window in milliseconds
  maxRequests: number; // max requests per window
}

interface ClientRateLimit {
  count: number;
  resetAt: number;
}

const defaultConfig: RateLimitConfig = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 60,
};

const clients = new Map<string, ClientRateLimit>();

export function rateLimit(maxRequests: number = 60, windowMs: number = 60000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientId = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();

    let clientData = clients.get(clientId);

    // Initialize or reset if window expired
    if (!clientData || now > clientData.resetAt) {
      clientData = {
        count: 0,
        resetAt: now + windowMs,
      };
    }

    clientData.count++;

    if (clientData.count > maxRequests) {
      clients.set(clientId, clientData);
      return res.status(429).json({
        error: 'Too many requests',
        retryAfter: Math.ceil((clientData.resetAt - now) / 1000),
      });
    }

    clients.set(clientId, clientData);

    // Add rate limit headers
    res.set({
      'X-RateLimit-Limit': maxRequests.toString(),
      'X-RateLimit-Remaining': (maxRequests - clientData.count).toString(),
      'X-RateLimit-Reset': clientData.resetAt.toString(),
    });

    next();
  };
}

// Cleanup old entries every minute
setInterval(() => {
  const now = Date.now();
  for (const [clientId, data] of clients.entries()) {
    if (now > data.resetAt) {
      clients.delete(clientId);
    }
  }
}, 60 * 1000);
