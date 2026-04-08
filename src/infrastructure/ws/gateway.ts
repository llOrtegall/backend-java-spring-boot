import type { ServerWebSocket, WebSocketHandler } from "bun";
import type { WsData, ConnectionRegistry } from "./connection-registry.ts";
import type { EventRouter } from "./event-router.ts";
import type { TokenSigner } from "../../domain/ports/services/token-signer.ts";
import type { IdGenerator } from "../../domain/ports/services/id-generator.ts";
import { logger } from "../logging/logger.ts";

export class WsGateway {
  constructor(
    private readonly registry: ConnectionRegistry,
    private readonly router: EventRouter,
    private readonly tokenSigner: TokenSigner,
    private readonly idGenerator: IdGenerator,
  ) {}

  async upgrade(req: Request, server: Bun.Server<WsData>): Promise<Response | undefined> {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return new Response("Missing token", { status: 401 });
    }

    const claims = await this.tokenSigner.verifyAccess(token);
    if (!claims) {
      return new Response("Invalid or expired token", { status: 401 });
    }

    const data: WsData = {
      userId: claims.sub,
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
        logger.debug({ userId: ws.data.userId, connId: ws.data.connId }, "WS connected");
      },
      message: async (ws, raw) => {
        await this.router.dispatch(ws, raw);
      },
      close: (ws, code, reason) => {
        this.registry.unregister(ws);
        logger.debug({ userId: ws.data.userId, connId: ws.data.connId, code }, "WS disconnected");
      },
    };
  }
}
