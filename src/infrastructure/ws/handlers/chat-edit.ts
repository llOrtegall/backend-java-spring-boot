import type { ServerWebSocket } from "bun";
import type { WsData } from "../connection-registry.ts";
import type { ClientEnvelope } from "../envelope.ts";
import type { EditMessage } from "../../../application/use-cases/messages/edit-message.ts";
import { validate } from "../../http/validation/validate.ts";
import { ChatEditPayloadSchema } from "../../../application/dtos/ws-events.ts";
import { buildAck } from "../envelope.ts";

export async function handleChatEdit(
  ws: ServerWebSocket<WsData>,
  envelope: ClientEnvelope,
  editMessage: EditMessage,
): Promise<void> {
  const { messageId, body } = validate(ChatEditPayloadSchema, envelope.payload);
  const msg = await editMessage.execute(ws.data.userId, messageId, body);
  ws.send(buildAck(envelope.refId, { id: msg.id, editedAt: msg.editedAt }));
}
