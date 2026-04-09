import type { Middleware } from "../compose.ts";
import type { TokenSigner } from "../../../domain/ports/services/token-signer.ts";
import { AuthError } from "../../../domain/errors/domain-errors.ts";

export function authMiddleware(tokenSigner: TokenSigner): Middleware {
  return async (req, ctx, next) => {
    const header = req.headers.get("authorization");
    const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) throw new AuthError("Missing authorization token");

    const claims = await tokenSigner.verifyAccess(token);
    if (!claims) throw new AuthError("Invalid or expired token");

    ctx.userId = claims.sub;
    return next();
  };
}
