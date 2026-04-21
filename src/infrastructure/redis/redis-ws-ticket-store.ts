import type { WsTicketStore } from "../../domain/ports/services/ws-ticket-store.ts";

type RedisClient = Bun.RedisClient;

export class RedisWsTicketStore implements WsTicketStore {
  constructor(private readonly redis: RedisClient) {}

  async issue(userId: string, ttlSec: number): Promise<string> {
    const ticket = crypto.randomUUID();
    await this.redis.set(`ws:ticket:${ticket}`, userId, "EX", ttlSec);
    return ticket;
  }

  async consume(ticket: string): Promise<string | null> {
    const key = `ws:ticket:${ticket}`;
    const userId = await this.redis.get(key) as string | null;
    if (userId) await this.redis.del(key);
    return userId;
  }
}
