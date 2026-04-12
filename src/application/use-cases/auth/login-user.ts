import type { UserRepository } from "../../../domain/ports/repositories/user-repository.ts";
import type { PasswordHasher } from "../../../domain/ports/services/password-hasher.ts";
import type { PublicUser } from "../../../domain/entities/user.ts";
import { toPublicUser } from "../../../domain/entities/user.ts";
import { AuthError } from "../../../domain/errors/domain-errors.ts";
import { createSession, type SessionDeps } from "./_session.ts";

interface Deps extends SessionDeps {
  userRepo: UserRepository;
  passwordHasher: PasswordHasher;
}

interface Input {
  email: string;
  password: string;
  userAgent?: string;
  ip?: string;
}

export class LoginUser {
  constructor(private readonly deps: Deps) {}

  async execute(input: Input): Promise<{ user: PublicUser; accessToken: string; refreshToken: string }> {
    const email = input.email.toLowerCase().trim();
    const user = await this.deps.userRepo.findByEmail(email);

    // Generic message — don't reveal whether the email exists
    if (!user) throw new AuthError("Invalid credentials");

    const valid = await this.deps.passwordHasher.verify(input.password, user.passwordHash);
    if (!valid) throw new AuthError("Invalid credentials");

    const session = await createSession(this.deps, user.id, { userAgent: input.userAgent, ip: input.ip });

    return { user: toPublicUser(user), ...session };
  }
}
