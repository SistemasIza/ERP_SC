/**
 * Rate Limiter Service
 * Service for rate limiting requests
 */

import { RateLimitConfig, RateLimitResult } from './types/security.types';

export class RateLimiterService {
  private requests: Map<string, { count: number; resetTime: Date }> = new Map();

  /**
   * Check if request is allowed
   */
  checkLimit(identifier: string, config: RateLimitConfig): RateLimitResult {
    const now = new Date();
    const windowStart = new Date(now.getTime() - config.windowMs);
    
    let requestInfo = this.requests.get(identifier);
    
    // Clean up expired entries
    if (requestInfo && requestInfo.resetTime < now) {
      this.requests.delete(identifier);
      requestInfo = undefined;
    }
    
    if (!requestInfo) {
      requestInfo = {
        count: 0,
        resetTime: new Date(now.getTime() + config.windowMs),
      };
      this.requests.set(identifier, requestInfo);
    }
    
    requestInfo.count++;
    
    const remaining = Math.max(0, config.maxRequests - requestInfo.count);
    const success = remaining > 0;
    
    return {
      success,
      limit: config.maxRequests,
      remaining,
      resetTime: requestInfo.resetTime,
    };
  }

  /**
   * Reset rate limit for an identifier
   */
  resetLimit(identifier: string): void {
    this.requests.delete(identifier);
  }

  /**
   * Get current usage for an identifier
   */
  getUsage(identifier: string): { count: number; resetTime: Date } | undefined {
    return this.requests.get(identifier);
  }

  /**
   * Clean up expired entries
   */
  cleanup(): void {
    const now = new Date();
    for (const [identifier, info] of this.requests.entries()) {
      if (info.resetTime < now) {
        this.requests.delete(identifier);
      }
    }
  }
}
