import type { ServerWebSocket } from "bun";
import type { WsData } from "../connection-registry.ts";
import type { ClientEnvelope } from "../envelope.ts";

export function handlePing(ws: ServerWebSocket<WsData>, envelope: ClientEnvelope): void {
  ws.send(JSON.stringify({ type: "pong", refId: envelope.refId, ts: Date.now() }));
}
