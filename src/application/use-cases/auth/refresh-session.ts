import type { RefreshTokenRepository } from "../../../domain/ports/repositories/refresh-token-repository.ts";
import type { TokenSigner } from "../../../domain/ports/services/token-signer.ts";
import type { IdGenerator } from "../../../domain/ports/services/id-generator.ts";
import type { Clock } from "../../../domain/ports/services/clock.ts";
import type { RefreshToken } from "../../../domain/entities/refresh-token.ts";
import { AuthError } from "../../../domain/errors/domain-errors.ts";
import { sha256Sync } from "../../../infrastructure/crypto/sha256.ts";

interface Deps {
  refreshTokenRepo: RefreshTokenRepository;
  tokenSigner: TokenSigner;
  idGenerator: IdGenerator;
  clock: Clock;
  refreshTtlSec: number;
  refreshPepper: string;
  graceWindowSec: number;
}

export class RefreshSession {
  constructor(private readonly deps: Deps) {}

  async execute(
    rawToken: string,
    meta?: { userAgent?: string; ip?: string },
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const hash = sha256Sync(this.deps.refreshPepper + rawToken);
    const current = await this.deps.refreshTokenRepo.findByHash(hash);

    if (!current) throw new AuthError("Invalid refresh token");

    const now = this.deps.clock.now();

    if (current.revokedAt !== null) {
      // Already-rotated token replayed. Check grace window for mobile retry resilience.
      if (current.replacedById !== null && this.deps.graceWindowSec > 0) {
        const ageMs = now.getTime() - current.revokedAt.getTime();
        if (ageMs <= this.deps.graceWindowSec * 1000) {
          const replacement = await this.deps.refreshTokenRepo.findById(current.replacedById);
          if (replacement && !replacement.revokedAt && replacement.expiresAt > now) {
            return this.rotateToken(replacement, now, meta);
          }
        }
      }
      // Potential token theft — revoke entire family if the token was legitimately rotated
      if (current.replacedById !== null) {
        await this.deps.refreshTokenRepo.revokeFamily(current.familyId);
      }
      throw new AuthError("Invalid refresh token");
    }

    if (current.expiresAt < now) throw new AuthError("Refresh token expired");

    return this.rotateToken(current, now, meta);
  }

  private async rotateToken(
    current: RefreshToken,
    now: Date,
    meta?: { userAgent?: string; ip?: string },
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const { raw: newRaw, hash: newHash } = this.deps.tokenSigner.generateRefresh();
    const newId = this.deps.idGenerator.uuidv7();

    await this.deps.refreshTokenRepo.insert({
      id: newId,
      userId: current.userId,
      tokenHash: newHash,
      familyId: current.familyId,
      parentId: current.id,
      replacedById: null,
      userAgent: meta?.userAgent ?? current.userAgent,
      ip: meta?.ip ?? current.ip,
      expiresAt: new Date(now.getTime() + this.deps.refreshTtlSec * 1000),
      revokedAt: null,
    });

    await this.deps.refreshTokenRepo.markRevoked(current.id, newId);

    const accessToken = await this.deps.tokenSigner.signAccess({
      sub: current.userId,
      jti: this.deps.idGenerator.uuidv7(),
    });

    return { accessToken, refreshToken: newRaw };
  }
}
