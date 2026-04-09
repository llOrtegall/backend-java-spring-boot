import type { RoomRepository } from "../../../domain/ports/repositories/room-repository.ts";
import { ForbiddenError, NotFoundError } from "../../../domain/errors/domain-errors.ts";
import { RoomAuthorizer } from "../../services/room-authorizer.ts";

interface Deps {
  roomRepo: RoomRepository;
  authorizer: RoomAuthorizer;
}

export class RemoveMember {
  constructor(private readonly deps: Deps) {}

  async execute(requesterId: string, roomId: string, targetUserId: string): Promise<void> {
    await this.deps.authorizer.assertRoomExists(roomId);

    const target = await this.deps.roomRepo.getMember(roomId, targetUserId);
    if (!target) throw new NotFoundError("Member not found");

    if (requesterId === targetUserId) {
      await this.deps.roomRepo.removeMember(roomId, targetUserId);
      return;
    }

    const requester = await this.deps.roomRepo.getMember(roomId, requesterId);
    if (!requester) throw new ForbiddenError("Not a member of this room");

    if (requester.role === "member") throw new ForbiddenError("Admin or owner required");
    if (target.role === "owner") throw new ForbiddenError("Cannot remove the owner");
    if (requester.role === "admin" && target.role === "admin") {
      throw new ForbiddenError("Admin cannot remove another admin");
    }

    await this.deps.roomRepo.removeMember(roomId, targetUserId);
  }
}
