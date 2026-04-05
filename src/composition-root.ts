import { env } from "./infrastructure/config/env.ts";
import { logger } from "./infrastructure/logging/logger.ts";
import { sql } from "./infrastructure/db/client.ts";

import { JoseTokenSigner } from "./infrastructure/jwt/jose-token-signer.ts";
import { BunPasswordHasher } from "./infrastructure/crypto/bun-password-hasher.ts";
import { ConsoleEmailSender } from "./infrastructure/email/console-email-sender.ts";
import { SystemClock } from "./infrastructure/services/system-clock.ts";
import { SystemIdGenerator } from "./infrastructure/services/system-id-generator.ts";
import { InMemoryRateLimiter } from "./infrastructure/rate-limiter/in-memory-rate-limiter.ts";

import { PgUserRepository } from "./infrastructure/db/repositories/pg-user-repository.ts";
import { PgRefreshTokenRepository } from "./infrastructure/db/repositories/pg-refresh-token-repository.ts";
import { PgEmailTokenRepository } from "./infrastructure/db/repositories/pg-email-token-repository.ts";

import { RegisterUser } from "./application/use-cases/auth/register-user.ts";
import { LoginUser } from "./application/use-cases/auth/login-user.ts";
import { RefreshSession } from "./application/use-cases/auth/refresh-session.ts";
import { RevokeSession } from "./application/use-cases/auth/revoke-session.ts";
import { GetCurrentUser } from "./application/use-cases/auth/get-current-user.ts";
import { RequestEmailVerification } from "./application/use-cases/auth/request-email-verification.ts";
import { ConfirmEmailVerification } from "./application/use-cases/auth/confirm-email-verification.ts";
import { RequestPasswordReset } from "./application/use-cases/auth/request-password-reset.ts";
import { ConfirmPasswordReset } from "./application/use-cases/auth/confirm-password-reset.ts";

import { AuthController } from "./infrastructure/http/controllers/auth-controller.ts";
import type { TokenSigner } from "./domain/ports/services/token-signer.ts";
import type { RateLimiter } from "./domain/ports/services/rate-limiter.ts";

export interface AppContext {
  auth: AuthController;
  tokenSigner: TokenSigner;
  rateLimiter: RateLimiter;
}

export function buildApp(): AppContext {
  const tokenSigner = new JoseTokenSigner({
    accessSecret: env.JWT_ACCESS_SECRET,
    accessTtlSec: env.ACCESS_TTL,
    refreshPepper: env.JWT_REFRESH_PEPPER,
  });
  const passwordHasher = new BunPasswordHasher();
  const emailSender = new ConsoleEmailSender(logger);
  const clock = new SystemClock();
  const idGenerator = new SystemIdGenerator();
  const rateLimiter = new InMemoryRateLimiter();

  const userRepo = new PgUserRepository(sql);
  const refreshTokenRepo = new PgRefreshTokenRepository(sql);
  const emailTokenRepo = new PgEmailTokenRepository(sql);

  const sessionDeps = {
    refreshTokenRepo,
    tokenSigner,
    idGenerator,
    clock,
    refreshTtlSec: env.REFRESH_TTL,
  };

  const registerUser = new RegisterUser({
    ...sessionDeps,
    userRepo,
    passwordHasher,
    emailTokenRepo,
    emailSender,
    emailVerifyUrlBase: env.EMAIL_VERIFY_URL_BASE,
  });

  const loginUser = new LoginUser({
    ...sessionDeps,
    userRepo,
    passwordHasher,
  });

  const refreshSession = new RefreshSession({
    refreshTokenRepo,
    tokenSigner,
    idGenerator,
    clock,
    refreshTtlSec: env.REFRESH_TTL,
    refreshPepper: env.JWT_REFRESH_PEPPER,
  });

  const revokeSession = new RevokeSession(refreshTokenRepo, env.JWT_REFRESH_PEPPER);
  const getCurrentUser = new GetCurrentUser(userRepo);

  const requestEmailVerification = new RequestEmailVerification({
    userRepo,
    emailTokenRepo,
    emailSender,
    idGenerator,
    clock,
    emailVerifyUrlBase: env.EMAIL_VERIFY_URL_BASE,
  });

  const confirmEmailVerification = new ConfirmEmailVerification(emailTokenRepo, userRepo, clock);

  const requestPasswordReset = new RequestPasswordReset({
    userRepo,
    emailTokenRepo,
    emailSender,
    idGenerator,
    clock,
    emailResetUrlBase: env.EMAIL_RESET_URL_BASE,
  });

  const confirmPasswordReset = new ConfirmPasswordReset({
    emailTokenRepo,
    userRepo,
    refreshTokenRepo,
    passwordHasher,
  });

  const auth = new AuthController({
    registerUser,
    loginUser,
    refreshSession,
    revokeSession,
    getCurrentUser,
    requestEmailVerification,
    confirmEmailVerification,
    requestPasswordReset,
    confirmPasswordReset,
  });

  return { auth, tokenSigner, rateLimiter };
}
