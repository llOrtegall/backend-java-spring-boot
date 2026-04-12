import type { EmailTokenRepository } from "../../../domain/ports/repositories/email-token-repository.ts";
import type { UserRepository } from "../../../domain/ports/repositories/user-repository.ts";
import type { Clock } from "../../../domain/ports/services/clock.ts";
import { sha256Sync } from "../../../infrastructure/crypto/sha256.ts";
import { AuthError } from "../../../domain/errors/domain-errors.ts";

export class ConfirmEmailVerification {
  constructor(
    private readonly emailTokenRepo: EmailTokenRepository,
    private readonly userRepo: UserRepository,
    private readonly clock: Clock,
  ) {}

  async execute(rawToken: string): Promise<void> {
    const hash = sha256Sync(rawToken);
    const token = await this.emailTokenRepo.consume(hash, "verify");
    if (!token) throw new AuthError("Invalid or expired verification token");

    await this.userRepo.update(token.userId, { emailVerifiedAt: this.clock.now() });
  }
}
