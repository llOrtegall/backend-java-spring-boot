import type { PresenceStore } from "../../../domain/ports/services/presence-store.ts";
import type { MessageBus } from "../../../domain/ports/services/message-bus.ts";

interface Deps {
  presenceStore: PresenceStore;
  bus: MessageBus;
}

export class MarkUserOnline {
  constructor(private readonly deps: Deps) {}

  async execute(userId: string, connId: string, ttlSec: number): Promise<void> {
    await this.deps.presenceStore.markOnline(userId, connId, ttlSec);
    await this.deps.bus.publish("presence:global", {
      kind: "presence.online",
      userId,
      ts: Date.now(),
    });
  }
}
