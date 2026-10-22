import type { NextApiRequest, NextApiResponse } from 'next';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

// In-memory store for rate limiting (keyed by IP + route or custom key)
const ipRequestCounts = new Map<string, RateLimitRecord>();

// Periodic cleanup of expired entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    ipRequestCounts.forEach((record, key) => {
      if (now > record.resetTime) {
        ipRequestCounts.delete(key);
      }
    });
  }, 5 * 60 * 1000);
}

export interface RateLimitOptions {
  limit?: number;        // Maximum number of allowed requests in the time window
  windowMs?: number;     // Window duration in milliseconds (default: 60,000ms = 1 min)
  keyPrefix?: string;    // Scope/route identifier prefix
}

/**
 * Extracts client IP from request headers or socket address
 */
export function getClientIp(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0].trim();
  }
  return req.socket.remoteAddress || '127.0.0.1';
}

/**
 * Checks if the incoming request exceeds the configured rate limit.
 * If exceeded, automatically sends a HTTP 429 response and returns false.
 * If allowed, updates counters, sets rate-limit headers, and returns true.
 */
export function checkRateLimit(
  req: NextApiRequest,
  res: NextApiResponse,
  options: RateLimitOptions = {}
): boolean {
  const { limit = 60, windowMs = 60 * 1000, keyPrefix = 'api' } = options;
  const clientIp = getClientIp(req);
  const key = `${keyPrefix}:${clientIp}`;
  const now = Date.now();

  const currentRecord = ipRequestCounts.get(key);

  if (!currentRecord || now > currentRecord.resetTime) {
    // New window
    ipRequestCounts.set(key, {
      count: 1,
      resetTime: now + windowMs,
    });

    res.setHeader('X-RateLimit-Limit', limit);
    res.setHeader('X-RateLimit-Remaining', limit - 1);
    res.setHeader('X-RateLimit-Reset', Math.ceil((now + windowMs) / 1000));
    return true;
  }

  // Increment counter
  currentRecord.count += 1;

  if (currentRecord.count > limit) {
    const retryAfterSecs = Math.max(1, Math.ceil((currentRecord.resetTime - now) / 1000));
    res.setHeader('Retry-After', retryAfterSecs);
    res.setHeader('X-RateLimit-Limit', limit);
    res.setHeader('X-RateLimit-Remaining', 0);
    res.setHeader('X-RateLimit-Reset', Math.ceil(currentRecord.resetTime / 1000));

    res.status(429).json({
      success: false,
      error: `Too many requests from your IP. Please wait ${retryAfterSecs} seconds before trying again.`,
      retryAfterSeconds: retryAfterSecs,
    });
    return false;
  }

  res.setHeader('X-RateLimit-Limit', limit);
  res.setHeader('X-RateLimit-Remaining', Math.max(0, limit - currentRecord.count));
  res.setHeader('X-RateLimit-Reset', Math.ceil(currentRecord.resetTime / 1000));
  return true;
}
