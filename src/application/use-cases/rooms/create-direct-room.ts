import type { RoomRepository } from "../../../domain/ports/repositories/room-repository.ts";
import type { UserRepository } from "../../../domain/ports/repositories/user-repository.ts";
import type { IdGenerator } from "../../../domain/ports/services/id-generator.ts";
import type { Clock } from "../../../domain/ports/services/clock.ts";
import type { Room } from "../../../domain/entities/room.ts";
import { NotFoundError } from "../../../domain/errors/domain-errors.ts";
import { toRoomDto, type RoomDto } from "../../dtos/room-dtos.ts";

interface Deps {
  roomRepo: RoomRepository;
  userRepo: UserRepository;
  idGenerator: IdGenerator;
  clock: Clock;
}

export class CreateDirectRoom {
  constructor(private readonly deps: Deps) {}

  async execute(requesterId: string, targetUserId: string): Promise<RoomDto> {
    if (!(await this.deps.userRepo.findById(targetUserId))) {
      throw new NotFoundError("Target user not found");
    }

    const existing = await this.deps.roomRepo.findDmBetween(requesterId, targetUserId);
    if (existing) return toRoomDto(existing);

    const roomId = this.deps.idGenerator.uuidv7();
    const dmKey = [requesterId, targetUserId].sort().join(":");
    const now = this.deps.clock.now();

    const room: Room = {
      id: roomId,
      kind: "dm",
      name: null,
      createdBy: requesterId,
      dmKey,
      lastMessageAt: null,
      createdAt: now,
    };

    const created = await this.deps.roomRepo.createDm(
      room,
      { roomId, userId: requesterId, role: "member", joinedAt: now, lastReadMessageId: null, mutedUntil: null },
      { roomId, userId: targetUserId, role: "member", joinedAt: now, lastReadMessageId: null, mutedUntil: null },
    );

    return toRoomDto(created);
  }
}
