import type { RateLimiter, RateLimitResult } from "../../domain/ports/services/rate-limiter.ts";

interface Window {
  count: number;
  resetAt: number; // Unix seconds
}

export class InMemoryRateLimiter implements RateLimiter {
  private readonly windows = new Map<string, Window>();

  async consume(key: string, max: number, windowSec: number): Promise<RateLimitResult> {
    const now = Math.floor(Date.now() / 1000);
    const win = this.windows.get(key);

    if (!win || now >= win.resetAt) {
      const resetAt = now + windowSec;
      this.windows.set(key, { count: 1, resetAt });
      return { allowed: true, remaining: max - 1, resetAt };
    }

    win.count++;
    if (win.count > max) {
      return { allowed: false, remaining: 0, resetAt: win.resetAt };
    }
    return { allowed: true, remaining: max - win.count, resetAt: win.resetAt };
  }
}
