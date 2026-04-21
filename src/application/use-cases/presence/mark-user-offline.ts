import type { PresenceStore } from "../../../domain/ports/services/presence-store.ts";
import type { MessageBus } from "../../../domain/ports/services/message-bus.ts";

interface Deps {
  presenceStore: PresenceStore;
  bus: MessageBus;
}

export class MarkUserOffline {
  constructor(private readonly deps: Deps) {}

  async execute(userId: string, connId: string): Promise<void> {
    const removed = await this.deps.presenceStore.markOffline(userId, connId);
    if (!removed) return;
    const stillOnline = await this.deps.presenceStore.isOnline(userId);
    if (!stillOnline) {
      await this.deps.bus.publish("presence:global", {
        kind: "presence.offline",
        userId,
        ts: Date.now(),
      });
    }
  }
}
