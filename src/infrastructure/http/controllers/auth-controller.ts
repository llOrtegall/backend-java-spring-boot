import type { RouteHandler } from "../compose.ts";
import type { RegisterUser } from "../../../application/use-cases/auth/register-user.ts";
import type { LoginUser } from "../../../application/use-cases/auth/login-user.ts";
import type { RefreshSession } from "../../../application/use-cases/auth/refresh-session.ts";
import type { RevokeSession } from "../../../application/use-cases/auth/revoke-session.ts";
import type { GetCurrentUser } from "../../../application/use-cases/auth/get-current-user.ts";
import type { RequestEmailVerification } from "../../../application/use-cases/auth/request-email-verification.ts";
import type { ConfirmEmailVerification } from "../../../application/use-cases/auth/confirm-email-verification.ts";
import type { RequestPasswordReset } from "../../../application/use-cases/auth/request-password-reset.ts";
import type { ConfirmPasswordReset } from "../../../application/use-cases/auth/confirm-password-reset.ts";
import { validate } from "../validation/validate.ts";
import {
  RegisterSchema,
  LoginSchema,
  RefreshSchema,
  VerifyEmailSchema,
  RequestPasswordResetSchema,
  ConfirmPasswordResetSchema,
} from "../../../application/dtos/auth-dtos.ts";
import { AuthError } from "../../../domain/errors/domain-errors.ts";
import { env } from "../../config/env.ts";

interface Deps {
  registerUser: RegisterUser;
  loginUser: LoginUser;
  refreshSession: RefreshSession;
  revokeSession: RevokeSession;
  getCurrentUser: GetCurrentUser;
  requestEmailVerification: RequestEmailVerification;
  confirmEmailVerification: ConfirmEmailVerification;
  requestPasswordReset: RequestPasswordReset;
  confirmPasswordReset: ConfirmPasswordReset;
}

function getRefreshFromCookie(req: Request): string | null {
  const cookies = req.headers.get("cookie") ?? "";
  const match = cookies.match(/(?:^|;\s*)rt=([^;]+)/);
  return match?.[1]?.trim() ?? null;
}

function setRefreshCookie(res: Response, token: string): Response {
  const cookie = [
    `rt=${token}`,
    "HttpOnly",
    "Path=/api/v1/auth",
    "SameSite=Lax",
    `Max-Age=${env.REFRESH_TTL}`,
    ...(env.NODE_ENV === "production" ? ["Secure"] : []),
  ].join("; ");
  res.headers.append("Set-Cookie", cookie);
  return res;
}

function clearRefreshCookie(res: Response): Response {
  const cookie = [
    "rt=",
    "HttpOnly",
    "Path=/api/v1/auth",
    "SameSite=Lax",
    "Max-Age=0",
    ...(env.NODE_ENV === "production" ? ["Secure"] : []),
  ].join("; ");
  res.headers.append("Set-Cookie", cookie);
  return res;
}

function isWebClient(req: Request): boolean {
  return (
    req.headers.get("x-client-type") === "web" ||
    env.CORS_ORIGINS.some(o => req.headers.get("origin")?.startsWith(o))
  );
}

export class AuthController {
  constructor(private readonly deps: Deps) {}

  register: RouteHandler = async (req, _ctx) => {
    const body = validate(RegisterSchema, await req.json());
    const result = await this.deps.registerUser.execute({
      ...body,
      userAgent: req.headers.get("user-agent") ?? undefined,
    });
    const res = Response.json(result, { status: 201 });
    if (isWebClient(req)) setRefreshCookie(res, result.refreshToken);
    return res;
  };

  login: RouteHandler = async (req, _ctx) => {
    const body = validate(LoginSchema, await req.json());
    const result = await this.deps.loginUser.execute({
      ...body,
      userAgent: req.headers.get("user-agent") ?? undefined,
    });
    const res = Response.json(result);
    if (isWebClient(req)) setRefreshCookie(res, result.refreshToken);
    return res;
  };

  refresh: RouteHandler = async (req, _ctx) => {
    const cookieToken = getRefreshFromCookie(req);
    const body = await req.json().catch(() => ({}));
    const { refreshToken: bodyToken } = validate(RefreshSchema, body);

    const rawToken = cookieToken ?? bodyToken;
    if (!rawToken) throw new AuthError("Missing refresh token");

    const result = await this.deps.refreshSession.execute(rawToken, {
      userAgent: req.headers.get("user-agent") ?? undefined,
    });
    const res = Response.json(result);
    if (isWebClient(req)) setRefreshCookie(res, result.refreshToken);
    return res;
  };

  logout: RouteHandler = async (req, ctx) => {
    const cookieToken = getRefreshFromCookie(req);
    const body = await req.json().catch(() => ({}));
    const { refreshToken: bodyToken } = validate(RefreshSchema, body);

    const rawToken = cookieToken ?? bodyToken;
    if (rawToken) await this.deps.revokeSession.execute(rawToken);

    const res = new Response(null, { status: 204 });
    if (cookieToken) clearRefreshCookie(res);
    return res;
  };

  me: RouteHandler = async (_req, ctx) => {
    const user = await this.deps.getCurrentUser.execute(ctx.userId!);
    return Response.json({ user });
  };

  requestVerifyEmail: RouteHandler = async (_req, ctx) => {
    await this.deps.requestEmailVerification.execute(ctx.userId!);
    return new Response(null, { status: 204 });
  };

  confirmVerifyEmail: RouteHandler = async (req, _ctx) => {
    const { token } = validate(VerifyEmailSchema, await req.json());
    await this.deps.confirmEmailVerification.execute(token);
    return new Response(null, { status: 204 });
  };

  requestPasswordReset: RouteHandler = async (req, _ctx) => {
    const { email } = validate(RequestPasswordResetSchema, await req.json());
    await this.deps.requestPasswordReset.execute(email);
    return new Response(null, { status: 204 });
  };

  confirmPasswordReset: RouteHandler = async (req, _ctx) => {
    const { token, newPassword } = validate(ConfirmPasswordResetSchema, await req.json());
    await this.deps.confirmPasswordReset.execute(token, newPassword);
    return new Response(null, { status: 204 });
  };
}
