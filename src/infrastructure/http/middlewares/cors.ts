import type { Middleware } from "../compose.ts";

export function cors(allowedOrigins: string[]): Middleware {
  return async (req, ctx, next) => {
    const origin = req.headers.get("origin") ?? "";
    const isAllowed = allowedOrigins.length === 0 || allowedOrigins.includes(origin);

    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: buildCorsHeaders(isAllowed ? origin : "", req),
      });
    }

    const res = await next();
    if (isAllowed) {
      for (const [k, v] of Object.entries(buildCorsHeaders(origin, req))) {
        res.headers.set(k, v);
      }
    }
    return res;
  };
}

function buildCorsHeaders(origin: string, req: Request): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers":
      req.headers.get("access-control-request-headers") ??
      "Content-Type,Authorization,X-Client-Type,X-Request-ID",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400",
  };
}
