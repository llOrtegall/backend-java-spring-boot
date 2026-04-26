import { describe, test, expect, beforeAll, afterEach } from "bun:test";
import { startTestServer, truncateTables } from "../helpers/build-app.ts";

let server: Awaited<ReturnType<typeof startTestServer>>;

beforeAll(async () => {
  server = await startTestServer();
  await truncateTables();
});

afterEach(async () => {
  await truncateTables();
});

describe("Rate limiting — register (limit: 5/60s by IP)", () => {
  test("returns 429 with Retry-After after exceeding limit", async () => {
    // Exhaust the 5-request limit (400s count against the limit too)
    for (let i = 0; i < 5; i++) {
      await server.post("/api/v1/auth/register", { email: `rl${i}@x.com`, password: "pw", displayName: "U" });
    }

    const res = await server.post("/api/v1/auth/register", {
      email: "rl-extra@x.com",
      password: "password123",
      displayName: "Extra",
    });

    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBeTruthy();
  });
});

describe("Rate limiting — login (limit: 10/60s by IP)", () => {
  test("returns 429 after exceeding login limit", async () => {
    await server.post("/api/v1/auth/register", {
      email: "victim@x.com",
      password: "password123",
      displayName: "Victim",
    });

    for (let i = 0; i < 10; i++) {
      await server.post("/api/v1/auth/login", { email: "victim@x.com", password: "wrong" });
    }

    const res = await server.post("/api/v1/auth/login", {
      email: "victim@x.com",
      password: "wrong",
    });

    expect(res.status).toBe(429);
    const retryAfter = res.headers.get("retry-after");
    expect(retryAfter).toBeTruthy();
    expect(Number(retryAfter)).toBeGreaterThan(0);
  });
});

describe("Rate limiting — authenticated endpoints (limit: 120/60s by userId)", () => {
  test("returns 429 after exceeding default limit for authenticated user", async () => {
    const reg = await server.post("/api/v1/auth/register", {
      email: "authed@x.com",
      password: "password123",
      displayName: "Auth",
    });
    const { accessToken } = await reg.json() as { accessToken: string };

    for (let i = 0; i < 120; i++) {
      await server.get("/api/v1/auth/me", accessToken);
    }

    const res = await server.get("/api/v1/auth/me", accessToken);
    expect(res.status).toBe(429);
  });
});
