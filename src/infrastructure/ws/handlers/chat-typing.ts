import type { ServerWebSocket } from "bun";
import type { WsData } from "../connection-registry.ts";
import type { ClientEnvelope } from "../envelope.ts";
import type { MessageBus } from "../../../domain/ports/services/message-bus.ts";
import type { RoomRepository } from "../../../domain/ports/repositories/room-repository.ts";
import { validate } from "../../http/validation/validate.ts";
import { ChatTypingPayloadSchema } from "../../../application/dtos/ws-events.ts";

export async function handleChatTyping(
  ws: ServerWebSocket<WsData>,
  envelope: ClientEnvelope,
  roomRepo: RoomRepository,
  bus: MessageBus,
): Promise<void> {
  const { roomId } = validate(ChatTypingPayloadSchema, envelope.payload);
  const member = await roomRepo.getMember(roomId, ws.data.userId);
  if (!member) return;

  await bus.publish(`room:${roomId}`, {
    kind: "user.typing",
    roomId,
    userId: ws.data.userId,
  });
}
