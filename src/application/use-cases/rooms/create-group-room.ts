import type { RoomRepository } from "../../../domain/ports/repositories/room-repository.ts";
import type { UserRepository } from "../../../domain/ports/repositories/user-repository.ts";
import type { IdGenerator } from "../../../domain/ports/services/id-generator.ts";
import type { Clock } from "../../../domain/ports/services/clock.ts";
import type { Room, RoomMember } from "../../../domain/entities/room.ts";
import { NotFoundError } from "../../../domain/errors/domain-errors.ts";
import { toRoomDto, type RoomDto } from "../../dtos/room-dtos.ts";

interface Deps {
  roomRepo: RoomRepository;
  userRepo: UserRepository;
  idGenerator: IdGenerator;
  clock: Clock;
}

export class CreateGroupRoom {
  constructor(private readonly deps: Deps) {}

  async execute(requesterId: string, name: string, memberIds: string[]): Promise<RoomDto> {
    const allMemberIds = [...new Set([...memberIds])].filter(id => id !== requesterId);

    for (const mid of allMemberIds) {
      if (!(await this.deps.userRepo.findById(mid))) {
        throw new NotFoundError(`User not found: ${mid}`);
      }
    }

    const roomId = this.deps.idGenerator.uuidv7();
    const now = this.deps.clock.now();

    const room: Room = {
      id: roomId,
      kind: "group",
      name,
      createdBy: requesterId,
      dmKey: null,
      lastMessageAt: null,
      createdAt: now,
    };

    const owner: RoomMember = {
      roomId,
      userId: requesterId,
      role: "owner",
      joinedAt: now,
      lastReadMessageId: null,
      mutedUntil: null,
    };

    const created = await this.deps.roomRepo.createGroup(room, owner);

    for (const mid of allMemberIds) {
      await this.deps.roomRepo.addMember({
        roomId,
        userId: mid,
        role: "member",
        joinedAt: now,
        lastReadMessageId: null,
        mutedUntil: null,
      });
    }

    return toRoomDto(created);
  }
}
