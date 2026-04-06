import type { RoomRepository } from "../../domain/ports/repositories/room-repository.ts";
import type { RoomMember } from "../../domain/entities/room.ts";
import { ForbiddenError, NotFoundError } from "../../domain/errors/domain-errors.ts";

export class RoomAuthorizer {
  constructor(private readonly roomRepo: RoomRepository) {}

  async assertMember(roomId: string, userId: string): Promise<RoomMember> {
    const member = await this.roomRepo.getMember(roomId, userId);
    if (!member) throw new ForbiddenError("Not a member of this room");
    return member;
  }

  async assertAdmin(roomId: string, userId: string): Promise<RoomMember> {
    const member = await this.assertMember(roomId, userId);
    if (member.role === "member") throw new ForbiddenError("Admin or owner required");
    return member;
  }

  async assertOwner(roomId: string, userId: string): Promise<RoomMember> {
    const member = await this.assertMember(roomId, userId);
    if (member.role !== "owner") throw new ForbiddenError("Owner required");
    return member;
  }

  async assertRoomExists(roomId: string) {
    const room = await this.roomRepo.findById(roomId);
    if (!room) throw new NotFoundError("Room not found");
    return room;
  }
}
