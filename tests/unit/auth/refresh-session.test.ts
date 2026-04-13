import { describe, test, expect, beforeEach } from "bun:test";
import { RefreshSession } from "../../../src/application/use-cases/auth/refresh-session.ts";
import {
  InMemoryRefreshTokenRepo,
  FakeClock,
  FakeIdGenerator,
} from "../../helpers/fakes.ts";
import { sha256Sync } from "../../../src/infrastructure/crypto/sha256.ts";

const PEPPER = "test-pepper-32bytes-padding-here!";

function makeSut() {
  const repo = new InMemoryRefreshTokenRepo();
  const clock = new FakeClock();
  const idGenerator = new FakeIdGenerator();

  const sut = new RefreshSession({
    refreshTokenRepo: repo,
    tokenSigner: {
      signAccess: async () => "new-access-token",
      verifyAccess: async () => null,
      generateRefresh: () => {
        const raw = `refresh-${idGenerator.uuidv7()}`;
        const hash = sha256Sync(PEPPER + raw);
        return { raw, hash };
      },
    },
    idGenerator,
    clock,
    refreshTtlSec: 2592000,
    refreshPepper: PEPPER,
  });

  return { sut, repo, clock };
}

describe("RefreshSession", () => {
  test("issues new access + refresh tokens and revokes old token", async () => {
    const { sut, repo } = makeSut();
    const raw = "initial-refresh-token";
    const hash = sha256Sync(PEPPER + raw);
    await repo.insert({
      id: "token-1",
      userId: "user-1",
      tokenHash: hash,
      familyId: "family-1",
      parentId: null,
      replacedById: null,
      userAgent: null,
      ip: null,
      expiresAt: new Date(Date.now() + 1_000_000),
      revokedAt: null,
    });

    const result = await sut.execute(raw, {});
    expect(result.accessToken).toBe("new-access-token");
    expect(result.refreshToken).toBeTruthy();

    const old = await repo.findByHash(hash);
    expect(old?.revokedAt).not.toBeNull();
  });

  test("revokes entire family on token reuse (double-spend)", async () => {
    const { sut, repo } = makeSut();
    const raw = "stolen-token";
    const hash = sha256Sync(PEPPER + raw);
    await repo.insert({
      id: "token-2",
      userId: "user-2",
      tokenHash: hash,
      familyId: "family-2",
      parentId: null,
      replacedById: null,
      userAgent: null,
      ip: null,
      expiresAt: new Date(Date.now() + 1_000_000),
      revokedAt: new Date(), // already revoked — simulates reuse
    });

    expect(sut.execute(raw, {})).rejects.toThrow();
    const active = await repo.listActiveByUser("user-2");
    expect(active.length).toBe(0);
  });

  test("throws AuthError when token does not exist", async () => {
    const { sut } = makeSut();
    expect(sut.execute("nonexistent", {})).rejects.toThrow();
  });
});
