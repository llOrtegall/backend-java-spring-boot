import type { RoomRepository } from "../../../domain/ports/repositories/room-repository.ts";
import type { UserRepository } from "../../../domain/ports/repositories/user-repository.ts";
import type { Clock } from "../../../domain/ports/services/clock.ts";
import type { RoomRole } from "../../../domain/entities/room.ts";
import { ConflictError, NotFoundError } from "../../../domain/errors/domain-errors.ts";
import { RoomAuthorizer } from "../../services/room-authorizer.ts";
import { toRoomMemberDto, type RoomMemberDto } from "../../dtos/room-dtos.ts";

interface Deps {
  roomRepo: RoomRepository;
  userRepo: UserRepository;
  clock: Clock;
  authorizer: RoomAuthorizer;
}

export class AddMember {
  constructor(private readonly deps: Deps) {}

  async execute(requesterId: string, roomId: string, userId: string, role: RoomRole): Promise<RoomMemberDto> {
    await this.deps.authorizer.assertRoomExists(roomId);
    await this.deps.authorizer.assertAdmin(roomId, requesterId);

    if (!(await this.deps.userRepo.findById(userId))) {
      throw new NotFoundError("User not found");
    }

    const existing = await this.deps.roomRepo.getMember(roomId, userId);
    if (existing) throw new ConflictError("User is already a member");

    const member = await this.deps.roomRepo.addMember({
      roomId,
      userId,
      role,
      joinedAt: this.deps.clock.now(),
      lastReadMessageId: null,
      mutedUntil: null,
    });

    return toRoomMemberDto(member);
  }
}
