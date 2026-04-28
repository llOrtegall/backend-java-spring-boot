import { describe, test, expect } from "bun:test";
import { MarkUserOnline } from "../../../src/application/use-cases/presence/mark-user-online.ts";
import { FakePresenceStore, FakeMessageBus } from "../../helpers/fakes.ts";

describe("MarkUserOnline", () => {
  test("marks user online in presence store", async () => {
    const store = new FakePresenceStore();
    const bus = new FakeMessageBus();
    const uc = new MarkUserOnline({ presenceStore: store, bus });

    await uc.execute("user1", "conn1", 60);

    expect(await store.isOnline("user1")).toBe(true);
  });

  test("publishes presence.online event to the global bus channel", async () => {
    const store = new FakePresenceStore();
    const bus = new FakeMessageBus();
    const uc = new MarkUserOnline({ presenceStore: store, bus });

    await uc.execute("user1", "conn1", 60);

    const event = bus.lastPublished("presence:global");
    expect(event).toMatchObject({ kind: "presence.online", userId: "user1" });
  });

  test("two connections for the same user both appear as online", async () => {
    const store = new FakePresenceStore();
    const bus = new FakeMessageBus();
    const uc = new MarkUserOnline({ presenceStore: store, bus });

    await uc.execute("user1", "conn1", 60);
    await uc.execute("user1", "conn2", 60);

    expect(await store.isOnline("user1")).toBe(true);
    const presenceEvents = bus.published.filter(p => p.channel === "presence:global");
    expect(presenceEvents).toHaveLength(2);
  });

  test("different users are tracked independently", async () => {
    const store = new FakePresenceStore();
    const bus = new FakeMessageBus();
    const uc = new MarkUserOnline({ presenceStore: store, bus });

    await uc.execute("user1", "conn1", 60);

    expect(await store.isOnline("user1")).toBe(true);
    expect(await store.isOnline("user2")).toBe(false);
  });
});
