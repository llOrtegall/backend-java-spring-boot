import type { RefreshTokenRepository } from "../../../domain/ports/repositories/refresh-token-repository.ts";
import { sha256Sync } from "../../../infrastructure/crypto/sha256.ts";

export class RevokeSession {
  constructor(
    private readonly refreshTokenRepo: RefreshTokenRepository,
    private readonly refreshPepper: string,
  ) {}

  async execute(rawToken: string): Promise<void> {
    const hash = sha256Sync(this.refreshPepper + rawToken);
    const token = await this.refreshTokenRepo.findByHash(hash);
    if (!token || token.revokedAt !== null) return; // idempotent
    await this.refreshTokenRepo.markRevoked(token.id);
  }
}
