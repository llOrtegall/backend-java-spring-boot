import type { MessageRepository } from "../../../domain/ports/repositories/message-repository.ts";
import type { RoomRepository } from "../../../domain/ports/repositories/room-repository.ts";
import type { MessageBus } from "../../../domain/ports/services/message-bus.ts";
import { ForbiddenError, NotFoundError } from "../../../domain/errors/domain-errors.ts";

interface Deps {
  messageRepo: MessageRepository;
  roomRepo: RoomRepository;
  bus: MessageBus;
}

export class DeleteMessage {
  constructor(private readonly deps: Deps) {}

  async execute(requesterId: string, messageId: string): Promise<void> {
    const msg = await this.deps.messageRepo.findById(messageId);
    if (!msg) throw new NotFoundError("Message not found");
    if (msg.deletedAt) throw new NotFoundError("Message not found");

    if (msg.senderId !== requesterId) {
      const member = await this.deps.roomRepo.getMember(msg.roomId, requesterId);
      if (!member || member.role === "member") {
        throw new ForbiddenError("Cannot delete another user's message");
      }
    }

    await this.deps.messageRepo.softDelete(messageId);
    await this.deps.bus.publish(`room:${msg.roomId}`, {
      kind: "message.deleted",
      messageId,
      roomId: msg.roomId,
    });
  }
}
