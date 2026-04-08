import type { ServerWebSocket } from "bun";
import type { WsData } from "../connection-registry.ts";
import type { ClientEnvelope } from "../envelope.ts";
import type { MarkAsRead } from "../../../application/use-cases/messages/mark-as-read.ts";
import { validate } from "../../http/validation/validate.ts";
import { ChatReadPayloadSchema } from "../../../application/dtos/ws-events.ts";
import { buildAck } from "../envelope.ts";

export async function handleChatRead(
  ws: ServerWebSocket<WsData>,
  envelope: ClientEnvelope,
  markAsRead: MarkAsRead,
): Promise<void> {
  const { roomId, messageId } = validate(ChatReadPayloadSchema, envelope.payload);
  await markAsRead.execute(ws.data.userId, roomId, messageId);
  ws.send(buildAck(envelope.refId, { roomId, messageId }));
}
