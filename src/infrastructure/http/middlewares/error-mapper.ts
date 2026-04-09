import type { Middleware } from "../compose.ts";
import {
  ValidationError,
  AuthError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  RateLimitError,
} from "../../../domain/errors/domain-errors.ts";
import { logger } from "../../logging/logger.ts";

export const errorMapper: Middleware = async (req, ctx, next) => {
  try {
    return await next();
  } catch (err) {
    if (err instanceof ValidationError)
      return Response.json({ error: err.message }, { status: 400 });
    if (err instanceof AuthError)
      return Response.json({ error: err.message }, { status: 401 });
    if (err instanceof ForbiddenError)
      return Response.json({ error: err.message }, { status: 403 });
    if (err instanceof NotFoundError)
      return Response.json({ error: err.message }, { status: 404 });
    if (err instanceof ConflictError)
      return Response.json({ error: err.message }, { status: 409 });
    if (err instanceof RateLimitError)
      return Response.json(
        { error: "Too many requests" },
        { status: 429, headers: { "Retry-After": String(err.retryAfter) } },
      );

    logger.error({ err, requestId: ctx.requestId }, "Unhandled error");
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
};
