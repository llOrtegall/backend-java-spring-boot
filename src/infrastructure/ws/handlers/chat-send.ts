import type { ServerWebSocket } from "bun";
import type { WsData } from "../connection-registry.ts";
import type { ClientEnvelope } from "../envelope.ts";
import type { SendMessage } from "../../../application/use-cases/messages/send-message.ts";
import { validate } from "../../http/validation/validate.ts";
import { ChatSendPayloadSchema } from "../../../application/dtos/ws-events.ts";
import { buildAck } from "../envelope.ts";

export async function handleChatSend(
  ws: ServerWebSocket<WsData>,
  envelope: ClientEnvelope,
  sendMessage: SendMessage,
): Promise<void> {
  const payload = validate(ChatSendPayloadSchema, envelope.payload);
  const msg = await sendMessage.execute({
    roomId: payload.roomId,
    senderId: ws.data.userId,
    body: payload.body,
    attachmentKey: payload.attachmentKey,
    clientMessageId: payload.clientMessageId,
    refId: envelope.refId,
  });
  ws.send(buildAck(envelope.refId, { id: msg.id, createdAt: msg.createdAt }));
}
