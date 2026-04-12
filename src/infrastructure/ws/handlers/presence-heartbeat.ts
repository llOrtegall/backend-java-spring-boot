import type { ServerWebSocket } from "bun";
import type { WsData } from "../connection-registry.ts";
import type { ClientEnvelope } from "../envelope.ts";
import type { Heartbeat } from "../../../application/use-cases/presence/heartbeat.ts";
import { buildAck } from "../envelope.ts";

export async function handlePresenceHeartbeat(
  ws: ServerWebSocket<WsData>,
  envelope: ClientEnvelope,
  heartbeat: Heartbeat,
  presenceTtlSec: number,
): Promise<void> {
  await heartbeat.execute(ws.data.userId, ws.data.connId, presenceTtlSec);
  ws.send(buildAck(envelope.refId, { ts: Date.now() }));
}
