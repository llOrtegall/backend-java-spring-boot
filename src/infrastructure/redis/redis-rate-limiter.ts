import type { RateLimiter, RateLimitResult } from "../../domain/ports/services/rate-limiter.ts";

type RedisClient = Bun.RedisClient;

export class RedisRateLimiter implements RateLimiter {
  constructor(private readonly redis: RedisClient) {}

  async consume(key: string, max: number, windowSec: number): Promise<RateLimitResult> {
    const now = Date.now();
    const windowMs = windowSec * 1000;
    const windowStart = now - windowMs;
    const resetAt = Math.ceil((now + windowMs) / 1000);

    const redisKey = `rl:${key}`;
    const member = `${now}:${Math.random()}`;

    // Remove expired entries, add current, count
    await this.redis.zremrangebyscore(redisKey, "-inf", windowStart);
    await this.redis.zadd(redisKey, now, member);
    await this.redis.pexpire(redisKey, windowMs * 2);

    const count = await this.redis.zcard(redisKey) as number;

    if (count > max) {
      return { allowed: false, remaining: 0, resetAt };
    }

    return { allowed: true, remaining: max - count, resetAt };
  }
}
