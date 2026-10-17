/**
 * JARVIS NEXUS - In-Memory Sliding Window Rate Limiter
 */

export interface RateLimitStatus {
  allowed: boolean;
  currentCount: number;
  remaining: number;
  resetAfterMs: number;
}

export class SimpleRateLimiter {
  private records = new Map<string, { count: number; resetAt: number }>();
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests = 60, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  check(key: string, now = Date.now()): RateLimitStatus {
    const record = this.records.get(key);

    if (!record || now >= record.resetAt) {
      this.records.set(key, { count: 1, resetAt: now + this.windowMs });
      return {
        allowed: true,
        currentCount: 1,
        remaining: this.maxRequests - 1,
        resetAfterMs: this.windowMs,
      };
    }

    if (record.count >= this.maxRequests) {
      return {
        allowed: false,
        currentCount: record.count,
        remaining: 0,
        resetAfterMs: Math.max(0, record.resetAt - now),
      };
    }

    record.count++;
    return {
      allowed: true,
      currentCount: record.count,
      remaining: this.maxRequests - record.count,
      resetAfterMs: Math.max(0, record.resetAt - now),
    };
  }

  reset(key?: string): void {
    if (key) {
      this.records.delete(key);
    } else {
      this.records.clear();
    }
  }
}
