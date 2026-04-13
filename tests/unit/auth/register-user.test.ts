import { describe, test, expect, beforeEach } from "bun:test";
import { RegisterUser } from "../../../src/application/use-cases/auth/register-user.ts";
import {
  InMemoryUserRepo,
  InMemoryRefreshTokenRepo,
  InMemoryEmailTokenRepo,
  FakePasswordHasher,
  FakeEmailSender,
  FakeClock,
  FakeIdGenerator,
} from "../../helpers/fakes.ts";

function makeSut() {
  const userRepo = new InMemoryUserRepo();
  const refreshTokenRepo = new InMemoryRefreshTokenRepo();
  const emailTokenRepo = new InMemoryEmailTokenRepo();
  const passwordHasher = new FakePasswordHasher();
  const emailSender = new FakeEmailSender();
  const clock = new FakeClock();
  const idGenerator = new FakeIdGenerator();

  const sut = new RegisterUser({
    userRepo,
    passwordHasher,
    emailTokenRepo,
    emailSender,
    refreshTokenRepo,
    tokenSigner: {
      signAccess: async () => "access-token",
      verifyAccess: async () => null,
      generateRefresh: () => ({ raw: "refresh-raw", hash: "refresh-hash" }),
    },
    idGenerator,
    clock,
    refreshTtlSec: 2592000,
    emailVerifyUrlBase: "http://localhost:5173/verify",
  });

  return { sut, userRepo, emailSender };
}

describe("RegisterUser", () => {
  test("creates user and returns tokens", async () => {
    const { sut } = makeSut();
    const result = await sut.execute({
      email: "alice@example.com",
      password: "secret123",
      displayName: "Alice",
    });

    expect(result.user.email).toBe("alice@example.com");
    expect(result.user.displayName).toBe("Alice");
    expect(result.accessToken).toBe("access-token");
    expect(result.refreshToken).toBe("refresh-raw");
  });

  test("normalises email to lowercase", async () => {
    const { sut, userRepo } = makeSut();
    await sut.execute({ email: "ALICE@EXAMPLE.COM", password: "secret123", displayName: "Alice" });
    const user = await userRepo.findByEmail("alice@example.com");
    expect(user).not.toBeNull();
  });

  test("throws ConflictError when email already taken", async () => {
    const { sut } = makeSut();
    await sut.execute({ email: "alice@example.com", password: "pw1", displayName: "Alice" });
    expect(sut.execute({ email: "alice@example.com", password: "pw2", displayName: "Alice2" }))
      .rejects.toThrow("Email already in use");
  });

  test("sends verification email asynchronously", async () => {
    const { sut, emailSender } = makeSut();
    await sut.execute({ email: "alice@example.com", password: "secret123", displayName: "Alice" });
    // fire-and-forget: wait a tick
    await new Promise(r => setTimeout(r, 10));
    expect(emailSender.sent.some(e => e.to === "alice@example.com" && e.kind === "verify")).toBe(true);
  });
});
