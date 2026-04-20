import type { SQL } from "bun";
import type { MessageRepository } from "../../../domain/ports/repositories/message-repository.ts";
import type { Message } from "../../../domain/entities/message.ts";

type Row = {
  id: string;
  room_id: string;
  sender_id: string;
  body: string;
  client_message_id: string | null;
  attachment_key: string | null;
  attachment_meta: Record<string, unknown> | null;
  edited_at: Date | null;
  deleted_at: Date | null;
  created_at: Date;
};

function mapRow(r: Row): Message {
  return {
    id: r.id,
    roomId: r.room_id,
    senderId: r.sender_id,
    body: r.body,
    clientMessageId: r.client_message_id,
    attachmentKey: r.attachment_key,
    attachmentMeta: r.attachment_meta,
    editedAt: r.edited_at,
    deletedAt: r.deleted_at,
    createdAt: r.created_at,
  };
}

export class PgMessageRepository implements MessageRepository {
  constructor(private readonly sql: SQL) {}

  async insert(msg: Message): Promise<Message> {
    const [row] = await this.sql<Row[]>`
      INSERT INTO messages
        (id, room_id, sender_id, body, client_message_id, attachment_key, attachment_meta, edited_at, deleted_at, created_at)
      VALUES
        (${msg.id}, ${msg.roomId}, ${msg.senderId}, ${msg.body}, ${msg.clientMessageId},
         ${msg.attachmentKey}, ${msg.attachmentMeta ? JSON.stringify(msg.attachmentMeta) : null},
         ${msg.editedAt}, ${msg.deletedAt}, ${msg.createdAt})
      ON CONFLICT (sender_id, client_message_id)
        WHERE client_message_id IS NOT NULL
      DO UPDATE SET id = EXCLUDED.id
      RETURNING *
    `;
    return mapRow(row!);
  }

  async findById(id: string): Promise<Message | null> {
    const [row] = await this.sql<Row[]>`SELECT * FROM messages WHERE id = ${id}`;
    return row ? mapRow(row) : null;
  }

  async listByRoom({ roomId, before, limit }: { roomId: string; before?: string; limit: number }): Promise<Message[]> {
    const rows = before
      ? await this.sql<Row[]>`
          SELECT * FROM messages
          WHERE room_id = ${roomId} AND id < ${before}
          ORDER BY id DESC
          LIMIT ${limit}
        `
      : await this.sql<Row[]>`
          SELECT * FROM messages
          WHERE room_id = ${roomId}
          ORDER BY id DESC
          LIMIT ${limit}
        `;
    return rows.map(mapRow);
  }

  async update(id: string, patch: Partial<Pick<Message, "body" | "editedAt">>): Promise<Message> {
    const updates: Record<string, unknown> = {};
    if (patch.body !== undefined) updates.body = patch.body;
    if (patch.editedAt !== undefined) updates.edited_at = patch.editedAt;

    const [row] = await this.sql<Row[]>`
      UPDATE messages SET ${this.sql(updates)}
      WHERE id = ${id}
      RETURNING *
    `;
    return mapRow(row!);
  }

  async softDelete(id: string): Promise<Message> {
    const [row] = await this.sql<Row[]>`
      UPDATE messages
      SET deleted_at = now(), body = '', attachment_key = NULL, attachment_meta = NULL
      WHERE id = ${id}
      RETURNING *
    `;
    return mapRow(row!);
  }
}
