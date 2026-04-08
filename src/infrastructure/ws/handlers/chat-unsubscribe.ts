import type { ServerWebSocket } from "bun";
import type { WsData, ConnectionRegistry } from "../connection-registry.ts";
import type { ClientEnvelope } from "../envelope.ts";
import { validate } from "../../http/validation/validate.ts";
import { ChatUnsubscribePayloadSchema } from "../../../application/dtos/ws-events.ts";
import { buildAck } from "../envelope.ts";

export function handleChatUnsubscribe(
  ws: ServerWebSocket<WsData>,
  envelope: ClientEnvelope,
  registry: ConnectionRegistry,
): void {
  const { roomIds } = validate(ChatUnsubscribePayloadSchema, envelope.payload);
  for (const roomId of roomIds) {
    registry.unsubscribeRoom(ws, roomId);
  }
  ws.send(buildAck(envelope.refId, { unsubscribed: roomIds }));
}
