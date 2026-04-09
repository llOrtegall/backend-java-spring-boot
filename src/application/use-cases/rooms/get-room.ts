import type { RoomRepository } from "../../../domain/ports/repositories/room-repository.ts";
import { toRoomDto, toRoomMemberDto, type RoomWithMembersDto } from "../../dtos/room-dtos.ts";
import { RoomAuthorizer } from "../../services/room-authorizer.ts";

interface Deps {
  roomRepo: RoomRepository;
  authorizer: RoomAuthorizer;
}

export class GetRoom {
  constructor(private readonly deps: Deps) {}

  async execute(requesterId: string, roomId: string): Promise<RoomWithMembersDto> {
    await this.deps.authorizer.assertMember(roomId, requesterId);
    const room = await this.deps.authorizer.assertRoomExists(roomId);
    const members = await this.deps.roomRepo.listMembers(roomId);

    return {
      ...toRoomDto(room),
      members: members.map(toRoomMemberDto),
    };
  }
}
