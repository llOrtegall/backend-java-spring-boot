import type { EmailTokenRepository } from "../../../domain/ports/repositories/email-token-repository.ts";
import type { EmailSender } from "../../../domain/ports/services/email-sender.ts";
import type { UserRepository } from "../../../domain/ports/repositories/user-repository.ts";
import type { IdGenerator } from "../../../domain/ports/services/id-generator.ts";
import type { Clock } from "../../../domain/ports/services/clock.ts";
import { sha256Sync } from "../../../infrastructure/crypto/sha256.ts";

interface Deps {
  userRepo: UserRepository;
  emailTokenRepo: EmailTokenRepository;
  emailSender: EmailSender;
  idGenerator: IdGenerator;
  clock: Clock;
  emailVerifyUrlBase: string;
}

export class RequestEmailVerification {
  constructor(private readonly deps: Deps) {}

  async execute(userId: string): Promise<void> {
    const user = await this.deps.userRepo.findById(userId);
    if (!user || user.emailVerifiedAt !== null) return; // idempotent

    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    const raw = Buffer.from(bytes).toString("base64url");
    const hash = sha256Sync(raw);

    await this.deps.emailTokenRepo.insert({
      id: this.deps.idGenerator.uuidv7(),
      userId,
      kind: "verify",
      tokenHash: hash,
      expiresAt: new Date(this.deps.clock.now().getTime() + 24 * 60 * 60 * 1000),
    });

    const link = `${this.deps.emailVerifyUrlBase}?token=${raw}`;
    await this.deps.emailSender.sendVerification(user.email, link);
  }
}
