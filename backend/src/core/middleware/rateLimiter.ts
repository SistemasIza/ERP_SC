import { Request, Response, NextFunction } from 'express';
import { cacheService } from '../../shared/services/cacheService';

interface RateLimitOptions {
  windowMs?: number; // Time window in milliseconds
  maxRequests?: number; // Maximum requests per window
  keyGenerator?: (req: Request) => string;
  skipSuccessfulRequests?: boolean;
  message?: string;
}

class RateLimiter {
  private options: RateLimitOptions;

  constructor(options: RateLimitOptions = {}) {
    this.options = {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 100,
      keyGenerator: (req) => this.getDefaultKey(req),
      skipSuccessfulRequests: false,
      message: 'Too many requests, please try again later',
      ...options
    };
  }

  private getDefaultKey(req: Request): string {
    const userId = req.headers['x-user-id'] as string;
    const orgId = req.headers['x-organization-id'] as string;
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    
    return `ratelimit:${orgId || 'no-org'}:${userId || ip}`;
  }

  private getKey(req: Request): string {
    if (this.options.keyGenerator) {
      return this.options.keyGenerator(req);
    }
    return this.getDefaultKey(req);
  }

  middleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const key = this.getKey(req);
        const cacheKey = `ratelimit:${key}`;
        
        // Get current request count
        const currentData = cacheService.get<{ count: number; resetTime: number }>(cacheKey);
        
        const now = Date.now();
        const windowStart = now - this.options.windowMs!;
        
        if (!currentData || currentData.resetTime < windowStart) {
          // Reset counter for new window
          cacheService.set(cacheKey, {
            count: 1,
            resetTime: now
          }, Math.ceil(this.options.windowMs! / 1000));
          
          // Add rate limit headers
          this.addRateLimitHeaders(res, 1, this.options.maxRequests!, now + this.options.windowMs!);
          
          return next();
        }

        // Check if limit exceeded
        if (currentData.count >= this.options.maxRequests!) {
          const resetTime = currentData.resetTime + this.options.windowMs!;
          const retryAfter = Math.ceil((resetTime - now) / 1000);
          
          return res.status(429).json({
            error: this.options.message,
            retryAfter,
            limit: this.options.maxRequests,
            remaining: 0,
            reset: new Date(resetTime).toISOString()
          });
        }

        // Increment counter
        const newCount = currentData.count + 1;
        cacheService.set(cacheKey, {
          count: newCount,
          resetTime: currentData.resetTime
        }, Math.ceil(this.options.windowMs! / 1000));

        // Add rate limit headers
        this.addRateLimitHeaders(res, newCount, this.options.maxRequests!, currentData.resetTime + this.options.windowMs!);

        next();
      } catch (error) {
        console.error('Rate limiter error:', error);
        // On error, allow request to proceed
        next();
      }
    };
  }

  private addRateLimitHeaders(res: Response, current: number, limit: number, resetTime: number): void {
    res.setHeader('X-RateLimit-Limit', limit.toString());
    res.setHeader('X-RateLimit-Remaining', Math.max(0, limit - current).toString());
    res.setHeader('X-RateLimit-Reset', new Date(resetTime).toISOString());
    res.setHeader('X-RateLimit-Current', current.toString());
  }

  // Reset rate limit for a specific key
  reset(key: string): void {
    const cacheKey = `ratelimit:${key}`;
    cacheService.delete(cacheKey);
  }

  // Get current rate limit status for a key
  getStatus(key: string): { count: number; limit: number; resetTime: number } | null {
    const cacheKey = `ratelimit:${key}`;
    const data = cacheService.get<{ count: number; resetTime: number }>(cacheKey);
    
    if (!data) return null;

    return {
      count: data.count,
      limit: this.options.maxRequests!,
      resetTime: data.resetTime + this.options.windowMs!
    };
  }
}

// Pre-configured rate limiters for different use cases
export const createRateLimiter = (options?: RateLimitOptions) => new RateLimiter(options);

// API rate limiter (100 requests per 15 minutes)
export const apiRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 100
});

// Strict rate limiter for sensitive operations (10 requests per 15 minutes)
export const strictRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 10,
  message: 'Too many attempts, please wait before trying again'
});

// Auth rate limiter (5 requests per 15 minutes)
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 5,
  message: 'Too many authentication attempts, please try again later'
});

// Webhook rate limiter (1000 requests per minute)
export const webhookRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 1000
});

export default RateLimiter;
