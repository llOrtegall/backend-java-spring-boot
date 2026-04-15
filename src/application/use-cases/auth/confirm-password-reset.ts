import type { EmailTokenRepository } from "../../../domain/ports/repositories/email-token-repository.ts";
import type { UserRepository } from "../../../domain/ports/repositories/user-repository.ts";
import type { RefreshTokenRepository } from "../../../domain/ports/repositories/refresh-token-repository.ts";
import type { PasswordHasher } from "../../../domain/ports/services/password-hasher.ts";
import { sha256Sync } from "../../../infrastructure/crypto/sha256.ts";
import { AuthError } from "../../../domain/errors/domain-errors.ts";

interface Deps {
  emailTokenRepo: EmailTokenRepository;
  userRepo: UserRepository;
  refreshTokenRepo: RefreshTokenRepository;
  passwordHasher: PasswordHasher;
}

export class ConfirmPasswordReset {
  constructor(private readonly deps: Deps) {}

  async execute(rawToken: string, newPassword: string): Promise<void> {
    const hash = sha256Sync(rawToken);
    const token = await this.deps.emailTokenRepo.consume(hash, "reset");
    if (!token) throw new AuthError("Invalid or expired reset token");

    const passwordHash = await this.deps.passwordHasher.hash(newPassword);
    await this.deps.userRepo.update(token.userId, { passwordHash });
    await this.deps.refreshTokenRepo.revokeAllForUser(token.userId);
  }
}
