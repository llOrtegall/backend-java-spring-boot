import { z } from "zod";
import type { Room, RoomMember } from "../../domain/entities/room.ts";
import type { PublicUser } from "../../domain/entities/user.ts";

export const CreateDirectRoomSchema = z.object({
  targetUserId: z.string().uuid(),
});
export type CreateDirectRoomInput = z.infer<typeof CreateDirectRoomSchema>;

export const CreateGroupRoomSchema = z.object({
  name: z.string().min(1).max(128).trim(),
  memberIds: z.array(z.string().uuid()).max(99).default([]),
});
export type CreateGroupRoomInput = z.infer<typeof CreateGroupRoomSchema>;

export const AddMemberSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["admin", "member"]).default("member"),
});
export type AddMemberInput = z.infer<typeof AddMemberSchema>;

export const RemoveMemberSchema = z.object({
  userId: z.string().uuid(),
});

export const ListMessagesQuerySchema = z.object({
  before: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
export type ListMessagesQuery = z.infer<typeof ListMessagesQuerySchema>;

export interface RoomDto {
  id: string;
  kind: string;
  name: string | null;
  createdBy: string | null;
  lastMessageAt: Date | null;
  createdAt: Date;
}

export interface RoomMemberDto {
  userId: string;
  role: string;
  joinedAt: Date;
  lastReadMessageId: string | null;
  mutedUntil: Date | null;
}

export interface RoomWithMembersDto extends RoomDto {
  members: RoomMemberDto[];
}

export function toRoomDto(r: Room): RoomDto {
  return {
    id: r.id,
    kind: r.kind,
    name: r.name,
    createdBy: r.createdBy,
    lastMessageAt: r.lastMessageAt,
    createdAt: r.createdAt,
  };
}

export function toRoomMemberDto(m: RoomMember): RoomMemberDto {
  return {
    userId: m.userId,
    role: m.role,
    joinedAt: m.joinedAt,
    lastReadMessageId: m.lastReadMessageId,
    mutedUntil: m.mutedUntil,
  };
}
