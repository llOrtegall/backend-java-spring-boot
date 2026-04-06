export interface Message {
  id: string;
  roomId: string;
  senderId: string;
  body: string;
  clientMessageId: string | null;
  attachmentKey: string | null;
  attachmentMeta: Record<string, unknown> | null;
  editedAt: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
}

export interface MessageDto {
  id: string;
  roomId: string;
  senderId: string;
  body: string;
  attachmentKey: string | null;
  attachmentMeta: Record<string, unknown> | null;
  editedAt: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
}

export function toMessageDto(m: Message): MessageDto {
  return {
    id: m.id,
    roomId: m.roomId,
    senderId: m.senderId,
    body: m.body,
    attachmentKey: m.attachmentKey,
    attachmentMeta: m.attachmentMeta,
    editedAt: m.editedAt,
    deletedAt: m.deletedAt,
    createdAt: m.createdAt,
  };
}
