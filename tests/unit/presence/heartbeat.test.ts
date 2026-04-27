import { describe, test, expect } from "bun:test";
import { Heartbeat } from "../../../src/application/use-cases/presence/heartbeat.ts";
import { FakePresenceStore } from "../../helpers/fakes.ts";

describe("Heartbeat", () => {
  test("keeps user online after heartbeat", async () => {
    const store = new FakePresenceStore();
    const uc = new Heartbeat(store);

    await store.markOnline("user1", "conn1", 60);
    await uc.execute("user1", "conn1", 120);

    expect(await store.isOnline("user1")).toBe(true);
  });

  test("creates presence entry if connection was not previously registered", async () => {
    const store = new FakePresenceStore();
    const uc = new Heartbeat(store);

    await uc.execute("user1", "conn1", 60);

    expect(await store.isOnline("user1")).toBe(true);
  });

  test("listOnline includes all heartbeating users", async () => {
    const store = new FakePresenceStore();
    const uc = new Heartbeat(store);

    await uc.execute("user1", "conn1", 60);
    await uc.execute("user2", "conn2", 60);

    const online = await store.listOnline(["user1", "user2", "user3"]);
    expect(online).toContain("user1");
    expect(online).toContain("user2");
    expect(online).not.toContain("user3");
  });
});
