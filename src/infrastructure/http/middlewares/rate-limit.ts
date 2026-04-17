import type { Middleware } from "../compose.ts";
import type { RateLimiter } from "../../../domain/ports/services/rate-limiter.ts";
import { RateLimitError } from "../../../domain/errors/domain-errors.ts";

interface RateLimitOptions {
  keyBy?: "ip" | "user";
}

export function rateLimit(
  limiter: RateLimiter,
  key: string,
  max: number,
  windowSec: number,
  options: RateLimitOptions = {},
): Middleware {
  return async (req, ctx, next) => {
    const { keyBy = "ip" } = options;

    let subject: string;
    if (keyBy === "user" && ctx.userId) {
      subject = ctx.userId;
    } else {
      subject =
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        req.headers.get("x-real-ip") ??
        "unknown";
    }

    const result = await limiter.consume(`${key}:${subject}`, max, windowSec);
    if (!result.allowed) {
      const retryAfter = Math.max(0, result.resetAt - Math.floor(Date.now() / 1000));
      throw new RateLimitError(retryAfter);
    }
    return next();
  };
}
