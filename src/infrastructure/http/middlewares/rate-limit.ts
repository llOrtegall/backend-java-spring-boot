import type { Middleware } from "../compose.ts";
import type { RateLimiter } from "../../../domain/ports/services/rate-limiter.ts";
import { RateLimitError } from "../../../domain/errors/domain-errors.ts";

export function rateLimit(
  limiter: RateLimiter,
  key: string,
  max: number,
  windowSec: number,
): Middleware {
  return async (req, ctx, next) => {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      "unknown";
    const result = await limiter.consume(`${key}:${ip}`, max, windowSec);
    if (!result.allowed) {
      const retryAfter = Math.max(0, result.resetAt - Math.floor(Date.now() / 1000));
      throw new RateLimitError(retryAfter);
    }
    return next();
  };
}
