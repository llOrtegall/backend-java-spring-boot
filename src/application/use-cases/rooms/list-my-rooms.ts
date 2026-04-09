import type { RoomRepository } from "../../../domain/ports/repositories/room-repository.ts";
import { toRoomDto, type RoomDto } from "../../dtos/room-dtos.ts";

export class ListMyRooms {
  constructor(private readonly roomRepo: RoomRepository) {}

  async execute(userId: string): Promise<RoomDto[]> {
    const rooms = await this.roomRepo.listForUser(userId);
    return rooms.map(toRoomDto);
  }
}
