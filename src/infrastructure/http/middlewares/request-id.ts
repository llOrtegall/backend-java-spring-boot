import type { Middleware } from "../compose.ts";

export const requestId: Middleware = async (req, ctx, next) => {
  const incoming = req.headers.get("x-request-id");
  ctx.requestId = incoming ?? ctx.requestId;
  const res = await next();
  res.headers.set("x-request-id", ctx.requestId);
  return res;
};
