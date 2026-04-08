import type { ServerWebSocket } from "bun";
import type { WsData, ConnectionRegistry } from "../connection-registry.ts";
import type { ClientEnvelope } from "../envelope.ts";
import type { RoomRepository } from "../../../domain/ports/repositories/room-repository.ts";
import { validate } from "../../http/validation/validate.ts";
import { ChatSubscribePayloadSchema } from "../../../application/dtos/ws-events.ts";
import { buildAck, buildError } from "../envelope.ts";

export async function handleChatSubscribe(
  ws: ServerWebSocket<WsData>,
  envelope: ClientEnvelope,
  registry: ConnectionRegistry,
  roomRepo: RoomRepository,
): Promise<void> {
  const { roomIds } = validate(ChatSubscribePayloadSchema, envelope.payload);
  const subscribed: string[] = [];

  for (const roomId of roomIds) {
    const member = await roomRepo.getMember(roomId, ws.data.userId);
    if (!member) continue;
    if (!ws.data.rooms.has(roomId)) {
      await registry.subscribeRoom(ws, roomId);
    }
    subscribed.push(roomId);
  }

  ws.send(buildAck(envelope.refId, { subscribed }));
}
