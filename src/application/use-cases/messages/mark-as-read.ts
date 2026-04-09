import type { MessageRepository } from "../../../domain/ports/repositories/message-repository.ts";
import type { RoomRepository } from "../../../domain/ports/repositories/room-repository.ts";
import type { MessageBus } from "../../../domain/ports/services/message-bus.ts";
import { ForbiddenError, NotFoundError } from "../../../domain/errors/domain-errors.ts";

interface Deps {
  messageRepo: MessageRepository;
  roomRepo: RoomRepository;
  bus: MessageBus;
}

export class MarkAsRead {
  constructor(private readonly deps: Deps) {}

  async execute(userId: string, roomId: string, messageId: string): Promise<void> {
    const member = await this.deps.roomRepo.getMember(roomId, userId);
    if (!member) throw new ForbiddenError("Not a member of this room");

    const msg = await this.deps.messageRepo.findById(messageId);
    if (!msg || msg.roomId !== roomId) throw new NotFoundError("Message not found");

    await this.deps.roomRepo.setLastReadMessage(roomId, userId, messageId);
    await this.deps.bus.publish(`room:${roomId}`, {
      kind: "message.read",
      roomId,
      userId,
      messageId,
    });
  }
}
