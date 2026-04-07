import type { MessageBus, Unsubscribe } from "../../domain/ports/services/message-bus.ts";

type RedisClient = Bun.RedisClient;

export class RedisMessageBus implements MessageBus {
  private readonly channelHandlers = new Map<string, Set<(event: unknown) => void>>();

  constructor(
    private readonly publisher: RedisClient,
    private readonly subscriber: RedisClient,
  ) {}

  async publish(channel: string, event: unknown): Promise<void> {
    await this.publisher.publish(channel, JSON.stringify(event));
  }

  async subscribe(channel: string, handler: (event: unknown) => void): Promise<Unsubscribe> {
    let handlers = this.channelHandlers.get(channel);
    const isNew = !handlers;

    if (isNew) {
      handlers = new Set();
      this.channelHandlers.set(channel, handlers);
      await this.subscriber.subscribe(channel, (raw: string) => {
        const set = this.channelHandlers.get(channel);
        if (!set?.size) return;
        let parsed: unknown;
        try { parsed = JSON.parse(raw); } catch { return; }
        for (const h of set) h(parsed);
      });
    }

    handlers!.add(handler);

    return async () => {
      const set = this.channelHandlers.get(channel);
      if (!set) return;
      set.delete(handler);
      if (set.size === 0) {
        this.channelHandlers.delete(channel);
        await this.subscriber.unsubscribe(channel);
      }
    };
  }
}
