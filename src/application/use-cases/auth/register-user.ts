import type { UserRepository } from "../../../domain/ports/repositories/user-repository.ts";
import type { EmailTokenRepository } from "../../../domain/ports/repositories/email-token-repository.ts";
import type { PasswordHasher } from "../../../domain/ports/services/password-hasher.ts";
import type { EmailSender } from "../../../domain/ports/services/email-sender.ts";
import type { PublicUser } from "../../../domain/entities/user.ts";
import { toPublicUser } from "../../../domain/entities/user.ts";
import { ConflictError } from "../../../domain/errors/domain-errors.ts";
import { sha256Sync } from "../../../infrastructure/crypto/sha256.ts";
import { createSession, type SessionDeps } from "./_session.ts";

interface Deps extends SessionDeps {
  userRepo: UserRepository;
  passwordHasher: PasswordHasher;
  emailTokenRepo: EmailTokenRepository;
  emailSender: EmailSender;
  emailVerifyUrlBase: string;
}

interface Input {
  email: string;
  password: string;
  displayName: string;
  userAgent?: string;
  ip?: string;
}

export class RegisterUser {
  constructor(private readonly deps: Deps) {}

  async execute(input: Input): Promise<{ user: PublicUser; accessToken: string; refreshToken: string }> {
    const email = input.email.toLowerCase().trim();

    if (await this.deps.userRepo.findByEmail(email)) {
      throw new ConflictError("Email already in use");
    }

    const passwordHash = await this.deps.passwordHasher.hash(input.password);
    const userId = this.deps.idGenerator.uuidv7();

    const user = await this.deps.userRepo.create({
      id: userId,
      email,
      passwordHash,
      displayName: input.displayName,
      avatarUrl: null,
      emailVerifiedAt: null,
    });

    const session = await createSession(this.deps, userId, { userAgent: input.userAgent, ip: input.ip });

    // Fire-and-forget email verification
    this.sendVerificationEmail(userId, email).catch(() => {});

    return { user: toPublicUser(user), ...session };
  }

  private async sendVerificationEmail(userId: string, email: string): Promise<void> {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    const raw = Buffer.from(bytes).toString("base64url");
    const hash = sha256Sync(raw);
    const now = this.deps.clock.now();

    await this.deps.emailTokenRepo.insert({
      id: this.deps.idGenerator.uuidv7(),
      userId,
      kind: "verify",
      tokenHash: hash,
      expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
    });

    const link = `${this.deps.emailVerifyUrlBase}?token=${raw}`;
    await this.deps.emailSender.sendVerification(email, link);
  }
}
