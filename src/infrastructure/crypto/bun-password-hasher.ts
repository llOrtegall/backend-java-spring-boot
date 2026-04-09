import type { PasswordHasher } from "../../domain/ports/services/password-hasher.ts";

export class BunPasswordHasher implements PasswordHasher {
  async hash(plain: string): Promise<string> {
    return Bun.password.hash(plain, { algorithm: "argon2id" });
  }

  async verify(plain: string, hash: string): Promise<boolean> {
    return Bun.password.verify(plain, hash);
  }
}
