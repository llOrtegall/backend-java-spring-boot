import type { RefreshTokenRepository } from "../../../domain/ports/repositories/refresh-token-repository.ts";
import type { TokenSigner } from "../../../domain/ports/services/token-signer.ts";
import type { IdGenerator } from "../../../domain/ports/services/id-generator.ts";
import type { Clock } from "../../../domain/ports/services/clock.ts";

export interface SessionDeps {
  refreshTokenRepo: RefreshTokenRepository;
  tokenSigner: TokenSigner;
  idGenerator: IdGenerator;
  clock: Clock;
  refreshTtlSec: number;
}

export async function createSession(
  deps: SessionDeps,
  userId: string,
  meta?: { userAgent?: string; ip?: string },
): Promise<{ accessToken: string; refreshToken: string }> {
  const { raw, hash: tokenHash } = deps.tokenSigner.generateRefresh();
  const familyId = deps.idGenerator.uuidv7();
  const now = deps.clock.now();

  await deps.refreshTokenRepo.insert({
    id: deps.idGenerator.uuidv7(),
    userId,
    tokenHash,
    familyId,
    parentId: null,
    replacedById: null,
    userAgent: meta?.userAgent ?? null,
    ip: meta?.ip ?? null,
    expiresAt: new Date(now.getTime() + deps.refreshTtlSec * 1000),
    revokedAt: null,
  });

  const accessToken = await deps.tokenSigner.signAccess({
    sub: userId,
    jti: deps.idGenerator.uuidv7(),
  });

  return { accessToken, refreshToken: raw };
}
