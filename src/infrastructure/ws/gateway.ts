import type { ServerWebSocket, WebSocketHandler } from "bun";
import type { WsData, ConnectionRegistry } from "./connection-registry.ts";
import type { EventRouter } from "./event-router.ts";
import type { TokenSigner } from "../../domain/ports/services/token-signer.ts";
import type { WsTicketStore } from "../../domain/ports/services/ws-ticket-store.ts";
import type { IdGenerator } from "../../domain/ports/services/id-generator.ts";
import type { MarkUserOnline } from "../../application/use-cases/presence/mark-user-online.ts";
import type { MarkUserOffline } from "../../application/use-cases/presence/mark-user-offline.ts";
import { logger } from "../logging/logger.ts";

interface PresenceDeps {
  markUserOnline: MarkUserOnline;
  markUserOffline: MarkUserOffline;
  presenceTtlSec: number;
}

export class WsGateway {
  constructor(
    private readonly registry: ConnectionRegistry,
    private readonly router: EventRouter,
    private readonly tokenSigner: TokenSigner,
    private readonly ticketStore: WsTicketStore,
    private readonly idGenerator: IdGenerator,
    private readonly presence: PresenceDeps,
  ) {}

  async upgrade(req: Request, server: Bun.Server<WsData>): Promise<Response | undefined> {
    const url = new URL(req.url);

    let userId: string | null = null;

    const ticket = url.searchParams.get("ticket");
    if (ticket) {
      userId = await this.ticketStore.consume(ticket);
      if (!userId) return new Response("Invalid or expired ticket", { status: 401 });
    } else {
      const token = url.searchParams.get("token");
      if (!token) return new Response("Missing token or ticket", { status: 401 });
      const claims = await this.tokenSigner.verifyAccess(token);
      if (!claims) return new Response("Invalid or expired token", { status: 401 });
      userId = claims.sub;
    }

    const data: WsData = {
      userId,
      connId: this.idGenerator.uuidv7(),
      rooms: new Set(),
    };

    if (server.upgrade(req, { data })) return undefined;
    return new Response("WebSocket upgrade failed", { status: 400 });
  }

  get handlers(): WebSocketHandler<WsData> {
    return {
      open: (ws) => {
        this.registry.register(ws);
        this.presence.markUserOnline
          .execute(ws.data.userId, ws.data.connId, this.presence.presenceTtlSec)
          .catch(err => logger.warn({ err, userId: ws.data.userId }, "Failed to mark user online"));
        logger.debug({ userId: ws.data.userId, connId: ws.data.connId }, "WS connected");
      },
      message: async (ws, raw) => {
        await this.router.dispatch(ws, raw);
      },
      close: (ws, code) => {
        this.registry.unregister(ws);
        this.presence.markUserOffline
          .execute(ws.data.userId, ws.data.connId)
          .catch(err => logger.warn({ err, userId: ws.data.userId }, "Failed to mark user offline"));
        logger.debug({ userId: ws.data.userId, connId: ws.data.connId, code }, "WS disconnected");
      },
    };
  }
}
