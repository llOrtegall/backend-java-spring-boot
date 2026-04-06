export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number; // Unix timestamp seconds
}

export interface RateLimiter {
  consume(key: string, max: number, windowSec: number): Promise<RateLimitResult>;
}
