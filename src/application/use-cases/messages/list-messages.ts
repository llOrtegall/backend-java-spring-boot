import type { MessageRepository } from "../../../domain/ports/repositories/message-repository.ts";
import type { RoomRepository } from "../../../domain/ports/repositories/room-repository.ts";
import { toMessageDto, type MessageDto } from "../../../domain/entities/message.ts";
import { ForbiddenError } from "../../../domain/errors/domain-errors.ts";

interface Deps {
  messageRepo: MessageRepository;
  roomRepo: RoomRepository;
}

interface Input {
  roomId: string;
  requesterId: string;
  before?: string;
  limit: number;
}

export class ListMessages {
  constructor(private readonly deps: Deps) {}

  async execute(input: Input): Promise<MessageDto[]> {
    const member = await this.deps.roomRepo.getMember(input.roomId, input.requesterId);
    if (!member) throw new ForbiddenError("Not a member of this room");

    const messages = await this.deps.messageRepo.listByRoom({
      roomId: input.roomId,
      before: input.before,
      limit: input.limit,
    });

    return messages.map(toMessageDto);
  }
}
