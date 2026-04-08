import type { ServerWebSocket } from "bun";
import type { WsData } from "../connection-registry.ts";
import type { ClientEnvelope } from "../envelope.ts";
import type { DeleteMessage } from "../../../application/use-cases/messages/delete-message.ts";
import { validate } from "../../http/validation/validate.ts";
import { ChatDeletePayloadSchema } from "../../../application/dtos/ws-events.ts";
import { buildAck } from "../envelope.ts";

export async function handleChatDelete(
  ws: ServerWebSocket<WsData>,
  envelope: ClientEnvelope,
  deleteMessage: DeleteMessage,
): Promise<void> {
  const { messageId } = validate(ChatDeletePayloadSchema, envelope.payload);
  await deleteMessage.execute(ws.data.userId, messageId);
  ws.send(buildAck(envelope.refId, { messageId }));
}
